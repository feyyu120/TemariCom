import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Bookmark, Users, Radio, Settings, Menu } from 'lucide-react';

export interface ChatHeaderProps {
  onOpenMobileMenu?: () => void;
  onMenuPress?: () => void;
  onSavedMessagesPress?: () => void;
  onCreateGroupPress?: () => void;
  onNewChannelPress?: () => void;
  onSettingsPress?: () => void;
  unreadCount?: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenMobileMenu,
  onMenuPress,
  onSavedMessagesPress,
  onCreateGroupPress,
  onNewChannelPress,
  onSettingsPress,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-background select-none shrink-0 relative">
      <div className="flex items-center gap-2.5">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-1 -ml-1 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors lg:hidden cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-bold tracking-tight text-textPrimary">Chat</h1>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen((prev) => !prev);
            onMenuPress?.();
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isMenuOpen
              ? 'bg-surface-elevated text-textPrimary'
              : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
          }`}
          aria-label="Chat options"
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-52 py-1.5 bg-surface-elevated rounded-2xl border border-border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onSavedMessagesPress?.();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-textPrimary hover:bg-surface/80 active:bg-surface transition-colors cursor-pointer text-left"
            >
              <Bookmark className="w-4 h-4 text-textSecondary shrink-0" />
              <span>Saved Messages</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onCreateGroupPress?.();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-textPrimary hover:bg-surface/80 active:bg-surface transition-colors cursor-pointer text-left"
            >
              <Users className="w-4 h-4 text-textSecondary shrink-0" />
              <span>Create Group</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onNewChannelPress?.();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-textPrimary hover:bg-surface/80 active:bg-surface transition-colors cursor-pointer text-left"
            >
              <Radio className="w-4 h-4 text-textSecondary shrink-0" />
              <span>New Channel</span>
            </button>

            <div className="h-px bg-border-subtle my-1" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                onSettingsPress?.();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-textPrimary hover:bg-surface/80 active:bg-surface transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-textSecondary shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
