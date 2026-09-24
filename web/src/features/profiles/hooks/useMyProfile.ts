import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { useAuth } from '@/features/auth';
import { FullProfileResponse, PROFILE_KEYS } from '../types';

export { PROFILE_KEYS };

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

