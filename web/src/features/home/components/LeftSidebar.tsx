import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
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
  Trophy,
  Download,
  HelpCircle,
  BadgeCheck,
} from 'lucide-react';
import { useTheme } from '@/theme';
import { homeService } from '@/features/home/services/homeService';
import { mockCurrentUser } from '@/features/home/mocks/mockHomeData';
import { UserProfile } from '@/features/home/types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const LeftSidebar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(mockCurrentUser);

  // Load authenticated user profile
  useEffect(() => {
    let isMounted = true;
    homeService
      .getCurrentUser()
      .then((user) => {
        if (isMounted) setCurrentUser(user);
      })
      .catch((err) => {
        console.error('Failed to load user profile', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const mainNavItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'tutor', label: 'Find Tutor', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'campus', label: 'Campus', icon: <Building2 className="w-5 h-5" /> },
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" />, badge: 3 },
    { id: 'lostfound', label: 'Lost & Found', icon: <Search className="w-5 h-5" /> },
    { id: 'promote', label: 'Promote', icon: <BadgePercent className="w-5 h-5" /> },
    { id: 'create', label: 'Create', icon: <PlusCircle className="w-5 h-5" /> },
  ];

  const moreDropdownItems: NavItem[] = [
    { id: 'chess', label: 'Play Chess', icon: <Trophy className="w-5 h-5" /> },
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
      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 space-y-1">
        <nav className="space-y-1">
          {mainNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-card text-[15px] font-medium text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-textPrimary shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-danger text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* MORE Button: Positioned immediately after Create */}
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-card text-[15px] font-medium text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
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
            <div className="mt-1 pl-2 space-y-1 border-l-2 border-border-subtle ml-3.5 py-1">
              {moreDropdownItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
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

      {/* 3. PINNED BOTTOM PROFILE FOOTER: Never scrolls, anchored firmly at bottom */}
      <div className="shrink-0 p-3.5 border-t border-border-subtle bg-background">
        <div className="flex items-center justify-between p-2 rounded-card hover:bg-surface-elevated cursor-pointer transition-colors duration-150">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-bold text-textPrimary truncate">
                  {currentUser.name}
                </p>
                {currentUser.isVerified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-verification shrink-0" />
                )}
              </div>
              <p className="text-[13px] text-textTertiary truncate">
                @{currentUser.username}
              </p>
            </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-textPrimary shrink-0" />
        </div>
      </div>
    </aside>
  );
};
