package storage

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	ErrInvalidContentType = errors.New("invalid or unsupported image content type")
)

// AllowedImageTypes maps permitted MIME types to standard file extensions
var AllowedImageTypes = map[string]string{
	"image/jpeg": "jpg",
	"image/jpg":  "jpg",
	"image/png":  "png",
	"image/webp": "webp",
	"image/gif":  "gif",
	"image/heic": "heic",
	"image/heif": "heif",
}

// GenerateAvatarKey creates a collision-resistant, user-scoped storage key.
// Stored directly in PostgreSQL (e.g. avatars/{userID}/{unixNano}.{ext}) instead of raw domain URLs.
func (r *R2Client) GenerateAvatarKey(
	userID string,
	extension string,
) string {
	extension = strings.ToLower(strings.TrimPrefix(extension, "."))

	if extension == "jpeg" {
		extension = "jpg"
	}

	if extension == "" {
		extension = "jpg"
	}

	return fmt.Sprintf(
		"avatars/%s/%d.%s",
		userID,
		time.Now().UnixNano(),
		extension,
	)
}

// GenerateAvatarUploadURL creates a presigned PUT URL allowing mobile/web clients to upload directly to Cloudflare R2.
// Upload URL expires in 10 minutes and restricts the uploaded Content-Type.
func (r *R2Client) GenerateAvatarUploadURL(
	ctx context.Context,
	key string,
	contentType string,
) (string, error) {
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	if _, ok := AllowedImageTypes[contentType]; !ok {
		return "", fmt.Errorf("%w: %s", ErrInvalidContentType, contentType)
	}

	request, err := r.PresignClient.PresignPutObject(
		ctx,
		&s3.PutObjectInput{
			Bucket:      aws.String(r.BucketName),
			Key:         aws.String(key),
			ContentType: aws.String(contentType),
		},
		func(options *s3.PresignOptions) {
			options.Expires = 10 * time.Minute
		},
	)

	if err != nil {
		return "", fmt.Errorf("generate avatar upload URL: %w", err)
	}

	return request.URL, nil
}

// AvatarURL transforms a database-stored storage key into a full public CDN/media URL.
// If the key is already a full URL or is empty, it returns it as-is.
func (r *R2Client) AvatarURL(key string) string {
	if key == "" {
		return ""
	}

	if strings.HasPrefix(key, "http://") || strings.HasPrefix(key, "https://") {
		return key
	}

	return strings.TrimRight(r.MediaBaseURL, "/") +
		"/" +
		strings.TrimPrefix(path.Clean("/"+key), "/")
}

// ExtractKey normalizes a URL or key, stripping the MediaBaseURL prefix if present,
// ensuring only the storage key (e.g. avatars/123/456.jpg) is persisted in PostgreSQL.
func (r *R2Client) ExtractKey(keyOrURL string) string {
	trimmed := strings.TrimSpace(keyOrURL)
	if trimmed == "" {
		return ""
	}

	baseURL := strings.TrimRight(r.MediaBaseURL, "/")
	if strings.HasPrefix(trimmed, baseURL) {
		trimmed = strings.TrimPrefix(trimmed, baseURL)
		trimmed = strings.TrimPrefix(trimmed, "/")
	}

	return trimmed
}

// DeleteObject removes an object from Cloudflare R2 by key.
func (r *R2Client) DeleteObject(ctx context.Context, key string) error {
	if key == "" {
		return nil
	}
	cleanKey := r.ExtractKey(key)
	_, err := r.Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.BucketName),
		Key:    aws.String(cleanKey),
	})
	return err
}
