import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Loader2,
  AlertCircle,
  User as UserIcon,
  Check,
} from 'lucide-react';
import {
  FullProfileResponse,
  StudyLevel,
  STUDY_LEVEL_LABELS,
  UpdateProfileInput,
  getAppAcademicMeta,
  saveAppAcademicMeta,
} from '@/features/profiles/types';
import { useUpdateProfile } from '@/features/profiles/hooks/useUpdateProfile';
import { profileService } from '@/features/profiles/services/profileService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FullProfileResponse;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const updateProfileMutation = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [studyLevel, setStudyLevel] = useState<StudyLevel | ''>('');
  const [academicYear, setAcademicYear] = useState<number | ''>('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // UI state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // Synchronize form values when profile opens
  useEffect(() => {
    if (isOpen && profile) {
      setFullName(profile.user?.full_name || '');
      setUsername(profile.user?.username || '');
      setBio(profile.user?.bio || '');
      setPhone(profile.user?.phone || '');
      setAvatarUrl(profile.user?.avatar_url || '');

      setStudyLevel(profile.student_profile?.study_level || '');
      setAcademicYear(
        profile.student_profile?.academic_year !== undefined &&
          profile.student_profile?.academic_year !== null
          ? profile.student_profile.academic_year
          : ''
      );
      setPortfolioUrl(profile.student_profile?.portfolio_url || '');

      const academicMeta = getAppAcademicMeta(profile.user?.id);
      setUniversity(academicMeta.university);
      setDepartment(academicMeta.department);

      setErrorMessage(null);
      setIsSavedSuccessfully(false);
    }
  }, [isOpen, profile]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle avatar file selection & direct upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Avatar image size must be less than 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = file.type || 'image/jpeg';

      // 1. Request presigned upload URL from backend
      const presigned = await profileService.getAvatarPresignedUrl({
        extension: ext,
        content_type: contentType,
      });

      // 2. Direct PUT upload to storage
      await profileService.uploadAvatarBinary(presigned.upload_url, file, contentType);

      // 3. Set preview and store key to save with profile
      setAvatarUrl(presigned.public_url || presigned.key);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload avatar image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: UpdateProfileInput = {};

    if (fullName.trim() !== (profile.user?.full_name || '')) {
      payload.full_name = fullName.trim();
    }

    if (username.trim() !== (profile.user?.username || '')) {
      payload.username = username.trim().toLowerCase();
    }

    if (bio.trim() !== (profile.user?.bio || '')) {
      payload.bio = bio.trim();
    }

    if (phone.trim() !== (profile.user?.phone || '')) {
      payload.phone = phone.trim() ? phone.trim() : undefined;
    }

    if (avatarUrl && avatarUrl !== profile.user?.avatar_url) {
      payload.avatar_url = avatarUrl;
    }

    if (studyLevel !== (profile.student_profile?.study_level || '')) {
      if (studyLevel) {
        payload.study_level = studyLevel as StudyLevel;
      }
    }

    const currentYear = profile.student_profile?.academic_year ?? '';
    if (academicYear !== currentYear) {
      if (typeof academicYear === 'number') {
        payload.academic_year = academicYear;
      }
    }

    if (portfolioUrl.trim() !== (profile.student_profile?.portfolio_url || '')) {
      payload.portfolio_url = portfolioUrl.trim() ? portfolioUrl.trim() : undefined;
    }

    try {
      if (profile.user?.id) {
        saveAppAcademicMeta(profile.user.id, { university, department });
      }
      await updateProfileMutation.mutateAsync(payload);
      setIsSavedSuccessfully(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to update profile. Please verify your input and try again.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-textPrimary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface">
          <h2 id="edit-profile-title" className="text-base sm:text-lg font-bold text-textPrimary">
            Edit Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close edit profile modal"
          >
            <X className="w-5 h-5 text-textPrimary" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-2.5 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSavedSuccessfully && (
            <div className="p-3 rounded-xl bg-verification/10 border border-verification/30 flex items-center gap-2.5 text-xs text-verification">
              <Check className="w-4 h-4 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Avatar Upload Picker */}
          <div className="flex flex-col items-center justify-center pb-2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-border shadow-md"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-surface-elevated border-2 border-border flex items-center justify-center text-textSecondary shadow-md">
                  <UserIcon className="w-10 h-10" />
                </div>
              )}

              {/* Upload Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>

              {/* Badge Button */}
              <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-surface text-textPrimary shadow-sm border border-border">
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
            />
            <p className="text-[11px] text-textTertiary mt-2">
              Click photo to change avatar (JPG, PNG, WebP up to 5MB)
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-textSecondary">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Abebe Kebede"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none transition-colors"
            />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-textSecondary">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-textTertiary">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="username"
                maxLength={50}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-textSecondary">Bio</label>
              <span className="text-[11px] text-textTertiary">{bio.length}/255</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about your studies, passions, or campus life..."
              maxLength={255}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-textSecondary">Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +251 91 234 5678"
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none transition-colors"
            />
          </div>

          {/* University / School */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-textSecondary">University / School</label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. ASTU, AAU, or your university"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none transition-colors"
            />
          </div>

          {/* Department */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-textSecondary">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. CSE, Software Engineering, Medicine"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none transition-colors"
            />
          </div>

          {/* Academic Info Row: Study Level & Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Study Level */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-textSecondary">Degree / Study Level</label>
              <select
                value={studyLevel}
                onChange={(e) => setStudyLevel(e.target.value as StudyLevel | '')}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">Select study level</option>
                {Object.entries(STUDY_LEVEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-textSecondary">Academic Year</label>
              <select
                value={academicYear}
                onChange={(e) =>
                  setAcademicYear(e.target.value ? parseInt(e.target.value, 10) : '')
                }
                className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5, 6, 7].map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Portfolio URL */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-textSecondary">Portfolio / Website Link</label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://myportfolio.com or github.com/user"
              maxLength={500}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle focus:border-active text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none transition-colors"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border-subtle bg-surface flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={updateProfileMutation.isPending}
            className="px-4 py-2 rounded-pill border border-border text-textSecondary hover:text-textPrimary hover:bg-surface-elevated text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending || isUploadingAvatar}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-pill bg-textPrimary hover:bg-textPrimary/90 active:scale-[0.98] text-background text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;

