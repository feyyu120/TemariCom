import React, { useEffect, useState } from 'react';
import { Post } from '@/features/home/types';
import { homeService } from '@/features/home/services/homeService';
import { PostCard } from '@/features/home/components/PostCard';
import { PostSkeleton } from '@/features/home/components/SkeletonLoader';

type FeedTab = 'for_you' | 'following';

export const CenterFeed: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>('for_you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  return (
    <main className="flex-1 min-w-0 h-screen overflow-y-auto border-r border-border-subtle bg-background">
      {/* Sticky Header with Feed Tabs (Aligned with LeftSidebar header) */}
      <header className="h-[53px] sticky top-0 z-20 backdrop-blur-md bg-background/85 border-b border-border-subtle flex items-stretch">
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

      {/* Feed Content */}
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
