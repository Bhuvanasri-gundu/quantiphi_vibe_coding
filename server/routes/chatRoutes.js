import { Router } from 'express';
import { sendMessage, regenerateResponse } from '../controllers/chatController.js';

const router = Router();

// POST /api/chat - Send a message and stream AI response
router.post('/', sendMessage);

// POST /api/chat/regenerate - Regenerate last AI response
router.post('/regenerate', regenerateResponse);

export default router;
