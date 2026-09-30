import React from 'react';
import { MoreVertical, Bookmark } from 'lucide-react';

interface ChatHeaderProps {
  onMenuPress?: () => void;
  onSavedMessagesPress?: () => void;
  unreadCount?: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onMenuPress, onSavedMessagesPress }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-background select-none">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight text-textPrimary">Chat</h1>
      </div>

      <div className="flex items-center gap-1">
        {onSavedMessagesPress && (
          <button
            type="button"
            onClick={onSavedMessagesPress}
            title="Saved Messages"
            className="w-8 h-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
            aria-label="Saved Messages"
          >
            <Bookmark className="w-4 h-4 fill-blue-500/20" />
          </button>
        )}

        <button
          type="button"
          onClick={onMenuPress}
          className="w-8 h-8 rounded-full flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
          aria-label="Chat options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
