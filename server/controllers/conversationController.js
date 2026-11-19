import {
  getConversations as fetchConversations,
  getConversationWithMessages,
  deleteConversation as removeConversation,
  searchConversations as findConversations,
  createConversation as initConversation,
  updateConversationTone,
} from '../services/conversationService.js';

/**
 * GET /api/conversations
 * Returns all conversations ordered by most recently updated.
 */
export const getConversations = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    const conversations = await fetchConversations(sessionId);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/conversations
 * Creates a new conversation.
 */
export const createConversation = async (req, res, next) => {
  try {
    const { title = 'New Conversation', tone = 'professional' } = req.body;
    const sessionId = req.headers['x-session-id'] || req.body.sessionId || 'default-session';
    const conversation = await initConversation(title, tone, sessionId);
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/conversations/:id
 * Returns a single conversation with all its messages.
 */
export const getConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await getConversationWithMessages(id);
    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/conversations/:id
 * Deletes a conversation and all its messages.
 */
export const deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await removeConversation(id);
    res.json({ success: true, message: 'Conversation deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/conversations/:id/tone
 * Updates the tone for an existing conversation.
 */
export const updateTone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tone } = req.body;

    if (!tone) {
      return res.status(400).json({ error: 'Tone is required.' });
    }

    const updated = await updateConversationTone(id, tone);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/conversations/search?q=query
 * Searches conversations by title.
 */
export const searchConversations = async (req, res, next) => {
  try {
    const { q } = req.query;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query (q) is required.' });
    }

    const conversations = await findConversations(q.trim(), sessionId);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/conversations/:id/export
 * Exports a conversation as a downloadable text file.
 */
export const exportConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await getConversationWithMessages(id);

    // Format conversation cleanly
    let text = `============================================================\n`;
    text += `CONVERSA - AI CHAT ASSISTANT EXPORT\n`;
    text += `============================================================\n\n`;
    text += `Title: ${conversation.title || 'Untitled'}\n`;
    text += `Tone: ${(conversation.tone || 'professional').toUpperCase()}\n`;
    text += `Date Created: ${new Date(conversation.createdAt).toLocaleString()}\n`;
    text += `Last Updated: ${new Date(conversation.updatedAt).toLocaleString()}\n`;
    text += `\n------------------------------------------------------------\n\n`;

    if (conversation.messages && conversation.messages.length > 0) {
      for (const msg of conversation.messages) {
        const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
        const timeVal = msg.timestamp || msg.createdAt;
        const timestamp = timeVal ? new Date(timeVal).toLocaleString() : 'N/A';
        text += `[${role}] - ${timestamp}\n`;
        text += `${msg.content}\n\n`;
      }
    } else {
      text += '(No messages in this conversation)\n';
    }

    text += `============================================================\n`;

    // Sanitize title for filename
    const safeTitle = (conversation.title || 'conversation')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Conversa_${safeTitle}.txt"`);
    res.send(text);
  } catch (error) {
    next(error);
  }
};
