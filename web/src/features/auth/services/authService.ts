import { apiClient, tokenStorage } from '@/services/api';
import {
  AuthPurpose,
  AuthSessionResponse,
  LoginRequest,
  RegisterRequest,
  SendOTPResponse,
  User,
  VerifyOTPRequest,
} from '../types';

export interface LogoutResult {
  serverRevoked: boolean;
  error?: string;
}

/**
 * Authentication Service (Pure functional object - zero classes)
 */
export const authService = {
  /**
   * Request OTP code to register a new user
   * POST /api/v1/auth/register
   */
  async register(req: RegisterRequest): Promise<SendOTPResponse> {
    const cleanEmail = req.email.trim().toLowerCase();
    const payload: RegisterRequest = {
      email: cleanEmail,
    };

    const response = await apiClient.post<SendOTPResponse>('/auth/register', payload, {
      requiresAuth: false,
    });

    const data = response.data;
    return {
      ...data,
      identifier: data?.identifier || cleanEmail,
      purpose: (data?.purpose || 'registration') as AuthPurpose,
    };
  },

  /**
   * Request OTP code to log in an existing user
   * POST /api/v1/auth/login
   */
  async login(identifier: string): Promise<SendOTPResponse> {
    const trimmed = identifier.trim();
    const payload: LoginRequest = { identifier: trimmed };

    const response = await apiClient.post<SendOTPResponse>('/auth/login', payload, {
      requiresAuth: false,
    });

    const data = response.data;
    return {
      ...data,
      identifier: data?.identifier || trimmed,
      purpose: (data?.purpose || 'login') as AuthPurpose,
    };
  },

  /**
   * Submit 6-digit OTP code to complete authentication & receive session token
   * POST /api/v1/auth/verify-otp
   */
  async verifyOTP(req: VerifyOTPRequest): Promise<AuthSessionResponse> {
    const cleanReq: VerifyOTPRequest = {
      identifier: req.identifier.trim().toLowerCase(),
      code: req.code.trim(),
      purpose: req.purpose,
      email: req.email?.trim() || undefined,
      phone: req.phone?.trim() || undefined,
    };

    const response = await apiClient.post<AuthSessionResponse>('/auth/verify-otp', cleanReq, {
      requiresAuth: false,
    });

    const data = response.data;

    // Save session token and user data securely upon successful auth
    if (data?.session_token) {
      await tokenStorage.setSessionToken(data.session_token);
      if (data.user) {
        await tokenStorage.setUserData(data.user);
        await tokenStorage.saveAccount({
          user: data.user,
          sessionToken: data.session_token,
          addedAt: Date.now(),
        }, true);
      }
    }

    return data;
  },

  /**
   * Logout current user: revokes session in PostgreSQL & clears cookie and storage
   * POST /api/v1/auth/logout
   */
  async logout(specificToken?: string): Promise<LogoutResult> {
    let serverRevoked = false;
    let revocationError: string | undefined;

    try {
      await apiClient.post('/auth/logout', undefined, {
        requiresAuth: true,
        headers: specificToken ? { Authorization: `Bearer ${specificToken}` } : undefined,
      });
      serverRevoked = true;
    } catch (error: any) {
      revocationError = error?.message || 'Server session revocation failed';
      console.warn('[authService.logout] Remote session revocation failed:', revocationError);
    }

    // Clear active session locally
    await tokenStorage.removeSessionToken();

    return {
      serverRevoked,
      error: serverRevoked ? undefined : revocationError,
    };
  },

  /**
   * Switch the active account on Web (updates HttpOnly cookie on backend and active account in storage)
   * POST /api/v1/auth/switch-account
   */
  async switchAccount(accountIdOrToken: string): Promise<User> {
    const accounts = tokenStorage.getAccounts();
    const account = accounts.find((a) => a.id === accountIdOrToken);
    const token = account ? account.sessionToken : accountIdOrToken;

    const response = await apiClient.post<User>(
      '/auth/switch-account',
      { session_token: token },
      { requiresAuth: false }
    );

    if (account) {
      tokenStorage.switchActiveAccount(account.id);
    }

    return response.data;
  },

  /**
   * Health check for auth module
   * GET /api/v1/auth/health
   */
  async checkHealth(): Promise<{ module: string; status: string }> {
    const response = await apiClient.get<{ module: string; status: string }>('/auth/health', {
      requiresAuth: false,
    });
    return response.data;
  },
};

export default authService;

