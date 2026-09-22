package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

const (
	// SessionCookieName is the canonical cookie name for the web session token.
	SessionCookieName = "session_token"

	// SessionDuration defines the maximum lifespan of the session cookie (30 days).
	SessionDuration = 30 * 24 * time.Hour
)

// ExtractSessionToken extracts the session token from the incoming request using a 2-tier priority:
//  1. Highest Priority: Explicit "Authorization: Bearer <token>" header
//     (Used by Mobile clients, or Web clients actively switching accounts)
//  2. Fallback: HttpOnly "session_token" cookie
//     (Used by Web clients for secure, default single-session authentication)
func ExtractSessionToken(c fiber.Ctx) string {
	// 1. Check Bearer Authorization header
	authHeader := c.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token != "" {
			return token
		}
	}

	// 2. Fallback to HttpOnly cookie
	cookieToken := c.Cookies(SessionCookieName)
	if cookieToken != "" {
		return strings.TrimSpace(cookieToken)
	}

	return ""
}

// BuildSessionCookie creates a secure HttpOnly fiber.Cookie configuration for web clients.
func BuildSessionCookie(token string, isSecure bool) *fiber.Cookie {
	return &fiber.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
		MaxAge:   int(SessionDuration.Seconds()),
	}
}

// BuildClearSessionCookie creates an expired fiber.Cookie to clear the session on logout.
func BuildClearSessionCookie() *fiber.Cookie {
	return &fiber.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HTTPOnly: true,
		Expires:  time.Now().Add(-24 * time.Hour),
		MaxAge:   -1,
	}
}

// RequireAuth returns a Fiber middleware handler that enforces authentication
// via session token (either Bearer header or HttpOnly cookie).
// Decoupled validator function eliminates circular package dependencies.
func RequireAuth(validateSession func(ctx context.Context, token string) (any, error)) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := ExtractSessionToken(c)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Missing or invalid session authorization",
			})
		}

		user, err := validateSession(c.Context(), token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Session has expired or was revoked",
			})
		}

		c.Locals("currentUser", user)
		c.Locals("sessionToken", token)
		return c.Next()
	}
}
