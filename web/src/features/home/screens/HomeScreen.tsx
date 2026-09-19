import React, { useState, useRef } from 'react';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { CenterFeed } from '@/features/home/components/CenterFeed';
import { RightSidebar } from '@/features/home/components/RightSidebar';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';
import { MobileBottomNav } from '@/features/home/components/MobileBottomNav';

export const HomeScreen: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Detect swipe right gesture to open mobile sidebar drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only open sidebar if swipe started near the left edge (<= 40px)
    // to prevent accidental opening while scrolling horizontal cards or feeds
    const isLeftEdgeSwipe = touchStartX.current <= 40;
    if (isLeftEdgeSwipe && deltaX > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      setIsDrawerOpen(true);
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex h-screen w-screen overflow-hidden bg-background text-textPrimary antialiased"
    >
      {/* 1. Left Navigation Sidebar - Independent scroll on desktop, hidden on mobile */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Center Posts Feed - Independent scroll, responsive full-width on mobile */}
      <CenterFeed onOpenMenu={() => setIsDrawerOpen(true)} />

      {/* 3. Right Discover / Widgets Sidebar - Independent scroll on desktop, hidden on mobile */}
      <div className="hidden lg:flex shrink-0">
        <RightSidebar />
      </div>

      {/* 4. Mobile Drawer Navigation Menu */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* 5. Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav />
    </div>
  );
};
