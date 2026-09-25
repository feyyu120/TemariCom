import React from 'react';

export const PaperSkeleton: React.FC = () => {
  return (
    <div className="p-4 sm:p-5 rounded-card bg-surface border border-border-subtle animate-pulse space-y-3">
      {/* Top category badges & date */}
      <div className="flex items-center justify-between gap-3">
        <div className="h-5 w-24 bg-surface-elevated rounded-full" />
        <div className="h-4 w-20 bg-surface-elevated rounded-sm" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="h-5 w-4/5 bg-surface-elevated rounded-sm" />
        <div className="h-5 w-2/3 bg-surface-elevated rounded-sm" />
      </div>

      {/* Authors */}
      <div className="h-4 w-1/2 bg-surface-elevated rounded-sm" />

      {/* Abstract preview */}
      <div className="space-y-1.5 pt-1">
        <div className="h-3.5 w-full bg-surface-elevated rounded-sm" />
        <div className="h-3.5 w-full bg-surface-elevated rounded-sm" />
        <div className="h-3.5 w-3/4 bg-surface-elevated rounded-sm" />
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-surface-elevated rounded-lg" />
          <div className="h-8 w-20 bg-surface-elevated rounded-lg" />
        </div>
        <div className="h-8 w-8 bg-surface-elevated rounded-lg" />
      </div>
    </div>
  );
};
