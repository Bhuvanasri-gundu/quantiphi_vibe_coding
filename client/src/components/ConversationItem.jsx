import { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';

/**
 * Format a timestamp into relative time.
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const title = conversation.title || 'Untitled conversation';
  const timestamp =
    conversation.updatedAt ||
    conversation.updated_at ||
    conversation.createdAt ||
    conversation.created_at ||
    conversation.timestamp;

  const preview = conversation.lastMessage?.content || '';

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    onDelete();
    setConfirmDelete(false);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer relative
        ${
          isSelected
            ? 'bg-gray-100 border-l-2 border-blue-600 pl-2.5'
            : 'hover:bg-gray-50 border-l-2 border-transparent'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-800 truncate">
            {title}
          </div>
          {preview ? (
            <div className="text-xs text-gray-400 truncate mt-0.5">
              {preview}
            </div>
          ) : null}
          <div className="text-[11px] text-gray-400 mt-0.5">
            {formatRelativeTime(timestamp)}
          </div>
        </div>

        {confirmDelete ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 bg-white border border-red-200 rounded px-1.5 py-0.5 shadow-xs"
          >
            <span className="text-[11px] text-red-600 font-medium">Delete?</span>
            <button
              onClick={handleConfirmDelete}
              className="p-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
              title="Confirm delete"
            >
              <Check size={12} />
            </button>
            <button
              onClick={handleCancelDelete}
              className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleDeleteClick}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer flex-shrink-0 mt-0.5"
            title="Delete conversation"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
