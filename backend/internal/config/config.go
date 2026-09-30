package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"

	"access-log-analytics/internal/model"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

var (
	globalConfig *model.AppConfig
	configMutex  sync.RWMutex
	configPath   = filepath.Join("data", "config.json")
)

// InitConfig loads configuration from .env and data/config.json
func InitConfig() (*model.AppConfig, error) {
	configMutex.Lock()
	defer configMutex.Unlock()

	// 1. Try loading .env if it exists
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	// 2. Default Config
	defaultHash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	cfg := &model.AppConfig{
		Port:          8080,
		JWTSecret:     "access-log-analytics-secret-key-2026",
		AdminUser:     "admin",
		AdminPassHash: string(defaultHash),
		ClickHouse: model.ClickHouseConfig{
			Protocol: "http",
			Host:     "127.0.0.1",
			Port:     8123,
			Database: "default",
			Username: "default",
			Password: "",
			Secure:   false,
		},
	}

	// Read environment variables
	if p := os.Getenv("PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil {
			cfg.Port = val
		}
	}
	if s := os.Getenv("JWT_SECRET"); s != "" {
		cfg.JWTSecret = s
	}
	if u := os.Getenv("ADMIN_USER"); u != "" {
		cfg.AdminUser = u
	}
	if p := os.Getenv("ADMIN_PASSWORD"); p != "" {
		h, err := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
		if err == nil {
			cfg.AdminPassHash = string(h)
		}
	}

	if proto := os.Getenv("CLICKHOUSE_PROTOCOL"); proto != "" {
		cfg.ClickHouse.Protocol = proto
	}
	if h := os.Getenv("CLICKHOUSE_HOST"); h != "" {
		cfg.ClickHouse.Host = h
	}
	if p := os.Getenv("CLICKHOUSE_PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil {
			cfg.ClickHouse.Port = val
		}
	}
	if db := os.Getenv("CLICKHOUSE_DATABASE"); db != "" {
		cfg.ClickHouse.Database = db
	}
	if u := os.Getenv("CLICKHOUSE_USERNAME"); u != "" {
		cfg.ClickHouse.Username = u
	}
	if pw := os.Getenv("CLICKHOUSE_PASSWORD"); pw != "" {
		cfg.ClickHouse.Password = pw
	}
	if sec := os.Getenv("CLICKHOUSE_SECURE"); sec == "true" || sec == "1" {
		cfg.ClickHouse.Secure = true
	}

	// 3. If data/config.json exists, load overrides
	if err := os.MkdirAll("data", 0755); err == nil {
		if fileData, err := os.ReadFile(configPath); err == nil {
			var savedCfg model.AppConfig
			if err := json.Unmarshal(fileData, &savedCfg); err == nil {
				// Merge saved ClickHouse config
				if savedCfg.ClickHouse.Host != "" {
					cfg.ClickHouse = savedCfg.ClickHouse
				}
				if savedCfg.AdminUser != "" {
					cfg.AdminUser = savedCfg.AdminUser
				}
				if savedCfg.AdminPassHash != "" {
					cfg.AdminPassHash = savedCfg.AdminPassHash
				}
			}
		}
	}

	globalConfig = cfg
	return cfg, nil
}

// GetConfig returns current global config safely
func GetConfig() model.AppConfig {
	configMutex.RLock()
	defer configMutex.RUnlock()
	return *globalConfig
}

// SaveClickHouseConfig updates the ClickHouse configuration persistently
func SaveClickHouseConfig(newCK model.ClickHouseConfig) error {
	configMutex.Lock()
	defer configMutex.Unlock()

	// If new password is blank, preserve existing password if host matches
	if newCK.Password == "" && globalConfig.ClickHouse.Password != "" {
		newCK.Password = globalConfig.ClickHouse.Password
	}

	globalConfig.ClickHouse = newCK

	// Persist to data/config.json
	if err := os.MkdirAll("data", 0755); err != nil {
		return fmt.Errorf("failed to create data dir: %w", err)
	}

	data, err := json.MarshalIndent(globalConfig, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to save config file: %w", err)
	}

	return nil
}
