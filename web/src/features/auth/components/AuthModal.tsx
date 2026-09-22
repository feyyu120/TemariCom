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
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthModalView } from '../context/AuthContext';

interface AuthModalProps {
  onHelpClick?: () => void;
}

// Error sanitizer that prevents leaking backend implementation details or endpoints
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

  // 7. Sanitize if under 80 characters and contains clean prose
  if (message.length > 0 && message.length < 100 && !/[{}[\]\\]/.test(message)) {
    return message;
  }

  return 'Something went wrong. Please check your information and try again.';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onHelpClick }) => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalView,
    setAuthModalView,
    register,
    login,
    verifyOTP,
  } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [activeStep, setActiveStep] = useState<'credentials' | 'otp'>('credentials');

  // Loading and feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);

  // OTP inputs refs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state whenever modal opens or view changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveStep('credentials');
      setErrorMessage(null);
      setOtpCode(['', '', '', '', '', '']);
      setAgreedToTerms(false);
    }
  }, [isAuthModalOpen, authModalView]);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeStep === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeStep, resendCountdown]);

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
      if (isRegister) {
        await register(cleanEmail);
      } else {
        await login(cleanEmail);
      }

      // Transition to OTP step
      setActiveStep('otp');
      setResendCountdown(45);
      setCanResend(false);

      // Focus first OTP input
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
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    const newCode = [...otpCode];
    newCode[index] = cleaned.slice(-1); // Take last entered digit
    setOtpCode(newCode);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
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

  // Support pasting full 6-digit code
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
      // Verification successful, AuthProvider closes the modal and updates user state
    } catch (err: any) {
      setErrorMessage(formatUserFacingError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP code
  const handleResendOTP = async () => {
    if (!canResend || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isRegister) {
        await register(email.trim().toLowerCase());
      } else {
        await login(email.trim().toLowerCase());
      }
      setResendCountdown(45);
      setCanResend(false);
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(formatUserFacingError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-[430px] rounded-3xl bg-[#0d1117] border border-white/[0.08] shadow-2xl p-6 sm:p-7 text-white flex flex-col items-center">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between mb-4">
          {activeStep === 'otp' ? (
            <button
              type="button"
              onClick={() => {
                setActiveStep('credentials');
                setErrorMessage(null);
              }}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Go back to edit email"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={closeAuthModal}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onHelpClick}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Help and support"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Brand TC Logo Squircle */}
        <div className="w-16 h-16 rounded-2xl bg-[#090d14] border border-white/[0.12] flex items-center justify-center shadow-lg mb-5 select-none">
          <div className="relative flex items-center justify-center">
            {/* Stylized TC Brand Emblem */}
            <span className="font-extrabold text-2xl tracking-tighter text-white font-sans">
              T<span className="text-blue-500">C</span>
            </span>
          </div>
        </div>

        {/* Dynamic Titles */}
        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white text-center mb-2">
          {activeStep === 'credentials'
            ? isRegister
              ? 'Join TemariCom'
              : 'Welcome Back'
            : 'Verify Your Email'}
        </h2>

        <p className="text-sm text-gray-400 text-center leading-relaxed max-w-[310px] mb-6">
          {activeStep === 'credentials'
            ? isRegister
              ? 'Connect with students, tutors and campus life across Ethiopia.'
              : 'Enter your student email to sign in to your TemariCom account.'
            : `Enter the 6-digit verification code sent to ${email}`}
        </p>

        {/* Safe User-Facing Error Banner */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Email Form Card */}
        {activeStep === 'credentials' && (
          <form onSubmit={handleSubmitEmail} className="w-full space-y-4">
            {/* Form Inner Card */}
            <div className="w-full rounded-2xl bg-[#141923] border border-white/[0.06] p-4 sm:p-5">
              <label
                htmlFor="auth-email-input"
                className="block text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-2.5"
              >
                EMAIL ADDRESS
              </label>

              <div className="relative flex items-center rounded-xl bg-[#0a0d14] border border-white/[0.08] focus-within:border-blue-500/80 transition-colors">
                <GraduationCap className="w-5 h-5 text-gray-400 ml-3.5 shrink-0" />
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
                  className="w-full py-3 px-3 text-sm text-white placeholder-gray-500 bg-transparent outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3 rounded-xl font-medium text-sm text-white bg-[#262f42] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
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
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-500 bg-transparent hover:border-gray-300'
                    }`}
                  >
                    {agreedToTerms && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <label className="text-xs text-gray-400 leading-snug cursor-pointer select-none">
                    I agree to the{' '}
                    <a
                      href="#terms"
                      onClick={(e) => e.preventDefault()}
                      className="text-white underline hover:text-blue-400"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="#privacy"
                      onClick={(e) => e.preventDefault()}
                      className="text-white underline hover:text-blue-400"
                    >
                      Privacy Policy
                    </a>
                    .
                  </label>
                </div>
              )}
            </div>

            {/* Bottom Toggle between Sign In and Register */}
            <div className="pt-2 text-center text-xs text-gray-400">
              {isRegister ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => toggleView('login')}
                    className="font-semibold text-white underline hover:text-blue-400 transition-colors ml-1"
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
                    className="font-semibold text-white underline hover:text-blue-400 transition-colors ml-1"
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
            <div className="w-full rounded-2xl bg-[#141923] border border-white/[0.06] p-4 sm:p-5 flex flex-col items-center">
              <label className="block text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-4 text-center">
                ENTER 6-DIGIT VERIFICATION CODE
              </label>

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
                    className="w-11 h-12 text-center text-lg font-bold text-white bg-[#0a0d14] border border-white/[0.1] rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => submitOtpCode()}
                disabled={isSubmitting || otpCode.join('').length !== 6}
                className="w-full py-3 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
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

              {/* Resend Code Timer */}
              <div className="mt-4 text-center text-xs text-gray-400">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isSubmitting}
                    className="font-semibold text-blue-400 hover:underline cursor-pointer"
                  >
                    Resend verification code
                  </button>
                ) : (
                  <span>Resend code in {resendCountdown}s</span>
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
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Wrong email? <span className="underline">Change email address</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

