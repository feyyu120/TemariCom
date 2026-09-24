import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { setUnauthorizedHandler, tokenStorage } from '@/services/api';
import { PROFILE_KEYS, FullProfileResponse } from '@/features/profiles/types';
import { profileService } from '@/features/profiles/services/profileService';
import {
  AuthSessionResponse,
  SendOTPResponse,
  StoredAccount,
  User,
  VerifyOTPRequest,
} from '../types';

export type AuthModalView = 'register' | 'login';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  accounts: StoredAccount[];
  activeAccountId: string | null;
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  register: (email: string) => Promise<SendOTPResponse>;
  login: (identifier: string) => Promise<SendOTPResponse>;
  verifyOTP: (params: VerifyOTPRequest) => Promise<AuthSessionResponse>;
  logout: () => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  requireAuth: (callback: () => void) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AUTH_USER_QUERY_KEY = PROFILE_KEYS.me();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('register');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Stored multi-accounts list (hydrates synchronously from localStorage)
  const [accounts, setAccounts] = useState<StoredAccount[]>(() =>
    tokenStorage.getAccountsSync()
  );
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() =>
    tokenStorage.getActiveAccountIdSync()
  );

  // Refresh local accounts list synchronously
  const syncLocalAccounts = useCallback(() => {
    setAccounts(tokenStorage.getAccountsSync());
    setActiveAccountId(tokenStorage.getActiveAccountIdSync());
  }, []);

  // TanStack Query: fetch current authenticated user profile via profileService.getMyProfile()
  // Eliminates redundant /auth/me request since /profile/me already provides complete user and academic data.
  // Hydrates synchronously from tokenStorage so there is never a flash of logged-out state.
  // On app open, profile/me is fetched once and cached in TanStack Query.
  // When user navigates to /profile, it renders instantly from TanStack Query cache!
  const hasActiveSession = Boolean(
    activeAccountId || tokenStorage.getActiveAccountIdSync() || tokenStorage.getSessionToken()
  );

  const {
    data: myProfile,
    isLoading,
    refetch,
  } = useQuery<FullProfileResponse | null>({
    queryKey: PROFILE_KEYS.me(),
    queryFn: async () => {
      try {
        const profile = await profileService.getMyProfile();
        return profile;
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        // If 401 Unauthorized, session is definitively invalid or revoked on server
        if (status === 401) {
          await tokenStorage.clearAll();
          syncLocalAccounts();
          return null;
        }

        // If backend is sleeping, 502/503, or temporary network drop:
        // PRESERVE the cached user from localStorage so the UI NEVER flickers to "Sign In"!
        const cachedUser = tokenStorage.getUserDataSync<User>();
        if (cachedUser) {
          return {
            user: {
              id: cachedUser.id,
              username: cachedUser.username || null,
              email: cachedUser.email || null,
              phone: cachedUser.phone || null,
              full_name: cachedUser.full_name || null,
              avatar_url: cachedUser.avatar_url || null,
              bio: cachedUser.bio || null,
              is_verified: cachedUser.is_verified || false,
            },
            student_profile: null,
            social_counts: { followers_count: 0, following_count: 0 },
            is_following: false,
            is_own_profile: true,
          };
        }

        return null;
      }
    },
    initialData: () => {
      const cached = tokenStorage.getUserDataSync<User>();
      if (!cached || !cached.id) return null;
      return {
        user: {
          id: cached.id,
          username: cached.username || null,
          email: cached.email || null,
          phone: cached.phone || null,
          full_name: cached.full_name || null,
          avatar_url: cached.avatar_url || null,
          bio: cached.bio || null,
          is_verified: cached.is_verified || false,
        },
        student_profile: null,
        social_counts: { followers_count: 0, following_count: 0 },
        is_following: false,
        is_own_profile: true,
      };
    },
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5,
    enabled: hasActiveSession,
    retry: (failureCount, error: unknown) => {
      const status = (error as { status?: number })?.status;
      if (status === 401) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1500 * (attemptIndex + 1), 5000),
  });

  const currentUser = useMemo<User | null>(() => {
    if (myProfile?.user && myProfile.user.id) {
      const cached = tokenStorage.getUserDataSync<User>();
      return {
        id: myProfile.user.id,
        email: myProfile.user.email ?? cached?.email,
        phone: myProfile.user.phone ?? cached?.phone,
        username: myProfile.user.username ?? cached?.username,
        full_name: myProfile.user.full_name ?? cached?.full_name,
        avatar_url: myProfile.user.avatar_url ?? cached?.avatar_url,
        bio: myProfile.user.bio ?? cached?.bio,
        is_verified: myProfile.user.is_verified ?? cached?.is_verified ?? false,
        account_status: cached?.account_status ?? 'active',
        roles: cached?.roles ?? ['student'],
        two_step_enabled: cached?.two_step_enabled ?? false,
        last_login_at: cached?.last_login_at ?? null,
        last_login_ip: cached?.last_login_ip ?? null,
        created_at: cached?.created_at ?? new Date().toISOString(),
        updated_at: cached?.updated_at ?? new Date().toISOString(),
      };
    }
    const cachedUser = tokenStorage.getUserDataSync<User>();
    return cachedUser || null;
  }, [myProfile]);

  const isAuthenticated = Boolean(currentUser);

  // Hook global 401 unauthorized listener to auto-clear session on any expired API call
  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStorage.clearAll();
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
      syncLocalAccounts();
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [queryClient, syncLocalAccounts]);

  // Sync user data to active account in storage when fetched
  useEffect(() => {
    if (currentUser) {
      tokenStorage.setUserData(currentUser);
      syncLocalAccounts();
    }
  }, [currentUser, syncLocalAccounts]);

  const openAuthModal = useCallback((view: AuthModalView = 'register') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setPendingAction(null);
  }, []);

  // Action gating: if guest, prompt login and hold action; if logged in, run immediately
  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
      } else {
        setPendingAction(() => action);
        openAuthModal('login');
      }
    },
    [isAuthenticated, openAuthModal]
  );

  const handleRegister = useCallback(async (email: string): Promise<SendOTPResponse> => {
    return await authService.register({ email });
  }, []);

  const handleLogin = useCallback(async (identifier: string): Promise<SendOTPResponse> => {
    return await authService.login(identifier);
  }, []);

  const handleVerifyOTP = useCallback(
    async (params: VerifyOTPRequest): Promise<AuthSessionResponse> => {
      const authSession = await authService.verifyOTP(params);

      // Update TanStack query cache with the verified user
      if (authSession.user) {
        queryClient.setQueryData<FullProfileResponse | null>(PROFILE_KEYS.me(), {
          user: {
            id: authSession.user.id,
            username: authSession.user.username || null,
            email: authSession.user.email || null,
            phone: authSession.user.phone || null,
            full_name: authSession.user.full_name || null,
            avatar_url: authSession.user.avatar_url || null,
            bio: authSession.user.bio || null,
            is_verified: authSession.user.is_verified || false,
          },
          student_profile: null,
          social_counts: { followers_count: 0, following_count: 0 },
          is_following: false,
          is_own_profile: true,
        });
        queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me() }).catch(() => {});
      } else {
        await queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me() });
      }

      syncLocalAccounts();
      setIsAuthModalOpen(false);

      // Execute held action if present
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      return authSession;
    },
    [pendingAction, queryClient, syncLocalAccounts]
  );

  const handleLogout = useCallback(async (): Promise<void> => {
    await authService.logout();
    queryClient.setQueryData(PROFILE_KEYS.me(), null);
    queryClient.removeQueries({ queryKey: PROFILE_KEYS.all });
    syncLocalAccounts();
  }, [queryClient, syncLocalAccounts]);

  const handleSwitchAccount = useCallback(
    async (accountId: string): Promise<void> => {
      const targetUser = await authService.switchAccount(accountId);
      if (targetUser) {
        queryClient.setQueryData<FullProfileResponse | null>(PROFILE_KEYS.me(), {
          user: {
            id: targetUser.id,
            username: targetUser.username || null,
            email: targetUser.email || null,
            phone: targetUser.phone || null,
            full_name: targetUser.full_name || null,
            avatar_url: targetUser.avatar_url || null,
            bio: targetUser.bio || null,
            is_verified: targetUser.is_verified || false,
          },
          student_profile: null,
          social_counts: { followers_count: 0, following_count: 0 },
          is_following: false,
          is_own_profile: true,
        });
        queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me() }).catch(() => {});
      }
      syncLocalAccounts();
    },
    [queryClient, syncLocalAccounts]
  );

  const handleRefreshUser = useCallback(async (): Promise<void> => {
    await refetch();
    syncLocalAccounts();
  }, [refetch, syncLocalAccounts]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user: currentUser ?? null,
      isAuthenticated,
      isLoading,
      isAuthModalOpen,
      authModalView,
      accounts,
      activeAccountId,
      openAuthModal,
      closeAuthModal,
      setAuthModalView,
      register: handleRegister,
      login: handleLogin,
      verifyOTP: handleVerifyOTP,
      logout: handleLogout,
      switchAccount: handleSwitchAccount,
      requireAuth,
      refreshUser: handleRefreshUser,
    }),
    [
      currentUser,
      isAuthenticated,
      isLoading,
      isAuthModalOpen,
      authModalView,
      accounts,
      activeAccountId,
      openAuthModal,
      closeAuthModal,
      handleRegister,
      handleLogin,
      handleVerifyOTP,
      handleLogout,
      handleSwitchAccount,
      requireAuth,
      handleRefreshUser,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

