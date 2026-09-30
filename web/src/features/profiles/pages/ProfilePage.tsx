import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  FileText,
  Repeat2,
  Bookmark,
  AlertCircle,
  LogIn,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useMyProfile, useUserProfile } from '@/features/profiles/hooks';
import { ProfileSkeleton } from '@/features/profiles/components/ProfileSkeleton';
import { ProfileHeader } from '@/features/profiles/components/ProfileHeader';
import { EditProfileModal } from '@/features/profiles/components/EditProfileModal';
import { MobileBottomNav } from '@/features/home/components/MobileBottomNav';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';

type ProfileTab = 'posts' | 'reposts' | 'saved';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser, isAuthenticated, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Setup mode check from URL query params (e.g. fresh registration)
  const isSetupMode = searchParams.get('setup') === 'true';

  // If `:id` is provided in URL, fetch public user profile; otherwise fetch my profile
  const isViewingSpecificUser = Boolean(id && id !== authUser?.id);

  const myProfileQuery = useMyProfile();
  const userProfileQuery = useUserProfile(isViewingSpecificUser ? id : undefined);

  const activeQuery = isViewingSpecificUser ? userProfileQuery : myProfileQuery;
  const { data: profile, isLoading, isError, error, refetch } = activeQuery;

  // Automatically trigger setup modal when navigated with ?setup=true
  useEffect(() => {
    if (isSetupMode && profile) {
      setIsEditModalOpen(true);
    }
  }, [isSetupMode, profile]);

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      navigate(returnUrl, { replace: true });
    } else if (isSetupMode) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('setup');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // If user visits /profile while not logged in
  if (!isViewingSpecificUser && !isAuthenticated) {
    return (
      <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased selection:bg-surface-elevated">
        {/* Desktop Left Navigation Sidebar */}
        <div className="hidden lg:flex shrink-0">
          <LeftSidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 h-full max-h-full overflow-y-auto min-w-0 bg-background flex flex-col justify-between">
          <header className="h-[53px] sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-3.5 sm:px-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5 text-textPrimary" />
              </button>
              <span className="font-bold text-base text-textPrimary">Profile</span>
            </div>
            <div className="w-6" />
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-sm w-full p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle text-center space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center mx-auto text-textPrimary">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-textPrimary">Sign In to View Profile</h2>
                <p className="text-xs text-textTertiary mt-1 leading-relaxed">
                  Connect with classmates, showcase your degree and academic year, and manage your campus activities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-pill bg-textPrimary hover:bg-textPrimary/90 active:scale-[0.99] text-background font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            </div>
          </main>

          <MobileBottomNav />

          <MobileDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased selection:bg-surface-elevated">
      {/* 1. Desktop Left Navigation Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Scrollable Container */}
      <main className="flex-1 min-w-0 min-h-0 h-full max-h-full overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-r-0 lg:border-r border-border-subtle bg-background pb-20 lg:pb-12">
        {/* TOP STICKY HEADER: Hamburger/Back Button | "Profile" | Settings Gear */}
        <header className="h-[53px] sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-3.5 sm:px-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {isViewingSpecificUser ? (
              <button
                type="button"
                onClick={handleBack}
                className="p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-textPrimary" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5 text-textPrimary" />
              </button>
            )}
            <h1 className="text-base sm:text-lg font-bold text-textPrimary tracking-tight truncate">
              {isViewingSpecificUser ? (profile?.user?.full_name || 'Profile') : 'Profile'}
            </h1>
          </div>

          {/* Settings Icon -> navigates to /profile/settings */}
          <button
            type="button"
            onClick={() => navigate('/profile/settings')}
            className="p-1.5 -mr-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
            title="Profile Settings"
            aria-label="Profile Settings"
          >
            <Settings className="w-5 h-5 text-textPrimary" />
          </button>
        </header>

        {/* MAIN PROFILE CONTAINER */}
        <div className="max-w-2xl mx-auto w-full">
        {isLoading ? (
          <ProfileSkeleton />
        ) : isError || !profile ? (
          <div className="p-8 rounded-3xl bg-surface border border-border-subtle text-center space-y-4 max-w-sm mx-auto mt-12">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-textPrimary">Failed to Load Profile</h2>
              <p className="text-xs text-textTertiary mt-1">
                {(error as any)?.message || 'This student profile could not be found.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-pill border border-border-subtle hover:bg-surface-elevated text-xs font-semibold text-textPrimary transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Profile Hero & 4-Column Academic Meta Bar */}
            <div className="px-4 sm:px-6">
              <ProfileHeader
                profile={profile}
                onEditClick={() => setIsEditModalOpen(true)}
                isCurrentUser={!isViewingSpecificUser || profile.user?.id === authUser?.id}
              />
            </div>

            {/* 3. TABS BAR: Posts | Reposts | Saved */}
            <div className="mt-4 border-b border-border-subtle flex items-center justify-around px-4">
              {/* Tab 1: Posts */}
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'posts'
                    ? 'text-textPrimary'
                    : 'text-textTertiary hover:text-textSecondary'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Posts</span>
                {activeTab === 'posts' && (
                  <div className="absolute bottom-0 left-6 right-6 h-[2.5px] bg-textPrimary rounded-full animate-fadeIn" />
                )}
              </button>

              {/* Tab 2: Reposts */}
              <button
                type="button"
                onClick={() => setActiveTab('reposts')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'reposts'
                    ? 'text-textPrimary'
                    : 'text-textTertiary hover:text-textSecondary'
                }`}
              >
                <Repeat2 className="w-4 h-4" />
                <span>Reposts</span>
                {activeTab === 'reposts' && (
                  <div className="absolute bottom-0 left-6 right-6 h-[2.5px] bg-textPrimary rounded-full animate-fadeIn" />
                )}
              </button>

              {/* Tab 3: Saved */}
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors relative cursor-pointer ${
                  activeTab === 'saved'
                    ? 'text-textPrimary'
                    : 'text-textTertiary hover:text-textSecondary'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Saved</span>
                {activeTab === 'saved' && (
                  <div className="absolute bottom-0 left-6 right-6 h-[2.5px] bg-textPrimary rounded-full animate-fadeIn" />
                )}
              </button>
            </div>

            {/* 4. TAB CONTENT (No mock data - shows 'No posts yet' until post module is implemented) */}
            <div className="divide-y divide-border-subtle">
              {activeTab === 'posts' && (
                <div className="p-12 text-center space-y-2">
                  <p className="text-sm font-bold text-textPrimary">No posts yet</p>
                  <p className="text-xs text-textTertiary">
                    When you share notes, thoughts, or projects, they will show up here.
                  </p>
                </div>
              )}

              {activeTab === 'reposts' && (
                <div className="p-12 text-center space-y-2">
                  <p className="text-sm font-bold text-textPrimary">No reposts yet</p>
                  <p className="text-xs text-textTertiary">
                    Posts reposted to your profile will appear here.
                  </p>
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="p-12 text-center space-y-2">
                  <p className="text-sm font-bold text-textPrimary">No saved items</p>
                  <p className="text-xs text-textTertiary">
                    Items you bookmark will be privately saved here for later.
                  </p>
                </div>
              )}
            </div>

            {/* Edit / Setup Profile Modal */}
            {profile && (
              <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                profile={profile}
                isSetupMode={isSetupMode}
                onSkip={handleCloseEditModal}
              />
            )}
          </>
        )}
        </div>
      </main>

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Fixed bottom navigation for mobile */}
      <MobileBottomNav />
    </div>
  );
};

export default ProfilePage;
