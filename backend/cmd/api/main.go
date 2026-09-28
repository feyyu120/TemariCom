package main

import (
	"context"
	"log"
	"time"

	"TemariCom/config"
	"TemariCom/internal/auth"
	"TemariCom/internal/profile"
	"TemariCom/internal/research"
	"TemariCom/pkg/database"
	"TemariCom/pkg/email"
	"TemariCom/pkg/middleware"
	"TemariCom/pkg/storage"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

func main() {
	app := fiber.New()
	cfg := config.Load()

	// 1. Recover Middleware (Safety shield against unhandled panics)
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))

	// 2. CORS for web (HttpOnly cookies + credentials) and mobile (Bearer tokens)
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			// Allows local development (e.g. Vite on 5173/3000) and web origins
			return true
		},
		AllowCredentials: true,
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "User-Agent", "X-Requested-With"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
	}))

	// 3. Database Connection Pool
	db, err := database.Connect(context.Background(), cfg.DBURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// 4. Initialize Brevo Transactional Email Service
	var emailService email.EmailService
	if cfg.BrevoAPIKey != "" {
		svc, err := email.NewBrevoEmailService(cfg.BrevoAPIKey, cfg.BrevoSenderEmail, cfg.BrevoSenderName)
		if err != nil {
			log.Printf("[Warning] Failed to initialize Brevo email service: %v", err)
		} else {
			emailService = svc
			log.Printf("Brevo email service initialized successfully (Sender: %s <%s>)", cfg.BrevoSenderName, cfg.BrevoSenderEmail)
		}
	} else {
		log.Println("[Warning] BREVO_API_KEY is not configured. Verification emails will be logged to console.")
	}

	// 5. Initialize Cloudflare R2 Storage Client
	var r2Storage *storage.R2Client
	if cfg.R2AccountID != "" && cfg.R2AccessKeyID != "" && cfg.R2SecretAccessKey != "" {
		r2, err := storage.NewR2Client(storage.R2Config{
			AccountID:       cfg.R2AccountID,
			AccessKeyID:     cfg.R2AccessKeyID,
			SecretAccessKey: cfg.R2SecretAccessKey,
			BucketName:      cfg.R2BucketName,
			MediaBaseURL:    cfg.R2PublicDomain,
		})
		if err != nil {
			log.Fatalf("failed to initialize R2: %v", err)
		}
		r2Storage = r2
		log.Println("Cloudflare R2 storage initialized successfully")
	} else {
		log.Println("[Warning] R2 credentials not fully configured. Cloud storage disabled.")
	}

	// 6. API v1 Route Group
	api := app.Group("/api/v1")
	api.Use(logger.New())
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	api.Use(middleware.TimeoutMiddleware(time.Second * 15))

	// 7. Register Auth Module
	authSvc := auth.RegisterRoutes(api, db, emailService, r2Storage)

	// 8. Register Profile Module
	_ = profile.RegisterRoutes(api, db, authSvc, r2Storage)

	// 9. Register Research Module (ScholarXiv Integration & Saved Papers)
	_ = research.RegisterRoutes(api, db, authSvc, cfg.ScholarXivBaseURL, cfg.ScholarXivAPIKey)

	port := cfg.Port
	log.Printf("TemariCom backend starting on port %s...", port)
	log.Fatal(app.Listen(":"+port, fiber.ListenConfig{DisableStartupMessage: true}))
}
