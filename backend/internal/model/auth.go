package model

import (
	"time"
)

// LoginRequest represents username & password
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserInfo represents logged-in user details
type UserInfo struct {
	Username string `json:"username"`
	Role     string `json:"role"`
}

// LoginResponse represents token output
type LoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	User      UserInfo  `json:"user"`
}

// AuditLogEntry represents an admin operation or query audit record
type AuditLogEntry struct {
	ID        int64     `json:"id"`
	Time      time.Time `json:"time"`
	TimeLocal string    `json:"time_local"`
	Username  string    `json:"username"`
	ClientIP  string    `json:"client_ip"`
	Action    string    `json:"action"`    // "QUERY_LOGS", "QUERY_UID", "QUERY_HOST", "QUERY_IP", "EXPORT_CSV", "UPDATE_CONFIG"
	Target    string    `json:"target"`    // e.g. "UID: 16728", "Host: youtube.com"
	Details   string    `json:"details"`
	CostMs    int64     `json:"cost_ms"`
}
