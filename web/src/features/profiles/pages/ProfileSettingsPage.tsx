import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  LogOut,
  Trash2,
  ChevronRight,
  User as UserIcon,
  Shield,
  Lock,
  Bell,
  Sun,
  Moon,
  HelpCircle,
  FileText,
  Menu,
  Info,
  X,
  Edit3,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';
import { useMyProfile } from '@/features/profiles/hooks/useMyProfile';
import { profileService } from '@/features/profiles/services/profileService';
import { EditProfileModal } from '@/features/profiles/components/EditProfileModal';
import { MobileBottomNav } from '@/features/home/components/MobileBottomNav';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { ConfirmDeleteModal } from '@/components';

interface SettingItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  badge?: string;
  details?: {
    heading: string;
    description: string;
    points: { label: string; value: string; status?: string }[];
    footerNote: string;
  };
}

export const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { data: profile } = useMyProfile();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Active placeholder detail popup state
  const [activePlaceholder, setActivePlaceholder] = useState<SettingItem | null>(null);

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

  const privacySetting: SettingItem = {
    id: 'privacy',
    title: 'Privacy & Policy',
    icon: <Shield className="w-4 h-4 text-emerald-500" />,
    subtitle: 'Profile visibility, read receipts & data policies',
    badge: 'Standard',
    details: {
      heading: 'Student Privacy & Data Policy',
      description:
        'TemariCom protects student personal records, campus interactions, and private communications.',
      points: [
        { label: 'Profile Visibility', value: 'Public to Campus Students', status: 'Active' },
        { label: 'Direct Messages', value: 'Verified Campus Members Only', status: 'Active' },
        { label: 'Last Seen & Online State', value: 'Visible to Chat Contacts', status: 'Active' },
        { label: 'Data Encryption', value: 'AES-256 in Transit & at Rest', status: 'Enforced' },
        { label: 'Academic ID Protection', value: 'Encrypted & Never Shared', status: 'Protected' },
      ],
      footerNote:
        'Full privacy toggles, ghost mode, and selective read receipt controls will be configurable here in the upcoming release.',
    },
  };

  const securitySetting: SettingItem = {
    id: 'security',
    title: 'Security & Access',
    icon: <Lock className="w-4 h-4 text-blue-500" />,
    subtitle: 'Password, two-step verification & active sessions',
    badge: 'Protected',
    details: {
      heading: 'Account Security & Access Control',
      description:
        'Manage login credentials, authorized campus devices, and two-factor authentication.',
      points: [
        { label: 'Authentication Mode', value: 'Email / Phone OTP & Password', status: 'Active' },
        { label: 'Active Sessions', value: 'Current Browser Session', status: '1 Device' },
        { label: 'Two-Factor Authentication', value: 'Email Verification OTP', status: 'Enabled' },
        { label: 'Login Alerts', value: 'Instant Security Alerts', status: 'Active' },
      ],
      footerNote:
        'Biometric authentication, passkeys, and remote session revocation will be enabled soon.',
    },
  };

  const notificationsSetting: SettingItem = {
    id: 'notifications',
    title: 'Notifications & Alerts',
    icon: <Bell className="w-4 h-4 text-amber-500" />,
    subtitle: 'Direct messages, campus updates & study alerts',
    badge: 'On',
    details: {
      heading: 'Notification Preferences',
      description: 'Configure real-time push, in-app badges, and campus opportunity alerts.',
      points: [
        { label: 'Direct Chat Messages', value: 'Push & Sound Notifications', status: 'Enabled' },
        { label: 'Campus Announcements', value: 'Official University Notices', status: 'Enabled' },
        { label: 'Opportunities & Jobs', value: 'Internship & Research Alerts', status: 'Enabled' },
        { label: 'Lost & Found Matches', value: 'Smart Keyword Matches', status: 'Active' },
      ],
      footerNote:
        'Sound customization, quiet hours, and frequency sliders will be available in the upcoming release.',
    },
  };

  const termsSetting: SettingItem = {
    id: 'terms',
    title: 'Terms of Service',
    icon: <FileText className="w-4 h-4 text-purple-500" />,
    subtitle: 'Student guidelines and campus community terms',
    details: {
      heading: 'Campus Community Terms & Guidelines',
      description:
        'Community standards ensuring respectful, harassment-free, and productive collaboration across campus.',
      points: [
        { label: 'Code of Conduct', value: 'Zero Tolerance for Harassment', status: 'Strict' },
        { label: 'Academic Integrity', value: 'No Unauthorized Exam Sharing', status: 'Strict' },
        { label: 'Marketplace Safety', value: 'Safe In-Person Campus Exchanges', status: 'Standard' },
        { label: 'User Agreement', value: 'Version 2.4 - University Tier', status: 'Current' },
      ],
      footerNote:
        'Full legal documentation and university policies can be reviewed anytime.',
    },
  };

  return (
    <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased selection:bg-surface-elevated">
      {/* 1. Desktop Left Navigation Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Scrollable Container */}
      <main className="flex-1 min-w-0 min-h-0 h-full max-h-full overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-r-0 lg:border-r border-border-subtle bg-background pb-20 lg:pb-12">
        {/* Top Header */}
        <header className="h-[53px] sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-3.5 sm:px-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
              aria-label="Back to profile"
            >
              <ArrowLeft className="w-5 h-5 text-textPrimary" />
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5 text-textPrimary" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-textPrimary tracking-tight truncate">
              Settings
            </h1>
          </div>
          <Link
            to="/profile"
            className="text-xs font-semibold px-3 py-1.5 rounded-pill border border-border hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors shrink-0"
          >
            Profile
          </Link>
        </header>

        {/* Main Settings Body */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 w-full">
          {/* User Account Info Card */}
          {authUser && (
            <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border flex items-center gap-3">
              {authUser.avatar_url ? (
                <img
                  src={authUser.avatar_url}
                  alt={authUser.full_name || authUser.username || ''}
                  className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-textSecondary shrink-0">
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-textPrimary truncate">
                  {authUser.full_name || authUser.username || 'Student User'}
                </p>
                <p className="text-xs text-textTertiary truncate mt-0.5">
                  {authUser.email || `@${authUser.username}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3.5 py-1.5 rounded-pill border border-border hover:bg-surface text-xs font-semibold text-textPrimary transition-colors cursor-pointer shrink-0"
              >
                Edit
              </button>
            </div>
          )}

          {/* Section 1: Privacy & Security */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textTertiary px-1">
              Privacy & Security
            </h2>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/30">
              {/* Privacy & Policy */}
              <button
                type="button"
                onClick={() => setActivePlaceholder(privacySetting)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    {privacySetting.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        {privacySetting.title}
                      </p>
                      {privacySetting.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                          {privacySetting.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      {privacySetting.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors shrink-0 ml-2" />
              </button>

              {/* Security & Access */}
              <button
                type="button"
                onClick={() => setActivePlaceholder(securitySetting)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    {securitySetting.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        {securitySetting.title}
                      </p>
                      {securitySetting.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                          {securitySetting.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      {securitySetting.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* Section 2: Preferences */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textTertiary px-1">
              Preferences
            </h2>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/30">
              {/* Notifications */}
              <button
                type="button"
                onClick={() => setActivePlaceholder(notificationsSetting)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    {notificationsSetting.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        {notificationsSetting.title}
                      </p>
                      {notificationsSetting.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                          {notificationsSetting.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      {notificationsSetting.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors shrink-0 ml-2" />
              </button>

              {/* Theme & Display */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0 text-textPrimary">
                    {isDark ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-textPrimary leading-tight">
                      Theme & Display
                    </p>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      Currently using {isDark ? 'Dark Theme' : 'Light Theme'} (Tap to switch)
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-textSecondary bg-surface px-2.5 py-1 rounded-pill border border-border shrink-0 ml-2">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Support & Legal */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textTertiary px-1">
              Support & Guidelines
            </h2>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/30">
              {/* Help & FAQ */}
              <button
                type="button"
                onClick={() => navigate('/faq')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0 text-textPrimary">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-textPrimary leading-tight">
                      Help & FAQ
                    </p>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      Frequently asked questions & student support
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors shrink-0 ml-2" />
              </button>

              {/* Terms of Service */}
              <button
                type="button"
                onClick={() => setActivePlaceholder(termsSetting)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0 text-textPrimary">
                    {termsSetting.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-textPrimary leading-tight">
                      {termsSetting.title}
                    </p>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      {termsSetting.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* Section 4: Account Actions & Danger Zone */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textTertiary px-1">
              Account Actions
            </h2>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/30">
              {/* Log Out Entry */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-textPrimary shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-textPrimary leading-tight">
                      Log Out
                    </p>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      Sign out of your active account session
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors shrink-0 ml-2" />
              </button>

              {/* Delete Account Entry */}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-danger/10 transition-colors text-left cursor-pointer group text-danger"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-danger leading-tight">
                      Delete Account
                    </p>
                    <p className="text-xs text-danger/80 mt-0.5 truncate">
                      Permanently delete account and all profile data
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-danger/60 group-hover:text-danger transition-colors shrink-0 ml-2" />
              </button>
            </div>
          </div>
        </div>

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

        {/* Edit Profile Modal */}
        {profile && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            profile={profile}
          />
        )}
      </main>

      {/* Interactive Detail Dialog for Placeholder Settings */}
      {activePlaceholder && activePlaceholder.details && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          onClick={() => setActivePlaceholder(null)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden text-textPrimary animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                  {activePlaceholder.icon}
                </div>
                <h3 className="text-base font-bold text-textPrimary leading-tight">
                  {activePlaceholder.details.heading}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePlaceholder(null)}
                className="p-1 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <p className="text-xs text-textSecondary leading-relaxed">
                {activePlaceholder.details.description}
              </p>

              {/* Status Points */}
              <div className="rounded-2xl border border-border bg-surface-elevated/40 divide-y divide-border overflow-hidden">
                {activePlaceholder.details.points.map((pt, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <span className="text-textSecondary font-medium">{pt.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-textPrimary">{pt.value}</span>
                      {pt.status && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                          {pt.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Informative Note */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-elevated border border-border text-xs text-textTertiary leading-relaxed">
                <Info className="w-4 h-4 text-active shrink-0 mt-0.5" />
                <span>{activePlaceholder.details.footerNote}</span>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => setActivePlaceholder(null)}
                className="w-full py-2.5 rounded-xl bg-active hover:bg-active/90 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-sm cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default ProfileSettingsPage;
