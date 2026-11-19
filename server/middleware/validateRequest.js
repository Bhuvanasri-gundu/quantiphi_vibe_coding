import mongoose from 'mongoose';

/**
 * Validates that the chat message exists and is a non-empty string.
 */
export const validateChatMessage = (req, res, next) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'Message is required and must be a non-empty string.',
    });
  }

  next();
};

/**
 * Validates that the conversation ID param is a valid MongoDB ObjectId.
 */
export const validateConversationId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Invalid conversation ID. Must be a valid 24-character hexadecimal ObjectId.',
    });
  }

  next();
};
