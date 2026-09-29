import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApiService, chatQueryKeys } from '@/features/chat/services/chatApiService';
import { Conversation, UserSearchResult } from '@/features/chat/types';

export function useUserSearch() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isCreatingChat, setIsCreatingChat] = useState<boolean>(false);

  // Debounce search input by 1600ms (above 1.5s) to avoid unnecessary requests while typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 1600);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Clean and validate search term
  const normalizedQuery = useMemo(() => {
    return debouncedQuery.replace(/^@/, '').trim();
  }, [debouncedQuery]);

  const shouldFetch = normalizedQuery.length >= 2;

  // Optimized TanStack Query with caching
  const { data: results = [], isFetching } = useQuery({
    queryKey: chatQueryKeys.userSearch(normalizedQuery),
    queryFn: () => chatApiService.searchUsers(normalizedQuery),
    enabled: shouldFetch,
    staleTime: 60 * 1000, // 1 minute cache
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const flushSearch = useCallback(() => {
    setDebouncedQuery(query.trim());
  }, [query]);

  const createOrOpenChat = useCallback(
    async (targetUserId: string): Promise<Conversation | null> => {
      setIsCreatingChat(true);
      try {
        const conv = await chatApiService.createDirectConversation(targetUserId);
        if (conv && conv.id) {
          // Pre-populate / update TanStack Query cache with new conversation
          queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const exists = list.some((c) => c.id === conv.id);
            if (exists) {
              return list.map((c) => (c.id === conv.id ? { ...c, ...conv } : c));
            }
            return [conv, ...list];
          });
          return conv;
        }
        return null;
      } catch (err) {
        console.error('Failed to create or open conversation:', err);
        return null;
      } finally {
        setIsCreatingChat(false);
      }
    },
    [queryClient]
  );

    const isDebouncing = query.trim().length >= 2 && query.trim() !== debouncedQuery;

  return {
    query,
    setQuery,
    debouncedQuery,
    results: shouldFetch ? results : [],
    isSearching: isFetching || isDebouncing,
    isCreatingChat,
    clearSearch,
    flushSearch,
    createOrOpenChat,
  };
}

export default useUserSearch;
