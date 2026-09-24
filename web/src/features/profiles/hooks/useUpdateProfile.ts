import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { PROFILE_KEYS } from './useMyProfile';
import { FullProfileResponse, UpdateProfileInput } from '../types';
import { AUTH_USER_QUERY_KEY, useAuth } from '@/features/auth';

/**
 * Mutation hook for partially updating current user's profile.
 * Automatically synchronizes cache with zero refetch flicker.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation<FullProfileResponse, Error, UpdateProfileInput>({
    mutationFn: (data: UpdateProfileInput) => profileService.updateProfile(data),
    onSuccess: (updated) => {
      // 1. Direct cache update for instant UI feedback
      queryClient.setQueryData(PROFILE_KEYS.me(), updated);

      if (updated.user?.id) {
        queryClient.setQueryData(PROFILE_KEYS.user(updated.user.id), updated);
      }

      // 2. Invalidate auth query to keep UserContext / Header avatar in sync
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
      refreshUser().catch(() => {});
    },
  });
}

