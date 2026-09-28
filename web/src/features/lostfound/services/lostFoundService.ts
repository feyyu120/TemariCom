import { apiClient } from '@/services/api/apiClient';
import { tokenStorage } from '@/services/api/tokenStorage';
import { ENDPOINTS } from '@/services/api/endpoints';
import { ENV } from '@/config/env';
import {
  LostFoundItem,
  ItemListResponse,
  CreateItemPayload,
  UpdateItemPayload,
  ItemFilterQuery,
  PresignImageResponse,
  PaginationMeta,
} from '@/features/lostfound/types';

const SAVED_BOOKMARKS_KEY = 'temaricom_lostfound_saved_ids';

export const lostFoundService = {
  /**
   * Retrieves lost and found items from real backend with filter & pagination.
   * No hardcoded mock data.
   */
  async getItems(filter: ItemFilterQuery = {}): Promise<ItemListResponse> {
    const queryParams: Record<string, string | number> = {};
    if (filter.type && filter.type !== 'all') queryParams.type = filter.type;
    if (filter.status && filter.status !== 'all') queryParams.status = filter.status;
    if (filter.category && filter.category !== 'all') queryParams.category = filter.category;
    if (filter.search) queryParams.search = filter.search;
    if (filter.page !== undefined) queryParams.page = filter.page;
    if (filter.limit !== undefined) queryParams.limit = filter.limit;

    try {
      const res = await apiClient.get<any>(ENDPOINTS.LOST_FOUND.ITEMS, {
        params: queryParams,
        requiresAuth: false,
      });

      let items: LostFoundItem[] = [];
      let pagination: PaginationMeta = {
        total: 0,
        page: filter.page || 0,
        limit: filter.limit || 20,
        has_more: false,
      };

      const resData = res.data;
      if (resData) {
        if (Array.isArray(resData.data)) {
          items = resData.data;
          if (resData.pagination) pagination = resData.pagination;
        } else if (Array.isArray(resData.items)) {
          items = resData.items;
          if (resData.pagination) pagination = resData.pagination;
        } else if (Array.isArray(resData)) {
          items = resData;
          pagination.total = items.length;
        }
      }

      return { items, pagination };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[LostFoundService] Failed to fetch items from backend:', err);
      }
      return {
        items: [],
        pagination: {
          total: 0,
          page: filter.page || 0,
          limit: filter.limit || 20,
          has_more: false,
        },
      };
    }
  },

  /**
   * Retrieves single item by ID from backend.
   */
  async getItemById(id: string): Promise<LostFoundItem> {
    const res = await apiClient.get<LostFoundItem>(ENDPOINTS.LOST_FOUND.ITEM_BY_ID(id), {
      requiresAuth: false,
    });
    return res.data;
  },

  /**
   * Creates a new lost or found item post in PostgreSQL.
   */
  async createItem(payload: CreateItemPayload): Promise<LostFoundItem> {
    const res = await apiClient.post<LostFoundItem>(
      ENDPOINTS.LOST_FOUND.ITEMS,
      payload,
      { requiresAuth: true }
    );
    return res.data;
  },

  /**
   * Updates an existing item (e.g. resolve status or edit info)
   */
  async updateItem(id: string, payload: UpdateItemPayload): Promise<LostFoundItem> {
    const res = await apiClient.patch<LostFoundItem>(
      ENDPOINTS.LOST_FOUND.ITEM_BY_ID(id),
      payload,
      { requiresAuth: true }
    );
    return res.data;
  },

  /**
   * Permanently deletes a post and cleans up associated R2 photos.
   */
  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.LOST_FOUND.ITEM_BY_ID(id), {
      requiresAuth: true,
    });
  },

  /**
   * Requests a Cloudflare R2 presigned PUT upload URL
   */
  async getUploadUrl(contentType: string, extension: string): Promise<PresignImageResponse> {
    const res = await apiClient.post<PresignImageResponse>(
      ENDPOINTS.LOST_FOUND.UPLOAD_URL,
      { content_type: contentType, extension },
      { requiresAuth: true }
    );
    return res.data;
  },

  /**
   * Directly uploads image file bytes to Cloudflare R2 using presigned PUT URL
   */
  async uploadImageToR2(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload photo to storage (${res.status})`);
    }
  },

  /**
   * Unified, highly resilient photo uploader:
   * 1. Attempts direct authenticated multipart upload to backend (bypasses browser CORS / signature issues)
   * 2. Falls back to presigned R2 upload if backend multipart is unavailable
   */
  async uploadPhoto(file: File): Promise<{ key: string; public_url: string }> {
    const ext = file.name.split('.').pop() || 'jpg';
    const contentType = file.type || 'image/jpeg';

    // Strategy 1: Multipart upload via backend (zero CORS issues)
    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = await tokenStorage.getSessionToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${ENV.API_BASE_URL}${ENDPOINTS.LOST_FOUND.UPLOAD}`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return {
            key: json.data.key,
            public_url: json.data.public_url || json.data.url,
          };
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[LostFoundService] Direct multipart upload error, trying presigned PUT:', e);
      }
    }

    // Strategy 2: Presigned PUT URL fallback directly to R2
    const presignRes = await this.getUploadUrl(contentType, ext);
    await this.uploadImageToR2(presignRes.upload_url, file);
    return {
      key: presignRes.key,
      public_url: presignRes.public_url,
    };
  },

  // -------------------------------------------------------------------------
  // Local Bookmarks / Saved Items Manager
  // -------------------------------------------------------------------------
  getSavedItemIds(): string[] {
    try {
      const raw = localStorage.getItem(SAVED_BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  isItemSaved(id: string): boolean {
    const saved = this.getSavedItemIds();
    return saved.includes(id);
  },

  toggleSaveItem(id: string): boolean {
    const saved = this.getSavedItemIds();
    let updated: string[];
    let isSavedNow: boolean;

    if (saved.includes(id)) {
      updated = saved.filter((item) => item !== id);
      isSavedNow = false;
    } else {
      updated = [...saved, id];
      isSavedNow = true;
    }

    try {
      localStorage.setItem(SAVED_BOOKMARKS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update bookmarks in localStorage', e);
    }

    return isSavedNow;
  },
};
