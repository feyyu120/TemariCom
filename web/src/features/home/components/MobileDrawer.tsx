import React, { useEffect } from 'react';
import {
  Home,
  GraduationCap,
  Megaphone,
  ShoppingCart,
  Bike,
  Search,
  Trophy,
  Bookmark,
  Download,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useTheme } from '@/theme';

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
  const { isDark, toggleTheme } = useTheme();

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

  const menuGroup1: DrawerMenuItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'tutor', label: 'Find Tutor', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'promote', label: 'Promote', icon: <Megaphone className="w-5 h-5" /> },
  ];

  const menuGroup2: DrawerMenuItem[] = [
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'delivery', label: 'Campus Delivery', icon: <Bike className="w-5 h-5" /> },
    { id: 'lostitem', label: 'Lost Item', icon: <Search className="w-5 h-5" /> },
    { id: 'chess', label: 'Play Chess', icon: <Trophy className="w-5 h-5" /> },
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
        className={`fixed top-0 bottom-0 left-0 w-[290px] max-w-[82vw] bg-background border-r border-border-subtle z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Top Profile Section */}
          <div className="p-4 pb-3 border-b border-border-subtle bg-surface/40">
            <div className="flex items-center justify-between mb-3.5">
              {/* User Avatar */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-border-subtle">
                T
              </div>

              <div className="flex items-center gap-1">
                {/* Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-textPrimary hover:bg-surface-elevated transition-colors"
                  aria-label="Toggle theme mode"
                >
                  {isDark ? (
                    <Sun className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-textPrimary" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-textPrimary">
                thehoper150
              </span>
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <p className="text-xs text-textTertiary mt-0.5">
              +251 91 234 5678
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1">
            {/* Group 1: Core navigation */}
            {menuGroup1.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={onClose}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors"
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
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors"
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
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors"
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
                onClick={onClose}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-medium text-textPrimary hover:bg-surface-elevated transition-colors"
              >
                <span className="text-textSecondary">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <div className="h-[1px] bg-border-subtle mx-2 my-1.5" />

            {/* Logout */}
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-card text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="w-5 h-5 text-danger" />
              <span>Logout</span>
            </button>
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

