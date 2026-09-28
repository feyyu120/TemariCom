import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface ResearchSearchBarProps {
  initialValue?: string;
  isLoading?: boolean;
  onSearch: (query: string) => void;
}

export const ResearchSearchBar: React.FC<ResearchSearchBarProps> = ({
  initialValue = '',
  isLoading = false,
  onSearch,
}) => {
  const [inputValue, setInputValue] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleClear = () => {
    setInputValue('');
  };

  return (
    <div className="w-full">
      {/* Form with explicit submit button (prevents live search API costs) */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="absolute left-3.5 w-4 h-4 text-textTertiary pointer-events-none shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search papers by topic, title, or arXiv ID..."
            className="w-full pl-10 pr-9 py-2.5 bg-surface border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[14px] placeholder:text-textTertiary outline-none transition-colors"
          />
          {inputValue.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 p-1 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-3.5 sm:px-5 py-2.5 rounded-card bg-active text-activeText font-semibold text-[14px] hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-activeText/30 border-t-activeText rounded-full animate-spin" />
              <span className="hidden sm:inline">Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
