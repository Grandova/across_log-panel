package database

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"access-log-analytics/internal/model"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ClickHouseManager handles thread-safe dynamic ClickHouse connections
type ClickHouseManager struct {
	conn      driver.Conn
	config    model.ClickHouseConfig
	mutex     sync.RWMutex
	lastError string
	version   string
	latencyMs int64
	connected bool
}

var (
	GlobalCKManager *ClickHouseManager
	once            sync.Once
)

// GetCKManager returns the singleton ClickHouseManager
func GetCKManager() *ClickHouseManager {
	once.Do(func() {
		GlobalCKManager = &ClickHouseManager{}
	})
	return GlobalCKManager
}

// sanitizeHostAndPort extracts clean hostname/IP and port
func sanitizeHostAndPort(rawHost string, rawPort int, protocol clickhouse.Protocol) (string, int) {
	host := strings.TrimSpace(rawHost)
	// Strip protocols if user pasted full URL
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimPrefix(host, "https://")
	if idx := strings.Index(host, "/"); idx != -1 {
		host = host[:idx]
	}

	port := rawPort

	// If host contains host:port
	if h, pStr, err := net.SplitHostPort(host); err == nil {
		host = h
		if p, err := strconv.Atoi(pStr); err == nil && port <= 0 {
			port = p
		}
	} else if strings.Contains(host, ":") {
		// Could be host:port without IPv6 brackets
		parts := strings.Split(host, ":")
		if len(parts) == 2 {
			if p, err := strconv.Atoi(parts[1]); err == nil {
				host = parts[0]
				if port <= 0 {
					port = p
				}
			}
		}
	}

	if port <= 0 {
		if protocol == clickhouse.Native {
			port = 9000
		} else {
			port = 8123
		}
	}

	if host == "" {
		host = "127.0.0.1"
	}

	return host, port
}

// buildOptions constructs clickhouse.Options from ClickHouseConfig
func buildOptions(cfg model.ClickHouseConfig) *clickhouse.Options {
	protocol := clickhouse.HTTP
	if strings.ToLower(strings.TrimSpace(cfg.Protocol)) == "native" {
		protocol = clickhouse.Native
	}

	host, port := sanitizeHostAndPort(cfg.Host, cfg.Port, protocol)

	var tlsCfg *tls.Config
	if cfg.Secure {
		tlsCfg = &tls.Config{InsecureSkipVerify: true}
	}

	database := strings.TrimSpace(cfg.Database)
	if database == "" {
		database = "default"
	}

	username := strings.TrimSpace(cfg.Username)
	if username == "" {
		username = "default"
	}

	return &clickhouse.Options{
		Addr:     []string{fmt.Sprintf("%s:%d", host, port)},
		Protocol: protocol,
		Auth: clickhouse.Auth{
			Database: database,
			Username: username,
			Password: cfg.Password,
		},
		TLS: tlsCfg,
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		DialTimeout: 5 * time.Second,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
	}
}

// Connect attempts to connect to ClickHouse using given config
func (m *ClickHouseManager) Connect(cfg model.ClickHouseConfig) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	opts := buildOptions(cfg)
	conn, err := clickhouse.Open(opts)
	if err != nil {
		m.connected = false
		m.lastError = err.Error()
		return fmt.Errorf("failed to open ClickHouse connection: %w", err)
	}

	// Verify connection by pinging and checking version
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	start := time.Now()
	var version string
	if err := conn.QueryRow(ctx, "SELECT version()").Scan(&version); err != nil {
		m.connected = false
		m.lastError = err.Error()
		_ = conn.Close()
		return fmt.Errorf("ClickHouse ping failed: %w", err)
	}

	// Successfully connected
	if m.conn != nil {
		_ = m.conn.Close()
	}
	m.conn = conn
	m.config = cfg
	m.connected = true
	m.version = version
	m.latencyMs = time.Since(start).Milliseconds()
	m.lastError = ""

	return nil
}

// GetConn returns active driver.Conn or error if disconnected
func (m *ClickHouseManager) GetConn() (driver.Conn, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if !m.connected || m.conn == nil {
		errMsg := m.lastError
		if errMsg == "" {
			errMsg = "ClickHouse 尚未连接，请在设置中配置连接地址"
		}
		return nil, fmt.Errorf("ClickHouse 未连接: %s", errMsg)
	}

	return m.conn, nil
}

// TestConnection tests a config without changing the active connection
func (m *ClickHouseManager) TestConnection(cfg model.ClickHouseConfig) (string, int64, error) {
	opts := buildOptions(cfg)
	conn, err := clickhouse.Open(opts)
	if err != nil {
		return "", 0, fmt.Errorf("打开连接异常: %w", err)
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	start := time.Now()
	var version string
	if err := conn.QueryRow(ctx, "SELECT version()").Scan(&version); err != nil {
		return "", 0, fmt.Errorf("验证查询失败: %w", err)
	}
	latency := time.Since(start).Milliseconds()

	return version, latency, nil
}

// GetStatus returns the current connection status and telemetry
func (m *ClickHouseManager) GetStatus() (connected bool, version string, latencyMs int64, lastError string) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	// Proactively check if connection is still healthy if currently connected
	if m.connected && m.conn != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		start := time.Now()
		var v string
		if err := m.conn.QueryRow(ctx, "SELECT version()").Scan(&v); err != nil {
			m.connected = false
			m.lastError = err.Error()
		} else {
			m.version = v
			m.latencyMs = time.Since(start).Milliseconds()
			m.lastError = ""
		}
	}

	return m.connected, m.version, m.latencyMs, m.lastError
}
