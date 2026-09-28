package model

import (
	"time"

	"github.com/google/uuid"
)

type ItemType string

const (
	TypeLost  ItemType = "lost"
	TypeFound ItemType = "found"
)

type ItemStatus string

const (
	StatusActive   ItemStatus = "active"
	StatusResolved ItemStatus = "resolved"
	StatusClosed   ItemStatus = "closed"
)

// LostFoundItem mirrors the lost_found_items PostgreSQL table schema.
type LostFoundItem struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Type        ItemType   `json:"type"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Category    *string    `json:"category,omitempty"`
	Location    *string    `json:"location,omitempty"`
	EventDate   *time.Time `json:"event_date,omitempty"`
	PhoneNumber *string    `json:"phone_number,omitempty"`
	Status      ItemStatus `json:"status"`
	ImageKey    *string    `json:"image_key,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ReporterInfo contains non-sensitive public identity of the user who posted the item.
type ReporterInfo struct {
	ID        uuid.UUID `json:"id"`
	FullName  string    `json:"full_name"`
	Username  string    `json:"username"`
	AvatarURL string    `json:"avatar_url"`
	Phone     *string   `json:"phone,omitempty"`
	Email     *string   `json:"email,omitempty"`
}

// LostFoundItemDetail combines the item with the resolved CDN image URL and reporter profile.
type LostFoundItemDetail struct {
	LostFoundItem
	ImageURL *string      `json:"image_url,omitempty"`
	Reporter ReporterInfo `json:"reporter"`
}
