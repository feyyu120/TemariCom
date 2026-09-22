import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  HelpCircle,
  GraduationCap,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthModalView } from '../context/AuthContext';
import { AuthHelpModal } from './AuthHelpModal';

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

  // 6. OTP errors
  if (/invalid verification|invalid code/i.test(message)) {
    return 'Invalid 6-digit verification code. Please check your email and try again.';
  }
  if (/expired/i.test(message)) {
    return 'The verification code has expired. Please request a new code.';
  }

  // 7. Sanitize if under 100 characters and contains safe prose
  if (message.length > 0 && message.length < 100 && !/[{}[\]\\]/.test(message)) {
    return message;
  }

  return 'Something went wrong. Please check your information and try again.';
}

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalView,
    setAuthModalView,
    register,
    login,
    verifyOTP,
  } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [activeStep, setActiveStep] = useState<'credentials' | 'otp'>('credentials');

  // Help FAQ Modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Loading and feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 5-minute expiry countdown from backend (default 300s)
  const [expiryCountdown, setExpiryCountdown] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);

  // OTP inputs refs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state whenever modal opens or view changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveStep('credentials');
      setErrorMessage(null);
      setOtpCode(['', '', '', '', '', '']);
      setAgreedToTerms(false);
      setIsHelpOpen(false);
    }
  }, [isAuthModalOpen, authModalView]);

  // Expiry countdown timer (5 minutes = 300 seconds)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeStep === 'otp' && expiryCountdown > 0) {
      timer = setInterval(() => {
        setExpiryCountdown((prev) => {
          if (prev <= 1) {
            setErrorMessage('Verification code has expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeStep, expiryCountdown]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeStep === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeStep, resendCooldown]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen && !isHelpOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, isHelpOpen, closeAuthModal]);

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

  // Format seconds to mm:ss display
  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Toggle between register and login
  const toggleView = (newView: AuthModalView) => {
    setAuthModalView(newView);
    setErrorMessage(null);
    setActiveStep('credentials');
  };

  // Step 1: Submit email to request OTP
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
      if (isRegister) {
        otpResponse = await register(cleanEmail);
      } else {
        otpResponse = await login(cleanEmail);
      }

      // Configure 5-minute expiry countdown from backend
      const backendDuration = Number(otpResponse?.expires_in) || 300;
      setExpiryCountdown(backendDuration);
      setResendCooldown(60);

      // Transition to OTP step
      setActiveStep('otp');

      // Auto-focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMessage(formatUserFacingError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP digit entry
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    const newCode = [...otpCode];
    newCode[index] = cleaned.slice(-1);
    setOtpCode(newCode);

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      submitOtpCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digitsOnly = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digitsOnly.length > 0) {
      const newCode = [...otpCode];
      for (let i = 0; i < 6; i++) {
        newCode[i] = digitsOnly[i] || '';
      }
      setOtpCode(newCode);

      const nextFocusIndex = Math.min(digitsOnly.length, 5);
      otpInputRefs.current[nextFocusIndex]?.focus();

      if (digitsOnly.length === 6) {
        submitOtpCode(digitsOnly);
      }
    }
  };

  // Step 2: Submit OTP code
  const submitOtpCode = async (codeToVerify?: string) => {
    if (expiryCountdown <= 0) {
      setErrorMessage('Verification code has expired. Please request a new code.');
      return;
    }

    const finalCode = (codeToVerify || otpCode.join('')).trim();
    if (finalCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await verifyOTP({
        identifier: email.trim().toLowerCase(),
        code: finalCode,
        purpose: isRegister ? 'registration' : 'login',
        email: email.trim().toLowerCase(),
      });
    } catch (err: any) {
      setErrorMessage(formatUserFacingError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP code
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let otpResponse;
      if (isRegister) {
        otpResponse = await register(email.trim().toLowerCase());
      } else {
        otpResponse = await login(email.trim().toLowerCase());
      }

      const backendDuration = Number(otpResponse?.expires_in) || 300;
      setExpiryCountdown(backendDuration);
      setResendCooldown(60);
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(formatUserFacingError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fadeIn"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Container: fully adapts to Light and Dark modes using theme tokens */}
        <div className="relative w-full max-w-[430px] rounded-3xl bg-surface border border-border shadow-2xl p-6 sm:p-7 text-textPrimary flex flex-col items-center">
          {/* Top Header Bar */}
          <div className="w-full flex items-center justify-between mb-2">
            {activeStep === 'otp' ? (
              <button
                type="button"
                onClick={() => {
                  setActiveStep('credentials');
                  setErrorMessage(null);
                }}
                className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors"
                aria-label="Go back to edit email"
              >
                <ArrowLeft className="w-5 h-5 text-textPrimary" />
              </button>
            ) : (
              <button
                type="button"
                onClick={closeAuthModal}
                className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-textPrimary" />
              </button>
            )}

            {/* Help / FAQ Question Mark Button */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Help and FAQ"
            >
              <HelpCircle className="w-5 h-5 text-textPrimary" />
            </button>
          </div>

          {/* Dynamic Titles (No TC logo per user requirement) */}
          <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-textPrimary text-center mt-2 mb-2">
            {activeStep === 'credentials'
              ? isRegister
                ? 'Join TemariCom'
                : 'Welcome Back'
              : 'Verify Your Email'}
          </h2>

          <p className="text-sm text-textSecondary text-center leading-relaxed max-w-[310px] mb-6">
            {activeStep === 'credentials'
              ? isRegister
                ? 'Connect with students, tutors and campus life across Ethiopia.'
                : 'Enter your student email to sign in to your TemariCom account.'
              : `Enter the 6-digit verification code sent to ${email}`}
          </p>

          {/* Safe User-Facing Error Banner */}
          {errorMessage && (
            <div className="w-full mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-xs text-danger animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Email Form Card */}
          {activeStep === 'credentials' && (
            <form onSubmit={handleSubmitEmail} className="w-full space-y-4">
              {/* Form Inner Card */}
              <div className="w-full rounded-2xl bg-surface-elevated border border-border-subtle p-4 sm:p-5">
                <label
                  htmlFor="auth-email-input"
                  className="block text-[11px] font-semibold tracking-wider text-textTertiary uppercase mb-2.5"
                >
                  EMAIL ADDRESS
                </label>

                <div className="relative flex items-center rounded-xl bg-surface border border-border focus-within:border-active transition-colors">
                  <GraduationCap className="w-5 h-5 text-textSecondary ml-3.5 shrink-0" />
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
          )}

          {/* Step 2: OTP Verification Card */}
          {activeStep === 'otp' && (
            <div className="w-full space-y-4">
              <div className="w-full rounded-2xl bg-surface-elevated border border-border-subtle p-4 sm:p-5 flex flex-col items-center">
                <label className="block text-[11px] font-semibold tracking-wider text-textTertiary uppercase mb-3 text-center">
                  ENTER 6-DIGIT VERIFICATION CODE
                </label>

                {/* 5-minute Backend Expiry Indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border-subtle text-xs text-textSecondary mb-4">
                  <Clock className="w-3.5 h-3.5 text-textTertiary" />
                  <span>
                    Code expires in{' '}
                    <strong className="text-textPrimary font-mono">
                      {formatCountdown(expiryCountdown)}
                    </strong>
                  </span>
                </div>

                {/* 6 Digit Input Boxes */}
                <div className="flex items-center justify-between gap-2 w-full max-w-[320px] mb-5">
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
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-lg font-bold text-textPrimary bg-surface border border-border rounded-xl focus:border-active focus:ring-1 focus:ring-active outline-none transition-colors"
                    />
                  ))}
                </div>

                {/* Verify Button (Theme consistent, no blue color) */}
                <button
                  type="button"
                  onClick={() => submitOtpCode()}
                  disabled={isSubmitting || otpCode.join('').length !== 6 || expiryCountdown <= 0}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-active text-active-text hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Code</span>
                    </>
                  )}
                </button>

                {/* Resend Code Link with Cooldown */}
                <div className="mt-4 text-center text-xs text-textSecondary">
                  {resendCooldown <= 0 ? (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isSubmitting}
                      className="font-bold text-textPrimary underline hover:opacity-80 cursor-pointer"
                    >
                      Resend verification code
                    </button>
                  ) : (
                    <span>Resend available in {resendCooldown}s</span>
                  )}
                </div>
              </div>

              {/* Change Email Option */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep('credentials');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-textTertiary hover:text-textPrimary transition-colors cursor-pointer"
                >
                  Wrong email? <span className="underline">Change email address</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Help Modal */}
      <AuthHelpModal
        isOpen={isHelpOpen}
        type={authModalView}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
};

export default AuthModal;
