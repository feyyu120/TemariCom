import React from 'react';
import { Plus } from 'lucide-react';
import { StoryItem } from '@/features/chat/types';
import { getInitials } from '@/features/chat/utils/chatUtils';

interface StoriesCarouselProps {
  stories?: StoryItem[];
  onAddStoryPress?: () => void;
  onStoryPress?: (story: StoryItem) => void;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: '1',
    name: 'Berek',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    is_online: true,
    has_unseen: true,
  },
  {
    id: '2',
    name: 'Nebiyu',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    is_online: true,
    has_unseen: true,
  },
  {
    id: '3',
    name: 'ASTU SE',
    avatar_url: '',
    badge_text: 'SE',
    is_online: false,
    has_unseen: true,
  },
  {
    id: '4',
    name: 'Tech Club',
    avatar_url: '',
    badge_text: '🧠',
    is_online: false,
    has_unseen: false,
  },
  {
    id: '5',
    name: 'ASTU Admin',
    avatar_url: '',
    badge_text: '🏛️',
    is_online: false,
    has_unseen: true,
  },
];

export const StoriesCarousel: React.FC<StoriesCarouselProps> = ({
  stories = DEFAULT_STORIES,
  onAddStoryPress,
  onStoryPress,
}) => {
  return (
    <div className="py-2.5 px-4 border-b border-border-subtle bg-background select-none">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* "+ Your Story" Item */}
        <button
          type="button"
          onClick={onAddStoryPress}
          className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-surface hover:border-active text-textSecondary group-hover:text-active transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium text-textSecondary group-hover:text-textPrimary truncate max-w-[60px]">
            Your Story
          </span>
        </button>

        {/* Stories list */}
        {stories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStoryPress?.(item)}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
          >
            <div
              className={`relative w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                item.has_unseen
                  ? 'border-2 border-active'
                  : 'border-2 border-border-subtle'
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-surface flex items-center justify-center text-xs font-bold text-textPrimary">
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{item.badge_text || getInitials(item.name)}</span>
                )}
              </div>
              {item.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </div>
            <span className="text-[11px] font-medium text-textSecondary group-hover:text-textPrimary truncate max-w-[60px]">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoriesCarousel;
