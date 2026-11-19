import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { connectDB } from '../config/database.js';

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (process.env.MONGODB_URI) {
    await connectDB();
    if (mongoose.connection.readyState === 1) return;
  }
  throw Object.assign(
    new Error('Database is not connected. Set MONGODB_URI in your .env file.'),
    { statusCode: 503 }
  );
}

function validateId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(
      new Error('Invalid conversation ID. Must be a valid 24-character hexadecimal ObjectId.'),
      { statusCode: 400 }
    );
  }
}

const VALID_TONES = ['professional', 'casual', 'concise'];

/**
 * Creates a new conversation.
 */
export async function createConversation(title, tone = 'professional', sessionId = 'default-session') {
  await ensureConnected();

  const normalizedTone = VALID_TONES.includes(tone?.toLowerCase()) ? tone.toLowerCase() : 'professional';

  const conversation = await Conversation.create({
    title: title.trim().substring(0, 100),
    tone: normalizedTone,
    sessionId: sessionId || 'default-session',
    messages: [],
  });

  return conversation.toJSON();
}

/**
 * Returns all conversations ordered by most recently updated.
 * Filters by sessionId if provided.
 */
export async function getConversations(sessionId) {
  await ensureConnected();

  const filter = {};
  if (sessionId) {
    filter.sessionId = sessionId;
  }

  const conversations = await Conversation.find(
    filter,
    'title tone sessionId createdAt updatedAt messages'
  )
    .sort({ updatedAt: -1 })
    .exec();

  return conversations.map((conv) => {
    const json = conv.toJSON();
    const lastMsg = json.messages && json.messages.length > 0
      ? json.messages[json.messages.length - 1]
      : null;
    return {
      id: json.id || json._id,
      _id: json._id,
      title: json.title,
      tone: json.tone,
      sessionId: json.sessionId,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      lastMessage: lastMsg ? {
        role: lastMsg.role,
        content: lastMsg.content?.substring(0, 80),
        timestamp: lastMsg.timestamp,
      } : null,
    };
  });
}

/**
 * Returns a single conversation by ID with all its messages.
 */
export async function getConversationById(id) {
  await ensureConnected();
  validateId(id);

  const conversation = await Conversation.findById(id).exec();
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  return conversation.toJSON();
}

/**
 * Returns all messages for a given conversation, in chronological order.
 */
export async function getMessagesByConversationId(id) {
  await ensureConnected();
  validateId(id);

  const conversation = await Conversation.findById(id).select('messages').exec();
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  return conversation.messages.map((msg) => msg.toJSON());
}

/**
 * Deletes a conversation by ID.
 */
export async function deleteConversation(id) {
  await ensureConnected();
  validateId(id);

  const result = await Conversation.findByIdAndDelete(id).exec();
  if (!result) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  return { success: true };
}

/**
 * Searches conversations by title (case-insensitive partial match).
 */
export async function searchConversations(query, sessionId) {
  await ensureConnected();

  const escaped = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const filter = { title: { $regex: escaped, $options: 'i' } };
  if (sessionId) {
    filter.sessionId = sessionId;
  }

  const conversations = await Conversation.find(
    filter,
    'title tone sessionId createdAt updatedAt messages'
  )
    .sort({ updatedAt: -1 })
    .exec();

  return conversations.map((conv) => {
    const json = conv.toJSON();
    const lastMsg = json.messages && json.messages.length > 0
      ? json.messages[json.messages.length - 1]
      : null;
    return {
      id: json.id || json._id,
      _id: json._id,
      title: json.title,
      tone: json.tone,
      sessionId: json.sessionId,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      lastMessage: lastMsg ? {
        role: lastMsg.role,
        content: lastMsg.content?.substring(0, 80),
        timestamp: lastMsg.timestamp,
      } : null,
    };
  });
}

/**
 * Updates a conversation's tone.
 */
export async function updateConversationTone(id, tone) {
  await ensureConnected();
  validateId(id);

  if (!VALID_TONES.includes(tone?.toLowerCase())) {
    throw Object.assign(
      new Error(`Invalid tone: ${tone}. Must be one of: ${VALID_TONES.join(', ')}`),
      { statusCode: 400 }
    );
  }

  const conversation = await Conversation.findById(id).exec();
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  conversation.tone = tone.toLowerCase();
  conversation.updatedAt = new Date();
  await conversation.save();

  return conversation.toJSON();
}

/**
 * Adds a message to a conversation and updates the conversation's updatedAt timestamp.
 */
export async function addMessage(conversationId, role, content, tone) {
  await ensureConnected();
  validateId(conversationId);

  const conversation = await Conversation.findById(conversationId).exec();
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  const message = {
    role,
    content,
    tone: tone || conversation.tone,
    timestamp: new Date(),
  };

  conversation.messages.push(message);
  conversation.updatedAt = new Date();
  await conversation.save();

  const savedMessage = conversation.messages[conversation.messages.length - 1];
  return savedMessage.toJSON();
}

/**
 * Replaces or updates the last assistant message (used for regeneration without losing prior content on failure).
 */
export async function replaceLastAssistantMessage(conversationId, newContent, tone) {
  await ensureConnected();
  validateId(conversationId);

  const conversation = await Conversation.findById(conversationId).exec();
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  let lastAssistantIndex = -1;
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    if (conversation.messages[i].role === 'assistant') {
      lastAssistantIndex = i;
      break;
    }
  }

  if (lastAssistantIndex !== -1) {
    conversation.messages[lastAssistantIndex].content = newContent;
    conversation.messages[lastAssistantIndex].tone = tone || conversation.tone;
    conversation.messages[lastAssistantIndex].timestamp = new Date();
  } else {
    conversation.messages.push({
      role: 'assistant',
      content: newContent,
      tone: tone || conversation.tone,
      timestamp: new Date(),
    });
  }

  conversation.updatedAt = new Date();
  await conversation.save();

  const updatedMsg = lastAssistantIndex !== -1
    ? conversation.messages[lastAssistantIndex]
    : conversation.messages[conversation.messages.length - 1];

  return updatedMsg.toJSON();
}

/**
 * Returns a conversation with all its messages (for export).
 */
export async function getConversationWithMessages(id) {
  return getConversationById(id);
}
