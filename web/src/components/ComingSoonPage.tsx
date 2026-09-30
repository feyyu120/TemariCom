import React, { useState } from 'react';
import { Menu, MoreVertical, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  badgeText?: string;
  icon?: React.ReactNode;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title,
  description = "We're crafting something special for you. This feature will be available soon!",
  badgeText = 'Coming Soon',
  icon,
}) => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-textPrimary antialiased selection:bg-surface-elevated">
      {/* 1. Desktop Left Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 bg-background flex flex-col justify-between">
        {/* Sticky Pinned Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle shrink-0">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 h-[53px] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5 text-textPrimary" />
              </button>

              <div className="flex items-center min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-textPrimary truncate">
                  {title}
                </h1>
              </div>
            </div>

            {/* Top Right: 3-Vertical-Dots Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="p-1.5 -mr-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer"
                aria-label="More options"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical className="w-5 h-5 text-textPrimary" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-1 w-44 rounded-card bg-surface-elevated border border-border-subtle shadow-xl z-50 py-1 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <ArrowLeft className="w-4 h-4 text-textSecondary" />
                      <span>Back to Home</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Centered Coming Soon Placeholder Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle text-center space-y-4 shadow-xl animate-fadeIn">
            {/* Icon Banner */}
            <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center mx-auto text-textPrimary shadow-inner">
              {icon || <Sparkles className="w-8 h-8 text-textPrimary" />}
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle text-xs font-semibold text-textSecondary">
              <span className="w-2 h-2 rounded-full bg-active animate-pulse" />
              <span>{badgeText}</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">
                {title} Coming Soon
              </h2>
              <p className="text-sm text-textTertiary leading-relaxed">
                {description}
              </p>
            </div>

            {/* Back Home Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-2.5 px-4 rounded-xl bg-active text-activeText font-semibold text-sm hover:opacity-95 active:scale-95 transition-all duration-150 cursor-pointer shadow-xs"
              >
                Back to Home Feed
              </button>
            </div>
          </div>
        </div>

        {/* Footer Padding for Mobile Navigation */}
        <div className="h-4 shrink-0" />
      </main>

      {/* 3. Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default ComingSoonPage;
