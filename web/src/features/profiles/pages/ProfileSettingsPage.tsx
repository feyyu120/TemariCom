import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  LogOut,
  Trash2,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useMyProfile } from '@/features/profiles/hooks/useMyProfile';
import { profileService } from '@/features/profiles/services/profileService';
import { EditProfileModal } from '@/features/profiles/components/EditProfileModal';
import { MobileBottomNav } from '@/features/home/components/MobileBottomNav';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { ConfirmDeleteModal } from '@/components';

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
      throw err;
    }
  };

  return (
    <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased selection:bg-surface-elevated">
      {/* 1. Desktop Left Navigation Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Scrollable Container */}
      <div className="flex-1 min-h-0 h-full max-h-full overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-w-0 bg-background flex flex-col pb-20 lg:pb-12">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle shrink-0">
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
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 w-full flex-1">
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
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
        errorMessage={deleteError}
        title="Delete Account Forever?"
        description="This action is permanent and irreversible. All your profile information, academic records, and session data will be permanently wiped."
        confirmLabel="Delete Forever"
        icon="warning"
      />
      </div>

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

