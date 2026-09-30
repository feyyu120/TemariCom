import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  BookOpen,
  Microscope,
  GraduationCap,
  Building2,
  ShoppingCart,
  MessageSquare,
  Search,
  PlusCircle,
  Bookmark,
  Settings,
  BadgePercent,
  MoreHorizontal,
  ChevronDown,
  Sun,
  Moon,
  Download,
  HelpCircle,
  BadgeCheck,
  User as UserIcon,
  LogIn,
} from 'lucide-react';
import { useTheme } from '@/theme';
import { useAuth, UserMenuDropdown } from '@/features/auth';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/features/chat';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const LeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { unreadCount } = useChat();
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('temaricom_sidebar_more_open') === 'true';
    } catch {
      return false;
    }
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState<string | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleMore = () => {
    setIsMoreOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('temaricom_sidebar_more_open', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isMoreOpen && navContainerRef.current) {
      navContainerRef.current.scrollTop = 0;
    }
  }, [isMoreOpen]);

  const mainNavItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'research', label: 'Research', icon: <Microscope className="w-5 h-5" /> },
    { id: 'tutor', label: 'Find Tutor', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'campus', label: 'Campus', icon: <Building2 className="w-5 h-5" /> },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-5 h-5" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: 'lostfound', label: 'Lost Item', icon: <Search className="w-5 h-5" /> },
    { id: 'promote', label: 'Promote', icon: <BadgePercent className="w-5 h-5" /> },
    { id: 'create', label: 'Create', icon: <PlusCircle className="w-5 h-5" /> },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'chat' && !isAuthenticated) {
      openAuthModal('login');
      return;
    }

    const routes: Record<string, string> = {
      home: '/',
      learn: '/learn',
      research: '/research',
      tutor: '/tutor',
      campus: '/campus',
      chat: '/chat',
      lostfound: '/lostfound',
      promote: '/promote',
      create: '/create',
    };

    const route = routes[id];

    if (route) {
      navigate(route);
    }
  };
  const moreDropdownItems: NavItem[] = [
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'saved', label: 'Saved', icon: <Bookmark className="w-5 h-5" /> },
    { id: 'downloads', label: 'Downloads', icon: <Download className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    { id: 'help', label: 'Help', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 h-screen shrink-0 border-r border-border-subtle bg-background flex flex-col justify-between select-none">
      {/* 1. PINNED TOP HEADER: Logo & Brand Name (Aligned with CenterFeed header) */}
      <div className="h-[53px] shrink-0 border-b border-border-subtle flex items-center px-4 bg-background">
        <div className="flex items-center gap-3 px-1">
          <img
            src="/assets/temaricom-logo-dark.png"
            alt="TemariCom Logo"
            className="w-7 h-7 object-contain rounded-sm hidden dark:block"
          />
          <img
            src="/assets/temaricom-logo-light.png"
            alt="TemariCom Logo"
            className="w-7 h-7 object-contain rounded-sm block dark:hidden"
          />
          <span className="font-bold text-lg tracking-tight text-textPrimary">
            TemariCom
          </span>
        </div>
      </div>

      {/* 2. SCROLLABLE NAVIGATION LIST: Scrolls between pinned header and pinned profile */}
      <div
        ref={navContainerRef}
        className={`flex-1 min-h-0 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 overscroll-contain ${
          isMoreOpen
            ? 'overflow-y-auto pb-4'
            : 'overflow-y-hidden [@media(max-height:600px)]:overflow-y-auto'
        }`}
      >
        <nav className="space-y-1">
          {mainNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-card text-[15px] font-medium text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="relative text-textPrimary shrink-0">
                  {item.icon}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-danger text-white text-[10px] font-bold px-1 rounded-full flex items-center justify-center leading-none">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </div>
            </button>
          ))}

          {/* MORE Button: Positioned immediately after Create */}
          <button
            type="button"
            onClick={handleToggleMore}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-card text-[15px] font-medium text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <MoreHorizontal className="w-5 h-5 text-textPrimary shrink-0" />
              <span>More</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-textPrimary transition-transform duration-200 ${
                isMoreOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Lists when More is clicked */}
          {isMoreOpen && (
            <div className="mt-1 pl-2 space-y-1 border-l-2 border-border-subtle ml-3.5 py-1 mb-2">
              {moreDropdownItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'settings') {
                      navigate('/profile/settings');
                    } else if (item.id === 'help') {
                      navigate('/faq');
                    } else if (item.id === 'marketplace') {
                      navigate('/marketplace');
                    } else if (item.id === 'downloads') {
                      navigate('/downloads');
                    } else if (item.id === 'saved') {
                      navigate('/saved');
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-[15px] font-medium text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
                >
                  <span className="text-textPrimary shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Theme Mode Switcher in More Dropdown */}
              <div className="flex items-center justify-between px-3 py-2 rounded-card hover:bg-surface-elevated transition-colors text-[15px] text-textPrimary cursor-pointer">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon className="w-5 h-5 text-textPrimary shrink-0" />
                  ) : (
                    <Sun className="w-5 h-5 text-textPrimary shrink-0" />
                  )}
                  <span className="text-[13px] font-medium">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  onClick={toggleTheme}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDark ? 'bg-active' : 'bg-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isDark ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* 3. PINNED BOTTOM PROFILE / AUTH FOOTER */}
      <div className="relative shrink-0 p-3 border-t border-border-subtle bg-background">
        {!isAuthenticated || !user ? (
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full flex items-center justify-between p-2.5 rounded-card bg-surface-elevated/70 hover:bg-surface-elevated border border-border-subtle hover:border-border transition-all duration-150 group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-textSecondary group-hover:text-textPrimary shrink-0 transition-colors">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[14px] font-bold text-textPrimary leading-tight">
                  Sign In
                </p>
                <p className="text-[12px] text-textTertiary truncate">
                  Join TemariCom
                </p>
              </div>
            </div>
            <LogIn className="w-4 h-4 text-textTertiary group-hover:text-textPrimary shrink-0 transition-colors ml-2" />
          </button>
        ) : (
          <>
            <UserMenuDropdown
              isOpen={isUserMenuOpen}
              onClose={() => setIsUserMenuOpen(false)}
              position="top"
            />

            <div className="flex items-center justify-between p-2 rounded-card hover:bg-surface-elevated transition-colors duration-150 select-none">
              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                title="View Profile"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.username || 'Avatar'}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-textSecondary shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[15px] font-bold text-textPrimary truncate hover:underline">
                      {user.full_name || user.username || (user.email ? user.email.split('@')[0] : 'User')}
                    </p>
                    {user.is_verified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-verification shrink-0" />
                    )}
                  </div>
                  <p className="text-[13px] text-textTertiary truncate">
                    @{user.username || (user.email ? user.email.split('@')[0] : 'user')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserMenuOpen(!isUserMenuOpen);
                }}
                className="p-1.5 rounded-full hover:bg-surface text-textPrimary transition-colors cursor-pointer ml-1 shrink-0"
                title="Account options"
                aria-label="Account options"
              >
                <MoreHorizontal className="w-4 h-4 text-textPrimary shrink-0" />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
