import {
  HomeFeedData,
  Post,
  OfficialAnnouncement,
  Opportunity,
  LostFoundItem,
} from '@/features/home/types';
import {
  mockHomeData,
  mockPosts,
  mockAnnouncements,
  mockOpportunities,
  mockLostItems,
} from '@/features/home/mocks/mockHomeData';

/**
 * Toggle between Mock Data and Real Backend API.
 * When your Go backend is running, switch USE_MOCK to false or set VITE_USE_MOCK=false in your .env
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Helper for realistic async network simulation
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const homeService = {
  /**
   * Fetch complete home feed (posts, announcements, opportunities, lost items)
   */
  async getHomeFeed(): Promise<HomeFeedData> {
    if (USE_MOCK) {
      await delay(750); // Simulate network latency so skeletons are visible
      return JSON.parse(JSON.stringify(mockHomeData));
    }

    const res = await fetch(`${API_BASE_URL}/home/feed`);
    if (!res.ok) {
      throw new Error(`Failed to fetch home feed: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch posts for a specific feed ('for_you' | 'following')
   */
  async getPosts(feedType: 'for_you' | 'following' = 'for_you'): Promise<Post[]> {
    if (USE_MOCK) {
      await delay(500);
      return mockPosts.filter((post) => post.feedType === 'both' || post.feedType === feedType);
    }

    const res = await fetch(`${API_BASE_URL}/posts?feed=${feedType}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch posts: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch official campus & ministry announcements
   */
  async getAnnouncements(): Promise<OfficialAnnouncement[]> {
    if (USE_MOCK) {
      await delay(400);
      return [...mockAnnouncements];
    }

    const res = await fetch(`${API_BASE_URL}/announcements/official`);
    if (!res.ok) {
      throw new Error(`Failed to fetch announcements: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch student opportunities (scholarships, internships, jobs, events)
   */
  async getOpportunities(): Promise<Opportunity[]> {
    if (USE_MOCK) {
      await delay(450);
      return [...mockOpportunities];
    }

    const res = await fetch(`${API_BASE_URL}/opportunities`);
    if (!res.ok) {
      throw new Error(`Failed to fetch opportunities: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Fetch lost and found items
   */
  async getLostItems(): Promise<LostFoundItem[]> {
    if (USE_MOCK) {
      await delay(400);
      return [...mockLostItems];
    }

    const res = await fetch(`${API_BASE_URL}/lostfound/recent`);
    if (!res.ok) {
      throw new Error(`Failed to fetch lost items: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Like / unlike a post
   */
  async toggleLike(postId: string, currentLiked: boolean): Promise<boolean> {
    if (USE_MOCK) {
      return !currentLiked;
    }

    const res = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: currentLiked ? 'DELETE' : 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to toggle like');
    }
    return !currentLiked;
  },

  /**
   * Bookmark / unbookmark a post
   */
  async toggleBookmark(postId: string, currentBookmarked: boolean): Promise<boolean> {
    if (USE_MOCK) {
      return !currentBookmarked;
    }

    const res = await fetch(`${API_BASE_URL}/posts/${postId}/bookmark`, {
      method: currentBookmarked ? 'DELETE' : 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to toggle bookmark');
    }
    return !currentBookmarked;
  },
};
