import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { PROFILE_KEYS } from './useMyProfile';
import { FullProfileResponse } from '../types';

/**
 * Hook to retrieve any public student profile by user UUID.
 */
export function useUserProfile(userId?: string) {
  return useQuery<FullProfileResponse>({
    queryKey: PROFILE_KEYS.user(userId || ''),
    queryFn: () => profileService.getUserProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });
}

