package dto

import "TemariCom/internal/lostfound/model"

// CreateItemRequest represents the payload for creating a new lost or found post.
type CreateItemRequest struct {
	Type        string  `json:"type" validate:"required,oneof=lost found"`
	Title       string  `json:"title" validate:"required,min=2,max=150"`
	Description *string `json:"description" validate:"omitempty,max=2000"`
	Category    *string `json:"category" validate:"omitempty,max=50"`
	Location    *string `json:"location" validate:"omitempty,max=255"`
	EventDate   *string `json:"event_date" validate:"omitempty,datetime=2006-01-02"`
	PhoneNumber *string `json:"phone_number" validate:"omitempty,max=30"`
	ImageKey    *string `json:"image_key" validate:"omitempty,max=500"`
}

// UpdateItemRequest represents partial updates (PATCH) to an existing lost or found post.
type UpdateItemRequest struct {
	Title       *string `json:"title" validate:"omitempty,min=2,max=150"`
	Description *string `json:"description" validate:"omitempty,max=2000"`
	Category    *string `json:"category" validate:"omitempty,max=50"`
	Location    *string `json:"location" validate:"omitempty,max=255"`
	EventDate   *string `json:"event_date" validate:"omitempty,datetime=2006-01-02"`
	PhoneNumber *string `json:"phone_number" validate:"omitempty,max=30"`
	Status      *string `json:"status" validate:"omitempty,oneof=active resolved closed"`
	ImageKey    *string `json:"image_key" validate:"omitempty,max=500"`
}

// PresignImageRequest is used to request a Cloudflare R2 presigned upload URL for item photos.
type PresignImageRequest struct {
	Extension   string `json:"extension" validate:"omitempty,max=10"`
	ContentType string `json:"content_type" validate:"required,max=50"`
}

// PresignImageResponse returns the presigned upload URL and R2 key to client.
type PresignImageResponse struct {
	UploadURL string `json:"upload_url"`
	Key       string `json:"key"`
	PublicURL string `json:"public_url"`
}

// ItemFilterQuery contains query parameters for filtering and paginating items.
type ItemFilterQuery struct {
	Type     string `query:"type"`
	Status   string `query:"status"`
	Category string `query:"category"`
	Search   string `query:"search"`
	Page     int    `query:"page"`
	Limit    int    `query:"limit"`
}

// PaginationMeta standardizes pagination metadata across responses.
type PaginationMeta struct {
	Total   int64 `json:"total"`
	Page    int   `json:"page"`
	Limit   int   `json:"limit"`
	HasMore bool  `json:"has_more"`
}

// ItemListResponse formats the paginated response for listing items.
type ItemListResponse struct {
	Items      []model.LostFoundItemDetail `json:"items"`
	Pagination PaginationMeta              `json:"pagination"`
}
