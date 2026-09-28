import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  icon?: 'trash' | 'warning';
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Post?',
  description = 'Are you sure you want to delete this post? This action is permanent and cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading: controlledLoading,
  errorMessage: controlledError,
  icon = 'trash',
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDeleting = controlledLoading !== undefined ? controlledLoading : internalLoading;
  const activeError = controlledError !== undefined ? controlledError : internalError;

  const handleConfirm = async () => {
    setInternalLoading(true);
    setInternalError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setInternalError(err?.message || 'Failed to delete. Please try again.');
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-surface border border-border-subtle rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl text-textPrimary relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Badge */}
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          {icon === 'warning' ? (
            <AlertTriangle className="w-6 h-6 text-danger" />
          ) : (
            <Trash2 className="w-6 h-6 text-danger" />
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-textPrimary">
            {title}
          </h3>
          <p className="text-[12.5px] text-textTertiary leading-relaxed">
            {description}
          </p>
        </div>

        {/* Error message */}
        {activeError && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-[12px] text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-border-subtle hover:border-border text-[13px] font-semibold text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-danger hover:bg-danger/90 active:scale-[0.98] text-[13px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-white" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
