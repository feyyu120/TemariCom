import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  LogOut,
  Trash2,
  ChevronDown,
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
  Check,
  Info,
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

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 border border-border-subtle ${
      checked ? 'bg-textPrimary' : 'bg-surface-elevated'
    }`}
  >
    <div
      className={`w-5 h-5 rounded-full transition-transform ${
        checked
          ? 'translate-x-5 bg-background shadow-sm'
          : 'translate-x-0 bg-textSecondary shadow-sm'
      }`}
    />
  </button>
);

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

  // Accordion dropdown state: stores the ID of the expanded section
  const [expandedSection, setExpandedSection] = useState<string | null>('privacy');

  // Interactive toggle states for settings (persisted locally)
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [messagePrivacy, setMessagePrivacy] = useState<'all' | 'mutual'>('all');
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [chatNotifs, setChatNotifs] = useState(true);
  const [campusNotifs, setCampusNotifs] = useState(true);
  const [oppNotifs, setOppNotifs] = useState(true);
  const [lostNotifs, setLostNotifs] = useState(true);

  const toggleAccordion = (sectionId: string) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

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
      <main className="flex-1 min-w-0 min-h-0 h-full max-h-full overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-r-0 lg:border-r border-border-subtle bg-background pb-20 lg:pb-12">
        {/* Top Sticky Header */}
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

        {/* Main Settings List */}
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
                  <UserIcon className="w-6 h-6 text-textPrimary" />
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

          {/* Section 1: Privacy & Policy Accordion */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textTertiary px-1">
              Privacy & Security
            </h2>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/30">
              {/* Privacy & Policy Item */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('privacy')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
                  aria-expanded={expandedSection === 'privacy'}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                      <Shield className="w-4 h-4 text-textPrimary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        Privacy & Policy
                      </p>
                      <p className="text-xs text-textTertiary mt-0.5 truncate">
                        Profile visibility, read receipts & data policies
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-textSecondary transition-transform duration-200 shrink-0 ml-2 ${
                      expandedSection === 'privacy' ? 'rotate-180 text-textPrimary' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Content */}
                {expandedSection === 'privacy' && (
                  <div className="p-4 bg-surface/50 border-t border-border-subtle space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Campus Profile Visibility</p>
                        <p className="text-xs text-textTertiary mt-0.5 leading-relaxed">
                          Allow registered campus classmates to find your profile in searches.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={profileVisibility}
                        onChange={() => setProfileVisibility((v) => !v)}
                      />
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Read Receipts & Online State</p>
                        <p className="text-xs text-textTertiary mt-0.5 leading-relaxed">
                          Show online status and double check marks when messages are read.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={readReceipts}
                        onChange={() => setReadReceipts((v) => !v)}
                      />
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div>
                      <p className="text-sm font-semibold text-textPrimary">Who Can Message You</p>
                      <p className="text-xs text-textTertiary mt-0.5 leading-relaxed">
                        Control incoming direct messages from campus members.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMessagePrivacy('all')}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            messagePrivacy === 'all'
                              ? 'bg-textPrimary text-background border-textPrimary'
                              : 'bg-surface border-border text-textSecondary hover:text-textPrimary'
                          }`}
                        >
                          {messagePrivacy === 'all' && <Check className="w-3.5 h-3.5" />}
                          <span>All Campus Members</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMessagePrivacy('mutual')}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            messagePrivacy === 'mutual'
                              ? 'bg-textPrimary text-background border-textPrimary'
                              : 'bg-surface border-border text-textSecondary hover:text-textPrimary'
                          }`}
                        >
                          {messagePrivacy === 'mutual' && <Check className="w-3.5 h-3.5" />}
                          <span>Mutual Contacts Only</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-elevated border border-border-subtle text-xs text-textTertiary leading-relaxed">
                      <Info className="w-4 h-4 text-textPrimary shrink-0 mt-0.5" />
                      <span>
                        Student ID numbers and academic grades are permanently encrypted and never visible to other students.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Security & Access Item */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('security')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
                  aria-expanded={expandedSection === 'security'}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                      <Lock className="w-4 h-4 text-textPrimary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        Security & Access
                      </p>
                      <p className="text-xs text-textTertiary mt-0.5 truncate">
                        Password, two-step verification & active sessions
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-textSecondary transition-transform duration-200 shrink-0 ml-2 ${
                      expandedSection === 'security' ? 'rotate-180 text-textPrimary' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Content */}
                {expandedSection === 'security' && (
                  <div className="p-4 bg-surface/50 border-t border-border-subtle space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Two-Factor Authentication (2FA)</p>
                        <p className="text-xs text-textTertiary mt-0.5 leading-relaxed">
                          Require OTP verification code when signing in from an unknown browser.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={twoFactorAuth}
                        onChange={() => setTwoFactorAuth((v) => !v)}
                      />
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Suspicious Login Alerts</p>
                        <p className="text-xs text-textTertiary mt-0.5 leading-relaxed">
                          Receive security notifications if your account is accessed from a new IP.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={loginAlerts}
                        onChange={() => setLoginAlerts((v) => !v)}
                      />
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Active Browser Session</p>
                        <p className="text-xs text-textTertiary mt-0.5">
                          Current device • Connected via verified campus session
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-surface-elevated border border-border text-textPrimary">
                        Active
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Preferences Accordion */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textTertiary px-1">
              Preferences
            </h2>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/30">
              {/* Notifications Accordion Item */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('notifications')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
                  aria-expanded={expandedSection === 'notifications'}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                      <Bell className="w-4 h-4 text-textPrimary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        Notifications & Alerts
                      </p>
                      <p className="text-xs text-textTertiary mt-0.5 truncate">
                        Direct messages, campus updates & study alerts
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-textSecondary transition-transform duration-200 shrink-0 ml-2 ${
                      expandedSection === 'notifications' ? 'rotate-180 text-textPrimary' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Content */}
                {expandedSection === 'notifications' && (
                  <div className="p-4 bg-surface/50 border-t border-border-subtle space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Direct Chat Messages</p>
                        <p className="text-xs text-textTertiary mt-0.5">
                          Push notifications and in-app sound when classmates send messages.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={chatNotifs}
                        onChange={() => setChatNotifs((v) => !v)}
                      />
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Campus Announcements</p>
                        <p className="text-xs text-textTertiary mt-0.5">
                          Official administrative notices and university updates.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={campusNotifs}
                        onChange={() => setCampusNotifs((v) => !v)}
                      />
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Opportunities & Research</p>
                        <p className="text-xs text-textTertiary mt-0.5">
                          Alerts when papers, tutors, or internship opportunities are posted.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={oppNotifs}
                        onChange={() => setOppNotifs((v) => !v)}
                      />
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Lost & Found Matches</p>
                        <p className="text-xs text-textTertiary mt-0.5">
                          Smart keyword notifications when someone reports an item matching yours.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={lostNotifs}
                        onChange={() => setLostNotifs((v) => !v)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Theme & Display Accordion Item */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('theme')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
                  aria-expanded={expandedSection === 'theme'}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                      {isDark ? <Moon className="w-4 h-4 text-textPrimary" /> : <Sun className="w-4 h-4 text-textPrimary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        Theme & Display
                      </p>
                      <p className="text-xs text-textTertiary mt-0.5 truncate">
                        Currently using {isDark ? 'Dark Theme' : 'Light Theme'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-textSecondary transition-transform duration-200 shrink-0 ml-2 ${
                      expandedSection === 'theme' ? 'rotate-180 text-textPrimary' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Content */}
                {expandedSection === 'theme' && (
                  <div className="p-4 bg-surface/50 border-t border-border-subtle space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs text-textTertiary">
                      Choose your preferred interface theme:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDark) toggleTheme();
                        }}
                        className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                          isDark
                            ? 'bg-textPrimary text-background border-textPrimary font-bold shadow-sm'
                            : 'bg-surface border-border text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        <Moon className="w-4 h-4" />
                        <span className="text-xs">Dark Mode</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isDark) toggleTheme();
                        }}
                        className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                          !isDark
                            ? 'bg-textPrimary text-background border-textPrimary font-bold shadow-sm'
                            : 'bg-surface border-border text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        <Sun className="w-4 h-4" />
                        <span className="text-xs">Light Mode</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Support & Legal Accordion */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textTertiary px-1">
              Support & Guidelines
            </h2>
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-surface-elevated/30">
              {/* Help & FAQ Item (Navigates to FAQ page) */}
              <button
                type="button"
                onClick={() => navigate('/faq')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                    <HelpCircle className="w-4 h-4 text-textPrimary" />
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

              {/* Terms of Service Accordion Item */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('terms')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors text-left cursor-pointer group"
                  aria-expanded={expandedSection === 'terms'}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 text-textPrimary">
                      <FileText className="w-4 h-4 text-textPrimary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-textPrimary leading-tight">
                        Terms of Service
                      </p>
                      <p className="text-xs text-textTertiary mt-0.5 truncate">
                        Student guidelines and campus community terms
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-textSecondary transition-transform duration-200 shrink-0 ml-2 ${
                      expandedSection === 'terms' ? 'rotate-180 text-textPrimary' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Content */}
                {expandedSection === 'terms' && (
                  <div className="p-4 bg-surface/50 border-t border-border-subtle space-y-3.5 animate-in fade-in duration-150">
                    <div>
                      <p className="text-xs font-bold text-textPrimary uppercase tracking-wider">
                        1. Campus Code of Conduct
                      </p>
                      <p className="text-xs text-textTertiary mt-1 leading-relaxed">
                        All interactions on TemariCom must remain respectful and harassment-free. Abuse or impersonation results in immediate account suspension.
                      </p>
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div>
                      <p className="text-xs font-bold text-textPrimary uppercase tracking-wider">
                        2. Academic Integrity
                      </p>
                      <p className="text-xs text-textTertiary mt-1 leading-relaxed">
                        Sharing lecture notes, papers, and tutoring assistance is encouraged. Leaking unreleased exam content violates campus policy.
                      </p>
                    </div>

                    <div className="h-px bg-border-subtle" />

                    <div>
                      <p className="text-xs font-bold text-textPrimary uppercase tracking-wider">
                        3. Marketplace & Exchange Safety
                      </p>
                      <p className="text-xs text-textTertiary mt-1 leading-relaxed">
                        Buy and sell student gear safely in designated campus public areas. TemariCom does not handle escrow for cash deals.
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-textPrimary shrink-0">
                    <LogOut className="w-4 h-4 text-textPrimary" />
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
