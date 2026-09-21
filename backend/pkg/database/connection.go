package database

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Println("failed to parse database pool configuration: ", err)
		return nil, err
	}

	// Optimize connection pooling for cloud PostgreSQL (Neon / PgBouncer)
	config.MinConns = 3
	config.MaxConns = 25
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute

	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Println("failed to create database pool: ", err)
		return nil, err
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := db.Ping(pingCtx); err != nil {
		db.Close()
		log.Println("failed to ping database: ", err)
		return nil, err
	}

	log.Println("Database pool connected and prewarmed successfully")

	return db, nil
}
