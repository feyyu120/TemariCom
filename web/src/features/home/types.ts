export interface Author {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  isVerified?: boolean;
  institution?: string;
}

export interface PostMedia {
  type: 'image' | 'link';
  url?: string;
  title?: string;
  subtitle?: string;
  domain?: string;
  imageUrl?: string;
}

export interface PostStats {
  comments: number;
  reposts: number;
  likes: number;
  views: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface Post {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  timeAgo: string;
  media?: PostMedia;
  stats: PostStats;
  tags?: string[];
  feedType?: 'for_you' | 'following' | 'both';
}

export interface OfficialAnnouncement {
  id: string;
  institutionName: string;
  institutionLogoUrl?: string;
  title: string;
  date: string;
  isOfficial: boolean;
  linkUrl?: string;
}

export type OpportunityType = 'Scholarship' | 'Internship' | 'Job' | 'Event';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organization: string;
  organizationLogoUrl?: string;
  deadlineOrDate: string;
  location?: string;
}

export type LostFoundStatus = 'Lost' | 'Found';

export interface LostFoundItem {
  id: string;
  status: LostFoundStatus;
  title: string;
  location: string;
  timeAgo: string;
  category?: 'backpack' | 'phone' | 'id_card' | 'general';
}

export interface HomeFeedData {
  posts: Post[];
  announcements: OfficialAnnouncement[];
  opportunities: Opportunity[];
  lostItems: LostFoundItem[];
}

