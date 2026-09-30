import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Phone,
  MoreVertical,
  Smile,
  Paperclip,
  Camera,
  Send,
  Check,
  CheckCheck,
  Clock,
  Mic,
  X,
  CornerUpRight,
  Reply,
  Loader2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useToast } from '@/context';
import { chatApiService, chatQueryKeys } from '@/features/chat/services/chatApiService';
import { chatWebSocketService } from '@/features/chat/services/chatWebSocketService';
import { ChatMessage, Conversation, MessagesPage } from '@/features/chat/types';
import {
  formatMessageTime,
  formatLastSeen,
  getInitials,
} from '@/features/chat/utils/chatUtils';
import { MessageActionModal } from '@/features/chat/components/MessageActionModal';

interface DirectChatViewProps {
  conversation: Conversation | null;
  onBack?: () => void;
  onConversationRead?: (conversationId: string) => void;
  onMessageSent?: (conversationId: string, preview: string, timestamp: string) => void;
  onForwardMessage?: (message: ChatMessage) => void;
  initialForwardMessage?: ChatMessage | null;
  onClearInitialForward?: () => void;
}

export const DirectChatView: React.FC<DirectChatViewProps> = ({
  conversation,
  onBack,
  onConversationRead,
  onMessageSent,
  onForwardMessage,
  initialForwardMessage,
  onClearInitialForward,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);

  // Message Actions state
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [forwardedMessage, setForwardedMessage] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Delete modal state
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationId = conversation?.id;

  const isMyMessage = useCallback(
    (msg: ChatMessage | null | undefined): boolean => {
      if (!msg) return false;
      if (msg.sender_id === 'me') return true;
      if (currentUser?.id && msg.sender_id === currentUser.id) return true;
      return false;
    },
    [currentUser?.id]
  );

  const messagesQueryKey = conversationId
    ? chatQueryKeys.messages(conversationId, 50)
    : (['chat', 'messages', 'disabled'] as const);

  const isTempConversation = Boolean(conversationId && conversationId.startsWith('temp-'));

  // Messages Query
  const messagesQuery = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () => chatApiService.getMessages(conversationId!, 50),
    enabled: Boolean(conversationId) && !isTempConversation,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const messages: ChatMessage[] = useMemo(() => {
    const raw = messagesQuery.data?.messages || [];
    const seen = new Set<string>();
    const unique: ChatMessage[] = [];
    for (const m of raw) {
      if (m && m.id && !seen.has(m.id)) {
        seen.add(m.id);
        unique.push(m);
      }
    }
    // Sort oldest first for natural bottom-up reading
    // Any optimistic/pending message MUST stay at the very end (newest)
    return unique.sort((a, b) => {
      const aPending = a.status === 'pending' || a.id?.startsWith('temp-');
      const bPending = b.status === 'pending' || b.id?.startsWith('temp-');

      if (aPending && !bPending) return 1;
      if (!aPending && bPending) return -1;

      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (isNaN(timeA) || isNaN(timeB)) return 0;
      return timeA - timeB;
    });
  }, [messagesQuery.data?.messages]);

  // Handle initial forwarded message attachment
  useEffect(() => {
    if (initialForwardMessage) {
      setForwardedMessage(initialForwardMessage);
    }
  }, [initialForwardMessage]);

  // Auto-scroll to bottom on messages load
  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  // Mark as read once if unread and window is active/visible
  const readSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId || isTempConversation) {
      readSentRef.current = null;
      setInputText('');
      setReplyingTo(null);
      setEditingMessage(null);
      setForwardedMessage(null);
      return;
    }

    const checkAndMarkRead = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const unread = conversation?.unread_count ?? 0;
        if (unread > 0 && readSentRef.current !== conversationId) {
          readSentRef.current = conversationId;
          onConversationRead?.(conversationId);
        }
      }
    };

    checkAndMarkRead();

    const handleFocusOrVisible = () => {
      checkAndMarkRead();
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [conversationId, conversation?.unread_count, isTempConversation, onConversationRead]);

  // Typing event listener for active chat
  useEffect(() => {
    if (!conversationId) return;

    let clearTypingTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubTyping = chatWebSocketService.on('chat:typing', (payload: any) => {
      if (payload?.conversation_id === conversationId) {
        const isTyping = Boolean(payload.is_typing);
        setIsPeerTyping(isTyping);

        if (clearTypingTimer) {
          clearTimeout(clearTypingTimer);
          clearTypingTimer = null;
        }

        // Auto-clear typing indicator if stop event is delayed/dropped
        if (isTyping) {
          clearTypingTimer = setTimeout(() => {
            setIsPeerTyping(false);
          }, 3500);
        }
      }
    });

    return () => {
      unsubTyping();
      if (clearTypingTimer) {
        clearTimeout(clearTypingTimer);
      }
      setIsPeerTyping(false);
    };
  }, [conversationId]);

  // Clean up typing state on conversation change or unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (conversationId) {
        chatWebSocketService.sendTyping(conversationId, false);
      }
    };
  }, [conversationId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (!conversationId) return;

    if (text.trim().length > 0) {
      chatWebSocketService.sendTyping(conversationId, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        chatWebSocketService.sendTyping(conversationId, false);
      }, 2000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      chatWebSocketService.sendTyping(conversationId, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleSaveEdit();
      } else {
        handleSendMessage();
      }
    }
  };

  // Jump to quoted replied message
  const handleJumpToMessage = (targetMsgId?: string) => {
    if (!targetMsgId) return;
    const el = document.getElementById(`msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetMsgId);
      setTimeout(() => setHighlightedMessageId(null), 1600);
    }
  };

  // Action Menu Handlers
  const handleOpenActionMenu = (
    e: React.MouseEvent,
    msg: ChatMessage
  ) => {
    e.preventDefault();
    setActionMessage(msg);
    setActionMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleReply = (msg: ChatMessage) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleCopy = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      showToast({
        title: 'Copied',
        message: 'Message copied to clipboard',
        type: 'info',
        durationMs: 2500,
      });
    } catch {
      // fallback
    }
  };

  const handleForward = (msg: ChatMessage) => {
    if (onForwardMessage) {
      onForwardMessage(msg);
    }
  };

  const handleEdit = (msg: ChatMessage) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setInputText(msg.content);
    inputRef.current?.focus();
  };

  const handleDeletePrompt = (msg: ChatMessage) => {
    setMessageToDelete(msg);
  };

  const confirmDelete = async (scope: 'me' | 'everyone') => {
    if (!messageToDelete || !conversationId) return;
    const msg = messageToDelete;
    setMessageToDelete(null);

    // Optimistic UI removal
    queryClient.setQueryData<MessagesPage>(messagesQueryKey, (old) => {
      if (!old) return old;
      return { ...old, messages: old.messages.filter((m) => m.id !== msg.id) };
    });

    try {
      await chatApiService.deleteMessage(conversationId, msg.id, scope);
      showToast({
        title: 'Deleted',
        message: scope === 'everyone' ? 'Message deleted for everyone' : 'Message removed',
        type: 'info',
        durationMs: 2500,
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !conversationId) return;
    const newContent = inputText.trim();
    if (!newContent || newContent === editingMessage.content) {
      setEditingMessage(null);
      setInputText('');
      return;
    }

    const msgId = editingMessage.id;
    setEditingMessage(null);
    setInputText('');

    // Optimistic update
    queryClient.setQueryData<MessagesPage>(messagesQueryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.map((m) =>
          m.id === msgId
            ? { ...m, content: newContent, edited_at: new Date().toISOString() }
            : m
        ),
      };
    });

    try {
      await chatApiService.editMessage(conversationId, msgId, newContent);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if ((!text && !forwardedMessage) || !conversationId || isSending || isTempConversation) return;

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const currentReply = replyingTo;
    const currentForward = forwardedMessage;

    const forwardOrigContent =
      currentForward?.forwarded_from_content || currentForward?.content || '';
    const forwardSenderName =
      currentForward?.forwarded_from_name ||
      currentForward?.sender?.full_name ||
      currentForward?.sender?.username ||
      'User';

    const messageContent = text || forwardOrigContent;
    const isForward = Boolean(currentForward);

    // 1. Optimistic Message creation
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser?.id || 'me',
      sender: {
        id: currentUser?.id || 'me',
        username: currentUser?.username || 'me',
        full_name: currentUser?.full_name || currentUser?.username || 'Me',
        avatar_url: currentUser?.avatar_url || '',
      },
      content: messageContent,
      message_type: 'text',
      reply_to_id: currentReply?.id,
      reply_to_content: currentReply?.content,
      reply_to_sender_name:
        currentReply?.sender?.full_name || currentReply?.sender?.username || 'User',
      forwarded_from_message_id: isForward ? currentForward?.id : undefined,
      forwarded_from_content: isForward ? forwardOrigContent : undefined,
      forwarded_from_name: isForward ? forwardSenderName : undefined,
      is_delivered: false,
      is_read: false,
      status: 'pending',
      created_at: now,
    };

    // Reset input state immediately
    setInputText('');
    setReplyingTo(null);
    setForwardedMessage(null);
    onClearInitialForward?.();
    setIsSending(true);

    // Stop typing state immediately on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    chatWebSocketService.sendTyping(conversationId, false);

    // Optimistically update TanStack Query cache
    queryClient.setQueryData<MessagesPage>(messagesQueryKey, (old) => {
      if (!old) return { messages: [optimisticMsg], has_more: false };
      return {
        ...old,
        messages: [...old.messages, optimisticMsg],
      };
    });

    onMessageSent?.(conversationId, messageContent, now);
    scrollToBottom(true);

    try {
      const serverMsg = await chatApiService.sendMessage(
        conversationId,
        messageContent,
        'text',
        {
          reply_to_id: currentReply?.id,
          reply_to_content: currentReply?.content,
          reply_to_sender_name: optimisticMsg.reply_to_sender_name,
          forwarded_from_message_id: isForward ? currentForward?.id : undefined,
          forwarded_from_content: isForward ? forwardOrigContent : undefined,
          forwarded_from_name: isForward ? forwardSenderName : undefined,
        }
      );

      if (serverMsg && serverMsg.id) {
        // Guaranteed replacement in query cache
        queryClient.setQueryData<MessagesPage>(messagesQueryKey, (old) => {
          if (!old) return { messages: [serverMsg], has_more: false };
          return {
            ...old,
            messages: old.messages.map((m) => (m.id === tempId ? serverMsg : m)),
          };
        });

        onMessageSent?.(conversationId, messageContent, serverMsg.created_at);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      queryClient.setQueryData<MessagesPage>(messagesQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) =>
            m.id === tempId ? { ...m, status: 'error' } : m
          ),
        };
      });
      showToast({
        title: 'Message Not Sent',
        message: err?.message || 'Failed to send message. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadOlder = useCallback(async () => {
    if (isLoadingOlder || !conversationId || messages.length === 0) return;
    if (messagesQuery.data?.has_more === false) return;
    const oldest = messages[0];
    if (!oldest?.created_at) return;

    setIsLoadingOlder(true);
    try {
      const olderPage = await chatApiService.getMessages(conversationId, 30, oldest.created_at);
      if (olderPage.messages.length > 0) {
        queryClient.setQueryData<MessagesPage>(messagesQueryKey, (old) => {
          if (!old) return olderPage;
          const existingIds = new Set(old.messages.map((m) => m.id));
          const newOlder = olderPage.messages.filter((m) => !existingIds.has(m.id));
          return {
            ...old,
            messages: [...newOlder, ...old.messages],
            has_more: olderPage.has_more,
          };
        });
      }
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, conversationId, messages, messagesQuery.data?.has_more, messagesQueryKey, queryClient]);

  if (!conversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-background select-none">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 text-textTertiary border border-border-subtle">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-textPrimary mb-1">
          Select a conversation
        </h2>
        <p className="text-xs text-textSecondary max-w-sm">
          Choose a chat from the sidebar or search for any student by username to begin messaging in real time.
        </p>
      </div>
    );
  }

  const title =
    conversation.peer?.full_name ||
    conversation.title ||
    conversation.peer?.username ||
    'Chat';
  const avatarUrl = conversation.peer?.avatar_url || conversation.avatar_url;
  const isOnline = conversation.peer?.is_online;

  return (
    <div className="flex-1 h-full max-h-full flex flex-col min-w-0 bg-background overflow-hidden relative overscroll-none">
      {/* 1. Bespoke Direct Chat Header */}
      <header className="h-[54px] shrink-0 border-b border-border-subtle px-4 flex items-center justify-between bg-background/95 backdrop-blur-md z-10 select-none">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-1.5 -ml-1 text-textSecondary hover:text-textPrimary rounded-full hover:bg-surface transition-colors cursor-pointer"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Avatar with Online indicator */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-surface flex items-center justify-center border border-border-subtle">
              {avatarUrl ? (
                <img src={avatarUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-textPrimary">
                  {getInitials(title)}
                </span>
              )}
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
            )}
          </div>

          {/* Title & Status */}
          <div className="min-w-0 flex flex-col justify-center gap-0.5">
            <h2 className="text-sm font-bold text-textPrimary truncate leading-snug">
              {title}
            </h2>
            <p className="text-[11px] truncate leading-tight">
              {isPeerTyping ? (
                <span className="text-emerald-500 font-semibold animate-pulse">Typing...</span>
              ) : isOnline ? (
                <span className="text-emerald-500 font-medium">Active now</span>
              ) : (
                <span className="text-textTertiary">
                  {formatLastSeen(conversation.peer?.last_seen_at || conversation.last_message_at, isOnline)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Call student"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Messages Thread List */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-background/50 select-text touch-pan-y"
      >
        {messagesQuery.data?.has_more && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
              className="text-xs text-textTertiary hover:text-textPrimary transition-colors py-1 px-3 rounded-full bg-surface border border-border-subtle cursor-pointer flex items-center gap-1.5"
            >
              {isLoadingOlder && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Load older messages</span>
            </button>
          </div>
        )}

        {(messagesQuery.isLoading || isTempConversation) && messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-end space-y-4 p-4 animate-pulse">
            {/* Bubble 1: Incoming */}
            <div className="flex items-start gap-2.5 max-w-[70%]">
              <div className="w-8 h-8 rounded-full bg-surface-elevated shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-9 bg-surface-elevated rounded-2xl rounded-tl-xs w-48" />
              </div>
            </div>

            {/* Bubble 2: Outgoing */}
            <div className="flex flex-col items-end self-end max-w-[70%]">
              <div className="h-14 bg-surface-elevated/80 rounded-2xl rounded-tr-xs w-60" />
            </div>

            {/* Bubble 3: Incoming */}
            <div className="flex items-start gap-2.5 max-w-[70%]">
              <div className="w-8 h-8 rounded-full bg-surface-elevated shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-16 bg-surface-elevated rounded-2xl rounded-tl-xs w-68" />
                <div className="h-2.5 bg-surface rounded w-16" />
              </div>
            </div>

            {/* Bubble 4: Outgoing */}
            <div className="flex flex-col items-end self-end max-w-[70%]">
              <div className="h-10 bg-surface-elevated/80 rounded-2xl rounded-tr-xs w-44" />
              <div className="h-2 bg-surface rounded w-12 mt-1 mr-1" />
            </div>

            {/* Bubble 5: Incoming */}
            <div className="flex items-start gap-2.5 max-w-[70%]">
              <div className="w-8 h-8 rounded-full bg-surface-elevated shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-10 bg-surface-elevated rounded-2xl rounded-tl-xs w-52" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-3 text-textTertiary">
              <Users className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-textPrimary">
              Say hello to {title}!
            </p>
            <p className="text-xs text-textSecondary mt-1">
              Send a message to start this real-time conversation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full space-y-3">
            {messages.map((item) => {
            const isMine = isMyMessage(item);
            const isPending = item.id.startsWith('temp-');
            const isHighlighted = highlightedMessageId === item.id;

            const hasForwardHeader = Boolean(
              item.forwarded_from_name || item.forwarded_from_message_id
            );
            const hasReplyCard = Boolean(item.reply_to_content || item.reply_to_id);

            return (
              <div
                key={item.id}
                id={`msg-${item.id}`}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group transition-all duration-200`}
              >
                <div
                  onContextMenu={(e) => handleOpenActionMenu(e, item)}
                  onClick={(e) => {
                    if (window.innerWidth <= 768) {
                      handleOpenActionMenu(e, item);
                    }
                  }}
                  className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2.5 rounded-2xl cursor-pointer relative shadow-xs transition-all ${
                    isMine
                      ? 'bg-active text-active-text rounded-br-xs'
                      : 'bg-surface-elevated text-textPrimary border border-border-subtle rounded-bl-xs'
                  } ${
                    isHighlighted ? 'ring-2 ring-active ring-offset-2' : ''
                  }`}
                >
                  {/* Forwarded Header */}
                  {hasForwardHeader && (
                    <div className="flex items-center gap-1 text-[11px] font-medium opacity-80 mb-1">
                      <CornerUpRight className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        Forwarded from {item.forwarded_from_name || 'User'}
                      </span>
                    </div>
                  )}

                  {/* Replied Message Quote Block */}
                  {hasReplyCard && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.reply_to_id) {
                          handleJumpToMessage(item.reply_to_id);
                        }
                      }}
                      className={`p-2 rounded-card mb-1.5 border-l-3 text-xs cursor-pointer select-none ${
                        isMine
                          ? 'bg-black/20 border-white/80'
                          : 'bg-surface border-active'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-bold mb-0.5">
                        <span className="truncate">
                          {item.reply_to_sender_name || 'Replied Message'}
                        </span>
                        <Reply className="w-3 h-3 opacity-75 shrink-0" />
                      </div>
                      <p className="line-clamp-2 opacity-85 text-[11px]">
                        {item.reply_to_content}
                      </p>
                    </div>
                  )}

                  {/* Message Content */}
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {item.content}
                  </p>

                  {/* Meta: Time, Edited, Markers */}
                  <div
                    className={`flex items-center gap-1.5 text-[10px] mt-1 opacity-70 ${
                      isMine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {item.edited_at && <span>edited</span>}
                    <span>{formatMessageTime(item.created_at)}</span>

                    {isMine && (
                      <span className="shrink-0">
                        {item.status === 'error' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-danger" />
                        ) : isPending ? (
                          <Clock className="w-3 h-3 animate-spin" />
                        ) : item.is_read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                        ) : item.is_delivered ? (
                          <CheckCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* 3. Action Banners: Replying / Editing / Forwarding */}
      {editingMessage ? (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-surface-elevated border-t border-border-subtle border-l-4 border-l-active">
          <div className="min-w-0 mr-2">
            <span className="text-xs font-bold text-active block">Edit Message</span>
            <span className="text-xs text-textSecondary truncate block">
              {editingMessage.content}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="p-1 text-textTertiary hover:text-textPrimary rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : replyingTo ? (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-surface-elevated border-t border-border-subtle border-l-4 border-l-active">
          <div className="min-w-0 mr-2">
            <span className="text-xs font-bold text-active block">
              Replying to{' '}
              {replyingTo.sender?.full_name ||
                replyingTo.sender?.username ||
                (replyingTo.sender_id === (currentUser?.id || 'me') ? 'Yourself' : title)}
            </span>
            <span className="text-xs text-textSecondary truncate block">
              {replyingTo.content}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 text-textTertiary hover:text-textPrimary rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : forwardedMessage ? (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-surface-elevated border-t border-border-subtle border-l-4 border-l-active">
          <div className="min-w-0 mr-2">
            <span className="text-xs font-bold text-active block">
              Forwarded from{' '}
              {forwardedMessage.sender?.full_name || forwardedMessage.sender?.username || 'User'}
            </span>
            <span className="text-xs text-textSecondary truncate block">
              {forwardedMessage.content}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setForwardedMessage(null);
              onClearInitialForward?.();
            }}
            className="p-1 text-textTertiary hover:text-textPrimary rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {/* 4. WhatsApp / Telegram Style Bottom Input Bar */}
      <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border-subtle bg-background flex items-end gap-2">
        <div className="flex-1 flex items-center gap-1.5 bg-surface-elevated border border-border-subtle rounded-2xl px-3 py-1.5 focus-within:border-active transition-colors">
          <button
            type="button"
            className="p-1.5 text-textTertiary hover:text-textPrimary rounded-full hover:bg-surface transition-colors cursor-pointer shrink-0"
            aria-label="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? 'Edit message...'
                : forwardedMessage
                ? 'Add a caption (or send directly)...'
                : 'Message'
            }
            className="flex-1 bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none resize-none max-h-32 py-1 leading-snug"
          />

          <button
            type="button"
            className="p-1.5 text-textTertiary hover:text-textPrimary rounded-full hover:bg-surface transition-colors cursor-pointer shrink-0"
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="p-1.5 text-textTertiary hover:text-textPrimary rounded-full hover:bg-surface transition-colors cursor-pointer shrink-0"
            aria-label="Take photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Send / Confirm / Mic Action Button */}
        <button
          type="button"
          onClick={
            editingMessage
              ? handleSaveEdit
              : inputText.trim() || forwardedMessage
              ? handleSendMessage
              : undefined
          }
          className="w-10 h-10 rounded-full bg-active text-active-text flex items-center justify-center shrink-0 shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          aria-label={editingMessage ? 'Save edit' : 'Send message'}
        >
          {editingMessage ? (
            <Check className="w-5 h-5" />
          ) : inputText.trim() || forwardedMessage ? (
            <Send className="w-4 h-4 ml-0.5" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Message Action Menu Modal */}
      <MessageActionModal
        isOpen={Boolean(actionMessage)}
        message={actionMessage}
        isMine={isMyMessage(actionMessage)}
        position={actionMenuPos}
        onClose={() => {
          setActionMessage(null);
          setActionMenuPos(null);
        }}
        onReply={handleReply}
        onCopy={handleCopy}
        onForward={handleForward}
        onEdit={handleEdit}
        onDelete={handleDeletePrompt}
      />

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-elevated border border-border rounded-large p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-textPrimary">Delete Message</h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              {isMyMessage(messageToDelete)
                ? 'Who do you want to delete this message for?'
                : 'This will hide the message for you.'}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {isMyMessage(messageToDelete) && (
                <button
                  type="button"
                  onClick={() => confirmDelete('everyone')}
                  className="w-full py-2 px-3 rounded-card text-xs font-semibold bg-danger text-white hover:bg-danger/90 transition-colors cursor-pointer"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                type="button"
                onClick={() => confirmDelete('me')}
                className="w-full py-2 px-3 rounded-card text-xs font-semibold bg-surface border border-border text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                Delete for Me
              </button>
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="w-full py-1.5 text-xs text-textTertiary hover:text-textPrimary transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectChatView;
