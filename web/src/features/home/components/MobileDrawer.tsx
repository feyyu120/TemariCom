import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  BookOpen,
  Microscope,
  GraduationCap,
  BadgePercent,
  ShoppingCart,
  Bike,
  Search,
  Bookmark,
  Download,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  BadgeCheck,
  User as UserIcon,
  LogIn,
  ChevronDown,
  UserPlus,
  Check,
} from 'lucide-react';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth';
import { useNavigate } from 'react-router-dom';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DrawerMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isDanger?: boolean;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const {
    user,
    isAuthenticated,
    accounts,
    activeAccountId,
    switchAccount,
    openAuthModal,
    logout,
  } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Close on Escape key press and reset account menu
  useEffect(() => {
    if (!isOpen) {
      setIsAccountMenuOpen(false);
    }
  }, [isOpen]);

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

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Swipe left on drawer panel to close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // If swiped left by > 45px and predominantly horizontal
    if (deltaX < -45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      onClose();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const menuGroup1: DrawerMenuItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'research', label: 'Research', icon: <Microscope className="w-5 h-5" /> },
    { id: 'profile', label: 'My Profile', icon: <UserIcon className="w-5 h-5" /> },
    { id: 'tutor', label: 'Find Tutor', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'promote', label: 'Promote', icon: <BadgePercent className="w-5 h-5" /> },
  ];

  const menuGroup2: DrawerMenuItem[] = [
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'delivery', label: 'Campus Delivery', icon: <Bike className="w-5 h-5" /> },
    { id: 'lostitem', label: 'Lost Item', icon: <Search className="w-5 h-5" /> },
  ];

  const menuGroup3: DrawerMenuItem[] = [
    { id: 'saved', label: 'Saved', icon: <Bookmark className="w-5 h-5" /> },
    { id: 'downloads', label: 'Downloads', icon: <Download className="w-5 h-5" /> },
  ];

  const menuGroup4: DrawerMenuItem[] = [
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    { id: 'help', label: 'Help', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-visibility duration-300 ${
        isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
    >
      {/* Dimmed Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 bottom-0 left-0 w-[290px] max-w-[82vw] bg-background border-r border-border-subtle z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Top Profile Section */}
          <div className="p-4 pb-3 border-b border-border-subtle bg-surface/40">
            <div className="flex items-center justify-between mb-3.5">
              {/* User Avatar or Guest Icon */}
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.username}
                  className="w-14 h-14 rounded-full object-cover shadow-sm border border-border shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center text-textSecondary shrink-0">
                  <UserIcon className="w-7 h-7" />
                </div>
              )}

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-9 h-9 rounded-full flex items-center justify-center text-textPrimary hover:bg-surface-elevated transition-colors"
                aria-label="Toggle theme mode"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-textPrimary" />
                ) : (
                  <Moon className="w-5 h-5 text-textPrimary" />
                )}
              </button>
            </div>

            {/* Profile Info or Sign In Action */}
            {!isAuthenticated || !user ? (
              <div className="space-y-2">
                <div>
                  <p className="font-bold text-base text-textPrimary">Welcome to TemariCom</p>
                  <p className="text-xs text-textTertiary mt-0.5">
                    Sign in to access your chats, tutors and saved items.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal('login');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-active hover:bg-active/90 active:scale-[0.99] text-active-text font-semibold text-sm transition-all shadow-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
              </div>
            ) : (
              <div>
                {/* Profile Header Row */}
                <div className="flex items-center justify-between select-none py-0.5">
                  <div
                    onClick={() => {
                      onClose();
                      navigate('/profile');
                    }}
                    className="min-w-0 flex-1 cursor-pointer group"
                    title="View Profile"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base text-textPrimary truncate group-hover:underline transition-colors">
                        {user.full_name || user.username || user.email.split('@')[0]}
                      </span>
                      {user.is_verified && (
                        <BadgeCheck className="w-4 h-4 text-verification shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-textTertiary mt-0.5 truncate">
                      <span>@{user.username || user.email.split('@')[0]}</span>
                      {user.phone && (
                        <>
                          <span>&bull;</span>
                          <span>{user.phone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Toggle Arrow */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAccountMenuOpen(!isAccountMenuOpen);
                    }}
                    className="p-1 rounded-full text-textSecondary hover:text-textPrimary transition-colors ml-2 cursor-pointer"
                    aria-label="Toggle account switcher"
                    aria-expanded={isAccountMenuOpen}
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isAccountMenuOpen ? 'rotate-180 text-textPrimary' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Telegram-style Multi-Account Drawer Dropdown */}
                {isAccountMenuOpen && (
                  <div className="mt-3 pt-3 border-t border-border-subtle space-y-1 animate-fadeIn">
                    <p className="px-1 text-[11px] font-semibold text-textTertiary uppercase tracking-wider mb-1.5">
                      Switch Account
                    </p>

                    {/* Stored Accounts List */}
                    {Array.isArray(accounts) &&
                      accounts.map((acc) => {
                      const isActive = acc.id === activeAccountId || acc.id === user.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={async () => {
                            if (!isActive) {
                              await switchAccount(acc.id);
                            }
                            setIsAccountMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-surface-elevated text-textPrimary font-semibold shadow-xs'
                              : 'text-textSecondary hover:bg-surface-elevated hover:text-textPrimary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {acc.user.avatar_url ? (
                              <img
                                src={acc.user.avatar_url}
                                alt={acc.user.full_name || acc.user.username}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-textTertiary shrink-0">
                                <UserIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-textPrimary truncate">
                                {acc.user.full_name || acc.user.username || acc.user.email}
                              </p>
                              <p className="text-[11px] text-textTertiary truncate">
                                @{acc.user.username || acc.user.email.split('@')[0]}
                              </p>
                            </div>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 text-textPrimary shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}

                    {/* Add Another Account Option */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setIsAccountMenuOpen(false);
                        openAuthModal('login');
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-textSecondary hover:bg-surface-elevated hover:text-textPrimary transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface border border-dashed border-border flex items-center justify-center text-textSecondary shrink-0">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <span>Add another account</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1">
            {/* Group 1: Core navigation */}
            {menuGroup1.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onClose();
                  if (item.id === 'home') {
                    navigate('/');
                  } else if (item.id === 'research') {
                    navigate('/research');
                  } else if (item.id === 'profile') {
                    if (!isAuthenticated) {
                      openAuthModal('login');
                    } else {
                      navigate('/profile');
                    }
                  }
                }}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <span className="text-textSecondary">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <div className="h-[1px] bg-border-subtle mx-2 my-1.5" />

            {/* Group 2: Services */}
            {menuGroup2.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={onClose}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <span className="text-textSecondary">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <div className="h-[1px] bg-border-subtle mx-2 my-1.5" />

            {/* Group 3: Saved & Downloads */}
            {menuGroup3.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={onClose}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <span className="text-textSecondary">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <div className="h-[1px] bg-border-subtle mx-2 my-1.5" />

            {/* Group 4: Settings & Help */}
            {menuGroup4.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onClose();
                  if (item.id === 'help') {
                    navigate('/faq');
                  }
                }}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <span className="text-textSecondary">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            {isAuthenticated && (
              <>
                <div className="h-[1px] bg-border-subtle mx-2 my-1.5" />
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-semibold text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-5 h-5 text-danger" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Footer Brand & Version */}
        <div className="p-4 border-t border-border-subtle text-center shrink-0">
          <p className="text-xs font-bold text-textPrimary tracking-tight">
            TemariCom For Web
          </p>
          <p className="text-[11px] font-medium text-textTertiary mt-0.5">
            Version 1.0.0
          </p>
        </div>
      </aside>
    </div>
  );
};
