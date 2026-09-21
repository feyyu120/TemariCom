package auth

import (
	"TemariCom/internal/auth/handler"
	"TemariCom/internal/auth/repository"
	"TemariCom/internal/auth/service"
	"TemariCom/pkg/email"
	"TemariCom/pkg/middleware"
	"TemariCom/pkg/storage"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterRoutes(router fiber.Router, db *pgxpool.Pool, emailService email.EmailService, r2Storage *storage.R2Client) service.AuthService {
	// Repositories
	userRepo := repository.NewUserRepository(db)
	verificationRepo := repository.NewVerificationCodeRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	loginAttemptRepo := repository.NewLoginAttemptRepository(db)

	// Service
	authService := service.NewAuthService(
		userRepo,
		verificationRepo,
		sessionRepo,
		loginAttemptRepo,
		emailService,
		r2Storage,
	)

	// Handler
	authHandler := handler.NewAuthHandler(authService)

	group := router.Group("/auth")

	// Rate Limiting Middleware: 5 requests / 1 minute per IP across authentication routes
	group.Use(middleware.AuthRateLimiter())

	// Health check
	group.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"module": "auth",
			"status": "ok",
		})
	})

	// Routes
	group.Get("/me", authHandler.Me)
	group.Post("/register", authHandler.Register)
	group.Post("/login", authHandler.Login)
	group.Post("/verify-otp", authHandler.VerifyOTP)
	group.Post("/logout", authHandler.Logout)

	return authService
}
