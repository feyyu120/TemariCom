import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { useAuth } from '@/features/auth';
import { FullProfileResponse } from '../types';

export const PROFILE_KEYS = {
  all: ['profile'] as const,
  me: () => [...PROFILE_KEYS.all, 'me'] as const,
  user: (id: string) => [...PROFILE_KEYS.all, id] as const,
  campus: (institutionId: string) => [...PROFILE_KEYS.all, 'campus', institutionId] as const,
};

/**
 * Hook to retrieve the current authenticated user's complete profile.
 * Stale time is 5 minutes to avoid redundant network round-trips.
 */
export function useMyProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery<FullProfileResponse>({
    queryKey: PROFILE_KEYS.me(),
    queryFn: () => profileService.getMyProfile(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

