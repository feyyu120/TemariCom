package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"strings"
)

// GenerateSessionToken generates a cryptographically secure random session token (hex encoded).
func GenerateSessionToken(byteLength int) (string, error) {
	if byteLength <= 0 {
		byteLength = 32 // 256 bits of entropy by default
	}

	bytes := make([]byte, byteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random session token: %w", err)
	}

	return hex.EncodeToString(bytes), nil
}

// HashSessionToken computes a SHA-256 hash of a session token for storage.
func HashSessionToken(token string) string {
	trimmedToken := strings.TrimSpace(token)
	hash := sha256.Sum256([]byte(trimmedToken))
	return hex.EncodeToString(hash[:])
}

// VerifySessionToken compares a plaintext session token against a stored SHA-256 hash in constant time.
func VerifySessionToken(providedToken, storedHash string) bool {
	providedHash := HashSessionToken(providedToken)
	return subtle.ConstantTimeCompare([]byte(providedHash), []byte(storedHash)) == 1
}
