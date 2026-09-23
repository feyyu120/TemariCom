import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  HelpCircle,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthModalView } from '../context/AuthContext';

const PENDING_STORAGE_KEY = 'temaricom_pending_verification';

// Error sanitizer preventing leaks of backend endpoints or driver traces
function formatUserFacingError(rawError: any): string {
  if (!rawError) return 'An unexpected error occurred. Please try again.';

  const message = typeof rawError === 'string' ? rawError : rawError?.message || '';

  // 1. Guard against URL leaks or internal endpoints
  if (/api\/v1|\/auth|localhost|http:\/\/|https:\/\//i.test(message)) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  // 2. Network / connection failures
  if (/failed to fetch|network error|econnrefused|load failed/i.test(message)) {
    return 'Unable to connect to TemariCom servers. Please check your internet connection.';
  }

  // 3. Rate limiting
  if (/too many requests|rate limit|limit exceeded/i.test(message)) {
    return 'Too many requests. Please wait a few moments before trying again.';
  }

  // 4. Duplicate email on registration
  if (/already exists|duplicate/i.test(message)) {
    return 'An account with this email already exists. Please switch to Sign in.';
  }

  // 5. Account not found on login
  if (/not found|no account/i.test(message)) {
    return 'No account was found with this email. Please create an account first.';
  }

  // 6. Safe short message
  if (message.length > 0 && message.length < 100 && !/[{}[\]\\]/.test(message)) {
    return message;
  }

  return 'Something went wrong. Please check your information and try again.';
}

export const AuthModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalView,
    setAuthModalView,
    register,
    login,
  } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state whenever modal opens or view changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMessage(null);
      setAgreedToTerms(false);
    }
  }, [isAuthModalOpen, authModalView]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const isRegister = authModalView === 'register';

  // Toggle between register and login
  const toggleView = (newView: AuthModalView) => {
    setAuthModalView(newView);
    setErrorMessage(null);
  };

  // Navigate to dedicated FAQ page
  const handleOpenFAQ = () => {
    closeAuthModal();
    navigate(`/faq?category=${isRegister ? 'registration' : 'login'}`);
  };

  // Submit email to request OTP and navigate to /verify
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (isRegister && !agreedToTerms) {
      setErrorMessage('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let otpResponse;
      const purpose = isRegister ? 'registration' : 'login';
      if (isRegister) {
        otpResponse = await register(cleanEmail);
      } else {
        otpResponse = await login(cleanEmail);
      }

      // Persist pending verification state in sessionStorage so reloading /verify maintains state
      const backendDuration = Number(otpResponse?.expires_in) || 300;
      const expiresAt = Date.now() + backendDuration * 1000;
      try {
        sessionStorage.setItem(
          PENDING_STORAGE_KEY,
          JSON.stringify({
            identifier: cleanEmail,
            purpose,
            expiresAt,
          })
        );
      } catch {
        // Storage unavailable
      }

      // Close modal and transition smoothly to the dedicated /verify route
      closeAuthModal();
      navigate(`/verify?identifier=${encodeURIComponent(cleanEmail)}&purpose=${purpose}`);
    } catch (err: any) {
      setErrorMessage(formatUserFacingError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Container: fully adapts to Light and Dark modes using theme tokens */}
      <div className="relative w-full max-w-[430px] rounded-3xl bg-surface border border-border shadow-2xl p-6 sm:p-7 text-textPrimary flex flex-col items-center overflow-hidden">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-textPrimary" />
          </button>

          {/* Help / FAQ Button -> routes to /faq */}
          <button
            type="button"
            onClick={handleOpenFAQ}
            className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Help and FAQ"
          >
            <HelpCircle className="w-5 h-5 text-textPrimary" />
          </button>
        </div>

        {/* Dynamic Titles */}
        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-textPrimary text-center mt-2 mb-2">
          {isRegister ? 'Join TemariCom' : 'Welcome Back'}
        </h2>

        <p className="text-sm text-textSecondary text-center leading-relaxed max-w-[310px] mb-6">
          {isRegister
            ? 'Connect with students, tutors and campus life across Ethiopia.'
            : 'Enter your student email to sign in to your TemariCom account.'}
        </p>

        {/* Safe User-Facing Error Banner */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-xs text-danger animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Email Form Card */}
        <form onSubmit={handleSubmitEmail} className="w-full space-y-4">
          <div className="w-full rounded-2xl bg-surface-elevated border border-border-subtle p-4 sm:p-5">
            <label
              htmlFor="auth-email-input"
              className="block text-[11px] font-semibold tracking-wider text-textTertiary uppercase mb-2.5"
            >
              EMAIL ADDRESS
            </label>

            <div className="relative flex items-center rounded-xl bg-surface border border-border focus-within:border-active transition-colors">
              <Mail className="w-5 h-5 text-textSecondary ml-3.5 shrink-0" />
              <input
                id="auth-email-input"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. student@gmail.com"
                className="w-full py-3 px-3 text-sm text-textPrimary placeholder:text-textTertiary bg-transparent outline-none"
              />
            </div>

            {/* Primary Action Button (Theme consistent, no blue color) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-3 rounded-xl font-semibold text-sm bg-active text-active-text hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isRegister ? 'Create Account' : 'Continue with Email'}</span>
              )}
            </button>

            {/* Terms of Service Checkbox (Only on Register) */}
            {isRegister && (
              <div className="mt-3.5 flex items-start gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={agreedToTerms}
                  onClick={() => {
                    setAgreedToTerms(!agreedToTerms);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    agreedToTerms
                      ? 'bg-active border-active text-active-text'
                      : 'border-border bg-transparent hover:border-textSecondary'
                  }`}
                >
                  {agreedToTerms && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <label className="text-xs text-textSecondary leading-snug cursor-pointer select-none">
                  I agree to the{' '}
                  <a
                    href="#terms"
                    onClick={(e) => e.preventDefault()}
                    className="text-textPrimary font-medium underline hover:opacity-80"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="#privacy"
                    onClick={(e) => e.preventDefault()}
                    className="text-textPrimary font-medium underline hover:opacity-80"
                  >
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
            )}
          </div>

          {/* Bottom Toggle between Sign In and Register */}
          <div className="pt-2 text-center text-xs text-textSecondary">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => toggleView('login')}
                  className="font-bold text-textPrimary underline hover:opacity-80 transition-opacity ml-1 cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => toggleView('register')}
                  className="font-bold text-textPrimary underline hover:opacity-80 transition-opacity ml-1 cursor-pointer"
                >
                  Register
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
