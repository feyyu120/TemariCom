import { apiClient } from '@/services/api';
import { ENDPOINTS } from '@/services/api/endpoints';
import {
  FullProfileResponse,
  PresignAvatarRequest,
  PresignAvatarResponse,
  UpdateProfileInput,
} from '../types';

/**
 * Profile Service (Pure functional object - zero classes)
 */
export const profileService = {
  /**
   * Fetch current authenticated user's complete profile
   */
  async getMyProfile(): Promise<FullProfileResponse> {
    const res = await apiClient.get<FullProfileResponse>(ENDPOINTS.PROFILE.ME);
    return res.data;
  },

  /**
   * Fetch any public user profile by user UUID
   */
  async getUserProfile(userId: string): Promise<FullProfileResponse> {
    const res = await apiClient.get<FullProfileResponse>(ENDPOINTS.PROFILE.BY_ID(userId), {
      requiresAuth: false,
    });
    return res.data;
  },

  /**
   * Partially update current user's profile
   */
  async updateProfile(input: UpdateProfileInput): Promise<FullProfileResponse> {
    const res = await apiClient.patch<FullProfileResponse>(ENDPOINTS.PROFILE.UPDATE, input);
    return res.data;
  },

  /**
   * Permanently delete user's account and all associated profile data
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete(ENDPOINTS.PROFILE.DELETE_ACCOUNT);
  },

  /**
   * Request presigned direct upload URL for avatar
   */
  async getAvatarPresignedUrl(req: PresignAvatarRequest): Promise<PresignAvatarResponse> {
    const res = await apiClient.post<PresignAvatarResponse>(ENDPOINTS.PROFILE.PRESIGN_AVATAR, req);
    return res.data;
  },

  /**
   * Upload image binary directly to Cloudflare R2 presigned URL
   */
  async uploadAvatarBinary(uploadUrl: string, file: Blob, contentType: string): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Avatar upload failed with status ${response.status}`);
    }
  },

  /**
   * Helper that requests a presigned URL, uploads the file binary,
   * updates the user's avatar_url in the database, and returns the updated profile.
   */
  async uploadAndSaveAvatar(file: File): Promise<FullProfileResponse> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = file.type || 'image/jpeg';

    const presigned = await profileService.getAvatarPresignedUrl({
      extension: ext,
      content_type: contentType,
    });

    await profileService.uploadAvatarBinary(presigned.upload_url, file, contentType);

    // Save key in database
    return await profileService.updateProfile({
      avatar_url: presigned.key,
    });
  },
};

