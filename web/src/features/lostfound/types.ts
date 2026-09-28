export type LostFoundType = 'lost' | 'found';
export type LostFoundStatus = 'active' | 'resolved' | 'closed';

export interface ReporterInfo {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
}

export interface LostFoundItem {
  id: string;
  user_id: string;
  type: LostFoundType;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  event_date?: string;
  phone_number?: string;
  status: LostFoundStatus;
  image_key?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  reporter?: ReporterInfo;
}

export interface ItemFilterQuery {
  type?: string;
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ItemListResponse {
  items: LostFoundItem[];
  pagination: PaginationMeta;
}

export interface CreateItemPayload {
  type: LostFoundType;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  event_date?: string;
  phone_number?: string;
  image_key?: string;
}

export interface UpdateItemPayload {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  event_date?: string;
  phone_number?: string;
  status?: LostFoundStatus;
  image_key?: string;
}

export interface PresignImageResponse {
  upload_url: string;
  key: string;
  public_url: string;
}

export interface DraftItem {
  id: string;
  title: string;
  type: LostFoundType;
  description: string;
  category: string;
  location: string;
  event_date: string;
  phone_number: string;
  image_key?: string;
  image_preview?: string;
  updatedAt: number;
}
