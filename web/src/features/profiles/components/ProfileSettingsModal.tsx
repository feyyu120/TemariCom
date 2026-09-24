import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Edit3,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { profileService } from '@/features/profiles/services/profileService';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenEdit,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await profileService.deleteAccount();
      await logout();
      onClose();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl shadow-2xl overflow-hidden text-textPrimary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface">
          <h2 id="settings-modal-title" className="text-base font-bold text-textPrimary">
            {showDeleteConfirm ? 'Delete Account' : 'Profile Settings'}
          </h2>
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(false);
              onClose();
            }}
            className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5 text-textPrimary" />
          </button>
        </div>

        {/* Content */}
        {!showDeleteConfirm ? (
          <div className="p-3 space-y-1">
            {/* 1. Edit Profile */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEdit();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-textPrimary group-hover:bg-surface">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-textPrimary leading-tight">
                    Edit Profile
                  </p>
                  <p className="text-xs text-textTertiary mt-0.5">
                    Update info, bio & academics
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors" />
            </button>

            {/* 2. Log Out */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-textPrimary group-hover:bg-surface">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-textPrimary leading-tight">
                    Log Out
                  </p>
                  <p className="text-xs text-textTertiary mt-0.5">
                    Sign out of this session
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors" />
            </button>

            <div className="h-[1px] bg-border-subtle my-1 mx-2" />

            {/* 3. Delete Account */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-danger/10 transition-colors text-left cursor-pointer group text-danger"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-danger leading-tight">
                    Delete Account
                  </p>
                  <p className="text-xs text-danger/80 mt-0.5">
                    Permanently delete account
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-danger/60 group-hover:text-danger transition-colors" />
            </button>
          </div>
        ) : (
          /* Confirmation Dialog */
          <div className="p-5 space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <p className="text-sm font-bold text-textPrimary">
                Are you absolutely sure?
              </p>
              <p className="text-xs text-textTertiary leading-relaxed">
                This action cannot be undone. All your profile information, academic records, and session data will be permanently deleted from our servers.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-pill border border-border text-xs font-semibold text-textSecondary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-pill bg-danger hover:bg-danger/90 active:scale-[0.98] text-xs font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Forever</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettingsModal;

