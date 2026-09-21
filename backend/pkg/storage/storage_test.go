package storage_test

import (
	"strings"
	"testing"

	"TemariCom/pkg/storage"
)

func TestAvatarKeyGenerationAndResolution(t *testing.T) {
	client := &storage.R2Client{
		BucketName:   "temaricom",
		MediaBaseURL: "https://pub-58c15ad5adaf4bdb8b12de6db6249645.r2.dev",
	}

	userID := "f47ac10b-58cc-4372-a567-0e02b2c3d479"
	key := client.GenerateAvatarKey(userID, "png")

	// 1. Verify key structure: avatars/{userID}/{timestamp}.png
	if !strings.HasPrefix(key, "avatars/"+userID+"/") {
		t.Fatalf("expected key to start with 'avatars/%s/', got '%s'", userID, key)
	}
	if !strings.HasSuffix(key, ".png") {
		t.Fatalf("expected key to end with '.png', got '%s'", key)
	}

	// 2. Verify AvatarURL resolution
	resolvedURL := client.AvatarURL(key)
	expectedPrefix := "https://pub-58c15ad5adaf4bdb8b12de6db6249645.r2.dev/avatars/" + userID + "/"
	if !strings.HasPrefix(resolvedURL, expectedPrefix) {
		t.Fatalf("expected resolved URL to start with '%s', got '%s'", expectedPrefix, resolvedURL)
	}

	// 3. Verify that passing an already full URL returns the full URL untouched
	fullURL := "https://cdn.customdomain.com/avatars/user/photo.jpg"
	if client.AvatarURL(fullURL) != fullURL {
		t.Fatalf("expected full URL to remain unchanged, got '%s'", client.AvatarURL(fullURL))
	}

	// 4. Verify ExtractKey extracts key from full MediaBaseURL
	fullR2URL := "https://pub-58c15ad5adaf4bdb8b12de6db6249645.r2.dev/" + key
	extracted := client.ExtractKey(fullR2URL)
	if extracted != key {
		t.Fatalf("expected extracted key '%s', got '%s'", key, extracted)
	}

	// 5. Verify ExtractKey with raw key returns raw key
	if client.ExtractKey(key) != key {
		t.Fatalf("expected extracted key '%s', got '%s'", key, client.ExtractKey(key))
	}
}
