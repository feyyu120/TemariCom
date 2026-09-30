import React, { useState, useRef, useEffect } from 'react';
import { VolumeX, Users, Trash2, UserX, UserCheck } from 'lucide-react';
import { Conversation } from '@/features/chat/types';
import { formatChatTimestamp, getInitials } from '@/features/chat/utils/chatUtils';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  isTyping?: boolean;
  typingUser?: string;
  onPress: (conversation: Conversation) => void;
  onDelete?: (conversation: Conversation) => void;
  onToggleBlock?: (conversation: Conversation) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected = false,
  isTyping = false,
  typingUser,
  onPress,
  onDelete,
  onToggleBlock,
}) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isBlocked = Boolean(conversation.is_blocked || conversation.peer?.is_blocked);

  const title =
    conversation.peer?.full_name ||
    conversation.title ||
    conversation.peer?.username ||
    'Chat';
  const avatarUrl = conversation.peer?.avatar_url || conversation.avatar_url;
  const isOnline = conversation.peer?.is_online;
  const timestamp = formatChatTimestamp(conversation.last_message_at);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
      }
    };
    if (contextMenuPos) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuPos]);

  // Handle right click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Handle touch long press (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenuPos({ x: touch.clientX, y: touch.clientY });
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <>
      <div
        onClick={() => onPress(conversation)}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        className={`flex items-center px-3.5 py-3 mx-2 my-0.5 rounded-xl cursor-pointer transition-all duration-150 select-none relative group ${
          isSelected
            ? 'bg-surface-elevated font-medium shadow-xs'
            : 'hover:bg-surface/60 active:bg-surface-elevated/70'
        }`}
      >
        {/* Avatar with Online Indicator */}
        <div className="relative mr-3 shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface flex items-center justify-center border border-border-subtle">
            {avatarUrl ? (
              <img src={avatarUrl} alt={title} className="w-full h-full object-cover" />
            ) : conversation.type === 'group' ? (
              <Users className="w-6 h-6 text-textTertiary" />
            ) : (
              <span className="text-sm font-bold text-textPrimary">
                {getInitials(title)}
              </span>
            )}
          </div>

          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>

        {/* Middle Content */}
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-textPrimary truncate flex-1">
              {title}
            </span>

            {conversation.is_muted && (
              <VolumeX className="w-3.5 h-3.5 text-textTertiary shrink-0" />
            )}
          </div>

          {isTyping ? (
            <p className="text-xs font-medium text-emerald-500 italic truncate">
              {typingUser ? `${typingUser} is typing...` : 'Typing...'}
            </p>
          ) : (
            <p
              className={`text-xs truncate ${
                conversation.unread_count > 0
                  ? 'font-semibold text-textPrimary'
                  : 'text-textSecondary'
              }`}
            >
              {conversation.last_message_preview || 'No messages yet'}
            </p>
          )}
        </div>

        {/* Right Column: Timestamp & Unread Badge */}
        <div className="flex flex-col items-end justify-center shrink-0 min-w-[44px]">
          <span
            className={`text-[11px] mb-1.5 ${
              conversation.unread_count > 0
                ? 'font-bold text-unread'
                : 'text-textTertiary'
            }`}
          >
            {timestamp}
          </span>

          {conversation.unread_count > 0 && (
            <span className="bg-unread text-white text-[11px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center leading-none">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
        </div>
      </div>

      {/* Context Menu Dropdown on Right-Click or Long-Press */}
      {contextMenuPos && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setContextMenuPos(null);
          }}
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
        >
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.min(contextMenuPos.x, window.innerWidth - 200),
              top: Math.min(contextMenuPos.y, window.innerHeight - 150),
            }}
            className="w-48 bg-surface-elevated border border-border rounded-large shadow-2xl py-1 z-50 animate-in zoom-in-95 duration-100 select-none"
          >
            {conversation.peer?.id && onToggleBlock && (
              <button
                type="button"
                onClick={() => {
                  setContextMenuPos(null);
                  onToggleBlock(conversation);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-textPrimary hover:bg-textPrimary/5 transition-colors cursor-pointer text-left"
              >
                {isBlocked ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>Unblock User</span>
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 text-danger" />
                    <span>Block User</span>
                  </>
                )}
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  setContextMenuPos(null);
                  onDelete(conversation);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left"
              >
                <Trash2 className="w-4 h-4 text-danger" />
                <span>Delete Chat</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationItem;
