import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Key,
  RefreshCw,
  Mail,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const PENDING_STORAGE_KEY = 'temaricom_pending_verification';

interface PendingVerification {
  identifier: string;
  purpose: 'registration' | 'login';
  expiresAt: number;
}

// Error sanitizer preventing leaks of backend endpoints or driver traces
function formatUserFacingError(rawError: unknown): string {
  if (!rawError) return 'An unexpected error occurred. Please try again.';

  const message =
    typeof rawError === 'string'
      ? rawError
      : (rawError as { message?: string })?.message || '';

  if (/api\/v1|\/auth|localhost|http:\/\/|https:\/\//i.test(message)) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }
  if (/failed to fetch|network error|econnrefused|load failed/i.test(message)) {
    return 'Unable to connect to TemariCom servers. Please check your internet connection.';
  }
  if (/too many requests|rate limit|limit exceeded/i.test(message)) {
    return 'Too many requests. Please wait a few moments before trying again.';
  }
  if (/invalid verification|invalid code/i.test(message)) {
    return 'Invalid 6-digit verification code. Please check your email and try again.';
  }
  if (/expired/i.test(message)) {
    return 'The verification code has expired. Please request a new code below.';
  }
  if (message.length > 0 && message.length < 100 && !/[{}[\]\\]/.test(message)) {
    return message;
  }

  return 'Verification could not be completed. Please check your code and try again.';
}

export const VerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyOTP, register, login, openAuthModal } = useAuth();

  // 1. Resolve identifier and purpose from URL params or sessionStorage
  const [identifier] = useState<string>(() => {
    const fromUrl = searchParams.get('identifier')?.trim();
    if (fromUrl) return fromUrl;
    try {
      const stored = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PendingVerification;
        return parsed.identifier || '';
      }
    } catch {
      // Ignore parse failure
    }
    return '';
  });

  const [purpose] = useState<'registration' | 'login'>(() => {
    const fromUrl = searchParams.get('purpose');
    if (fromUrl === 'login' || fromUrl === 'registration') return fromUrl;
    try {
      const stored = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PendingVerification;
        return parsed.purpose || 'registration';
      }
    } catch {
      // Ignore
    }
    return 'registration';
  });

  // 2. Countdown timer calculated from expiresAt timestamp (persists across reloads)
  const [expiryCountdown, setExpiryCountdown] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem(PENDING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PendingVerification;
        if (parsed.expiresAt) {
          const remainingSeconds = Math.floor((parsed.expiresAt - Date.now()) / 1000);
          return Math.max(0, remainingSeconds);
        }
      }
    } catch {
      // Fallback
    }
    return 300;
  });

  // 3. Form input states
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync state into sessionStorage for reload resilience
  useEffect(() => {
    if (identifier) {
      try {
        const stored = sessionStorage.getItem(PENDING_STORAGE_KEY);
        let expiresAt = Date.now() + 300_000;
        if (stored) {
          const parsed = JSON.parse(stored) as PendingVerification;
          if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
            expiresAt = parsed.expiresAt;
          }
        }
        sessionStorage.setItem(
          PENDING_STORAGE_KEY,
          JSON.stringify({ identifier, purpose, expiresAt })
        );
      } catch {
        // Storage unavailable
      }
    }
  }, [identifier, purpose]);

  // Active countdown timer effect
  useEffect(() => {
    if (expiryCountdown <= 0) return;

    const timer = setInterval(() => {
      setExpiryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryCountdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    otpInputRefs.current[0]?.focus();
  }, []);

  // Format MM:SS for countdown display
  const formattedCountdown = `${Math.floor(expiryCountdown / 60)
    .toString()
    .padStart(2, '0')}:${(expiryCountdown % 60).toString().padStart(2, '0')}`;

  // Handle individual digit input
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpCode];
    updated[index] = digit;
    setOtpCode(updated);
    setErrorMessage(null);
    setSuccessNotice(null);

    // Auto-advance cursor
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste full 6-digit code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpCode];
    pasted.split('').forEach((char, idx) => {
      if (idx < 6) updated[idx] = char;
    });
    setOtpCode(updated);
    setErrorMessage(null);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Submit OTP code for verification
  const handleVerifySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }

    if (!identifier) {
      setErrorMessage('Verification destination is missing. Please restart authentication.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await verifyOTP({
        identifier,
        code: fullCode,
        purpose,
        email: identifier.includes('@') ? identifier : undefined,
      });

      // Clear pending state on verified success
      try {
        sessionStorage.removeItem(PENDING_STORAGE_KEY);
      } catch {
        // Ignore
      }

      // Navigate to homepage or return target
      const returnUrl = searchParams.get('returnUrl') || '/';
      navigate(returnUrl, { replace: true });
    } catch (err: unknown) {
      setErrorMessage(formatUserFacingError(err));
      setIsSubmitting(false);
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    if (expiryCountdown > 0 || isResending || !identifier) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      let res;
      if (purpose === 'registration') {
        res = await register(identifier);
      } else {
        res = await login(identifier);
      }

      const expiresInSec = res.expires_in || 300;
      const newExpiresAt = Date.now() + expiresInSec * 1000;
      setExpiryCountdown(expiresInSec);
      setOtpCode(['', '', '', '', '', '']);

      try {
        sessionStorage.setItem(
          PENDING_STORAGE_KEY,
          JSON.stringify({ identifier, purpose, expiresAt: newExpiresAt })
        );
      } catch {
        // Ignore
      }

      setSuccessNotice('A new 6-digit verification code has been sent to your email.');
      otpInputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setErrorMessage(formatUserFacingError(err));
    } finally {
      setIsResending(false);
    }
  };

  // Return to email prompt
  const handleBackToAuth = () => {
    try {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
    } catch {
      // Ignore
    }
    navigate('/', { replace: true });
    openAuthModal(purpose === 'registration' ? 'register' : 'login');
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between p-4 sm:p-6 lg:p-8 animate-fadeIn text-textPrimary">
      {/* Top Navbar */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={handleBackToAuth}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Email</span>
        </button>

        <Link
          to="/faq"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary text-sm font-medium transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span>FAQ & Help</span>
        </Link>
      </header>

      {/* Main Verification Card */}
      <main className="max-w-md w-full mx-auto my-auto">
        <div className="w-full rounded-3xl bg-surface border border-border shadow-2xl p-6 sm:p-8 text-textPrimary">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-4 text-textPrimary shadow-inner">
              <Key className="w-7 h-7" />
            </div>

            <h1 className="text-2xl font-black text-textPrimary tracking-tight">
              Verify your email
            </h1>

            <p className="text-sm text-textSecondary mt-2 leading-relaxed">
              We sent a 6-digit verification code to
            </p>

            <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle max-w-full">
              <Mail className="w-3.5 h-3.5 text-textTertiary shrink-0" />
              <span className="text-xs font-semibold text-textPrimary truncate">
                {identifier || 'your email'}
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-error/10 border border-error/30 text-error text-xs mb-5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-success/10 border border-success/30 text-success text-xs mb-5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{successNotice}</span>
            </div>
          )}

          {/* 6-Digit Code Input Form */}
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider text-center mb-3">
                Enter 6-digit code
              </label>

              <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={isSubmitting}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold rounded-2xl bg-surface-elevated border border-border focus:border-active focus:ring-2 focus:ring-active/20 text-textPrimary outline-none transition-all"
                    aria-label={`Digit ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Countdown and Resend Controls */}
            <div className="flex flex-col items-center justify-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-textTertiary">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Code expires in{' '}
                  <strong className="font-mono text-textPrimary">{formattedCountdown}</strong>
                </span>
              </div>

              <div>
                {expiryCountdown > 0 ? (
                  <span className="text-textTertiary text-[11px]">
                    Did not receive the code? Wait for the countdown to request a new one.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 text-textPrimary hover:underline font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isResending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Resend verification code</span>
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || otpCode.join('').length !== 6}
                className="w-full h-12 rounded-2xl bg-active hover:bg-active/90 active:scale-[0.99] text-active-text font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <span>Verify & Continue</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToAuth}
                disabled={isSubmitting}
                className="w-full h-11 rounded-2xl bg-transparent hover:bg-surface-elevated text-textSecondary hover:text-textPrimary font-semibold text-xs transition-colors cursor-pointer"
              >
                Use a different email address
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl w-full mx-auto py-4 text-center text-xs text-textTertiary">
        <span>Protected by TemariCom security &bull; </span>
        <Link to="/faq" className="hover:underline text-textSecondary">
          Need assistance?
        </Link>
      </footer>
    </div>
  );
};

export default VerifyPage;

