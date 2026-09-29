import React from 'react';
import { MessageSquare, User, Loader2 } from 'lucide-react';
import { UserSearchResult } from '@/features/chat/types';
import { getInitials } from '@/features/chat/utils/chatUtils';

interface UserSearchResultsProps {
  results: UserSearchResult[];
  isSearching: boolean;
  query: string;
  isCreatingChat?: boolean;
  onSelectUser: (user: UserSearchResult) => void;
}

export const UserSearchResults: React.FC<UserSearchResultsProps> = ({
  results,
  isSearching,
  query,
  isCreatingChat = false,
  onSelectUser,
}) => {
  if (isSearching) {
    return (
      <div className="px-4 py-3 space-y-3 animate-pulse">
        <div className="h-3 bg-surface-elevated rounded w-28 mb-3" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-xl">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <div className="w-10 h-10 rounded-full bg-surface-elevated shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3.5 bg-surface-elevated rounded w-1/3" />
                <div className="h-2.5 bg-surface rounded w-1/4" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface-elevated shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (query.trim().length > 0 && query.trim().length < 2) {
    return (
      <div className="py-8 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-xs text-textTertiary">
          Type at least 2 characters to search students...
        </p>
      </div>
    );
  }

  if (query.trim().length >= 2 && !isSearching && results.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-2 text-textTertiary">
          <User className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-textPrimary">
          No students found matching &quot;{query}&quot;
        </p>
        <p className="text-xs text-textSecondary mt-1">
          Try searching by username, full name, or email.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-textTertiary mb-2">
        Students & Contacts ({results.length})
      </h3>

      <div className="space-y-1">
        {results.map((user) => {
          const displayName =
            user.full_name ||
            user.username ||
            (user.email ? user.email.split('@')[0] : 'Student');
          const displayUsername =
            user.username ||
            (user.email ? user.email.split('@')[0] : 'user');

          return (
            <div
              key={user.id}
              onClick={() => onSelectUser(user)}
              className="flex items-center justify-between p-2.5 rounded-card hover:bg-surface-elevated/70 transition-colors cursor-pointer select-none active:bg-surface-elevated"
            >
              <div className="flex items-center gap-3 min-w-0 mr-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface flex items-center justify-center shrink-0 border border-border-subtle">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-textPrimary">
                      {getInitials(displayName)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-textPrimary truncate">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-textTertiary truncate">
                    <span className="truncate">@{displayUsername}</span>
                    {user.email && (
                      <>
                        <span className="opacity-40">•</span>
                        <span className="truncate text-textSecondary/80">{user.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectUser(user);
              }}
              disabled={isCreatingChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-active/10 text-active hover:bg-active/20 transition-colors text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserSearchResults;
