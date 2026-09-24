/**
 * Profile Feature Types & DTOs
 * Strictly aligned with Go Backend models & contracts
 */

export type StudyLevel =
  | 'elementary'
  | 'high_school'
  | 'undergraduate'
  | 'postgraduate'
  | 'masters'
  | 'phd'
  | 'diploma'
  | 'other';

export const PROFILE_KEYS = {
  all: ['profile'] as const,
  me: () => ['profile', 'me'] as const,
  user: (id: string) => ['profile', id] as const,
  campus: (institutionId: string) => ['profile', 'campus', institutionId] as const,
};

export interface StudentProfile {
  user_id: string;
  study_level?: StudyLevel | null;
  academic_year?: number | null;
  institution_id?: string | null;
  department_id?: string | null;
  portfolio_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileSummary {
  id: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_verified: boolean;
}

export interface SocialCounts {
  followers_count: number;
  following_count: number;
}

export interface FullProfileResponse {
  user: UserProfileSummary;
  student_profile?: StudentProfile | null;
  social_counts: SocialCounts;
  is_following: boolean;
  is_own_profile: boolean;
}

export interface PresignAvatarRequest {
  extension: string;
  content_type: string;
}

export interface PresignAvatarResponse {
  upload_url: string;
  key: string;
  public_url: string;
}

export interface UpdateProfileInput {
  username?: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  study_level?: StudyLevel;
  academic_year?: number;
  institution_id?: string;
  department_id?: string;
  portfolio_url?: string;
}

export const STUDY_LEVEL_LABELS: Record<StudyLevel, string> = {
  elementary: 'Elementary School',
  high_school: 'High School',
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
  masters: "Master's Degree",
  phd: 'PhD / Doctorate',
  diploma: 'Diploma / TVET',
  other: 'Other Studies',
};

export const EMPTY_PROFILE: FullProfileResponse = {
  user: {
    id: '',
    username: null,
    email: null,
    phone: null,
    full_name: null,
    avatar_url: null,
    bio: null,
    is_verified: false,
  },
  student_profile: null,
  social_counts: {
    followers_count: 0,
    following_count: 0,
  },
  is_following: false,
  is_own_profile: true,
};

export interface AcademicAppMeta {
  university: string;
  department: string;
}

export const ETHIOPIAN_UNIVERSITIES = [
  { code: 'ASTU', name: 'Adama Science and Technology University (ASTU)' },
  { code: 'AAU', name: 'Addis Ababa University (AAU)' },
  { code: 'AASTU', name: 'Addis Ababa Science & Technology University (AASTU)' },
  { code: 'JU', name: 'Jimma University (JU)' },
  { code: 'HU', name: 'Hawassa University (HU)' },
  { code: 'BDU', name: 'Bahir Dar University (BDU)' },
  { code: 'MU', name: 'Mekelle University (MU)' },
  { code: 'UoG', name: 'University of Gondar (UoG)' },
  { code: 'AMU', name: 'Arba Minch University (AMU)' },
  { code: 'Haramaya', name: 'Haramaya University' },
  { code: 'Wollo', name: 'Wollo University' },
  { code: 'Other', name: 'Other Institution' },
];

export const ACADEMIC_DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science and Engineering (CSE)' },
  { code: 'SE', name: 'Software Engineering (SE)' },
  { code: 'ECE', name: 'Electrical and Computer Engineering (ECE)' },
  { code: 'IT', name: 'Information Technology (IT)' },
  { code: 'ME', name: 'Mechanical Engineering (ME)' },
  { code: 'CE', name: 'Civil Engineering (CE)' },
  { code: 'Medicine', name: 'Medicine & Health Sciences' },
  { code: 'Business', name: 'Business & Economics' },
  { code: 'Law', name: 'School of Law' },
  { code: 'Architecture', name: 'Architecture' },
  { code: 'Other', name: 'Other Department' },
];

export function getAppAcademicMeta(userId?: string): AcademicAppMeta {
  if (!userId) return { university: '', department: '' };
  try {
    const raw = localStorage.getItem(`temaricom_academic_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        university: parsed.university || '',
        department: parsed.department || '',
      };
    }
  } catch {}
  return { university: '', department: '' };
}

export function saveAppAcademicMeta(userId: string, meta: AcademicAppMeta): void {
  try {
    localStorage.setItem(`temaricom_academic_${userId}`, JSON.stringify(meta));
  } catch {}
}

