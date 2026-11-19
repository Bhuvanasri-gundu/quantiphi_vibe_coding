import { useState, useCallback } from 'react';
import { Copy, RefreshCw, Check, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function MessageBubble({
  message,
  isLastAssistant,
  onRegenerate,
  isLoading,
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);

  return (
    <div
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mt-1">
          <Bot size={15} className="text-gray-500" />
        </div>
      )}

      <div
        className={`max-w-[75%] min-w-0 ${isUser ? 'order-first' : ''}`}
        style={isUser ? { order: 0 } : {}}
      >
        {/* Message bubble */}
        <div
          className={`
            px-4 py-2.5 text-sm leading-relaxed
            ${
              isUser
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm'
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:my-2 prose-pre:p-0 prose-pre:bg-transparent">
              {message.content ? (
                <ReactMarkdown
                  components={{
                    pre({ children }) {
                      return (
                        <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto my-2">
                          {children}
                        </pre>
                      );
                    },
                    code({ inline, className, children, ...props }) {
                      if (inline) {
                        return (
                          <code
                            className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-xs font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code
                          className="block font-mono text-sm leading-relaxed"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse rounded-sm" />
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {formatTime(message.created_at || message.timestamp)}
        </div>

        {/* Action buttons for assistant messages */}
        {!isUser && message.content && (
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check size={12} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>

            {isLastAssistant && (
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Regenerate response"
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center mt-1">
          <User size={15} className="text-white" />
        </div>
      )}
    </div>
  );
}
