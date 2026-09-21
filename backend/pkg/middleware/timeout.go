package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

func TimeoutMiddleware(duration time.Duration) fiber.Handler {
	return func(c fiber.Ctx) error {
		// 0. Skip timeout for WebSocket upgrades so real-time channels can remain persistent
		if strings.EqualFold(c.Get("Upgrade"), "websocket") {
			return c.Next()
		}

		// 1. Wrap Fiber's context with a deadline window
		ctx, cancel := context.WithTimeout(c.Context(), duration)

		// 2. Safely defer the cleanup so it ALWAYS runs, even during panics
		defer cancel()

		// 3. Attach the safe context to the request structure
		c.SetContext(ctx)

		// 4. Synchronously execute downstream handlers and repositories
		return c.Next()
	}
}
