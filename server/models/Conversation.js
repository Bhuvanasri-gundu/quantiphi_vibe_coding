import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    tone: {
      type: String,
      enum: ['professional', 'casual', 'concise'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for message id compatibility
messageSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const conversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      index: true,
      default: 'default-session',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    tone: {
      type: String,
      enum: ['professional', 'casual', 'concise'],
      default: 'professional',
    },
    messages: [messageSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for conversation id compatibility
conversationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Indexes for conversation history retrieval and search
conversationSchema.index({ sessionId: 1, updatedAt: -1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ title: 'text' });
conversationSchema.index({ title: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
