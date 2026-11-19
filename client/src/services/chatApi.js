const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Get or create an anonymous session ID for this browser.
 */
export function getSessionId() {
  let id = localStorage.getItem('conversa_session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('conversa_session_id', id);
  }
  return id;
}

function getHeaders(customHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'x-session-id': getSessionId(),
    ...customHeaders,
  };
}

/**
 * Parse SSE stream from a fetch response.
 * Returns an object with reader and processStream method.
 */
function createStreamProcessor(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return {
    reader,
    async cancel() {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors
      }
    },
    async processStream(onChunk, onDone, onError) {
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            onDone();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || '';

          let eventType = null;

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('event:')) {
              eventType = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();

              if (eventType === 'done' || dataStr === '[DONE]') {
                let parsed = null;
                try {
                  parsed = JSON.parse(dataStr);
                } catch {
                  parsed = null;
                }
                onDone(parsed);
                return;
              }

              if (eventType === 'error') {
                try {
                  const parsed = JSON.parse(dataStr);
                  onError(new Error(parsed.error || parsed.message || 'Stream error'));
                } catch {
                  onError(new Error(dataStr));
                }
                return;
              }

              if (eventType === 'start') {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.conversationId) {
                    onChunk({ type: 'start', conversationId: parsed.conversationId });
                  }
                } catch {
                  // Ignore
                }
                continue;
              }

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.content !== undefined) {
                  onChunk(parsed.content);
                } else if (parsed.chunk !== undefined) {
                  onChunk(parsed.chunk);
                } else if (typeof parsed === 'string') {
                  onChunk(parsed);
                } else if (parsed.conversationId) {
                  onChunk(parsed);
                }
              } catch {
                if (dataStr && dataStr !== '[DONE]') {
                  onChunk(dataStr);
                }
              }
            }

            if (trimmed.startsWith('data:')) {
              eventType = null;
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          onDone();
        } else {
          onError(err);
        }
      }
    },
  };
}

/**
 * Send a message and get a streaming response.
 */
export async function sendMessage(message, conversationId, tone, signal) {
  const body = { message };
  if (conversationId) body.conversationId = conversationId;
  if (tone) body.tone = tone;

  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return createStreamProcessor(response);
}

/**
 * Regenerate the last assistant response with streaming.
 */
export async function regenerateResponse(conversationId, tone, signal) {
  const body = { conversationId };
  if (tone) body.tone = tone;

  const response = await fetch(`${API_URL}/api/chat/regenerate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return createStreamProcessor(response);
}

/**
 * Get all conversations for current session.
 */
export async function getConversations() {
  const response = await fetch(`${API_URL}/api/conversations`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch conversations');
  const data = await response.json();
  return data.conversations || data;
}

/**
 * Get a single conversation by ID.
 */
export async function getConversation(id) {
  const response = await fetch(`${API_URL}/api/conversations/${id}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
}

/**
 * Update conversation tone.
 */
export async function updateTone(id, tone) {
  const response = await fetch(`${API_URL}/api/conversations/${id}/tone`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ tone }),
  });
  if (!response.ok) throw new Error('Failed to update tone');
  return response.json();
}

/**
 * Delete a conversation.
 */
export async function deleteConversation(id) {
  const response = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete conversation');
  return response.json();
}

/**
 * Search conversations by query.
 */
export async function searchConversations(query) {
  const response = await fetch(
    `${API_URL}/api/conversations/search?q=${encodeURIComponent(query)}`,
    {
      headers: getHeaders(),
    }
  );
  if (!response.ok) throw new Error('Search failed');
  const data = await response.json();
  return data.conversations || data;
}

/**
 * Export a conversation and trigger file download.
 */
export async function exportConversation(id) {
  const response = await fetch(`${API_URL}/api/conversations/${id}/export`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `conversa-${id}.txt`;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
