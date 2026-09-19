import React, { useState } from 'react';
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
  Megaphone,
  MoreHorizontal,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/theme';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const LeftSidebar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainNavItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'tutor', label: 'Find Tutor', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'campus', label: 'Campus', icon: <Building2 className="w-5 h-5" /> },
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" />, badge: 3 },
    { id: 'lostfound', label: 'Lost & Found', icon: <Search className="w-5 h-5" /> },
    { id: 'promote', label: 'Promote', icon: <Megaphone className="w-5 h-5" /> },
    { id: 'create', label: 'Create', icon: <PlusCircle className="w-5 h-5" /> },
  ];

  const moreDropdownItems: NavItem[] = [
    { id: 'saved', label: 'Saved', icon: <Bookmark className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 h-screen shrink-0 border-r border-border-subtle bg-background flex flex-col justify-between select-none">
      {/* 1. PINNED TOP HEADER: Logo & Brand Name (Aligned with CenterFeed header) */}
      <div className="h-[53px] shrink-0 border-b border-border-subtle flex items-center px-4 bg-background">
        <div className="flex items-center gap-3 px-1">
          <img
            src={isDark ? "/assets/temaricom-logo-dark.png" : "/assets/temaricom-logo-light.png"}
            alt="TemariCom Logo"
            className="w-7 h-7 object-contain rounded-sm"
          />
          <span className="font-bold text-lg tracking-tight text-textPrimary">
            TemariCom
          </span>
        </div>
      </div>

      {/* 2. SCROLLABLE NAVIGATION LIST: Scrolls between pinned header and pinned profile */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <nav className="space-y-1">
          {mainNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-card text-sm text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
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
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-card text-sm text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-sm text-textPrimary hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
                >
                  <span className="text-textPrimary shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Theme Mode Switcher in More Dropdown */}
              <div className="flex items-center justify-between px-3 py-2 rounded-card hover:bg-surface-elevated transition-colors text-sm text-textPrimary cursor-pointer">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon className="w-5 h-5 text-textPrimary shrink-0" />
                  ) : (
                    <Sun className="w-5 h-5 text-textPrimary shrink-0" />
                  )}
                  <span className="text-xs font-medium">
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
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
              alt="Feysel Yassin"
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-textPrimary truncate">
                Feysel Yassin
              </p>
              <p className="text-xs text-textTertiary truncate">@feysel_y</p>
            </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-textPrimary shrink-0" />
        </div>
      </div>
    </aside>
  );
};
