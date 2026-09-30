package model

// DashboardOverview represents KPI counts
type DashboardOverview struct {
	TotalRequests int64 `json:"total_requests"`
	ActiveUsers   int64 `json:"active_users"`
	UniqueIPs     int64 `json:"unique_ips"`
	TotalHosts    int64 `json:"total_hosts"`
	TotalNodes    int64 `json:"total_nodes"`
}

// TrendPoint represents a point on the time series chart
type TrendPoint struct {
	BucketLocal string `json:"bucket_local"` // Formatted in Asia/Shanghai
	BucketUTC   string `json:"bucket_utc"`   // ISO8601
	Requests    int64  `json:"requests"`
	Users       int64  `json:"users"`
}

// HostStatItem represents a row in Host rankings
type HostStatItem struct {
	Rank      int    `json:"rank"`
	Host      string `json:"host"`
	Requests  int64  `json:"requests"`
	Users     int64  `json:"users"`
	IPs       int64  `json:"ips"`
	LastSeen  string `json:"last_seen,omitempty"`
}

// HostOverview represents single Host metrics
type HostOverview struct {
	Host          string `json:"host"`
	TotalRequests int64  `json:"total_requests"`
	UniqueUsers   int64  `json:"unique_users"`
	UniqueIPs     int64  `json:"unique_ips"`
	NodeCount     int64  `json:"node_count"`
	FirstSeen     string `json:"first_seen"`
	LastSeen      string `json:"last_seen"`
}

// HostUserItem represents a UID accessing a specific Host
type HostUserItem struct {
	UserID       int64  `json:"user_id"`
	Requests     int64  `json:"requests"`
	IPCount      int64  `json:"ip_count"`
	LastUserIP   string `json:"last_user_ip"`
	FirstSeen    string `json:"first_seen"`
	LastSeen     string `json:"last_seen"`
	LastNodeID   int32  `json:"last_node_id"`
	LastDestIP   string `json:"last_dest_ip"`
	LastDestPort uint16 `json:"last_dest_port"`
}

// UserOverview represents single UID metrics
type UserOverview struct {
	UserID        int64  `json:"user_id"`
	TotalRequests int64  `json:"total_requests"`
	HostCount     int64  `json:"host_count"`
	IPCount       int64  `json:"ip_count"`
	NodeCount     int64  `json:"node_count"`
	FirstSeen     string `json:"first_seen"`
	LastSeen      string `json:"last_seen"`
}

// UserHostItem represents a Host visited by a specific UID
type UserHostItem struct {
	Host     string `json:"host"`
	Requests int64  `json:"requests"`
	LastSeen string `json:"last_seen"`
}

// IPOverview represents single User IP metrics
type IPOverview struct {
	UserIP        string `json:"user_ip"`
	TotalRequests int64  `json:"total_requests"`
	UserCount     int64  `json:"user_count"`
	HostCount     int64  `json:"host_count"`
	NodeCount     int64  `json:"node_count"`
	FirstSeen     string `json:"first_seen"`
	LastSeen      string `json:"last_seen"`
}

// IPUserItem represents a UID that used this IP
type IPUserItem struct {
	UserID   int64  `json:"user_id"`
	Requests int64  `json:"requests"`
	LastSeen string `json:"last_seen"`
}

// NodeOverview represents single Node metrics
type NodeOverview struct {
	NodeID        int32  `json:"node_id"`
	TotalRequests int64  `json:"total_requests"`
	ActiveUsers   int64  `json:"active_users"`
	UniqueIPs     int64  `json:"unique_ips"`
	HostCount     int64  `json:"host_count"`
	FirstSeen     string `json:"first_seen"`
	LastSeen      string `json:"last_seen"`
}

// NodeStatItem represents a node ranking item
type NodeStatItem struct {
	NodeID   int32 `json:"node_id"`
	Requests int64 `json:"requests"`
	Users    int64 `json:"users"`
	IPs      int64 `json:"ips"`
}

// DomainLookupItem represents a domain lookup result (UIDs that visited domain)
type DomainLookupItem struct {
	UserID    int64  `json:"user_id"`
	Requests  int64  `json:"requests"`
	IPCount   int64  `json:"ip_count"`
	FirstSeen string `json:"first_seen"`
	LastSeen  string `json:"last_seen"`
}

// SearchDetectResult represents detection for global search
type SearchDetectResult struct {
	Query     string `json:"query"`
	Type      string `json:"type"`       // "uid", "ip", "host", "unknown"
	TargetURL string `json:"target_url"` // e.g. "/users/16728", "/hosts/youtube.com", "/ips/39.173.76.126"
	Label     string `json:"label"`
}
