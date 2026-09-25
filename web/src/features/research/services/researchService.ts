import { apiClient } from '@/services/api';
import { ENDPOINTS } from '@/services/api/endpoints';
import {
  ScholarXivPaper,
  SearchPapersResponse,
  SavedPaper,
  SavePaperInput,
  SavedPapersResponse,
} from '@/features/research/types';

/**
 * Research Service (Pure functional object - zero classes)
 */
export const researchService = {
  /**
   * Search academic research papers via ScholarXiv proxy
   */
  async searchPapers(q: string, page = 0, limit = 20): Promise<SearchPapersResponse> {
    const res = await apiClient.get<any>(
      ENDPOINTS.RESEARCH.SEARCH,
      {
        params: { q, page, limit },
        requiresAuth: false,
      }
    );
    // Defensively handle array vs paginated envelope
    if (Array.isArray(res.data)) {
      return {
        data: res.data,
        pagination: { page, limit, hasMore: res.data.length >= limit },
      };
    }
    if (res.data && Array.isArray(res.data.data)) {
      return {
        data: res.data.data,
        pagination: res.data.pagination || { page, limit, hasMore: false },
      };
    }
    return {
      data: [],
      pagination: { page, limit, hasMore: false },
    };
  },

  /**
   * Fetch a single paper's details by its ID
   */
  async getPaper(id: string): Promise<ScholarXivPaper> {
    const res = await apiClient.get<any>(
      ENDPOINTS.RESEARCH.PAPER_BY_ID(encodeURIComponent(id)),
      { requiresAuth: false }
    );
    return res.data?.data || res.data;
  },

  /**
   * List the authenticated user's bookmarked papers
   */
  async listSavedPapers(page = 0, limit = 20): Promise<SavedPapersResponse> {
    const res = await apiClient.get<any>(
      ENDPOINTS.RESEARCH.SAVED,
      {
        params: { page, limit },
        requiresAuth: true,
      }
    );
    if (Array.isArray(res.data)) {
      return {
        data: res.data,
        pagination: { page, limit, total: res.data.length, has_more: false },
      };
    }
    if (res.data && Array.isArray(res.data.data)) {
      return {
        data: res.data.data,
        pagination: res.data.pagination || { page, limit, total: res.data.data.length, has_more: false },
      };
    }
    return {
      data: [],
      pagination: { page, limit, total: 0, has_more: false },
    };
  },

  /**
   * Bookmark a paper to user's saved library
   */
  async savePaper(input: SavePaperInput): Promise<SavedPaper> {
    const res = await apiClient.post<{ success: boolean; data: SavedPaper }>(
      ENDPOINTS.RESEARCH.SAVE,
      input,
      { requiresAuth: true }
    );
    return res.data.data;
  },

  /**
   * Remove a paper bookmark by its record UUID
   */
  async removeSavedPaper(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.RESEARCH.REMOVE_SAVED(id), {
      requiresAuth: true,
    });
  },

  /**
   * Remove a paper bookmark by its external paper ID
   */
  async removeSavedPaperByExternalId(externalId: string): Promise<void> {
    await apiClient.delete(
      ENDPOINTS.RESEARCH.REMOVE_SAVED_BY_EXTERNAL(encodeURIComponent(externalId)),
      { requiresAuth: true }
    );
  },

  /**
   * Check if a specific paper is saved by the viewer
   */
  async checkIsSaved(externalId: string): Promise<boolean> {
    const res = await apiClient.get<{ success: boolean; data: { is_saved: boolean } }>(
      ENDPOINTS.RESEARCH.CHECK_SAVED(encodeURIComponent(externalId)),
      { requiresAuth: false }
    );
    return res.data?.data?.is_saved ?? false;
  },
};
