import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useMyProfile } from '@/features/profiles/hooks/useMyProfile';
import { profileService } from '@/features/profiles/services/profileService';
import { EditProfileModal } from '@/features/profiles/components/EditProfileModal';
import { MobileBottomNav } from '@/features/home/components/MobileBottomNav';

export const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { data: profile } = useMyProfile();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/profile');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await profileService.deleteAccount();
      await logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-textPrimary pb-20 animate-fadeIn">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer"
              aria-label="Back to profile"
            >
              <ArrowLeft className="w-5 h-5 text-textPrimary" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-textPrimary tracking-tight">
              Settings
            </h1>
          </div>
          <Link
            to="/profile"
            className="text-xs font-semibold px-3 py-1.5 rounded-pill border border-border-subtle hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors"
          >
            Profile
          </Link>
        </div>
      </header>

      {/* Main Settings List */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Account Info Card */}
        {authUser && (
          <div className="p-4 rounded-2xl bg-surface/40 border border-border-subtle flex items-center gap-3">
            {authUser.avatar_url ? (
              <img
                src={authUser.avatar_url}
                alt={authUser.full_name || authUser.username || ''}
                className="w-12 h-12 rounded-full object-cover border border-border-subtle shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-textSecondary shrink-0">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-textPrimary truncate">
                {authUser.full_name || authUser.username || 'Student User'}
              </p>
              <p className="text-xs text-textTertiary truncate">
                {authUser.email || `@${authUser.username}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-1.5 rounded-pill border border-border-subtle hover:bg-surface-elevated text-xs font-semibold text-textPrimary transition-colors cursor-pointer shrink-0"
            >
              Edit
            </button>
          </div>
        )}

        {/* Settings Group */}
        <div className="rounded-2xl border border-border-subtle divide-y divide-border-subtle overflow-hidden bg-surface/20">
          {/* Log Out Entry */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-textPrimary">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-textPrimary">Log Out</p>
                <p className="text-xs text-textTertiary mt-0.5">
                  Sign out of your active account session
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors" />
          </button>

          {/* Delete Account Entry */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-danger/10 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-danger">Delete Account</p>
                <p className="text-xs text-danger/80 mt-0.5">
                  Permanently delete account and all profile data
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-danger/60 group-hover:text-danger transition-colors" />
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm bg-surface border border-border-subtle rounded-3xl p-5 space-y-4 shadow-2xl text-textPrimary"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-textPrimary">
                Delete Account Forever?
              </h3>
              <p className="text-xs text-textTertiary leading-relaxed">
                This action is permanent and irreversible. All your profile information, academic records, and session data will be permanently wiped.
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
        </div>
      )}

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default ProfileSettingsPage;

