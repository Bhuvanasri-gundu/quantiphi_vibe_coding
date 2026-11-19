import { useRef, useEffect } from 'react';
import { Menu, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import ToneSelector from './ToneSelector';
import ExportButton from './ExportButton';

export default function ChatWindow({
  messages,
  currentConversation,
  isLoading,
  error,
  tone,
  onToneChange,
  onSendMessage,
  onRegenerate,
  onExport,
  onToggleSidebar,
  onStopStreaming,
}) {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const title =
    currentConversation?.title || (messages.length > 0 ? 'New conversation' : '');

  // Find the last assistant message index
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantIdx = i;
      break;
    }
  }

  const hasConversation = !!(
    currentConversation?._id || currentConversation?.id
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 min-w-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors lg:hidden"
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors hidden lg:flex"
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <h2 className="text-sm font-medium text-gray-800 truncate">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <ToneSelector tone={tone} onToneChange={onToneChange} />
          <ExportButton onExport={onExport} disabled={!hasConversation} />
        </div>
      </div>

      {/* Messages area */}
      {messages.length === 0 && !currentConversation ? (
        <WelcomeScreen onSendMessage={onSendMessage} />
      ) : (
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6"
        >
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg._id || msg.id || `msg-${idx}`}
                message={msg}
                isLastAssistant={idx === lastAssistantIdx}
                onRegenerate={onRegenerate}
                isLoading={isLoading}
              />
            ))}

            {/* Loading indicator before or during initial generation */}
            {isLoading && messages.length > 0 && !messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <Loader2 size={14} className="animate-spin text-blue-600" />
                <span>Conversa is thinking...</span>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 my-2">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        onStopStreaming={onStopStreaming}
      />
    </div>
  );
}
