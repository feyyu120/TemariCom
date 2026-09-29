import React from 'react';
import { VolumeX, Users } from 'lucide-react';
import { Conversation } from '@/features/chat/types';
import { formatChatTimestamp, getInitials } from '@/features/chat/utils/chatUtils';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  isTyping?: boolean;
  typingUser?: string;
  onPress: (conversation: Conversation) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected = false,
  isTyping = false,
  typingUser,
  onPress,
}) => {
  const title =
    conversation.peer?.full_name ||
    conversation.title ||
    conversation.peer?.username ||
    'Chat';
  const avatarUrl = conversation.peer?.avatar_url || conversation.avatar_url;
  const isOnline = conversation.peer?.is_online;
  const timestamp = formatChatTimestamp(conversation.last_message_at);

  return (
    <div
      onClick={() => onPress(conversation)}
      className={`flex items-center px-3.5 py-3 mx-2 my-0.5 rounded-xl cursor-pointer transition-all duration-150 select-none ${
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
  );
};

export default ConversationItem;
