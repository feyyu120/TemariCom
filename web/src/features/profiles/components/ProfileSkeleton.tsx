import React from 'react';

/**
 * Loading skeleton placeholder with shimmering animated tokens.
 * Matches the layout of ProfileHeader and AcademicInfoCards.
 */
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-pulse p-4 sm:p-6" aria-label="Loading profile...">
      {/* Top Banner Placeholder */}
      <div className="h-36 sm:h-48 w-full rounded-2xl sm:rounded-3xl bg-surface-elevated" />

      {/* Profile Header Block */}
      <div className="relative px-2 sm:px-6 -mt-16 sm:-mt-20">
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
          {/* Avatar Skeleton */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-background bg-surface-elevated shrink-0 shadow-lg" />

          {/* Action Button Skeleton */}
          <div className="w-32 h-10 rounded-pill bg-surface-elevated shrink-0" />
        </div>

        {/* User Details Skeleton */}
        <div className="mt-4 space-y-3 text-center sm:text-left">
          <div className="h-7 w-48 bg-surface-elevated rounded-medium mx-auto sm:mx-0" />
          <div className="h-4 w-32 bg-surface-elevated rounded-small mx-auto sm:mx-0" />
          <div className="h-4 w-3/4 max-w-md bg-surface-elevated rounded-small mx-auto sm:mx-0" />

          {/* Stats Skeleton */}
          <div className="flex items-center justify-center sm:justify-start gap-6 pt-2">
            <div className="h-4 w-20 bg-surface-elevated rounded-small" />
            <div className="h-4 w-20 bg-surface-elevated rounded-small" />
            <div className="h-4 w-28 bg-surface-elevated rounded-small" />
          </div>
        </div>
      </div>

      {/* Academic Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 px-2 sm:px-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-4 rounded-card bg-surface border border-border-subtle space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-medium bg-surface-elevated shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-16 bg-surface-elevated rounded-small" />
                <div className="h-4 w-28 bg-surface-elevated rounded-small" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileSkeleton;

