import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Edit3,
  LogOut,
  Trash2,
  ChevronRight,
  Shield,
  Lock,
  Bell,
  Sun,
  Moon,
  HelpCircle,
  FileText,
  User as UserIcon,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';
import { profileService } from '@/features/profiles/services/profileService';
import { ConfirmDeleteModal } from '@/components';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit: () => void;
}

interface PlaceholderSetting {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  badge?: string;
  details: {
    heading: string;
    description: string;
    points: { label: string; value: string; status?: string }[];
    footerNote: string;
  };
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenEdit,
}) => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Active placeholder detail popup state
  const [activePlaceholder, setActivePlaceholder] = useState<PlaceholderSetting | null>(null);

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
      throw err;
    }
  };

  const privacySetting: PlaceholderSetting = {
    title: 'Privacy & Policy',
    icon: <Shield className="w-4 h-4 text-textPrimary" />,
    subtitle: 'Profile visibility, read receipts & data policies',
    badge: 'Standard',
    details: {
      heading: 'Student Privacy & Data Policy',
      description:
        'TemariCom is dedicated to protecting student privacy, academic integrity, and campus communications.',
      points: [
        { label: 'Profile Visibility', value: 'Public to Campus Students', status: 'Active' },
        { label: 'Direct Messages', value: 'Verified Campus Members Only', status: 'Active' },
        { label: 'Last Seen & Online State', value: 'Visible to Chat Contacts', status: 'Active' },
        { label: 'Data Encryption', value: 'AES-256 in Transit & at Rest', status: 'Enforced' },
        { label: 'Academic ID Protection', value: 'Encrypted & Never Shared', status: 'Protected' },
      ],
      footerNote:
        'Customizable privacy toggles, stealth mode, and selective read receipt preferences will be fully interactive here in the upcoming release.',
    },
  };

  const securitySetting: PlaceholderSetting = {
    title: 'Security & Access',
    icon: <Lock className="w-4 h-4 text-textPrimary" />,
    subtitle: 'Password, two-step verification & active sessions',
    badge: 'Secure',
    details: {
      heading: 'Account Security & Access Control',
      description:
        'Manage credential authentication, connected devices, and two-factor safety protocols.',
      points: [
        { label: 'Authentication Mode', value: 'Email / Phone OTP & Password', status: 'Active' },
        { label: 'Active Sessions', value: 'Current Browser Session', status: '1 Device' },
        { label: 'Two-Factor Authentication', value: 'Email Verification OTP', status: 'Enabled' },
        { label: 'Login Alerts', value: 'Instant Security Alerts', status: 'Active' },
      ],
      footerNote:
        'Multi-device session revocation, passkeys, and biometric auth controls are scheduled for the next release.',
    },
  };

  const notificationsSetting: PlaceholderSetting = {
    title: 'Notifications & Alerts',
    icon: <Bell className="w-4 h-4 text-textPrimary" />,
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
        'Granular sound selectors, quiet hours, and channel-specific notification frequency will be available soon.',
    },
  };

  const termsSetting: PlaceholderSetting = {
    title: 'Terms of Service',
    icon: <FileText className="w-4 h-4 text-textPrimary" />,
    subtitle: 'Student guidelines and campus community terms',
    details: {
      heading: 'Campus Community Terms & Guidelines',
      description:
        'Guidelines ensuring respectful, harassment-free, and productive collaboration across all university departments.',
      points: [
        { label: 'Code of Conduct', value: 'Zero Tolerance for Harassment', status: 'Strict' },
        { label: 'Academic Integrity', value: 'No Unauthorized Exam Sharing', status: 'Strict' },
        { label: 'Marketplace Safety', value: 'Safe In-Person Campus Exchanges', status: 'Standard' },
        { label: 'User Agreement', value: 'Version 2.4 - University Tier', status: 'Current' },
      ],
      footerNote:
        'Full legal documentation and campus terms can be downloaded or reviewed anytime.',
    },
  };

  return (
    <>
      {/* Main Settings Modal Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden text-textPrimary flex flex-col max-h-[90dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
            <div className="flex items-center gap-2">
              <h2 id="settings-modal-title" className="text-base sm:text-lg font-bold text-textPrimary">
                Settings
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-5 h-5 text-textPrimary" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 space-y-3">
            {/* User Mini Card */}
            {authUser && (
              <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border flex items-center gap-3">
                {authUser.avatar_url ? (
                  <img
                    src={authUser.avatar_url}
                    alt={authUser.full_name || authUser.username || ''}
                    className="w-11 h-11 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center text-textSecondary shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-textPrimary truncate leading-tight">
                    {authUser.full_name || authUser.username || 'Student User'}
                  </p>
                  <p className="text-xs text-textTertiary truncate mt-0.5">
                    {authUser.email || `@${authUser.username}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit();
                  }}
                  className="px-3 py-1.5 rounded-pill border border-border hover:bg-surface text-xs font-semibold text-textPrimary transition-colors cursor-pointer shrink-0"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Group 1: Core Preferences */}
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/40">
              {/* Privacy & Policy */}
              <button
                type="button"
                onClick={() => setActivePlaceholder(privacySetting)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                    {privacySetting.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        {privacySetting.title}
                      </p>
                      {privacySetting.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-textSecondary">
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
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                    {securitySetting.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        {securitySetting.title}
                      </p>
                      {securitySetting.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-textSecondary">
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

              {/* Notifications */}
              <button
                type="button"
                onClick={() => setActivePlaceholder(notificationsSetting)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                    {notificationsSetting.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        {notificationsSetting.title}
                      </p>
                      {notificationsSetting.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-textSecondary">
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

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
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

            {/* Group 2: Support & Guidelines */}
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/40">
              {/* Help & FAQ */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/faq');
                }}
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
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

            {/* Group 3: Account Actions & Danger Zone */}
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/40">
              {/* Log Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-textPrimary shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-textPrimary leading-tight">
                      Log Out
                    </p>
                    <p className="text-xs text-textTertiary mt-0.5 truncate">
                      Sign out of this session
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-textTertiary group-hover:text-textPrimary transition-colors shrink-0 ml-2" />
              </button>

              {/* Delete Account */}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-danger/10 transition-colors text-left cursor-pointer group text-danger"
              >
                <div className="flex items-center gap-3 min-w-0">
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
      </div>

      {/* Interactive Detail / Placeholder Dialog */}
      {activePlaceholder && (
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
        description="This action cannot be undone. All your profile information, academic records, and session data will be permanently deleted from our servers."
        confirmLabel="Delete Forever"
        icon="warning"
      />
    </>
  );
};

export default ProfileSettingsModal;
