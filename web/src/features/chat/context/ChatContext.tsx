import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useToast } from '@/context';
import { chatApiService, chatQueryKeys } from '@/features/chat/services/chatApiService';
import { chatWebSocketService } from '@/features/chat/services/chatWebSocketService';
import {
  ChatMessage,
  Conversation,
  MessagesPage,
  WSDeletedPayload,
  WSDeliveredPayload,
  WSReadPayload,
  WSTypingPayload,
} from '@/features/chat/types';

interface ChatContextValue {
  unreadCount: number;
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (conversationId: string | null) => void;
  markConversationRead: (conversationId: string) => void;
  updateConversationPreview: (conversationId: string, preview: string, timestamp: string) => void;
  refetchConversations: () => Promise<any>;
  isLoading: boolean;
  typingUsers: Record<string, string>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { showChatToast } = useToast();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleSetActiveConversationId = useCallback((id: string | null) => {
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
  }, []);

  // 1. Account switch / logout effect
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const newUserId = user?.id ?? null;

    if (prevUserIdRef.current !== newUserId) {
      if (prevUserIdRef.current !== null) {
        queryClient.removeQueries({ queryKey: chatQueryKeys.all });
        chatWebSocketService.disconnect();
      }
      prevUserIdRef.current = newUserId;
    }
  }, [user?.id, queryClient]);

  // 2. Pre-fetch and cache conversations in TanStack Query
  const {
    data: conversations = [],
    isLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: chatQueryKeys.conversations(),
    queryFn: () => chatApiService.getConversations(),
    enabled: isAuthenticated && !isAuthLoading && Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // 3. Global real-time WebSocket subscriptions
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    chatWebSocketService.connect();

    // Listen for incoming messages across the app
    const unsubMsg = chatWebSocketService.on('chat:new_message', (message: ChatMessage) => {
      if (!message?.conversation_id) return;

      const isWindowVisible =
        typeof document !== 'undefined' && document.visibilityState === 'visible';
      const isCurrentChat =
        isWindowVisible &&
        Boolean(activeConversationIdRef.current) &&
        activeConversationIdRef.current === message.conversation_id;

      if (isCurrentChat) {
        chatWebSocketService.sendReadReceipt(message.conversation_id);
        chatApiService.markAsRead(message.conversation_id).catch(() => {});
      } else {
        // Show in-app floating toast if outside active chat
        const conv = conversationsRef.current.find((c) => c.id === message.conversation_id);
        const title =
          message.sender?.full_name ||
          message.sender?.username ||
          conv?.title ||
          conv?.peer?.full_name ||
          conv?.peer?.username ||
          'New Message';
        const avatarUrl =
          message.sender?.avatar_url || conv?.avatar_url || conv?.peer?.avatar_url;
        const preview =
          message.content || (message.media_key ? '📷 Photo' : 'Sent an attachment');

        showChatToast({
          conversationId: message.conversation_id,
          senderName: title,
          message: preview,
          avatarUrl,
        });
      }

      // Append new message to TanStack Query messages cache if active or loaded
      queryClient.setQueryData<MessagesPage>(
        chatQueryKeys.messages(message.conversation_id, 50),
        (old) => {
          if (!old) return { messages: [message], has_more: false };
          if (old.messages.some((m) => m.id === message.id)) return old;

          const isMine =
            message.sender_id === 'me' ||
            (user?.id && message.sender_id === user.id);

          if (isMine) {
            const tempIndex = old.messages.findIndex(
              (m) => m.id.startsWith('temp-') && m.content === message.content
            );
            if (tempIndex !== -1) {
              const updated = [...old.messages];
              updated[tempIndex] = message;
              return { ...old, messages: updated };
            }
          }

          return {
            ...old,
            messages: [...old.messages, message],
          };
        }
      );

      // Update conversations list in TanStack Query
      queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const index = list.findIndex((c) => c.id === message.conversation_id);

        if (index === -1) {
          // If conversation is brand new, trigger a soft refetch
          refetchConversations().catch(() => {});
          return list;
        }

        const target = list[index];
        const preview =
          message.content || (message.media_key ? '📷 Photo' : 'Sent an attachment');
        const updated: Conversation = {
          ...target,
          last_message_preview: preview,
          last_message_at: message.created_at,
          unread_count: isCurrentChat ? 0 : (target.unread_count || 0) + 1,
        };

        const rest = list.filter((_, i) => i !== index);
        return [updated, ...rest];
      });
    });

    // Listen for read receipts
    const unsubRead = chatWebSocketService.on('chat:read', (payload: WSReadPayload) => {
      if (!payload?.conversation_id) return;

      queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((c) =>
          c.id === payload.conversation_id ? { ...c, unread_count: 0 } : c
        );
      });

      // Update message read state
      queryClient.setQueryData<MessagesPage>(
        chatQueryKeys.messages(payload.conversation_id, 50),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.sender_id === user.id && !m.id.startsWith('temp-')
                ? { ...m, is_read: true, is_delivered: true }
                : m
            ),
          };
        }
      );
    });

    // Listen for message delivered
    const unsubDelivered = chatWebSocketService.on(
      'chat:message_delivered',
      (payload: WSDeliveredPayload) => {
        if (!payload?.conversation_id || !payload?.message_id) return;
        queryClient.setQueryData<MessagesPage>(
          chatQueryKeys.messages(payload.conversation_id, 50),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) =>
                m.id === payload.message_id ? { ...m, is_delivered: true } : m
              ),
            };
          }
        );
      }
    );

    // Listen for typing indicators
    const unsubTyping = chatWebSocketService.on('chat:typing', (payload: WSTypingPayload) => {
      if (!payload?.conversation_id) return;
      const convId = payload.conversation_id;

      if (payload.is_typing && payload.username) {
        setTypingUsers((prev) => ({ ...prev, [convId]: payload.username }));

        if (typingTimersRef.current[convId]) {
          clearTimeout(typingTimersRef.current[convId]);
        }
        typingTimersRef.current[convId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[convId];
            return next;
          });
        }, 3000);
      } else {
        if (typingTimersRef.current[convId]) {
          clearTimeout(typingTimersRef.current[convId]);
          delete typingTimersRef.current[convId];
        }
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[convId];
          return next;
        });
      }
    });

    // Listen for edited messages
    const unsubEdited = chatWebSocketService.on('chat:message_edited', (editedMsg: ChatMessage) => {
      if (!editedMsg?.conversation_id || !editedMsg?.id) return;
      queryClient.setQueryData<MessagesPage>(
        chatQueryKeys.messages(editedMsg.conversation_id, 50),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.id === editedMsg.id
                ? { ...m, content: editedMsg.content, edited_at: editedMsg.edited_at }
                : m
            ),
          };
        }
      );
    });

    // Listen for deleted messages
    const unsubDeleted = chatWebSocketService.on(
      'chat:message_deleted',
      (payload: WSDeletedPayload) => {
        if (!payload?.conversation_id || !payload?.message_id) return;
        queryClient.setQueryData<MessagesPage>(
          chatQueryKeys.messages(payload.conversation_id, 50),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.filter((m) => m.id !== payload.message_id),
            };
          }
        );
      }
    );

    return () => {
      unsubMsg();
      unsubRead();
      unsubDelivered();
      unsubTyping();
      unsubEdited();
      unsubDeleted();
    };
  }, [isAuthenticated, user?.id, queryClient, refetchConversations, showChatToast]);

  const markConversationRead = useCallback(
    (conversationId: string) => {
      chatApiService.markAsRead(conversationId).catch(() => {});
      chatWebSocketService.sendReadReceipt(conversationId);
      queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c));
      });
    },
    [queryClient]
  );

  const updateConversationPreview = useCallback(
    (conversationId: string, preview: string, timestamp: string) => {
      queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const index = list.findIndex((c) => c.id === conversationId);
        if (index === -1) return list;

        const target = list[index];
        const updated: Conversation = {
          ...target,
          last_message_preview: preview,
          last_message_at: timestamp,
        };

        const rest = list.filter((_, i) => i !== index);
        return [updated, ...rest];
      });
    },
    [queryClient]
  );

  const unreadCount = useMemo(() => {
    if (!Array.isArray(conversations)) return 0;
    return conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  }, [conversations]);

  const value = useMemo(
    () => ({
      unreadCount,
      conversations,
      activeConversationId,
      setActiveConversationId: handleSetActiveConversationId,
      markConversationRead,
      updateConversationPreview,
      refetchConversations,
      isLoading,
      typingUsers,
    }),
    [
      unreadCount,
      conversations,
      activeConversationId,
      handleSetActiveConversationId,
      markConversationRead,
      updateConversationPreview,
      refetchConversations,
      isLoading,
      typingUsers,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

export function useChatUnread(): ChatContextValue {
  return useChat();
}

export default ChatProvider;
