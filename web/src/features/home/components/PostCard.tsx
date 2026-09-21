import React, { useState } from 'react';
import {
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Bookmark,
  Share2,
  MoreHorizontal,
  BadgeCheck,
} from 'lucide-react';
import { Post } from '@/features/home/types';
import { homeService } from '@/features/home/services/homeService';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isLiked, setIsLiked] = useState(post.stats.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.stats.likes);
  const [isBookmarked, setIsBookmarked] = useState(post.stats.isBookmarked ?? false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikeCount((prev) => (nextState ? prev + 1 : prev - 1));
    try {
      await homeService.toggleLike(post.id, isLiked);
    } catch {
      // Rollback on failure
      setIsLiked(isLiked);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    try {
      await homeService.toggleBookmark(post.id, isBookmarked);
    } catch {
      setIsBookmarked(isBookmarked);
    }
  };

  // Helper to render hashtags and handles with color
  const renderFormattedText = (content: string) => {
    const parts = content.split(/(\s+)/);
    return parts.map((word, idx) => {
      if (word.startsWith('#') || word.startsWith('@')) {
        return (
          <span key={idx} className="text-textSecondary hover:underline cursor-pointer font-medium">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  return (
    <article className="p-3.5 sm:p-4 border-b border-border-subtle hover:bg-surface/30 transition-colors duration-150 cursor-pointer">
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Author Avatar */}
        <img
          src={post.author.avatarUrl}
          alt={post.author.name}
          className="w-10 h-10 rounded-full object-cover shrink-0 hover:opacity-90 transition-opacity"
        />

        {/* Post Body */}
        <div className="flex-1 min-w-0">
          {/* Header Row / Author Details */}
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-bold text-[15px] text-textPrimary hover:underline truncate">
                {post.author.name}
              </span>
              {post.author.isVerified && (
                <BadgeCheck className="w-4 h-4 text-verification shrink-0" />
              )}
              <span className="text-[15px] text-textTertiary truncate">
                @{post.author.username}
              </span>
              <span className="text-[15px] text-textTertiary">·</span>
              <span className="text-[15px] text-textTertiary shrink-0">
                {post.timeAgo}
              </span>
            </div>

            <button
              type="button"
              className="p-1 -mr-1 text-textTertiary hover:text-textPrimary hover:bg-surface-elevated rounded-full transition-colors cursor-pointer"
              aria-label="Post actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Text Content */}
          <div className="text-[15px] text-textPrimary whitespace-pre-line leading-[20px] mb-2.5">
            {renderFormattedText(post.content)}
          </div>

          {/* Media / Link Card Preview */}
          {post.media && (
            <div className="mb-2.5 rounded-card border border-border-subtle overflow-hidden bg-surface group hover:border-border transition-colors">
              {post.media.type === 'image' && post.media.imageUrl && (
                <div className="relative">
                  <img
                    src={post.media.imageUrl}
                    alt={post.media.title || 'Post media'}
                    className="w-full h-52 object-cover"
                  />
                  {(post.media.title || post.media.subtitle) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                      {post.media.title && (
                        <h4 className="text-white font-bold text-base">
                          {post.media.title}
                        </h4>
                      )}
                      {post.media.subtitle && (
                        <p className="text-gray-300 text-xs mt-0.5">
                          {post.media.subtitle}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {post.media.type === 'link' && (
                <div className="flex flex-col">
                  {post.media.imageUrl && (
                    <img
                      src={post.media.imageUrl}
                      alt={post.media.title || 'Link image'}
                      className="w-full h-44 object-cover"
                    />
                  )}
                  <div className="p-3 bg-surface">
                    <p className="text-xs text-textTertiary uppercase tracking-wide">
                      {post.media.domain}
                    </p>
                    <p className="font-semibold text-[15px] text-textPrimary mt-0.5 group-hover:underline">
                      {post.media.title}
                    </p>
                    {post.media.subtitle && (
                      <p className="text-[14px] text-textSecondary mt-1 line-clamp-2">
                        {post.media.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post Action Buttons Row */}
          <div className="flex items-center justify-between text-textTertiary text-[13px] max-w-md pt-1 select-none">
            {/* Comment */}
            <button
              type="button"
              className="flex items-center gap-1 hover:text-textPrimary group transition-colors -ml-1 py-1 px-1.5 rounded-full hover:bg-surface-elevated/70 cursor-pointer"
            >
              <MessageCircle className="w-[18px] h-[18px] shrink-0" />
              <span>{post.stats.comments}</span>
            </button>

            {/* Repost */}
            <button
              type="button"
              className="flex items-center gap-1 hover:text-textPrimary group transition-colors py-1 px-1.5 rounded-full hover:bg-surface-elevated/70 cursor-pointer"
            >
              <Repeat2 className="w-[18px] h-[18px] shrink-0" />
              <span>
                {post.stats.reposts > 999
                  ? `${(post.stats.reposts / 1000).toFixed(1)}K`
                  : post.stats.reposts}
              </span>
            </button>

            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1 group transition-colors py-1 px-1.5 rounded-full cursor-pointer ${
                isLiked
                  ? 'text-danger hover:bg-danger/10'
                  : 'hover:text-danger hover:bg-danger/10'
              }`}
            >
              <Heart
                className={`w-[18px] h-[18px] shrink-0 transition-transform active:scale-125 ${
                  isLiked ? 'fill-current text-danger' : ''
                }`}
              />
              <span className={isLiked ? 'font-semibold text-danger' : ''}>
                {likeCount > 999
                  ? `${(likeCount / 1000).toFixed(1)}K`
                  : likeCount}
              </span>
            </button>

            {/* Views */}
            <div className="flex items-center gap-1 hover:text-textPrimary transition-colors py-1 px-1">
              <BarChart2 className="w-[18px] h-[18px] shrink-0" />
              <span>{post.stats.views}</span>
            </div>

            {/* Share */}
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-surface-elevated hover:text-textPrimary transition-colors cursor-pointer"
              aria-label="Share post"
            >
              <Share2 className="w-4 h-4 shrink-0" />
            </button>

            {/* Bookmark */}
            <button
              type="button"
              onClick={handleBookmark}
              className={`p-1.5 rounded-full hover:bg-surface-elevated hover:text-textPrimary transition-colors cursor-pointer ${
                isBookmarked ? 'text-textPrimary' : ''
              }`}
              aria-label="Bookmark post"
            >
              <Bookmark
                className={`w-4 h-4 shrink-0 ${isBookmarked ? 'fill-current' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
