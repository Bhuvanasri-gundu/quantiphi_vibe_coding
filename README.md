# Conversa - AI Chat Assistant

A full-stack AI chat assistant with real-time streaming, persistent conversation history, and configurable response tones. Built with React, Node.js/Express, MongoDB Atlas (Mongoose), and OpenAI API.

## Features

- **Real-time AI Chat** - Powered by OpenAI with Server-Sent Events (SSE) streaming
- **Conversation History** - Persistent storage with MongoDB Atlas via Mongoose
- **Tone Toggle** - Switch between Professional, Casual, and Concise response styles
- **Regenerate Response** - Re-generate the last AI response with one click
- **Copy Response** - Copy any AI response to clipboard
- **Search Conversations** - Find previous conversations by title
- **Export Conversation** - Download any conversation as a formatted TXT file
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Vite, Tailwind CSS, Lucide React |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| AI | OpenAI API (GPT-4.1-mini default) |
| Streaming | Server-Sent Events (SSE) |

## Architecture

```
Client (React + Vite)
  |
  |-- fetch (SSE streaming) -->
  |
Server (Express.js)
  |
  |-- Mongoose ODM --> MongoDB Atlas (conversations collection)
  |-- OpenAI SDK --> OpenAI API (streaming completions)
```

## Project Structure

```
ai-chat-assistant/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── ChatInput.jsx
│   │   │   ├── ToneSelector.jsx
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── ConversationItem.jsx
│   │   │   └── ExportButton.jsx
│   │   ├── services/
│   │   │   └── chatApi.js     # API client
│   │   ├── hooks/
│   │   │   └── useChat.js     # Chat state management
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── server/                    # Express backend
│   ├── config/
│   │   ├── database.js        # MongoDB connection via Mongoose
│   │   └── openai.js          # OpenAI client
│   ├── models/
│   │   └── Conversation.js    # Mongoose Conversation schema
│   ├── controllers/
│   │   ├── chatController.js  # Chat and SSE streaming controller
│   │   └── conversationController.js # Conversation CRUD & export
│   ├── routes/
│   │   ├── chatRoutes.js
│   │   └── conversationRoutes.js
│   ├── services/
│   │   ├── aiService.js       # OpenAI integration
│   │   └── conversationService.js  # MongoDB database operations
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validateRequest.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+ installed
- A MongoDB Atlas cluster (or local MongoDB)
- An OpenAI API key

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-chat-assistant
```

### 2. Set Up MongoDB Atlas

1. Log into your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
2. In your Cluster, click **Connect**.
3. Choose **Connect your application** (Node.js driver).
4. Copy your connection string (format: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/conversa?retryWrites=true&w=majority`).
5. Ensure your IP address is whitelisted in **Network Access** (or `0.0.0.0/0` for development).
6. Create a database user with read/write privileges in **Database Access**.

### 3. Configure Environment Variables

**Backend** - Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/conversa
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
CLIENT_URL=http://localhost:5173
```

**Frontend** - Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

> **Getting your OpenAI API key:**
> - Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
> - Create a new API key

### 4. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
Server connects to MongoDB Atlas and starts on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
Frontend starts on http://localhost:5173

### 6. Open the Application

Navigate to **http://localhost:5173** in your browser.

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message and stream AI response (SSE) |
| POST | `/api/chat/regenerate` | Regenerate last AI response (SSE) |
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversations/search?q=` | Search conversations by title |
| GET | `/api/conversations/:id` | Get conversation with messages |
| DELETE | `/api/conversations/:id` | Delete a conversation |
| GET | `/api/conversations/:id/export` | Export conversation as TXT |

### POST /api/chat

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "conversationId": "64b1f8... (optional ObjectId)",
  "tone": "professional"
}
```

**Response:** Server-Sent Events stream
```
event: chunk
data: {"content":"Hello"}

event: chunk
data: {"content":"! How"}

event: done
data: {"conversationId":"64b1f8...","messageId":"64b1f9..."}
```

### POST /api/chat/regenerate

**Request Body:**
```json
{
  "conversationId": "64b1f8...",
  "tone": "casual"
}
```

**Response:** Same SSE format as `/api/chat`

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `PORT` | Server | Backend port (default: 5000) |
| `MONGODB_URI` | Server | MongoDB Atlas connection string |
| `OPENAI_API_KEY` | Server | OpenAI API key |
| `OPENAI_MODEL` | Server | AI model (default: gpt-4.1-mini) |
| `CLIENT_URL` | Server | Frontend URL for CORS |
| `VITE_API_URL` | Client | Backend API URL |

## Security Notes

- API keys and database credentials are stored only in server-side `.env` files
- `MONGODB_URI` is never exposed to the frontend
- All database operations are validated and executed through the Express backend
- `.env` files are excluded from version control via `.gitignore`

## License

MIT
