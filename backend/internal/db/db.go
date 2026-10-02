package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

// Connect establishes a PostgreSQL connection using environment variables.
func Connect() (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "flashpoll"),
		getEnv("DB_SSLMODE", "disable"),
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("sql.Open: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("db.Ping: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return db, nil
}

// RunMigrations creates tables if they don't exist.
func RunMigrations(db *sql.DB) error {
	migrations := []string{
		`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,

		`CREATE TABLE IF NOT EXISTS polls (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			question    TEXT NOT NULL,
			category    TEXT NOT NULL CHECK (category IN ('general','product','hr','engineering','design','other')),
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS options (
			id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
			option_text TEXT NOT NULL,
			vote_count  INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0)
		);`,

		`CREATE INDEX IF NOT EXISTS idx_options_poll_id ON options(poll_id);`,
	}

	for _, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration failed: %w\nSQL: %s", err, m)
		}
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
