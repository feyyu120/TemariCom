package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBURL            string
	Port             string
	BrevoAPIKey      string
	BrevoSenderEmail string
	BrevoSenderName  string

	// Cloudflare R2
	R2AccountID       string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2BucketName      string
	R2PublicDomain    string
}

func Load() *Config {
	// Load .env during local development.
	// In production, environment variables can be provided directly.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	brevoKey := os.Getenv("BREVO_API_KEY")
	brevoSender := os.Getenv("BREVO_SENDER_EMAIL")
	if brevoSender == "" {
		brevoSender = os.Getenv("BREVO_FROM_EMAIL")
	}
	if brevoSender == "" {
		brevoSender = "contact@temaricom.com"
	}

	brevoName := os.Getenv("BREVO_SENDER_NAME")
	if brevoName == "" {
		brevoName = "TemariCom"
	}

	// Cloudflare R2 Configuration
	r2AccountID := os.Getenv("R2_ACCOUNT_ID")
	r2AccessKey := os.Getenv("R2_ACCESS_KEY")
	if r2AccessKey == "" {
		r2AccessKey = os.Getenv("R2_ACCESS_KEY_ID")
	}
	r2SecretKey := os.Getenv("R2_SECRET_KEY")
	if r2SecretKey == "" {
		r2SecretKey = os.Getenv("R2_SECRET_ACCESS_KEY")
	}
	r2Bucket := os.Getenv("R2_BUCKET_NAME")
	r2Domain := os.Getenv("R2_PUBLIC_DOMAIN")
	if r2Domain == "" {
		r2Domain = os.Getenv("R2_MEDIA_BASE_URL")
	}

	return &Config{
		DBURL:             os.Getenv("DB_URL"),
		Port:              port,
		BrevoAPIKey:       brevoKey,
		BrevoSenderEmail:  brevoSender,
		BrevoSenderName:   brevoName,
		R2AccountID:       r2AccountID,
		R2AccessKeyID:     r2AccessKey,
		R2SecretAccessKey: r2SecretKey,
		R2BucketName:      r2Bucket,
		R2PublicDomain:    r2Domain,
	}
}
