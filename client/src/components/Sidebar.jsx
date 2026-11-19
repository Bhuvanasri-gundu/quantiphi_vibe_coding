import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, PanelLeftClose } from 'lucide-react';
import ConversationItem from './ConversationItem';

export default function Sidebar({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onSearch,
  isCollapsed,
  onToggleCollapse,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef(null);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const currentId = currentConversation?._id || currentConversation?.id;

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-30 h-full bg-white border-r border-gray-200
          flex flex-col transition-all duration-200 ease-in-out
          ${isCollapsed ? 'w-0 overflow-hidden' : 'w-72'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <span className="font-semibold text-lg text-gray-900">Conversa</span>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto mt-2 px-2">
          {conversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-400">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv) => {
                const id = conv._id || conv.id;
                return (
                  <ConversationItem
                    key={id}
                    conversation={conv}
                    isSelected={currentId === id}
                    onSelect={() => onSelectConversation(id)}
                    onDelete={() => onDeleteConversation(id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
