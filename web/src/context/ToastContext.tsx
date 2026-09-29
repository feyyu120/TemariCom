import React, { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type ToastType = 'chat' | 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title: string;
  message: string;
  avatarUrl?: string;
  actionData?: any;
  durationMs?: number;
  onPress?: () => void;
}

export interface ShowChatToastParams {
  conversationId: string;
  senderName: string;
  message: string;
  avatarUrl?: string;
  onPress?: () => void;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
  showChatToast: (params: ShowChatToastParams) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    setIsVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTimeout(() => {
      setCurrentToast(null);
    }, 250);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const toast: ToastOptions = {
      ...options,
      id: options.id || `toast-${Date.now()}`,
      durationMs: options.durationMs ?? 4500,
    };
    setCurrentToast(toast);
    setIsVisible(true);

    if (toast.durationMs && toast.durationMs > 0) {
      timerRef.current = setTimeout(() => {
        hideToast();
      }, toast.durationMs);
    }
  }, [hideToast]);

  const showChatToast = useCallback(
    ({ conversationId, senderName, message, avatarUrl, onPress }: ShowChatToastParams) => {
      showToast({
        id: `chat-${conversationId}-${Date.now()}`,
        type: 'chat',
        title: senderName,
        message,
        avatarUrl,
        actionData: { conversationId },
        onPress: () => {
          if (onPress) {
            onPress();
          } else {
            navigate(`/chat?conversationId=${conversationId}`);
          }
        },
      });
    },
    [showToast, navigate]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      hideToast,
      showChatToast,
    }),
    [showToast, hideToast, showChatToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-2rem)] md:w-[420px] pointer-events-auto"
        >
          <div
            onClick={() => {
              hideToast();
              currentToast.onPress?.();
            }}
            className={`w-full bg-surface-elevated/95 backdrop-blur-md border border-border rounded-large shadow-2xl p-3 flex items-center gap-3 cursor-pointer transition-all duration-300 ease-out select-none transform hover:scale-[1.01] active:scale-[0.99] ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-4 pointer-events-none'
            }`}
          >
            {/* Avatar / Icon Container */}
            <div className="relative shrink-0">
              {currentToast.avatarUrl ? (
                <img
                  src={currentToast.avatarUrl}
                  alt={currentToast.title}
                  className="w-10 h-10 rounded-full object-cover border border-border-subtle"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-active/15 text-active flex items-center justify-center font-bold text-sm border border-border-subtle">
                  {currentToast.title ? currentToast.title.charAt(0).toUpperCase() : <MessageSquare className="w-5 h-5" />}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-unread border-2 border-surface-elevated rounded-full" />
            </div>

            {/* Content text */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-bold text-textPrimary truncate">
                  {currentToast.title}
                </span>
                <span className="text-[10px] text-textTertiary shrink-0">Now</span>
              </div>
              <p className="text-xs text-textSecondary truncate leading-snug">
                {currentToast.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hideToast();
              }}
              className="p-1 text-textTertiary hover:text-textPrimary rounded-full hover:bg-surface transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function useInAppToast(): ToastContextValue {
  return useToast();
}

export default ToastProvider;
