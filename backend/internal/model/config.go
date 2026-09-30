package model

// ClickHouseConfig represents ClickHouse connection parameters
type ClickHouseConfig struct {
	Protocol string `json:"protocol"` // "http" or "native"
	Host     string `json:"host"`
	Port     int    `json:"port"`     // Default 8123 for http, 9000 for native
	Database string `json:"database"` // Default "default"
	Username string `json:"username"`
	Password string `json:"password"`
	Secure   bool   `json:"secure"`   // Use TLS/HTTPS
}

// ClickHouseConfigResponse represents masked config for frontend view
type ClickHouseConfigResponse struct {
	Protocol    string `json:"protocol"`
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Database    string `json:"database"`
	Username    string `json:"username"`
	HasPassword bool   `json:"has_password"`
	Secure      bool   `json:"secure"`
	Connected   bool   `json:"connected"`
	Version     string `json:"version"`
	LatencyMs   int64  `json:"latency_ms"`
	LastError   string `json:"last_error,omitempty"`
}

// AppConfig represents general system configuration
type AppConfig struct {
	Port         int              `json:"port"`
	JWTSecret    string           `json:"jwt_secret"`
	AdminUser    string           `json:"admin_user"`
	AdminPassHash string          `json:"admin_pass_hash"`
	ClickHouse   ClickHouseConfig `json:"clickhouse"`
}
