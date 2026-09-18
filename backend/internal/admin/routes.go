package admin

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(app *fiber.App) {
	admin := app.Group("/admin")

	admin.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"module": "admin",
		})
	})
}
