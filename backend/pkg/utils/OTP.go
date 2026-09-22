package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
)

// GenerateOTP generates a cryptographically secure 6-digit numeric OTP code (000000 - 999999).
func GenerateOTP() (string, error) {
	// Upper bound: 1,000,000 (exclusive range is 0 to 999,999)
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate secure random number: %w", err)
	}

	// Always format with leading zeros to guarantee a 6-digit string
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// HashOTP creates a cryptographic SHA-256 hash of the plaintext OTP.
// Plaintext verification codes are never stored in the database.
func HashOTP(code string) string {
	trimmedCode := strings.TrimSpace(code)
	hash := sha256.Sum256([]byte(trimmedCode))
	return hex.EncodeToString(hash[:])
}

// VerifyOTP compares a provided plaintext OTP code against a stored SHA-256 hash.
// Uses constant-time comparison to prevent timing-attack vulnerabilities.
func VerifyOTP(providedCode, storedHash string) bool {
	providedHash := HashOTP(providedCode)
	return subtle.ConstantTimeCompare([]byte(providedHash), []byte(storedHash)) == 1
}
