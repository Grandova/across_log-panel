package config

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
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
	globalConfig          *model.AppConfig
	configMutex           sync.RWMutex
	configPath            = filepath.Join("data", "config.json")
	ErrInvalidCredentials = errors.New("当前账号或密码不正确")
)

// InitConfig loads configuration from .env and data/config.json
func InitConfig() (*model.AppConfig, error) {
	configMutex.Lock()
	defer configMutex.Unlock()

	// 1. Try loading .env if it exists
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	// 2. Default Config
	cfg := &model.AppConfig{
		Port: 8080,
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
		if err != nil {
			return nil, fmt.Errorf("管理员初始密码无效: %w", err)
		}
		cfg.AdminPassHash = string(h)
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

	// Saved credentials take precedence over bootstrap environment variables.
	fileData, err := os.ReadFile(configPath)
	if err == nil {
		var savedCfg model.AppConfig
		if err := json.Unmarshal(fileData, &savedCfg); err != nil {
			return nil, fmt.Errorf("读取配置文件失败: %w", err)
		}
		if savedCfg.ClickHouse.Host != "" {
			cfg.ClickHouse = savedCfg.ClickHouse
		}
		if savedCfg.AdminUser != "" {
			cfg.AdminUser = savedCfg.AdminUser
		}
		if savedCfg.AdminPassHash != "" {
			cfg.AdminPassHash = savedCfg.AdminPassHash
		}
		if savedCfg.JWTSecret != "" {
			cfg.JWTSecret = savedCfg.JWTSecret
		}
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}
	if cfg.AdminUser == "" || cfg.AdminPassHash == "" {
		return nil, errors.New("首次启动请在环境配置中设置 ADMIN_USER 和 ADMIN_PASSWORD")
	}
	if cfg.JWTSecret == "" {
		key := make([]byte, 32)
		if _, err := rand.Read(key); err != nil {
			return nil, err
		}
		cfg.JWTSecret = hex.EncodeToString(key)
	}
	if err := saveConfig(*cfg); err != nil {
		return nil, err
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

	next := *globalConfig
	next.ClickHouse = newCK
	if err := saveConfig(next); err != nil {
		return err
	}
	*globalConfig = next
	return nil
}

func UpdateAdmin(username, currentPassword, newUsername, newPassword string) error {
	configMutex.Lock()
	defer configMutex.Unlock()

	if username != globalConfig.AdminUser || bcrypt.CompareHashAndPassword([]byte(globalConfig.AdminPassHash), []byte(currentPassword)) != nil {
		return ErrInvalidCredentials
	}
	next := *globalConfig
	next.AdminUser = newUsername
	if newPassword != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		next.AdminPassHash = string(hash)
	}
	// Rotating the signing key invalidates every session, including after a restart.
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return err
	}
	next.JWTSecret = hex.EncodeToString(key)
	if err := saveConfig(next); err != nil {
		return err
	}
	*globalConfig = next
	return nil
}

func saveConfig(cfg model.AppConfig) error {
	if err := os.MkdirAll(filepath.Dir(configPath), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	// Replace the file only after a complete write, keeping the previous login usable on failure.
	file, err := os.CreateTemp(filepath.Dir(configPath), ".config-*")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	if _, err := file.Write(data); err != nil {
		file.Close()
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(file.Name(), configPath)
}
