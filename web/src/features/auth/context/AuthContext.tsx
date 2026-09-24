import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { setUnauthorizedHandler, tokenStorage } from '@/services/api';
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

export const AUTH_USER_QUERY_KEY = ['auth', 'currentUser'] as const;

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

  // TanStack Query: fetch current authenticated user profile
  // Hydrates synchronously from tokenStorage to eliminate unauthenticated button flash on reload
  // Uses initialDataUpdatedAt: 0 so TanStack considers cached data stale immediately, triggering
  // a background server revalidation to /api/v1/auth/me on reload while displaying user instantly.
  const {
    data: currentUser,
    isLoading,
    refetch,
  } = useQuery<User | null>({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: async () => {
      try {
        const user = await authService.getMe();
        return user;
      } catch (err: any) {
        // If 401 Unauthorized, session is invalid or revoked on server
        if (err?.status === 401) {
          await tokenStorage.clearAll();
          syncLocalAccounts();
        }
        return null;
      }
    },
    initialData: () => tokenStorage.getUserDataSync<User>() || null,
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

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
        queryClient.setQueryData(AUTH_USER_QUERY_KEY, authSession.user);
      } else {
        await queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
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
    queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
    await queryClient.invalidateQueries();
    syncLocalAccounts();
  }, [queryClient, syncLocalAccounts]);

  const handleSwitchAccount = useCallback(
    async (accountId: string): Promise<void> => {
      const targetUser = await authService.switchAccount(accountId);
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, targetUser);
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

