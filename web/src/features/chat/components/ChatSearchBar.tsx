import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface ChatSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onSubmit,
  isLoading = false,
  placeholder = 'Search chats...',
}) => {
  return (
    <div className="px-4 py-2 bg-background shrink-0">
      <div className="flex items-center gap-2 bg-surface-elevated rounded-full px-3.5 h-10 border border-border-subtle focus-within:border-active transition-colors">
        <Search className="w-4 h-4 text-textTertiary shrink-0" />

        <input
          type="text"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit?.();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none py-0 min-w-0"
        />

        {isLoading ? (
          <Loader2 className="w-4 h-4 text-textTertiary animate-spin shrink-0" />
        ) : value.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 text-textTertiary hover:text-textPrimary rounded-full transition-colors cursor-pointer shrink-0"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ChatSearchBar;
