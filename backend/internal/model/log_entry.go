package model

import (
	"time"
)

// AccessLog represents a row from default.access_log
type AccessLog struct {
	Time      time.Time `json:"time"`
	Network   string    `json:"network"`
	NodeID    int32     `json:"node_id"`
	UserID    int64     `json:"user_id"`
	UserIP    string    `json:"user_ip"`
	Host      string    `json:"host"`
	DestIP    string    `json:"dest_ip"`
	DestPort  uint16    `json:"dest_port"`

	// Enriched fields for presentation
	TimeLocal string    `json:"time_local"` // Formatted in Asia/Shanghai
	TimeUTC   string    `json:"time_utc"`   // Formatted in UTC
	TimeISO   string    `json:"time_iso"`   // RFC3339
}

// LogQueryRequest represents search and filter parameters for logs
type LogQueryRequest struct {
	StartTime string `json:"start_time"` // Asia/Shanghai format or RFC3339
	EndTime   string `json:"end_time"`   // Asia/Shanghai format or RFC3339
	Preset    string `json:"preset"`     // "1h", "6h", "24h", "today", "yesterday", "7d", "30d"

	UserID    *int64  `json:"user_id"`
	UserIP    string  `json:"user_ip"`
	Host      string  `json:"host"`
	HostMatch string  `json:"host_match"` // "exact", "subdomain", "contains"
	NodeID    *int32  `json:"node_id"`
	Network   string  `json:"network"`
	DestIP    string  `json:"dest_ip"`
	DestPort  *uint16 `json:"dest_port"`

	SortBy    string `json:"sort_by"`    // "time"
	Order     string `json:"order"`      // "desc", "asc"
	Page      int    `json:"page"`       // Default 1
	PageSize  int    `json:"page_size"`  // Default 100
}

// LogQueryResponse represents paginated logs result
type LogQueryResponse struct {
	Total     int64       `json:"total"`
	Page      int         `json:"page"`
	PageSize  int         `json:"page_size"`
	Data      []AccessLog `json:"data"`
	CostMs    int64       `json:"cost_ms"`
}
