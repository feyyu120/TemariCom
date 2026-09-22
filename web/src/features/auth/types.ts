/**
 * Authentication Module Types & DTOs for TemariCom Web
 * Mirrors TemariCom Go Backend DTOs
 */

export type AuthPurpose = 'registration' | 'login' | 'recovery';
export type AuthChannel = 'app' | 'email';

export interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_verified?: boolean;
  account_status: string;
  roles: string[];
  two_step_enabled: boolean;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  device_name?: string | null;
  device_type?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  last_used_at: string;
  created_at: string;
  is_current?: boolean;
}

export interface RegisterRequest {
  email: string;
}

export interface LoginRequest {
  identifier: string;
}

export interface VerifyOTPRequest {
  identifier: string;
  code: string;
  purpose: AuthPurpose;
  email?: string;
  phone?: string;
}

export interface SendOTPResponse {
  identifier: string;
  purpose: AuthPurpose;
  channel: AuthChannel; // 'app' (sent to existing device) or 'email'
  has_active_sessions: boolean;
  expires_in: number; // in seconds (e.g. 300)
  message: string;
}

export interface AuthSessionResponse {
  session_token: string;
  requires_two_step: boolean;
  user: User;
  session?: Session;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface StoredAccount {
  user: User;
  sessionToken: string;
  addedAt: number;
}

export interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastOtpDetails: SendOTPResponse | null;
  accounts: StoredAccount[];
  activeAccountId: string | null;
}
