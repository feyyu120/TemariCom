import React, { useEffect } from 'react';
import {
  ArrowLeft,
  X,
  UserPlus,
  Mail,
  Sparkles,
  ShieldCheck,
  LogIn,
  Key,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { AuthModalView } from '../context/AuthContext';

export interface AuthHelpModalProps {
  isOpen: boolean;
  type: AuthModalView;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

export const AuthHelpModal: React.FC<AuthHelpModalProps> = ({
  isOpen,
  type,
  onClose,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const registerFAQs: FAQItem[] = [
    {
      question: '1. How can I register?',
      answer:
        'Enter your valid email address (personal or university email). We will send a 6-digit verification code to confirm your email.',
      icon: <UserPlus className="w-4 h-4 text-textPrimary" />,
    },
    {
      question: '2. How can I get my OTP code?',
      answer:
        'We will send the 6-digit verification code directly to your email. Please check your Inbox (and your Spam or Promotions folder if not found within a few seconds).',
      icon: <Mail className="w-4 h-4 text-textPrimary" />,
    },
    {
      question: '3. What happens after email verification?',
      answer:
        'You will be redirected to the Profile Setup screen where you can choose your username, campus, department, and phone number. You can also skip setup and complete it anytime later in your profile!',
      icon: <Sparkles className="w-4 h-4 text-textPrimary" />,
    },
    {
      question: '4. Is registration completely free?',
      answer:
        'Yes! TemariCom is 100% free for all university students, tutors, and academic communities across Ethiopia.',
      icon: <ShieldCheck className="w-4 h-4 text-textPrimary" />,
    },
  ];

  const loginFAQs: FAQItem[] = [
    {
      question: '1. How can I sign in?',
      answer:
        'Enter your registered email address, username, or phone number (if you have already added your phone in your profile).',
      icon: <LogIn className="w-4 h-4 text-textPrimary" />,
    },
    {
      question: '2. How can I get my login OTP code?',
      answer:
        '• If you have an active session on another device, we will send an in-app verification code to your TemariCom app.\n• If you do not have an active session, we will send the verification code directly to your email.',
      icon: <Key className="w-4 h-4 text-textPrimary" />,
    },
    {
      question: '3. What if I do not receive the code?',
      answer:
        'Make sure your email address was typed correctly and check your Spam folder. You can request a new code once the countdown timer expires.',
      icon: <RefreshCw className="w-4 h-4 text-textPrimary" />,
    },
    {
      question: '4. Is Two-Step Verification available?',
      answer:
        'Yes! You can enable Two-Step Verification with a custom password inside your Account & Security settings at any time.',
      icon: <Lock className="w-4 h-4 text-textPrimary" />,
    },
  ];

  const faqs = type === 'register' ? registerFAQs : loginFAQs;
  const title = type === 'register' ? 'Registration FAQ' : 'Sign In FAQ';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[460px] max-h-[85vh] flex flex-col rounded-3xl bg-surface border border-border shadow-2xl text-textPrimary overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 p-1 -ml-1 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-textPrimary" />
            <span className="font-bold text-base text-textPrimary">{title}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close FAQ"
          >
            <X className="w-5 h-5 text-textPrimary" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          <p className="text-[11px] font-semibold text-textTertiary uppercase tracking-wider">
            Frequently Asked Questions
          </p>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border transition-colors text-left"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-surface border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                    {faq.icon}
                  </div>
                  <h3 className="text-sm font-bold text-textPrimary leading-snug">
                    {faq.question}
                  </h3>
                </div>
                <p className="text-xs text-textSecondary leading-relaxed whitespace-pre-line pl-10">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle bg-surface text-center">
          <p className="text-[11px] text-textTertiary">
            Still need help? Reach out via campus support or contact@temaricom.et
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthHelpModal;
