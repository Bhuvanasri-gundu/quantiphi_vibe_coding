import { useState, useCallback, useRef, useEffect } from 'react';
import * as api from '../services/chatApi';

export function useChat() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tone, setTone] = useState('professional');

  const abortRef = useRef(null);

  // Load all conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations');
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Select a conversation and load its messages, restoring its saved tone
  const selectConversation = useCallback(async (id) => {
    try {
      setError(null);
      const data = await api.getConversation(id);
      const conv = data.conversation || data;
      setCurrentConversation(conv);
      setMessages(data.messages || conv?.messages || []);

      // Restore saved tone when reopening conversation
      if (conv?.tone) {
        setTone(conv.tone);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    }
  }, []);

  // Change tone and persist to backend if conversation is active
  const changeTone = useCallback(
    async (newTone) => {
      setTone(newTone);
      const convId = currentConversation?._id || currentConversation?.id;
      if (convId) {
        try {
          await api.updateTone(convId, newTone);
          setCurrentConversation((prev) => (prev ? { ...prev, tone: newTone } : prev));
        } catch (err) {
          console.warn('Could not persist tone change to server:', err.message);
        }
      }
    },
    [currentConversation]
  );

  // Stop / abort current streaming request
  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // Send a new message
  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Add user message optimistically
      const userMessage = {
        _id: `temp-user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add placeholder assistant message
      const assistantMessage = {
        _id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        const conversationId = currentConversation?._id || currentConversation?.id;
        const stream = await api.sendMessage(
          text.trim(),
          conversationId,
          tone,
          controller.signal
        );

        let fullContent = '';
        let newConversationId = conversationId;

        await stream.processStream(
          (chunk) => {
            if (typeof chunk === 'object') {
              if (chunk.conversationId) {
                newConversationId = chunk.conversationId;
              }
              return;
            }
            if (typeof chunk === 'string') {
              fullContent += chunk;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: fullContent };
                }
                return updated;
              });
            }
          },
          async (doneData) => {
            setIsLoading(false);
            abortRef.current = null;
            const convId = doneData?.conversationId || newConversationId;
            await loadConversations();
            if (convId) {
              try {
                const data = await api.getConversation(convId);
                const conv = data.conversation || data;
                setCurrentConversation(conv);
                setMessages(data.messages || conv?.messages || []);
              } catch {
                // Keep optimistic messages if reload fails
              }
            }
          },
          (err) => {
            setIsLoading(false);
            abortRef.current = null;
            if (err.name !== 'AbortError') {
              setError(err.message || 'Failed to get response');
              // Remove empty assistant message on error
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && !last.content) {
                  return prev.slice(0, -1);
                }
                return prev;
              });
            }
          }
        );
      } catch (err) {
        setIsLoading(false);
        abortRef.current = null;
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to send message');
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        }
      }
    },
    [isLoading, currentConversation, tone, loadConversations]
  );

  // Create a new chat
  const createNewChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id) => {
      try {
        await api.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => (c._id || c.id) !== id));
        if ((currentConversation?._id || currentConversation?.id) === id) {
          setCurrentConversation(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
        setError('Failed to delete conversation');
      }
    },
    [currentConversation]
  );

  // Search conversations
  const searchConversations = useCallback(
    async (query) => {
      if (!query.trim()) {
        loadConversations();
        return;
      }
      try {
        const data = await api.searchConversations(query);
        setConversations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Search failed:', err);
      }
    },
    [loadConversations]
  );

  // Regenerate last assistant response
  const regenerateResponse = useCallback(async () => {
    const conversationId = currentConversation?._id || currentConversation?.id;
    if (!conversationId || isLoading) return;

    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Clear content of the last assistant message while retaining slot
    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'assistant') {
          updated[i] = { ...updated[i], content: '' };
          break;
        }
      }
      return updated;
    });

    try {
      const stream = await api.regenerateResponse(
        conversationId,
        tone,
        controller.signal
      );
      let fullContent = '';

      await stream.processStream(
        (chunk) => {
          if (typeof chunk === 'string') {
            fullContent += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'assistant') {
                  updated[i] = { ...updated[i], content: fullContent };
                  break;
                }
              }
              return updated;
            });
          }
        },
        async () => {
          setIsLoading(false);
          abortRef.current = null;
          try {
            const data = await api.getConversation(conversationId);
            const conv = data.conversation || data;
            setCurrentConversation(conv);
            setMessages(data.messages || conv?.messages || []);
          } catch {
            // Keep optimistic messages
          }
        },
        (err) => {
          setIsLoading(false);
          abortRef.current = null;
          if (err.name !== 'AbortError') {
            setError(err.message || 'Failed to regenerate response');
          }
        }
      );
    } catch (err) {
      setIsLoading(false);
      abortRef.current = null;
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to regenerate response');
      }
    }
  }, [currentConversation, isLoading, tone]);

  // Export conversation
  const exportConversation = useCallback(async () => {
    const conversationId = currentConversation?._id || currentConversation?.id;
    if (!conversationId) return;

    try {
      await api.exportConversation(conversationId);
    } catch (err) {
      setError('Failed to export conversation');
    }
  }, [currentConversation]);

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    tone,
    loadConversations,
    selectConversation,
    sendMessage,
    createNewChat,
    deleteConversation,
    searchConversations,
    regenerateResponse,
    setTone: changeTone,
    stopStreaming,
    exportConversation,
  };
}
