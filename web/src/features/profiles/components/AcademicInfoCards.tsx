import React from 'react';
import {
  GraduationCap,
  Calendar,
  Building2,
  BookOpen,
  Globe,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { FullProfileResponse, STUDY_LEVEL_LABELS, StudyLevel } from '../types';

interface AcademicInfoCardsProps {
  profile: FullProfileResponse;
  onEditClick?: () => void;
}

export const AcademicInfoCards: React.FC<AcademicInfoCardsProps> = ({
  profile,
  onEditClick,
}) => {
  const { student_profile, is_own_profile } = profile;

  const studyLevel = student_profile?.study_level;
  const academicYear = student_profile?.academic_year;
  const portfolioUrl = student_profile?.portfolio_url;

  const hasAnyAcademicInfo = Boolean(
    studyLevel || academicYear || portfolioUrl
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-bold text-textPrimary flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-active" />
          <span>Academic Information</span>
        </h2>
        {is_own_profile && (
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs sm:text-sm font-semibold text-active hover:underline cursor-pointer"
          >
            Update details
          </button>
        )}
      </div>

      {!hasAnyAcademicInfo ? (
        <div className="p-6 rounded-2xl bg-surface border border-border-subtle text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-active/10 text-active flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary">
              {is_own_profile
                ? 'Academic details not completed yet'
                : 'No academic information shared'}
            </h3>
            <p className="text-xs text-textTertiary max-w-sm mx-auto mt-1">
              {is_own_profile
                ? 'Share your degree level, study year, and campus to connect with peers and access campus tutor groups.'
                : 'This user has not listed their academic information yet.'}
            </p>
          </div>
          {is_own_profile && (
            <button
              type="button"
              onClick={onEditClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-active hover:bg-active/90 text-active-text font-semibold text-xs transition-colors cursor-pointer"
            >
              <span>Complete Academic Profile</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Study Level / Degree Card */}
          {studyLevel && (
            <div className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-active shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-textTertiary uppercase tracking-wider">
                    Degree Level
                  </p>
                  <p className="text-sm font-bold text-textPrimary truncate">
                    {STUDY_LEVEL_LABELS[studyLevel as StudyLevel] || studyLevel}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Academic Year Card */}
          {academicYear !== undefined && academicYear !== null && (
            <div className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-active shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-textTertiary uppercase tracking-wider">
                    Academic Year
                  </p>
                  <p className="text-sm font-bold text-textPrimary truncate">
                    Year {academicYear}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio or Project Website Card */}
          {portfolioUrl && (
            <div className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-active shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-textTertiary uppercase tracking-wider">
                    Portfolio / Website
                  </p>
                  <a
                    href={portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-active hover:underline flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{portfolioUrl.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AcademicInfoCards;

