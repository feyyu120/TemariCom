import React, { useEffect, useState } from 'react';
import { Post, OfficialAnnouncement, Opportunity } from '@/features/home/types';
import { homeService } from '@/features/home/services/homeService';
import { PostCard } from '@/features/home/components/PostCard';
import { PostSkeleton } from '@/features/home/components/SkeletonLoader';
import { MobileTopBar } from '@/features/home/components/MobileTopBar';
import { MobileStories } from '@/features/home/components/MobileStories';
import { MobileOfficialOpportunities } from '@/features/home/components/MobileOfficialOpportunities';

type FeedTab = 'for_you' | 'following';

interface CenterFeedProps {
  onOpenMenu?: () => void;
}

export const CenterFeed: React.FC<CenterFeedProps> = ({ onOpenMenu }) => {
  const [activeTab, setActiveTab] = useState<FeedTab>('for_you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<OfficialAnnouncement[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load feed posts when activeTab changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    homeService
      .getPosts(activeTab)
      .then((data) => {
        if (isMounted) {
          setPosts(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load posts', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Load announcements & opportunities for mobile top sections
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      homeService.getAnnouncements(),
      homeService.getOpportunities(),
    ])
      .then(([annData, oppData]) => {
        if (isMounted) {
          setAnnouncements(annData);
          setOpportunities(oppData);
        }
      })
      .catch((err) => {
        console.error('Failed to load announcements and opportunities for mobile', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="flex-1 min-w-0 h-screen overflow-y-auto border-r-0 lg:border-r border-border-subtle bg-background pb-16 lg:pb-0">
      {/* 1. Mobile Sticky Top Header (Visible on < lg screens) */}
      <MobileTopBar onOpenMenu={onOpenMenu ?? (() => {})} />

      {/* 2. Desktop Sticky Header with Feed Tabs (Visible on lg+ screens) */}
      <header className="hidden lg:flex h-[53px] sticky top-0 z-20 backdrop-blur-md bg-background/85 border-b border-border-subtle items-stretch">
        <button
          type="button"
          onClick={() => setActiveTab('for_you')}
          className="flex-1 flex items-center justify-center text-center text-sm font-semibold transition-colors hover:bg-surface-elevated/40 relative"
        >
          <span
            className={
              activeTab === 'for_you'
                ? 'text-textPrimary font-bold'
                : 'text-textTertiary'
            }
          >
            For you
          </span>
          {activeTab === 'for_you' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-textPrimary rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('following')}
          className="flex-1 flex items-center justify-center text-center text-sm font-semibold transition-colors hover:bg-surface-elevated/40 relative"
        >
          <span
            className={
              activeTab === 'following'
                ? 'text-textPrimary font-bold'
                : 'text-textTertiary'
            }
          >
            Following
          </span>
          {activeTab === 'following' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-textPrimary rounded-full" />
          )}
        </button>
      </header>

      {/* 3. Mobile Top Sections: Quick Access Stories */}
      <MobileStories />

      {/* 4. Mobile Top Sections: Official & Opportunities Horizontal Cards */}
      <MobileOfficialOpportunities
        announcements={announcements}
        opportunities={opportunities}
      />

      {/* 5. Mobile Feed Tabs: For you / Following switcher */}
      <div className="lg:hidden flex items-stretch border-b border-border-subtle bg-background/95 sticky top-[53px] z-10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab('for_you')}
          className="flex-1 py-3 flex items-center justify-center text-center text-xs font-semibold transition-colors relative"
        >
          <span
            className={
              activeTab === 'for_you'
                ? 'text-textPrimary font-bold'
                : 'text-textTertiary'
            }
          >
            For you
          </span>
          {activeTab === 'for_you' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-textPrimary rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('following')}
          className="flex-1 py-3 flex items-center justify-center text-center text-xs font-semibold transition-colors relative"
        >
          <span
            className={
              activeTab === 'following'
                ? 'text-textPrimary font-bold'
                : 'text-textTertiary'
            }
          >
            Following
          </span>
          {activeTab === 'following' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-textPrimary rounded-full" />
          )}
        </button>
      </div>

      {/* 6. Feed Posts Stream */}
      <div className="divide-y divide-border-subtle">
        {isLoading ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-textTertiary">
            <p className="text-sm">No posts yet in this feed.</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </main>
  );
};
