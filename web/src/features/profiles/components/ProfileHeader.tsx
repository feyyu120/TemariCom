import React, { useState, useRef } from 'react';
import {
  Camera,
  BadgeCheck,
  User as UserIcon,
  Landmark,
  GraduationCap,
  Calendar,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { FullProfileResponse, STUDY_LEVEL_LABELS, StudyLevel, getAppAcademicMeta } from '@/features/profiles/types';
import { profileService } from '@/features/profiles/services/profileService';
import { useUpdateProfile } from '@/features/profiles/hooks/useUpdateProfile';

interface ProfileHeaderProps {
  profile: FullProfileResponse;
  onEditClick?: () => void;
  isCurrentUser?: boolean;
}

// Helper to format 1200 -> "1.2K"
function formatCount(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Suffix helper for academic year: 1 -> 1st, 2 -> 2nd, 3 -> 3rd, etc.
function formatAcademicYear(year?: number | null): string {
  if (!year) return 'Study Year';
  const j = year % 10;
  const k = year % 100;
  if (j === 1 && k !== 11) return `${year}st Year`;
  if (j === 2 && k !== 12) return `${year}nd Year`;
  if (j === 3 && k !== 13) return `${year}rd Year`;
  return `${year}th Year`;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  onEditClick,
  isCurrentUser = false,
}) => {
  const { user, student_profile, social_counts, is_own_profile } = profile;
  const isOwner = is_own_profile || isCurrentUser;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProfileMutation = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Direct avatar file upload handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await profileService.uploadAndSaveAvatar(file);
      await updateProfileMutation.mutateAsync({});
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const bioText = user.bio || '';
  const shouldTruncateBio = bioText.length > 90;
  const displayedBio = shouldTruncateBio && !isBioExpanded
    ? `${bioText.slice(0, 90)}...`
    : bioText;

  const studyLevelLabel = student_profile?.study_level
    ? STUDY_LEVEL_LABELS[student_profile.study_level as StudyLevel] || student_profile.study_level
    : null;

  const academicMeta = getAppAcademicMeta(user?.id);

  return (
    <div className="w-full text-textPrimary select-none">
      {/* 1. HERO ROW: Followers | Avatar + Camera | Following */}
      <div className="flex items-center justify-around sm:justify-center sm:gap-20 pt-2 pb-3">
        {/* Followers Counter (Left) */}
        <div className="text-center min-w-[72px]">
          <p className="text-2xl sm:text-3xl font-black text-textPrimary tracking-tight">
            {formatCount(social_counts?.followers_count ?? 0)}
          </p>
          <p className="text-xs text-textTertiary font-medium mt-0.5">Followers</p>
        </div>

        {/* Center Avatar with Camera Trigger */}
        <div className="relative group shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || user.username || 'Profile avatar'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-border-subtle bg-surface"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-surface-elevated border-2 border-border-subtle flex items-center justify-center text-textSecondary">
              <UserIcon className="w-12 h-12" />
            </div>
          )}

          {/* Camera Button for Owner */}
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-surface border border-border-subtle text-textPrimary hover:bg-surface-elevated transition-colors shadow-md cursor-pointer disabled:opacity-50"
                title="Change photo"
                aria-label="Change photo"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Following Counter (Right) */}
        <div className="text-center min-w-[72px]">
          <p className="text-2xl sm:text-3xl font-black text-textPrimary tracking-tight">
            {formatCount(social_counts?.following_count ?? 0)}
          </p>
          <p className="text-xs text-textTertiary font-medium mt-0.5">Following</p>
        </div>
      </div>

      {/* 2. NAME & VERIFIED BADGE */}
      <div className="text-center mt-2 space-y-1 px-4">
        <div className="flex items-center justify-center gap-1.5">
          <h1 className="text-lg sm:text-xl font-bold text-textPrimary tracking-tight">
            {user.full_name || user.username || 'Student User'}
          </h1>
          {user.is_verified && (
            <span title="Verified Student">
              <BadgeCheck className="w-5 h-5 text-textPrimary fill-textPrimary stroke-background" />
            </span>
          )}
        </div>

        {/* User Bio */}
        {bioText ? (
          <p className="text-xs sm:text-[13px] text-textSecondary max-w-md mx-auto leading-relaxed">
            {displayedBio}{' '}
            {shouldTruncateBio && (
              <button
                type="button"
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="text-textPrimary font-semibold hover:underline ml-1 cursor-pointer"
              >
                {isBioExpanded ? 'See less' : 'See more'}
              </button>
            )}
          </p>
        ) : isOwner ? (
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs text-textTertiary hover:text-textPrimary hover:underline cursor-pointer"
          >
            + Add a short bio
          </button>
        ) : null}
      </div>

      {/* 3. FOUR-COLUMN ACADEMIC / META BAR (Matches the exact layout with vertical divider lines) */}
      <div className="mt-5 grid grid-cols-4 divide-x divide-border-subtle border-y border-border-subtle py-3 text-center bg-transparent">
        {/* Item 1: University */}
        <div className="px-2">
          <Landmark className="w-5 h-5 mx-auto mb-1 text-textPrimary opacity-90" />
          <p
            onClick={!academicMeta.university && isOwner ? onEditClick : undefined}
            className={`text-xs sm:text-sm font-bold truncate ${
              academicMeta.university
                ? 'text-textPrimary'
                : isOwner
                ? 'text-textTertiary hover:text-textPrimary hover:underline cursor-pointer font-medium'
                : 'text-textTertiary font-normal'
            }`}
          >
            {academicMeta.university || (isOwner ? '+ Add Uni' : '—')}
          </p>
          <p className="text-[11px] text-textTertiary mt-0.5">University</p>
        </div>

        {/* Item 2: Department */}
        <div className="px-2">
          <GraduationCap className="w-5 h-5 mx-auto mb-1 text-textPrimary opacity-90" />
          <p
            onClick={!academicMeta.department && isOwner ? onEditClick : undefined}
            className={`text-xs sm:text-sm font-bold truncate ${
              academicMeta.department
                ? 'text-textPrimary'
                : isOwner
                ? 'text-textTertiary hover:text-textPrimary hover:underline cursor-pointer font-medium'
                : 'text-textTertiary font-normal'
            }`}
          >
            {academicMeta.department || (isOwner ? '+ Add Dept' : '—')}
          </p>
          <p className="text-[11px] text-textTertiary mt-0.5">Department</p>
        </div>

        {/* Item 3: Study Level / Year */}
        <div className="px-2">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-textPrimary opacity-90" />
          <p
            onClick={
              !student_profile?.academic_year && !studyLevelLabel && isOwner
                ? onEditClick
                : undefined
            }
            className={`text-xs sm:text-sm font-bold truncate ${
              student_profile?.academic_year || studyLevelLabel
                ? 'text-textPrimary'
                : isOwner
                ? 'text-textTertiary hover:text-textPrimary hover:underline cursor-pointer font-medium'
                : 'text-textTertiary font-normal'
            }`}
          >
            {student_profile?.academic_year
              ? formatAcademicYear(student_profile.academic_year)
              : studyLevelLabel || (isOwner ? '+ Add Year' : '—')}
          </p>
          <p className="text-[11px] text-textTertiary mt-0.5">Study Level</p>
        </div>

        {/* Item 4: Portfolio */}
        <div className="px-2">
          <Briefcase className="w-5 h-5 mx-auto mb-1 text-textPrimary opacity-90" />
          {student_profile?.portfolio_url ? (
            <a
              href={
                student_profile.portfolio_url.startsWith('http')
                  ? student_profile.portfolio_url
                  : `https://${student_profile.portfolio_url}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-bold text-textPrimary hover:underline flex items-center justify-center gap-1 truncate"
              title="Open Portfolio"
            >
              <span className="truncate">Portfolio</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
            </a>
          ) : (
            <p
              onClick={isOwner ? onEditClick : undefined}
              className={`text-xs sm:text-sm truncate ${
                isOwner
                  ? 'text-textTertiary hover:text-textPrimary hover:underline cursor-pointer font-medium'
                  : 'text-textTertiary font-normal'
              }`}
            >
              {isOwner ? '+ Add Link' : '—'}
            </p>
          )}
          <p className="text-[11px] text-textTertiary mt-0.5">Portfolio</p>
        </div>
      </div>

      {/* 4. QUICK ACCESS SECTION */}
      <div className="mt-5 px-1 sm:px-0">
        <h3 className="text-sm font-bold text-textPrimary mb-2 px-1">Quick Access</h3>
        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border-subtle bg-surface/30 hover:bg-surface-elevated transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-border-subtle flex items-center justify-center text-textPrimary">
              <UserIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-textPrimary">
              My Tutors & Bookings
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-textTertiary group-hover:text-textPrimary transition-colors">
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
