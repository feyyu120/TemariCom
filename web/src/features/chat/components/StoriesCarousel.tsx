import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { StoryItem } from '@/features/chat/types';
import { getInitials } from '@/features/chat/utils/chatUtils';
import { useToast } from '@/context';

interface StoriesCarouselProps {
  stories?: StoryItem[];
  onAddStoryPress?: () => void;
  onStoryPress?: (story: StoryItem) => void;
}

export const StoriesCarousel: React.FC<StoriesCarouselProps> = ({
  stories = [],
  onAddStoryPress,
  onStoryPress,
}) => {
  const { showToast } = useToast();
  const [showPopup, setShowPopup] = useState<boolean>(false);

  const handleAddStory = () => {
    if (onAddStoryPress) {
      onAddStoryPress();
      return;
    }

    showToast({
      title: 'Stories',
      message: 'Currently story is unavailable.',
      type: 'info',
    });
    setShowPopup(true);
  };

  return (
    <div className="py-2.5 px-4 border-b border-border-subtle bg-background select-none shrink-0">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* "+ Your Story" Item */}
        <button
          type="button"
          onClick={handleAddStory}
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

      {/* Modal Popup: Currently story is unavailable */}
      {showPopup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-surface-elevated border border-border rounded-2xl p-5 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-bold text-textPrimary">Stories</h3>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="p-1 text-textTertiary hover:text-textPrimary rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-textSecondary leading-relaxed">
              Currently story is unavailable.
            </p>
            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="w-full py-2 px-4 rounded-pill bg-active text-active-text text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesCarousel;
