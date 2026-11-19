import mongoose from 'mongoose';
import {
  createConversation,
  getMessagesByConversationId,
  addMessage,
  replaceLastAssistantMessage,
} from '../services/conversationService.js';
import { streamChatCompletion } from '../services/aiService.js';

const VALID_TONES = ['professional', 'casual', 'concise'];

/**
 * POST /api/chat
 * Sends a user message and streams back the AI response via SSE.
 */
export const sendMessage = async (req, res, next) => {
  let clientDisconnected = false;

  res.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
  });

  try {
    const { message, conversationId, tone = 'professional' } = req.body;
    const sessionId = req.headers['x-session-id'] || req.body.sessionId || 'default-session';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string.' });
    }

    const normalizedTone = VALID_TONES.includes(tone?.toLowerCase())
      ? tone.toLowerCase()
      : 'professional';

    if (conversationId && !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        error: 'Invalid conversation ID. Must be a valid 24-character hexadecimal ObjectId.',
      });
    }

    // If no conversationId, create a new conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const title = message.trim().substring(0, 60);
      const conversation = await createConversation(title, normalizedTone, sessionId);
      activeConversationId = (conversation._id || conversation.id).toString();
    }

    // Save the user message to MongoDB
    await addMessage(activeConversationId, 'user', message.trim(), normalizedTone);

    // Retrieve full conversation history
    const messages = await getMessagesByConversationId(activeConversationId);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Flush headers immediately
    if (res.flushHeaders) {
      res.flushHeaders();
    }

    // Notify client stream has started with the conversation ID
    res.write(`event: start\ndata: ${JSON.stringify({ conversationId: activeConversationId })}\n\n`);

    // Stream AI response
    let fullContent = '';

    try {
      for await (const chunk of streamChatCompletion(messages, normalizedTone)) {
        if (clientDisconnected) break;

        fullContent += chunk;
        res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      if (!clientDisconnected) {
        if (!fullContent) {
          fullContent = 'I apologize, but I could not generate a response at this moment. Please try again.';
          res.write(`event: chunk\ndata: ${JSON.stringify({ content: fullContent })}\n\n`);
        }

        // Save the complete assistant message to MongoDB
        const savedMessage = await addMessage(activeConversationId, 'assistant', fullContent, normalizedTone);

        res.write(
          `event: done\ndata: ${JSON.stringify({
            conversationId: activeConversationId.toString(),
            messageId: (savedMessage._id || savedMessage.id).toString(),
          })}\n\n`
        );
        res.end();
      }
    } catch (streamError) {
      console.error('Stream error during generation:', streamError.message);
      if (!clientDisconnected) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: streamError.message || 'Stream generation failed' })}\n\n`
        );
        res.end();
      }
    }
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
    if (!clientDisconnected) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
      );
      res.end();
    }
  }
};

/**
 * POST /api/chat/regenerate
 * Regenerates the last AI response for a conversation via SSE without losing prior content on failure.
 */
export const regenerateResponse = async (req, res, next) => {
  let clientDisconnected = false;

  res.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
  });

  try {
    const { conversationId, tone = 'professional' } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        error: 'Invalid conversation ID. Must be a valid 24-character hexadecimal ObjectId.',
      });
    }

    const normalizedTone = VALID_TONES.includes(tone?.toLowerCase())
      ? tone.toLowerCase()
      : 'professional';

    // Get current messages
    const currentMessages = await getMessagesByConversationId(conversationId);

    if (!currentMessages || currentMessages.length === 0) {
      return res.status(400).json({ error: 'No messages found in this conversation.' });
    }

    // Verify there is at least one user message
    const hasUserMessage = currentMessages.some((m) => m.role === 'user');
    if (!hasUserMessage) {
      return res.status(400).json({ error: 'No user message found to regenerate from.' });
    }

    // The context for regeneration should exclude the last assistant message
    let lastAssistantIdx = -1;
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === 'assistant') {
        lastAssistantIdx = i;
        break;
      }
    }

    const contextMessages = lastAssistantIdx !== -1
      ? currentMessages.slice(0, lastAssistantIdx)
      : currentMessages;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    if (res.flushHeaders) {
      res.flushHeaders();
    }

    res.write(`event: start\ndata: ${JSON.stringify({ conversationId })}\n\n`);

    // Stream new AI response
    let fullContent = '';

    try {
      for await (const chunk of streamChatCompletion(contextMessages, normalizedTone)) {
        if (clientDisconnected) break;

        fullContent += chunk;
        res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      if (!clientDisconnected) {
        if (!fullContent) {
          fullContent = 'I apologize, but I could not regenerate a response at this moment. Please try again.';
          res.write(`event: chunk\ndata: ${JSON.stringify({ content: fullContent })}\n\n`);
        }

        // Atomically replace the last assistant message in MongoDB
        const updatedMessage = await replaceLastAssistantMessage(conversationId, fullContent, normalizedTone);

        res.write(
          `event: done\ndata: ${JSON.stringify({
            conversationId: conversationId.toString(),
            messageId: (updatedMessage._id || updatedMessage.id).toString(),
          })}\n\n`
        );
        res.end();
      }
    } catch (streamError) {
      console.error('Regenerate stream error:', streamError.message);
      if (!clientDisconnected) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: streamError.message || 'Regeneration failed' })}\n\n`
        );
        res.end();
      }
    }
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }
    if (!clientDisconnected) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
      );
      res.end();
    }
  }
};
