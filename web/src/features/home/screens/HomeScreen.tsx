import React from 'react';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { CenterFeed } from '@/features/home/components/CenterFeed';
import { RightSidebar } from '@/features/home/components/RightSidebar';

export const HomeScreen: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-textPrimary antialiased">
      {/* 1. Left Navigation Sidebar - Independent Scroll */}
      <LeftSidebar />

      {/* 2. Center Posts Feed - Independent Scroll */}
      <CenterFeed />

      {/* 3. Right Discover / Widgets Sidebar - Independent Scroll */}
      <RightSidebar />
    </div>
  );
};
