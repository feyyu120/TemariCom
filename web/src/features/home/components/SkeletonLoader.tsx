import React from 'react';

export const PostSkeleton: React.FC = () => {
  return (
    <div className="p-4 border-b border-border-subtle animate-pulse">
      <div className="flex items-start gap-3">
        {/* Avatar Skeleton */}
        <div className="w-10 h-10 rounded-full bg-surface-elevated shrink-0" />
        
        {/* Post Content Skeleton */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-28 bg-surface-elevated rounded" />
            <div className="h-3 w-20 bg-surface-elevated rounded" />
            <div className="h-3 w-8 bg-surface-elevated rounded ml-auto" />
          </div>

          {/* Text Lines */}
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-surface-elevated rounded" />
            <div className="h-3.5 w-5/6 bg-surface-elevated rounded" />
            <div className="h-3.5 w-3/4 bg-surface-elevated rounded" />
          </div>

          {/* Media Box Skeleton */}
          <div className="h-44 w-full bg-surface-elevated rounded-card" />

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 max-w-md">
            <div className="h-4 w-12 bg-surface-elevated rounded" />
            <div className="h-4 w-12 bg-surface-elevated rounded" />
            <div className="h-4 w-12 bg-surface-elevated rounded" />
            <div className="h-4 w-12 bg-surface-elevated rounded" />
            <div className="h-4 w-6 bg-surface-elevated rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const WidgetItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-3 rounded-card animate-pulse">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-surface-elevated shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-3 w-16 bg-surface-elevated rounded" />
          <div className="h-3.5 w-3/4 bg-surface-elevated rounded" />
          <div className="h-2.5 w-1/3 bg-surface-elevated rounded" />
        </div>
      </div>
      <div className="w-4 h-4 rounded bg-surface-elevated ml-2" />
    </div>
  );
};

export const WidgetSkeleton: React.FC<{ itemsCount?: number }> = ({ itemsCount = 3 }) => {
  return (
    <div className="bg-surface rounded-card border border-border-subtle p-3.5 space-y-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 w-36 bg-surface-elevated rounded" />
        <div className="h-3 w-12 bg-surface-elevated rounded" />
      </div>
      {Array.from({ length: itemsCount }).map((_, index) => (
        <WidgetItemSkeleton key={index} />
      ))}
    </div>
  );
};

