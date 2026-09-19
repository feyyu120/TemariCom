import React from 'react';
import { Menu, Search, Bell } from 'lucide-react';

interface MobileTopBarProps {
  onOpenMenu: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onOpenMenu }) => {
  return (
    <header className="h-[53px] sticky top-0 z-30 backdrop-blur-md bg-background/90 border-b border-border-subtle flex items-center justify-between px-3.5 lg:hidden shrink-0">
      {/* Left: Hamburger Menu & Brand */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMenu}
          className="p-1.5 -ml-1 rounded-full text-textPrimary hover:bg-surface-elevated transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-textPrimary" />
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/assets/temaricom-logo-dark.png"
            alt="TemariCom Logo"
            className="w-6 h-6 object-contain rounded-sm hidden dark:block"
          />
          <img
            src="/assets/temaricom-logo-light.png"
            alt="TemariCom Logo"
            className="w-6 h-6 object-contain rounded-sm block dark:hidden"
          />
          <span className="font-bold text-base tracking-tight text-textPrimary">
            TemariCom
          </span>
        </div>
      </div>

      {/* Right: Search & Notification Bell */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="p-2 rounded-full text-textPrimary hover:bg-surface-elevated transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-textPrimary" />
        </button>

        <button
          type="button"
          className="relative p-2 rounded-full text-textPrimary hover:bg-surface-elevated transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-textPrimary" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-unread text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            3
          </span>
        </button>
      </div>
    </header>
  );
};
