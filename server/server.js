import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import chatRoutes from './routes/chatRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  })
);

// Parse JSON bodies with a 10mb limit
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);

// Global error handler (must be after routes)
app.use(errorHandler);

// Connect to MongoDB and start server
export async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn(
        '⚠️  WARNING: MONGODB_URI is not set. Database operations will return 503 until configured.'
      );
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Conversa server running on http://localhost:${PORT}`);
      console.log(`📡 CORS enabled for: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
