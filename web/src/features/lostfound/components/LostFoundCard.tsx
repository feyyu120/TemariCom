import React from 'react';
import { MapPin, Bookmark, Smartphone, CreditCard, Package, Search, HelpCircle } from 'lucide-react';
import { LostFoundItem, LostFoundType } from '@/features/lostfound/types';

interface LostFoundCardProps {
  item: LostFoundItem;
  isSaved?: boolean;
  onToggleSave?: (item: LostFoundItem, e: React.MouseEvent) => void;
  onClick?: (item: LostFoundItem) => void;
}

// Format relative time helper
function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Icon placeholder for items without photos
function getCategoryIcon(category?: string, title?: string, type?: LostFoundType) {
  const t = (title || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (c === 'phone' || t.includes('phone') || t.includes('iphone') || t.includes('samsung')) {
    return <Smartphone className="w-7 h-7 text-textSecondary" />;
  }
  if (c === 'id_card' || t.includes('id') || t.includes('card')) {
    return <CreditCard className="w-7 h-7 text-textSecondary" />;
  }
  if (c === 'backpack' || t.includes('backpack') || t.includes('bag')) {
    return <Package className="w-7 h-7 text-textSecondary" />;
  }
  if (type === 'lost') {
    return <HelpCircle className="w-7 h-7 text-textSecondary" />;
  }
  return <Search className="w-7 h-7 text-textSecondary" />;
}

export const LostFoundCard: React.FC<LostFoundCardProps> = ({
  item,
  isSaved = false,
  onToggleSave,
  onClick,
}) => {
  const isLost = item.type === 'lost';
  const subtitle = isLost
    ? `Last seen: ${item.location || 'Campus'}`
    : `Found: ${item.location || 'Campus'}`;

  const timeAgo = formatTimeAgo(item.created_at);

  const reporterName =
    item.reporter?.full_name?.trim() ||
    item.reporter?.username?.trim() ||
    (item.reporter?.email ? item.reporter.email.split('@')[0] : 'Campus Student');
  const reporterInitial = (reporterName || 'U').charAt(0).toUpperCase();

  return (
    <article
      onClick={() => onClick?.(item)}
      className="group relative bg-surface border border-border-subtle hover:border-border rounded-2xl p-3.5 sm:p-4.5 flex items-start gap-3.5 sm:gap-4 transition-all duration-150 cursor-pointer shadow-xs select-none"
    >
      {/* 1. Item Photo Thumbnail (shows uploaded image, falls back to category/type icon) */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-surface-elevated border border-border-subtle flex items-center justify-center p-2 text-center group-hover:border-border transition-colors">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
            {getCategoryIcon(item.category, item.title, item.type)}
            <span
              className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                isLost ? 'text-danger bg-danger/10' : 'text-active bg-active/10'
              }`}
            >
              {item.type}
            </span>
          </div>
        )}
      </div>

      {/* 2. Item Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        {/* Top: Title & Bookmark */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[14.5px] sm:text-[15.5px] text-textPrimary leading-snug truncate group-hover:text-textPrimary transition-colors">
            {item.title}
          </h3>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.(item, e);
            }}
            className="p-1 -mr-1 rounded-full text-textTertiary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
            aria-label={isSaved ? 'Remove bookmark' : 'Bookmark item'}
          >
            <Bookmark
              className={`w-4.5 h-4.5 ${
                isSaved ? 'fill-textPrimary text-textPrimary' : 'text-textTertiary'
              }`}
            />
          </button>
        </div>

        {/* Middle: Subtitle Location */}
        <p className="text-[12.5px] sm:text-[13px] text-textSecondary truncate mt-0.5">
          {subtitle}
        </p>

        {/* Bottom: Campus Location, Time, Real Reporter & Type Badge */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1">
          <div className="flex items-center gap-1.5 min-w-0 text-[11.5px] sm:text-[12px] text-textTertiary">
            <span className="flex items-center gap-1 font-medium text-textSecondary truncate">
              <MapPin className="w-3.5 h-3.5 text-textTertiary shrink-0" />
              <span className="truncate">{item.location?.split(',')[0] || 'Campus'}</span>
            </span>

            <span className="shrink-0">•</span>

            <span className="shrink-0">{timeAgo}</span>

            {/* Real Poster Identity */}
            <span
              className="flex items-center gap-1 shrink-0 ml-1 text-textTertiary"
              title={`Posted by ${reporterName}`}
            >
              {item.reporter?.avatar_url ? (
                <img
                  src={item.reporter.avatar_url}
                  alt={reporterName}
                  className="w-4.5 h-4.5 rounded-full object-cover border border-border-subtle shrink-0"
                />
              ) : (
                <span className="w-4.5 h-4.5 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-[10px] font-bold text-textSecondary shrink-0">
                  {reporterInitial}
                </span>
              )}
              <span className="text-[11.5px] text-textSecondary font-medium truncate max-w-[80px] sm:max-w-[120px]">
                {reporterName}
              </span>
            </span>
          </div>

          {/* Status Badge */}
          <span
            className={`px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-[11.5px] font-semibold capitalize shrink-0 tracking-wide ${
              item.status === 'resolved'
                ? 'bg-surface-elevated text-textTertiary border border-border-subtle'
                : 'bg-active text-activeText shadow-xs'
            }`}
          >
            {item.status === 'resolved' ? 'Resolved' : item.type}
          </span>
        </div>
      </div>
    </article>
  );
};
