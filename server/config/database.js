import mongoose from 'mongoose';
import dns from 'dns';

// Ensure DNS resolution succeeds on systems with restricted local DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if not supported in environment
}

let connectionPromise = null;

/**
 * Connect to MongoDB Atlas using Mongoose.
 * Prevents multiple concurrent connection attempts.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      '⚠️  WARNING: MONGODB_URI is not set in environment variables. Set MONGODB_URI in your .env file.'
    );
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      mongoose.connection.on('connected', () => {
        console.log('✅ Connected to MongoDB Atlas successfully.');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected.');
        connectionPromise = null;
      });

      await mongoose.connect(uri, {
        dbName: 'conversa',
        serverSelectionTimeoutMS: 8000,
      });

      return mongoose.connection;
    } catch (error) {
      connectionPromise = null;
      console.error('❌ Failed to connect to MongoDB Atlas:', error.message);
      throw error;
    }
  })();

  return connectionPromise;
}

/**
 * Check if MongoDB is currently connected.
 */
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

export default connectDB;
