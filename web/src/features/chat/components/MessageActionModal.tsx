import React, { useEffect, useRef } from 'react';
import { Reply, Copy, CornerUpRight, Pencil, Trash2 } from 'lucide-react';
import { ChatMessage } from '@/features/chat/types';

interface MessageActionModalProps {
  isOpen: boolean;
  message: ChatMessage | null;
  isMine: boolean;
  position?: { x: number; y: number } | null;
  onClose: () => void;
  onReply: (message: ChatMessage) => void;
  onCopy: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
}

export const MessageActionModal: React.FC<MessageActionModalProps> = ({
  isOpen,
  message,
  isMine,
  position,
  onClose,
  onReply,
  onCopy,
  onForward,
  onEdit,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const isPending = message.id.startsWith('temp-');
  const canEdit = isMine && !isPending && message.message_type === 'text';
  const canDelete = !isPending;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-150"
    >
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        style={
          position
            ? {
                position: 'fixed',
                left: Math.min(position.x, window.innerWidth - 220),
                top: Math.min(position.y, window.innerHeight - 260),
              }
            : undefined
        }
        className="w-56 bg-surface-elevated border border-border rounded-large shadow-2xl p-1.5 flex flex-col gap-0.5 select-none animate-in zoom-in-95 duration-100"
      >
        {/* Reply */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onReply(message);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-xs font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
        >
          <Reply className="w-4 h-4 text-textSecondary" />
          <span>Reply</span>
        </button>

        {/* Copy */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onCopy(message);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-xs font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
        >
          <Copy className="w-4 h-4 text-textSecondary" />
          <span>Copy</span>
        </button>

        {/* Forward */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onForward(message);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-xs font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
        >
          <CornerUpRight className="w-4 h-4 text-textSecondary" />
          <span>Forward</span>
        </button>

        {/* Edit (only own text) */}
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(message);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-xs font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
          >
            <Pencil className="w-4 h-4 text-textSecondary" />
            <span>Edit</span>
          </button>
        )}

        {/* Delete */}
        {canDelete && (
          <>
            <div className="h-px bg-border-subtle my-1" />
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(message);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-xs font-semibold text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left"
            >
              <Trash2 className="w-4 h-4 text-danger" />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageActionModal;
