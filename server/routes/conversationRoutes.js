import { Router } from 'express';
import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  updateTone,
  searchConversations,
  exportConversation,
} from '../controllers/conversationController.js';
import { validateConversationId } from '../middleware/validateRequest.js';

const router = Router();

// GET /api/conversations/search?q=query - Search conversations (MUST be before :id route)
router.get('/search', searchConversations);

// GET /api/conversations - List all conversations
router.get('/', getConversations);

// POST /api/conversations - Create a conversation
router.post('/', createConversation);

// GET /api/conversations/:id - Get a single conversation with messages
router.get('/:id', validateConversationId, getConversation);

// PATCH /api/conversations/:id/tone - Update tone for conversation
router.patch('/:id/tone', validateConversationId, updateTone);

// DELETE /api/conversations/:id - Delete a conversation
router.delete('/:id', validateConversationId, deleteConversation);

// GET /api/conversations/:id/export - Export conversation as text file
router.get('/:id/export', validateConversationId, exportConversation);

export default router;
