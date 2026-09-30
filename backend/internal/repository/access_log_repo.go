package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"access-log-analytics/internal/database"
	"access-log-analytics/internal/model"
	"access-log-analytics/internal/utils"
)

type AccessLogRepository struct {
	dbMgr *database.ClickHouseManager
}

func NewAccessLogRepository() *AccessLogRepository {
	return &AccessLogRepository{
		dbMgr: database.GetCKManager(),
	}
}

// sanitizeHost strips http/https and clean up host query
func sanitizeHost(raw string) string {
	h := strings.TrimSpace(raw)
	h = strings.TrimPrefix(h, "http://")
	h = strings.TrimPrefix(h, "https://")
	if idx := strings.Index(h, "/"); idx != -1 {
		h = h[:idx]
	}
	return strings.TrimPrefix(h, ".")
}

// buildLogFilter generates safe parameterized WHERE clause and argument slice
func (r *AccessLogRepository) buildLogFilter(req model.LogQueryRequest, startUTC, endUTC time.Time) (string, []interface{}) {
	var conditions []string
	var args []interface{}

	if !startUTC.IsZero() {
		conditions = append(conditions, "time >= ?")
		args = append(args, startUTC)
	}
	if !endUTC.IsZero() {
		conditions = append(conditions, "time <= ?")
		args = append(args, endUTC)
	}

	if req.UserID != nil {
		conditions = append(conditions, "user_id = ?")
		args = append(args, *req.UserID)
	}
	if strings.TrimSpace(req.UserIP) != "" {
		conditions = append(conditions, "user_ip = ?")
		args = append(args, strings.TrimSpace(req.UserIP))
	}
	if strings.TrimSpace(req.Host) != "" {
		host := sanitizeHost(req.Host)
		switch req.HostMatch {
		case "exact":
			conditions = append(conditions, "host = ?")
			args = append(args, host)
		case "subdomain":
			conditions = append(conditions, "(host = ? OR endsWith(host, ?))")
			args = append(args, host, "."+host)
		default: // "contains" or empty
			conditions = append(conditions, "host LIKE ?")
			args = append(args, "%"+host+"%")
		}
	}
	if req.NodeID != nil {
		conditions = append(conditions, "node_id = ?")
		args = append(args, *req.NodeID)
	}
	if strings.TrimSpace(req.Network) != "" {
		conditions = append(conditions, "network = ?")
		args = append(args, strings.TrimSpace(req.Network))
	}
	if strings.TrimSpace(req.DestIP) != "" {
		conditions = append(conditions, "dest_ip = ?")
		args = append(args, strings.TrimSpace(req.DestIP))
	}
	if req.DestPort != nil && *req.DestPort > 0 {
		conditions = append(conditions, "dest_port = ?")
		args = append(args, *req.DestPort)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}
	return whereClause, args
}

// QueryLogs executes a paginated query on default.access_log
func (r *AccessLogRepository) QueryLogs(ctx context.Context, req model.LogQueryRequest, startUTC, endUTC time.Time) (int64, []model.AccessLog, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return 0, nil, err
	}

	whereClause, args := r.buildLogFilter(req, startUTC, endUTC)

	// 1. Count query (ClickHouse returns UInt64 for count())
	countSQL := fmt.Sprintf("SELECT count() FROM default.access_log %s", whereClause)
	var total uint64
	if err := conn.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return 0, nil, fmt.Errorf("count query failed: %w", err)
	}

	if total == 0 {
		return 0, []model.AccessLog{}, nil
	}

	// 2. Data query
	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	order := "DESC"
	if strings.ToLower(req.Order) == "asc" {
		order = "ASC"
	}

	dataSQL := fmt.Sprintf(`
		SELECT time, network, node_id, user_id, user_ip, host, dest_ip, dest_port
		FROM default.access_log
		%s
		ORDER BY time %s
		LIMIT ? OFFSET ?
	`, whereClause, order)

	queryArgs := append(args, pageSize, offset)
	rows, err := conn.Query(ctx, dataSQL, queryArgs...)
	if err != nil {
		return 0, nil, fmt.Errorf("data query failed: %w", err)
	}
	defer rows.Close()

	var list []model.AccessLog
	for rows.Next() {
		var item model.AccessLog
		if err := rows.Scan(
			&item.Time,
			&item.Network,
			&item.NodeID,
			&item.UserID,
			&item.UserIP,
			&item.Host,
			&item.DestIP,
			&item.DestPort,
		); err != nil {
			return 0, nil, fmt.Errorf("scan log row failed: %w", err)
		}
		item.TimeLocal = utils.FormatToShanghai(item.Time)
		item.TimeUTC = utils.FormatToUTC(item.Time)
		item.TimeISO = utils.FormatISO8601(item.Time)
		list = append(list, item)
	}

	return int64(total), list, nil
}

// GetDashboardOverview retrieves the KPI statistics
func (r *AccessLogRepository) GetDashboardOverview(ctx context.Context, startUTC, endUTC time.Time) (model.DashboardOverview, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return model.DashboardOverview{}, err
	}

	query := `
		SELECT
			count() AS total_requests,
			uniqExact(user_id) AS active_users,
			uniqExact(user_ip) AS unique_ips,
			uniqExact(host) AS total_hosts,
			uniqExact(node_id) AS total_nodes
		FROM default.access_log
		WHERE time >= ? AND time <= ?
	`
	var totalRequests, activeUsers, uniqueIPs, totalHosts, totalNodes uint64
	if err := conn.QueryRow(ctx, query, startUTC, endUTC).Scan(
		&totalRequests,
		&activeUsers,
		&uniqueIPs,
		&totalHosts,
		&totalNodes,
	); err != nil {
		return model.DashboardOverview{}, fmt.Errorf("dashboard overview query failed: %w", err)
	}

	return model.DashboardOverview{
		TotalRequests: int64(totalRequests),
		ActiveUsers:   int64(activeUsers),
		UniqueIPs:     int64(uniqueIPs),
		TotalHosts:    int64(totalHosts),
		TotalNodes:    int64(totalNodes),
	}, nil
}

// GetTrend returns time-series buckets
func (r *AccessLogRepository) GetTrend(ctx context.Context, startUTC, endUTC time.Time, interval string) ([]model.TrendPoint, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return nil, err
	}

	// ClickHouse interval expression
	ckInterval := "INTERVAL 1 HOUR"
	switch interval {
	case "5m":
		ckInterval = "INTERVAL 5 MINUTE"
	case "15m":
		ckInterval = "INTERVAL 15 MINUTE"
	case "1h":
		ckInterval = "INTERVAL 1 HOUR"
	case "1d":
		ckInterval = "INTERVAL 1 DAY"
	default:
		// Auto choose interval based on duration
		duration := endUTC.Sub(startUTC)
		if duration <= 2*time.Hour {
			ckInterval = "INTERVAL 5 MINUTE"
		} else if duration <= 24*time.Hour {
			ckInterval = "INTERVAL 1 HOUR"
		} else {
			ckInterval = "INTERVAL 1 DAY"
		}
	}

	query := fmt.Sprintf(`
		SELECT
			toStartOfInterval(time, %s) AS bucket,
			count() AS requests,
			uniqExact(user_id) AS users
		FROM default.access_log
		WHERE time >= ? AND time <= ?
		GROUP BY bucket
		ORDER BY bucket ASC
	`, ckInterval)

	rows, err := conn.Query(ctx, query, startUTC, endUTC)
	if err != nil {
		return nil, fmt.Errorf("trend query failed: %w", err)
	}
	defer rows.Close()

	var points []model.TrendPoint
	for rows.Next() {
		var b time.Time
		var reqs, users uint64
		if err := rows.Scan(&b, &reqs, &users); err != nil {
			return nil, fmt.Errorf("scan trend point failed: %w", err)
		}
		points = append(points, model.TrendPoint{
			BucketLocal: utils.FormatToShanghai(b),
			BucketUTC:   utils.FormatISO8601(b),
			Requests:    int64(reqs),
			Users:       int64(users),
		})
	}
	return points, nil
}

// GetHostRanking returns Top N hosts
func (r *AccessLogRepository) GetHostRanking(ctx context.Context, startUTC, endUTC time.Time, limit int, nodeID *int32, userID *int64) ([]model.HostStatItem, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return nil, err
	}

	var conditions = []string{"time >= ?", "time <= ?"}
	var args = []interface{}{startUTC, endUTC}

	if nodeID != nil {
		conditions = append(conditions, "node_id = ?")
		args = append(args, *nodeID)
	}
	if userID != nil {
		conditions = append(conditions, "user_id = ?")
		args = append(args, *userID)
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	if limit <= 0 {
		limit = 20
	}
	args = append(args, limit)

	query := fmt.Sprintf(`
		SELECT
			host,
			count() AS requests,
			uniqExact(user_id) AS users,
			uniqExact(user_ip) AS ips,
			max(time) AS last_seen
		FROM default.access_log
		%s
		GROUP BY host
		ORDER BY requests DESC
		LIMIT ?
	`, whereClause)

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("host ranking query failed: %w", err)
	}
	defer rows.Close()

	var list []model.HostStatItem
	rank := 1
	for rows.Next() {
		var item model.HostStatItem
		var reqs, users, ips uint64
		var lastSeen time.Time
		if err := rows.Scan(&item.Host, &reqs, &users, &ips, &lastSeen); err != nil {
			return nil, fmt.Errorf("scan host ranking failed: %w", err)
		}
		item.Rank = rank
		item.Requests = int64(reqs)
		item.Users = int64(users)
		item.IPs = int64(ips)
		item.LastSeen = utils.FormatToShanghai(lastSeen)
		list = append(list, item)
		rank++
	}
	return list, nil
}

// GetHostOverview retrieves single Host overview
func (r *AccessLogRepository) GetHostOverview(ctx context.Context, host string, startUTC, endUTC time.Time) (model.HostOverview, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return model.HostOverview{}, err
	}

	cleanHost := sanitizeHost(host)
	query := `
		SELECT
			count() AS total_requests,
			uniqExact(user_id) AS unique_users,
			uniqExact(user_ip) AS unique_ips,
			uniqExact(node_id) AS node_count,
			min(time) AS first_seen,
			max(time) AS last_seen
		FROM default.access_log
		WHERE host = ? AND time >= ? AND time <= ?
	`
	var totalRequests, uniqueUsers, uniqueIPs, nodeCount uint64
	var firstSeen, lastSeen time.Time
	if err := conn.QueryRow(ctx, query, cleanHost, startUTC, endUTC).Scan(
		&totalRequests,
		&uniqueUsers,
		&uniqueIPs,
		&nodeCount,
		&firstSeen,
		&lastSeen,
	); err != nil {
		return model.HostOverview{}, fmt.Errorf("host overview query failed: %w", err)
	}

	return model.HostOverview{
		Host:          cleanHost,
		TotalRequests: int64(totalRequests),
		UniqueUsers:   int64(uniqueUsers),
		UniqueIPs:     int64(uniqueIPs),
		NodeCount:     int64(nodeCount),
		FirstSeen:     utils.FormatToShanghai(firstSeen),
		LastSeen:      utils.FormatToShanghai(lastSeen),
	}, nil
}

// GetHostTopUsers retrieves UIDs visiting a specific Host
func (r *AccessLogRepository) GetHostTopUsers(ctx context.Context, host string, startUTC, endUTC time.Time, sortBy string, order string, limit, offset int) (int64, []model.HostUserItem, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return 0, nil, err
	}

	cleanHost := sanitizeHost(host)

	// Count distinct users
	countQuery := `
		SELECT uniqExact(user_id)
		FROM default.access_log
		WHERE host = ? AND time >= ? AND time <= ?
	`
	var total uint64
	if err := conn.QueryRow(ctx, countQuery, cleanHost, startUTC, endUTC).Scan(&total); err != nil {
		return 0, nil, fmt.Errorf("host users count failed: %w", err)
	}

	if total == 0 {
		return 0, []model.HostUserItem{}, nil
	}

	orderBy := "requests DESC"
	if sortBy == "last_seen" {
		if strings.ToLower(order) == "asc" {
			orderBy = "last_seen ASC"
		} else {
			orderBy = "last_seen DESC"
		}
	} else if strings.ToLower(order) == "asc" {
		orderBy = "requests ASC"
	}

	query := fmt.Sprintf(`
		SELECT
			user_id,
			count() AS requests,
			uniqExact(user_ip) AS ip_count,
			argMax(user_ip, time) AS last_user_ip,
			min(time) AS first_seen,
			max(time) AS last_seen,
			argMax(node_id, time) AS last_node_id,
			argMax(dest_ip, time) AS last_dest_ip,
			argMax(dest_port, time) AS last_dest_port
		FROM default.access_log
		WHERE host = ? AND time >= ? AND time <= ?
		GROUP BY user_id
		ORDER BY %s
		LIMIT ? OFFSET ?
	`, orderBy)

	rows, err := conn.Query(ctx, query, cleanHost, startUTC, endUTC, limit, offset)
	if err != nil {
		return 0, nil, fmt.Errorf("host top users query failed: %w", err)
	}
	defer rows.Close()

	var list []model.HostUserItem
	for rows.Next() {
		var item model.HostUserItem
		var reqs, ipCount uint64
		var firstSeen, lastSeen time.Time
		if err := rows.Scan(
			&item.UserID,
			&reqs,
			&ipCount,
			&item.LastUserIP,
			&firstSeen,
			&lastSeen,
			&item.LastNodeID,
			&item.LastDestIP,
			&item.LastDestPort,
		); err != nil {
			return 0, nil, fmt.Errorf("scan host top user failed: %w", err)
		}
		item.Requests = int64(reqs)
		item.IPCount = int64(ipCount)
		item.FirstSeen = utils.FormatToShanghai(firstSeen)
		item.LastSeen = utils.FormatToShanghai(lastSeen)
		list = append(list, item)
	}

	return int64(total), list, nil
}

// GetUserOverview retrieves user statistics
func (r *AccessLogRepository) GetUserOverview(ctx context.Context, userID int64, startUTC, endUTC time.Time) (model.UserOverview, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return model.UserOverview{}, err
	}

	query := `
		SELECT
			count() AS total_requests,
			uniqExact(host) AS host_count,
			uniqExact(user_ip) AS ip_count,
			uniqExact(node_id) AS node_count,
			min(time) AS first_seen,
			max(time) AS last_seen
		FROM default.access_log
		WHERE user_id = ? AND time >= ? AND time <= ?
	`
	var totalRequests, hostCount, ipCount, nodeCount uint64
	var firstSeen, lastSeen time.Time
	if err := conn.QueryRow(ctx, query, userID, startUTC, endUTC).Scan(
		&totalRequests,
		&hostCount,
		&ipCount,
		&nodeCount,
		&firstSeen,
		&lastSeen,
	); err != nil {
		return model.UserOverview{}, fmt.Errorf("user overview query failed: %w", err)
	}

	return model.UserOverview{
		UserID:        userID,
		TotalRequests: int64(totalRequests),
		HostCount:     int64(hostCount),
		IPCount:       int64(ipCount),
		NodeCount:     int64(nodeCount),
		FirstSeen:     utils.FormatToShanghai(firstSeen),
		LastSeen:      utils.FormatToShanghai(lastSeen),
	}, nil
}

// GetUserTopHosts returns hosts accessed by this UID
func (r *AccessLogRepository) GetUserTopHosts(ctx context.Context, userID int64, startUTC, endUTC time.Time, limit int) ([]model.UserHostItem, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT
			host,
			count() AS requests,
			max(time) AS last_seen
		FROM default.access_log
		WHERE user_id = ? AND time >= ? AND time <= ?
		GROUP BY host
		ORDER BY requests DESC
		LIMIT ?
	`
	rows, err := conn.Query(ctx, query, userID, startUTC, endUTC, limit)
	if err != nil {
		return nil, fmt.Errorf("user top hosts query failed: %w", err)
	}
	defer rows.Close()

	var list []model.UserHostItem
	for rows.Next() {
		var item model.UserHostItem
		var reqs uint64
		var lastSeen time.Time
		if err := rows.Scan(&item.Host, &reqs, &lastSeen); err != nil {
			return nil, fmt.Errorf("scan user host failed: %w", err)
		}
		item.Requests = int64(reqs)
		item.LastSeen = utils.FormatToShanghai(lastSeen)
		list = append(list, item)
	}
	return list, nil
}

// DomainLookup returns UIDs that accessed a domain pattern
func (r *AccessLogRepository) DomainLookup(ctx context.Context, domain, mode string, startUTC, endUTC time.Time, limit, offset int) (int64, []model.DomainLookupItem, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return 0, nil, err
	}

	cleanDomain := sanitizeHost(domain)

	var matchCondition string
	var matchArgs []interface{}
	switch mode {
	case "exact":
		matchCondition = "host = ?"
		matchArgs = append(matchArgs, cleanDomain)
	case "contains":
		matchCondition = "host LIKE ?"
		matchArgs = append(matchArgs, "%"+cleanDomain+"%")
	default: // "subdomain"
		matchCondition = "(host = ? OR endsWith(host, ?))"
		matchArgs = append(matchArgs, cleanDomain, "."+cleanDomain)
	}

	countArgs := append([]interface{}{startUTC, endUTC}, matchArgs...)
	countSQL := fmt.Sprintf(`
		SELECT uniqExact(user_id)
		FROM default.access_log
		WHERE time >= ? AND time <= ? AND %s
	`, matchCondition)

	var total uint64
	if err := conn.QueryRow(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return 0, nil, fmt.Errorf("domain lookup count failed: %w", err)
	}

	if total == 0 {
		return 0, []model.DomainLookupItem{}, nil
	}

	dataSQL := fmt.Sprintf(`
		SELECT
			user_id,
			count() AS requests,
			uniqExact(user_ip) AS ip_count,
			min(time) AS first_seen,
			max(time) AS last_seen
		FROM default.access_log
		WHERE time >= ? AND time <= ? AND %s
		GROUP BY user_id
		ORDER BY requests DESC
		LIMIT ? OFFSET ?
	`, matchCondition)

	queryArgs := append(countArgs, limit, offset)
	rows, err := conn.Query(ctx, dataSQL, queryArgs...)
	if err != nil {
		return 0, nil, fmt.Errorf("domain lookup query failed: %w", err)
	}
	defer rows.Close()

	var list []model.DomainLookupItem
	for rows.Next() {
		var item model.DomainLookupItem
		var reqs, ipCount uint64
		var firstSeen, lastSeen time.Time
		if err := rows.Scan(&item.UserID, &reqs, &ipCount, &firstSeen, &lastSeen); err != nil {
			return 0, nil, fmt.Errorf("scan domain lookup item failed: %w", err)
		}
		item.Requests = int64(reqs)
		item.IPCount = int64(ipCount)
		item.FirstSeen = utils.FormatToShanghai(firstSeen)
		item.LastSeen = utils.FormatToShanghai(lastSeen)
		list = append(list, item)
	}

	return int64(total), list, nil
}

// GetIPOverview retrieves metrics for a specific user_ip
func (r *AccessLogRepository) GetIPOverview(ctx context.Context, ip string, startUTC, endUTC time.Time) (model.IPOverview, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return model.IPOverview{}, err
	}

	cleanIP := strings.TrimSpace(ip)
	query := `
		SELECT
			count() AS total_requests,
			uniqExact(user_id) AS user_count,
			uniqExact(host) AS host_count,
			uniqExact(node_id) AS node_count,
			min(time) AS first_seen,
			max(time) AS last_seen
		FROM default.access_log
		WHERE user_ip = ? AND time >= ? AND time <= ?
	`
	var totalRequests, userCount, hostCount, nodeCount uint64
	var firstSeen, lastSeen time.Time
	if err := conn.QueryRow(ctx, query, cleanIP, startUTC, endUTC).Scan(
		&totalRequests,
		&userCount,
		&hostCount,
		&nodeCount,
		&firstSeen,
		&lastSeen,
	); err != nil {
		return model.IPOverview{}, fmt.Errorf("ip overview query failed: %w", err)
	}

	return model.IPOverview{
		UserIP:        cleanIP,
		TotalRequests: int64(totalRequests),
		UserCount:     int64(userCount),
		HostCount:     int64(hostCount),
		NodeCount:     int64(nodeCount),
		FirstSeen:     utils.FormatToShanghai(firstSeen),
		LastSeen:      utils.FormatToShanghai(lastSeen),
	}, nil
}

// GetIPTopHosts returns hosts accessed by this user_ip
func (r *AccessLogRepository) GetIPTopHosts(ctx context.Context, ip string, startUTC, endUTC time.Time, limit int) ([]model.UserHostItem, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 20
	}
	cleanIP := strings.TrimSpace(ip)
	query := `
		SELECT host, count() AS requests, max(time) AS last_seen
		FROM default.access_log
		WHERE user_ip = ? AND time >= ? AND time <= ?
		GROUP BY host
		ORDER BY requests DESC
		LIMIT ?
	`
	rows, err := conn.Query(ctx, query, cleanIP, startUTC, endUTC, limit)
	if err != nil {
		return nil, fmt.Errorf("ip top hosts query failed: %w", err)
	}
	defer rows.Close()

	var list []model.UserHostItem
	for rows.Next() {
		var item model.UserHostItem
		var reqs uint64
		var lastSeen time.Time
		if err := rows.Scan(&item.Host, &reqs, &lastSeen); err != nil {
			return nil, err
		}
		item.Requests = int64(reqs)
		item.LastSeen = utils.FormatToShanghai(lastSeen)
		list = append(list, item)
	}
	return list, nil
}

// GetIPUsers returns UIDs that used this user_ip
func (r *AccessLogRepository) GetIPUsers(ctx context.Context, ip string, startUTC, endUTC time.Time, limit int) ([]model.IPUserItem, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 20
	}
	cleanIP := strings.TrimSpace(ip)
	query := `
		SELECT user_id, count() AS requests, max(time) AS last_seen
		FROM default.access_log
		WHERE user_ip = ? AND time >= ? AND time <= ?
		GROUP BY user_id
		ORDER BY requests DESC
		LIMIT ?
	`
	rows, err := conn.Query(ctx, query, cleanIP, startUTC, endUTC, limit)
	if err != nil {
		return nil, fmt.Errorf("ip users query failed: %w", err)
	}
	defer rows.Close()

	var list []model.IPUserItem
	for rows.Next() {
		var item model.IPUserItem
		var reqs uint64
		var lastSeen time.Time
		if err := rows.Scan(&item.UserID, &reqs, &lastSeen); err != nil {
			return nil, err
		}
		item.Requests = int64(reqs)
		item.LastSeen = utils.FormatToShanghai(lastSeen)
		list = append(list, item)
	}
	return list, nil
}

// GetNodeOverview returns stats for a specific node_id
func (r *AccessLogRepository) GetNodeOverview(ctx context.Context, nodeID int32, startUTC, endUTC time.Time) (model.NodeOverview, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return model.NodeOverview{}, err
	}
	query := `
		SELECT
			count() AS total_requests,
			uniqExact(user_id) AS active_users,
			uniqExact(user_ip) AS unique_ips,
			uniqExact(host) AS host_count,
			min(time) AS first_seen,
			max(time) AS last_seen
		FROM default.access_log
		WHERE node_id = ? AND time >= ? AND time <= ?
	`
	var totalRequests, activeUsers, uniqueIPs, hostCount uint64
	var firstSeen, lastSeen time.Time
	if err := conn.QueryRow(ctx, query, nodeID, startUTC, endUTC).Scan(
		&totalRequests,
		&activeUsers,
		&uniqueIPs,
		&hostCount,
		&firstSeen,
		&lastSeen,
	); err != nil {
		return model.NodeOverview{}, fmt.Errorf("node overview query failed: %w", err)
	}

	return model.NodeOverview{
		NodeID:        nodeID,
		TotalRequests: int64(totalRequests),
		ActiveUsers:   int64(activeUsers),
		UniqueIPs:     int64(uniqueIPs),
		HostCount:     int64(hostCount),
		FirstSeen:     utils.FormatToShanghai(firstSeen),
		LastSeen:      utils.FormatToShanghai(lastSeen),
	}, nil
}

// GetNodeRanking returns all nodes sorted by request count
func (r *AccessLogRepository) GetNodeRanking(ctx context.Context, startUTC, endUTC time.Time, limit int) ([]model.NodeStatItem, error) {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT node_id, count() AS requests, uniqExact(user_id) AS users, uniqExact(user_ip) AS ips
		FROM default.access_log
		WHERE time >= ? AND time <= ?
		GROUP BY node_id
		ORDER BY requests DESC
		LIMIT ?
	`
	rows, err := conn.Query(ctx, query, startUTC, endUTC, limit)
	if err != nil {
		return nil, fmt.Errorf("node ranking query failed: %w", err)
	}
	defer rows.Close()

	var list []model.NodeStatItem
	for rows.Next() {
		var item model.NodeStatItem
		var reqs, users, ips uint64
		if err := rows.Scan(&item.NodeID, &reqs, &users, &ips); err != nil {
			return nil, err
		}
		item.Requests = int64(reqs)
		item.Users = int64(users)
		item.IPs = int64(ips)
		list = append(list, item)
	}
	return list, nil
}

// StreamLogsForExport streams rows directly to the callback for CSV streaming
func (r *AccessLogRepository) StreamLogsForExport(ctx context.Context, req model.LogQueryRequest, startUTC, endUTC time.Time, maxLimit int, fn func(log model.AccessLog) error) error {
	conn, err := r.dbMgr.GetConn()
	if err != nil {
		return err
	}

	whereClause, args := r.buildLogFilter(req, startUTC, endUTC)
	if maxLimit <= 0 || maxLimit > 100000 {
		maxLimit = 100000
	}

	query := fmt.Sprintf(`
		SELECT time, network, node_id, user_id, user_ip, host, dest_ip, dest_port
		FROM default.access_log
		%s
		ORDER BY time DESC
		LIMIT ?
	`, whereClause)

	args = append(args, maxLimit)
	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("stream export query failed: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item model.AccessLog
		if err := rows.Scan(
			&item.Time,
			&item.Network,
			&item.NodeID,
			&item.UserID,
			&item.UserIP,
			&item.Host,
			&item.DestIP,
			&item.DestPort,
		); err != nil {
			return err
		}
		item.TimeLocal = utils.FormatToShanghai(item.Time)
		item.TimeUTC = utils.FormatToUTC(item.Time)
		item.TimeISO = utils.FormatISO8601(item.Time)
		if err := fn(item); err != nil {
			return err
		}
	}
	return nil
}
