import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square } from 'lucide-react';

export default function ChatInput({ onSendMessage, isLoading, onStopStreaming }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const hasContent = message.trim().length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 5 * 24; // ~5 rows
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  const handleSend = useCallback(() => {
    if (!hasContent || isLoading) return;
    onSendMessage(message.trim());
    setMessage('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, hasContent, isLoading, onSendMessage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 border border-gray-300 rounded-xl px-3 py-2 shadow-xs focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors bg-white">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-70 bg-transparent leading-6 max-h-32"
          />
          {isLoading && onStopStreaming ? (
            <button
              onClick={onStopStreaming}
              className="flex-shrink-0 p-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              title="Stop generating"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!hasContent || isLoading}
              className={`
                flex-shrink-0 p-1.5 rounded-lg transition-colors
                ${
                  hasContent && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }
              `}
              title="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
