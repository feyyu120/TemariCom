import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { FullProfileResponse, UpdateProfileInput, PROFILE_KEYS } from '../types';
import { useAuth } from '@/features/auth';

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

      // 2. Invalidate profile query to keep UserContext / Header avatar in sync
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.me() });
      refreshUser().catch(() => {});
    },
  });
}

