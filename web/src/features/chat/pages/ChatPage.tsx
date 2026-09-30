import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';
import { MobileBottomNav } from '@/features/home/components/MobileBottomNav';
import {
  ChatHeader,
  StoriesCarousel,
  ChatSearchBar,
  ConversationItem,
  UserSearchResults,
  DirectChatView,
} from '@/features/chat/components';
import { useChat } from '@/features/chat/context/ChatContext';
import { useUserSearch } from '@/features/chat/hooks/useUserSearch';
import { chatApiService, chatQueryKeys } from '@/features/chat/services/chatApiService';
import { ChatMessage, Conversation, UserSearchResult } from '@/features/chat/types';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context';
import { useAuth } from '@/features/auth';
import { MessageSquare, Users, LogIn, ArrowLeft } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading, openAuthModal } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Auto-open sign in modal if unauthenticated when viewing chat
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      openAuthModal('login');
    }
  }, [isAuthLoading, isAuthenticated, openAuthModal]);

  const {
    conversations,
    isLoading,
    unreadCount,
    setActiveConversationId,
    markConversationRead,
    updateConversationPreview,
    typingUsers,
  } = useChat();

  const {
    query,
    setQuery,
    results,
    isSearching,
    isCreatingChat,
    clearSearch,
    flushSearch,
    createOrOpenChat,
  } = useUserSearch();

  // Forwarding state
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);

  // Selected conversation state
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Desktop Sidebar Width & Resizing
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('temaricom_chat_sidebar_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 280 && val <= 650) return val;
      }
    }
    return 360;
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const maxWidth = Math.min(650, window.innerWidth * 0.55);
        const newWidth = Math.min(Math.max(280, startWidth + deltaX), maxWidth);
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setSidebarWidth((finalW) => {
          try {
            localStorage.setItem('temaricom_chat_sidebar_width', finalW.toString());
          } catch {}
          return finalW;
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [sidebarWidth]
  );

  const handleResetSidebarWidth = useCallback(() => {
    setSidebarWidth(360);
    try {
      localStorage.setItem('temaricom_chat_sidebar_width', '360');
    } catch {}
  }, []);

  const handleOpenConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation({ ...conv, unread_count: 0 });
      setActiveConversationId(conv.id);
      setSearchParams({ conversationId: conv.id }, { replace: true });
      if ((conv.unread_count || 0) > 0) {
        markConversationRead(conv.id);
      }
    },
    [setActiveConversationId, setSearchParams, markConversationRead]
  );

  const handleBackToList = useCallback(() => {
    setSelectedConversation(null);
    setActiveConversationId(null);
    setSearchParams({}, { replace: true });
  }, [setActiveConversationId, setSearchParams]);

  const handleDeleteConversation = useCallback(
    async (conv: Conversation) => {
      try {
        await chatApiService.deleteConversation(conv.id);
        queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (old) => {
          if (!old) return old;
          return old.filter((c) => c.id !== conv.id);
        });
        if (selectedConversation?.id === conv.id) {
          handleBackToList();
        }
        showToast({
          title: 'Conversation Deleted',
          message: 'The chat has been cleared and removed.',
          type: 'info',
        });
      } catch (err: any) {
        showToast({
          title: 'Delete Failed',
          message: err?.message || 'Failed to delete conversation',
          type: 'error',
        });
      }
    },
    [selectedConversation?.id, handleBackToList, queryClient, showToast]
  );

  const handleToggleBlock = useCallback(
    async (conv: Conversation) => {
      const peerId = conv.peer?.id;
      if (!peerId) return;
      const isBlocked = Boolean(conv.is_blocked || conv.peer?.is_blocked);
      try {
        if (isBlocked) {
          await chatApiService.unblockUser(peerId);
          showToast({
            title: 'User Unblocked',
            message: `${conv.peer?.full_name || conv.peer?.username || 'User'} has been unblocked.`,
            type: 'success',
          });
        } else {
          await chatApiService.blockUser(peerId);
          showToast({
            title: 'User Blocked',
            message: `${conv.peer?.full_name || conv.peer?.username || 'User'} has been blocked.`,
            type: 'info',
          });
        }

        queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (old) => {
          if (!old) return old;
          return old.map((c) => {
            if (c.id === conv.id || c.peer?.id === peerId) {
              return {
                ...c,
                is_blocked: !isBlocked,
                peer: c.peer ? { ...c.peer, is_blocked: !isBlocked } : undefined,
              };
            }
            return c;
          });
        });
      } catch (err: any) {
        showToast({
          title: 'Action Failed',
          message: err?.message || 'Failed to update block status',
          type: 'error',
        });
      }
    },
    [queryClient, showToast]
  );

  // Clear active conversation on unmount so background notifications/badges function correctly
  useEffect(() => {
    return () => {
      setActiveConversationId(null);
    };
  }, [setActiveConversationId]);

  // Check URL search params for auto-opening a conversation:
  // 1. ?conversationId=... or ?openId=... (existing conversation)
  // 2. ?userId=... (start or open direct chat with a user, e.g. from Lost & Found)
  const openIdFromUrl = searchParams.get('conversationId') || searchParams.get('openId');
  const targetUserIdFromUrl = searchParams.get('userId');
  const targetUserNameFromUrl = searchParams.get('name');
  const targetUserAvatarFromUrl = searchParams.get('avatar');

  const openedUrlIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !openIdFromUrl) return;
    if (openedUrlIdRef.current === openIdFromUrl) return;

    if (conversations.length > 0) {
      const target = conversations.find((c) => c.id === openIdFromUrl);
      if (target) {
        openedUrlIdRef.current = openIdFromUrl;
        setSelectedConversation(target);
        setActiveConversationId(target.id);
        if (target.unread_count > 0) {
          markConversationRead(target.id);
        }
      }
    }
  }, [openIdFromUrl, conversations, isAuthenticated, setActiveConversationId, markConversationRead]);

  // Handle direct message redirection (e.g. from Lost & Found DM click)
  useEffect(() => {
    if (!targetUserIdFromUrl || !isAuthenticated) return;

    // 1. Check if conversation already exists in memory
    const existing = conversations.find(
      (c) => c.peer?.id === targetUserIdFromUrl
    );
    if (existing) {
      handleOpenConversation(existing);
      return;
    }

    // 2. Instantly open an optimistic conversation (0ms perceived latency)
    const tempId = `temp-conv-${targetUserIdFromUrl}`;
    const optimisticConv: Conversation = {
      id: tempId,
      type: 'direct',
      title: targetUserNameFromUrl || 'Student',
      avatar_url: targetUserAvatarFromUrl || '',
      last_message_preview: '',
      is_muted: false,
      is_pinned: false,
      peer: {
        id: targetUserIdFromUrl,
        username: targetUserNameFromUrl || 'Student',
        full_name: targetUserNameFromUrl || 'Student',
        avatar_url: targetUserAvatarFromUrl || '',
        is_online: false,
      },
      unread_count: 0,
    };
    handleOpenConversation(optimisticConv);

    // 3. Resolve real conversation on backend in background
    let isCancelled = false;
    createOrOpenChat(targetUserIdFromUrl)
      .then((conv) => {
        if (isCancelled) return;
        if (conv && conv.id) {
          setSelectedConversation((curr) => {
            if (!curr) return null;
            if (curr.id === tempId || curr.peer?.id === targetUserIdFromUrl) {
              return conv;
            }
            return curr;
          });
          setActiveConversationId(conv.id);
          setSearchParams({ conversationId: conv.id }, { replace: true });

          queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (list.some((c) => c.id === conv.id)) return list;
            return [conv, ...list];
          });
        }
      })
      .catch((err: any) => {
        if (isCancelled) return;
        showToast({
          title: 'Chat Error',
          message: err?.message || 'Failed to start conversation.',
          type: 'error',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [
    targetUserIdFromUrl,
    targetUserNameFromUrl,
    targetUserAvatarFromUrl,
    conversations,
    createOrOpenChat,
    handleOpenConversation,
    setActiveConversationId,
    setSearchParams,
    showToast,
  ]);

  // Keep selectedConversation in sync with conversations updates
  useEffect(() => {
    if (selectedConversation?.id && !selectedConversation.id.startsWith('temp-')) {
      const updated = conversations.find((c) => c.id === selectedConversation.id);
      if (
        updated &&
        (updated.unread_count !== selectedConversation.unread_count ||
          updated.last_message_at !== selectedConversation.last_message_at)
      ) {
        setSelectedConversation((prev) => (prev ? { ...prev, ...updated } : null));
      }
    }
  }, [conversations, selectedConversation?.id]);

  const handleSelectSearchedUser = useCallback(
    (user: UserSearchResult) => {
      // 1. Check if conversation already exists in memory
      const existing = conversations.find(
        (c) =>
          c.peer?.id === user.id ||
          (c.peer?.username &&
            user.username &&
            c.peer.username.toLowerCase() === user.username.toLowerCase()) ||
          (c.peer?.email &&
            user.email &&
            c.peer.email.toLowerCase() === user.email.toLowerCase())
      );
      if (existing) {
        clearSearch();
        handleOpenConversation(existing);
        return;
      }

      // 2. Instantly open an optimistic conversation (0ms perceived latency)
      const tempId = `temp-conv-${user.id}`;
      const optimisticConv: Conversation = {
        id: tempId,
        type: 'direct',
        title: user.full_name || user.username,
        avatar_url: user.avatar_url,
        last_message_preview: '',
        is_muted: false,
        is_pinned: false,
        peer: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          is_online: false,
        },
        unread_count: 0,
      };

      clearSearch();
      handleOpenConversation(optimisticConv);

      // 3. Resolve real conversation on backend in background
      createOrOpenChat(user.id)
        .then((realConv) => {
          if (realConv && realConv.id) {
            setSelectedConversation((curr) => {
              if (!curr) return null;
              if (curr.id === tempId || curr.peer?.id === user.id) {
                return realConv;
              }
              return curr;
            });
            setActiveConversationId(realConv.id);
            setSearchParams({ conversationId: realConv.id }, { replace: true });

            queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
              const list = Array.isArray(prev) ? prev : [];
              if (list.some((c) => c.id === realConv.id)) return list;
              return [realConv, ...list];
            });
          }
        })
        .catch((err: any) => {
          console.warn('[ChatPage] createOrOpenChat error:', err);
          showToast({
            title: 'Chat Error',
            message: err?.message || 'Failed to start conversation.',
            type: 'error',
          });
        });
    },
    [
      conversations,
      createOrOpenChat,
      clearSearch,
      handleOpenConversation,
      setActiveConversationId,
      setSearchParams,
      showToast,
    ]
  );

  // Client-side filtering of conversations by search query
  const isSearchActive = query.trim().length > 0;
  const matchingConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase().replace(/^@/, '');
    if (!normalized) return [];

    return conversations.filter((conversation) => {
      const searchableValues = [
        conversation.title,
        conversation.peer?.username,
        conversation.peer?.full_name,
        conversation.peer?.email,
        conversation.last_message_preview,
      ];
      return searchableValues.some((v) => v?.toLowerCase().includes(normalized));
    });
  }, [conversations, query]);

  const handleOpenSavedMessages = useCallback(async () => {
    try {
      const savedConv = await chatApiService.getOrCreateSavedChat();
      if (savedConv && savedConv.id) {
        handleOpenConversation(savedConv);
        queryClient.setQueryData<Conversation[]>(chatQueryKeys.conversations(), (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((c) => c.id === savedConv.id)) return list;
          return [savedConv, ...list];
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Error',
        message: err?.message || 'Could not open Saved Messages',
        type: 'error',
      });
    }
  }, [handleOpenConversation, queryClient, showToast]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-textPrimary">
        <div className="w-8 h-8 rounded-full border-2 border-active border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased select-none fixed inset-0 md:relative md:inset-auto md:h-screen">
        {/* Desktop Left Sidebar */}
        <div className="hidden lg:flex shrink-0">
          <LeftSidebar />
        </div>

        {/* Center Main Area: Sign In Prompt */}
        <main className="flex-1 min-w-0 h-full max-h-full flex flex-col justify-between overflow-y-auto">
          {/* Mobile Top Header with Back button */}
          <header className="sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-background/90 backdrop-blur-md border-b border-border-subtle lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-textPrimary">Messages</h1>
            <div className="w-7" />
          </header>

          {/* Centered Sign In Card */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle text-center space-y-5 shadow-xl animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center mx-auto text-active">
                <MessageSquare className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-textPrimary">Sign In to Chat</h2>
                <p className="text-xs sm:text-sm text-textTertiary mt-1.5 leading-relaxed">
                  Join student conversations, discuss courses, share materials, and send direct messages in real time.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-pill bg-textPrimary hover:bg-textPrimary/90 active:scale-[0.99] text-background font-bold text-sm transition-all shadow-md cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full py-2.5 px-4 rounded-pill text-xs font-semibold text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden shrink-0">
            <MobileBottomNav />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased select-none fixed inset-0 md:relative md:inset-auto md:h-screen">
      {/* 1. Desktop Left Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Chat Area: Clean two-sided desktop view (inbox on left, active chat on right) */}
      <main className="flex-1 min-w-0 h-full max-h-full flex bg-background overflow-hidden relative">
        {/* Left Inbox Column: Header, Stories, Search, Conversations */}
        <section
          style={isDesktop ? { width: `${sidebarWidth}px`, minWidth: '280px', maxWidth: '650px' } : undefined}
          className={`h-full max-h-full flex flex-col bg-background shrink-0 border-r border-border-subtle ${
            isResizing ? 'select-none transition-none' : 'transition-[width] duration-150'
          } ${
            selectedConversation
              ? 'hidden md:flex'
              : 'w-full md:flex'
          }`}
        >
          {/* Bespoke Chat Header (clean top header for mobile & desktop) */}
          <ChatHeader
            onMenuPress={() => setIsDrawerOpen(true)}
            onSavedMessagesPress={handleOpenSavedMessages}
          />

          {/* Forwarding Banner */}
          {forwardingMessage && (
            <div className="flex items-center justify-between px-4 py-2 bg-active/10 border-b border-border-subtle text-xs">
              <div className="min-w-0 pr-2">
                <span className="font-bold text-active block">Forwarding message:</span>
                <span className="text-textSecondary truncate block">
                  {forwardingMessage.content}
                </span>
                <span className="text-[10px] text-textTertiary block">
                  Select a contact or conversation below
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="p-1 text-textTertiary hover:text-textPrimary rounded-full cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Stories Carousel */}
          <StoriesCarousel />

          {/* Search Bar */}
          <ChatSearchBar
            value={query}
            onChangeText={setQuery}
            onClear={clearSearch}
            onSubmit={flushSearch}
            isLoading={isSearching}
            placeholder="Search chats..."
          />

          {/* Conversations or User Search Results */}
          <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {isSearchActive ? (
              <div>
                {matchingConversations.length > 0 && (
                  <div className="px-4 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-textTertiary mb-1">
                      Conversations
                    </h3>
                    <div className="space-y-0.5 mb-2">
                      {matchingConversations.map((c) => (
                        <ConversationItem
                          key={c.id}
                          conversation={c}
                          isSelected={selectedConversation?.id === c.id}
                          isTyping={Boolean(typingUsers[c.id])}
                          typingUser={typingUsers[c.id]}
                          onPress={handleOpenConversation}
                          onDelete={handleDeleteConversation}
                          onToggleBlock={handleToggleBlock}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <UserSearchResults
                  results={results}
                  isSearching={isSearching}
                  query={query}
                  isCreatingChat={isCreatingChat}
                  onSelectUser={handleSelectSearchedUser}
                />
              </div>
            ) : isLoading && conversations.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-surface" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-surface rounded-md w-2/5" />
                      <div className="h-3 bg-surface rounded-md w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-3 text-textTertiary border border-border-subtle">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-textPrimary mb-1">
                  No conversations yet
                </h3>
                <p className="text-xs text-textSecondary max-w-xs leading-relaxed">
                  Type any classmate&apos;s username in the search bar above to start chatting in real time.
                </p>
              </div>
            ) : (
              <div className="py-1">
                {conversations.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    isSelected={selectedConversation?.id === c.id}
                    isTyping={Boolean(typingUsers[c.id])}
                    typingUser={typingUsers[c.id]}
                    onPress={handleOpenConversation}
                    onDelete={handleDeleteConversation}
                    onToggleBlock={handleToggleBlock}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Desktop Draggable Divider between Left Inbox and Active Chat */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleMouseDownResize}
          onDoubleClick={handleResetSidebarWidth}
          className={`hidden md:flex w-2 -mx-1 cursor-col-resize items-center justify-center bg-transparent hover:bg-active/20 active:bg-active/40 select-none z-20 shrink-0 group transition-colors ${
            isResizing ? 'bg-active/30' : ''
          }`}
          title="Drag to resize, double-click to reset"
        >
          <div
            className={`w-0.5 h-8 rounded-full transition-colors ${
              isResizing ? 'bg-active' : 'bg-transparent group-hover:bg-border-subtle'
            }`}
          />
        </div>

        {/* Right Active Chat Column */}
        <section
          className={`flex-1 h-full max-h-full min-w-0 flex flex-col bg-background ${
            selectedConversation ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConversation ? (
            <DirectChatView
              conversation={selectedConversation}
              onBack={handleBackToList}
              onConversationRead={markConversationRead}
              onMessageSent={updateConversationPreview}
              onForwardMessage={(msg) => setForwardingMessage(msg)}
              initialForwardMessage={forwardingMessage}
              onClearInitialForward={() => setForwardingMessage(null)}
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-background select-none">
              <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 text-textTertiary border border-border-subtle">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-textPrimary mb-1">
                Select a conversation
              </h2>
              <p className="text-xs text-textSecondary max-w-xs">
                Pick a chat from the inbox list or search for a classmate to begin messaging.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Mobile Drawer Menu */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Mobile Fixed Bottom Navigation (Only visible when no active chat is open on mobile) */}
      {!selectedConversation && (
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      )}
    </div>
  );
};

export default ChatPage;
