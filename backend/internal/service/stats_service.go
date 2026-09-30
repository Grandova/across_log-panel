package service

import (
	"context"
	"fmt"
	"time"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/repository"
)

type StatsService struct {
	repo      *repository.AccessLogRepository
	auditRepo *repository.AuditRepository
}

func NewStatsService() *StatsService {
	return &StatsService{
		repo:      repository.NewAccessLogRepository(),
		auditRepo: repository.GetAuditRepo(),
	}
}

// GetDashboardOverview returns summary KPI numbers
func (s *StatsService) GetDashboardOverview(ctx context.Context, startStr, endStr, preset string) (*model.DashboardOverview, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	ov, err := s.repo.GetDashboardOverview(ctx, startUTC, endUTC)
	if err != nil {
		return nil, err
	}
	return &ov, nil
}

// GetTrend returns timeline chart data
func (s *StatsService) GetTrend(ctx context.Context, startStr, endStr, preset, interval string) ([]model.TrendPoint, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	return s.repo.GetTrend(ctx, startUTC, endUTC, interval)
}

// GetHostRanking returns Top N host list
func (s *StatsService) GetHostRanking(ctx context.Context, startStr, endStr, preset string, limit int, nodeID *int32, userID *int64) ([]model.HostStatItem, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	return s.repo.GetHostRanking(ctx, startUTC, endUTC, limit, nodeID, userID)
}

// GetHostOverview returns metrics for a host
func (s *StatsService) GetHostOverview(ctx context.Context, host string, startStr, endStr, preset, username, clientIP string) (*model.HostOverview, error) {
	start := time.Now()
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	ov, err := s.repo.GetHostOverview(ctx, host, startUTC, endUTC)
	if err != nil {
		return nil, err
	}
	s.auditRepo.Record(username, clientIP, "QUERY_HOST", fmt.Sprintf("Host: %s", host), "", time.Since(start).Milliseconds())
	return &ov, nil
}

// GetHostUsers returns UIDs that accessed this host
func (s *StatsService) GetHostUsers(ctx context.Context, host string, startStr, endStr, preset, sortBy, order string, page, pageSize int) (int64, []model.HostUserItem, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return 0, nil, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize
	return s.repo.GetHostTopUsers(ctx, host, startUTC, endUTC, sortBy, order, pageSize, offset)
}

// GetUserOverview returns metrics for a UID
func (s *StatsService) GetUserOverview(ctx context.Context, userID int64, startStr, endStr, preset, username, clientIP string) (*model.UserOverview, error) {
	start := time.Now()
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	ov, err := s.repo.GetUserOverview(ctx, userID, startUTC, endUTC)
	if err != nil {
		return nil, err
	}
	s.auditRepo.Record(username, clientIP, "QUERY_UID", fmt.Sprintf("UID: %d", userID), "", time.Since(start).Milliseconds())
	return &ov, nil
}

// GetUserTopHosts returns top hosts for a UID
func (s *StatsService) GetUserTopHosts(ctx context.Context, userID int64, startStr, endStr, preset string, limit int) ([]model.UserHostItem, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	return s.repo.GetUserTopHosts(ctx, userID, startUTC, endUTC, limit)
}

// DomainLookup returns UIDs that visited matching domain
func (s *StatsService) DomainLookup(ctx context.Context, domain, mode, startStr, endStr, preset, username, clientIP string, page, pageSize int) (int64, []model.DomainLookupItem, error) {
	start := time.Now()
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return 0, nil, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize
	total, items, err := s.repo.DomainLookup(ctx, domain, mode, startUTC, endUTC, pageSize, offset)
	if err != nil {
		return 0, nil, err
	}
	s.auditRepo.Record(username, clientIP, "DOMAIN_LOOKUP", fmt.Sprintf("Domain: %s (mode=%s)", domain, mode), fmt.Sprintf("Total: %d", total), time.Since(start).Milliseconds())
	return total, items, nil
}

// GetIPOverview returns metrics for an IP
func (s *StatsService) GetIPOverview(ctx context.Context, ip string, startStr, endStr, preset, username, clientIP string) (*model.IPOverview, error) {
	start := time.Now()
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	ov, err := s.repo.GetIPOverview(ctx, ip, startUTC, endUTC)
	if err != nil {
		return nil, err
	}
	s.auditRepo.Record(username, clientIP, "QUERY_IP", fmt.Sprintf("IP: %s", ip), "", time.Since(start).Milliseconds())
	return &ov, nil
}

// GetIPTopHosts returns top hosts accessed by IP
func (s *StatsService) GetIPTopHosts(ctx context.Context, ip string, startStr, endStr, preset string, limit int) ([]model.UserHostItem, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	return s.repo.GetIPTopHosts(ctx, ip, startUTC, endUTC, limit)
}

// GetIPUsers returns UIDs that used this IP
func (s *StatsService) GetIPUsers(ctx context.Context, ip string, startStr, endStr, preset string, limit int) ([]model.IPUserItem, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	return s.repo.GetIPUsers(ctx, ip, startUTC, endUTC, limit)
}

// GetNodeOverview returns stats for a node
func (s *StatsService) GetNodeOverview(ctx context.Context, nodeID int32, startStr, endStr, preset string) (*model.NodeOverview, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	ov, err := s.repo.GetNodeOverview(ctx, nodeID, startUTC, endUTC)
	if err != nil {
		return nil, err
	}
	return &ov, nil
}

// GetNodeRanking returns all nodes ranked
func (s *StatsService) GetNodeRanking(ctx context.Context, startStr, endStr, preset string, limit int) ([]model.NodeStatItem, error) {
	startUTC, endUTC, err := ResolveTimeRange(startStr, endStr, preset)
	if err != nil {
		return nil, err
	}
	return s.repo.GetNodeRanking(ctx, startUTC, endUTC, limit)
}
