package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net"
	"regexp"
	"strconv"
	"strings"
	"time"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/repository"
)

type LogService struct {
	repo      *repository.AccessLogRepository
	auditRepo *repository.AuditRepository
}

func NewLogService() *LogService {
	return &LogService{
		repo:      repository.NewAccessLogRepository(),
		auditRepo: repository.GetAuditRepo(),
	}
}

// QueryLogs processes filter parameters, executes query and records metrics
func (s *LogService) QueryLogs(ctx context.Context, req model.LogQueryRequest, username, clientIP string) (*model.LogQueryResponse, error) {
	start := time.Now()
	startUTC, endUTC, err := ResolveTimeRange(req.StartTime, req.EndTime, req.Preset)
	if err != nil {
		return nil, fmt.Errorf("invalid time range: %w", err)
	}

	total, list, err := s.repo.QueryLogs(ctx, req, startUTC, endUTC)
	if err != nil {
		return nil, err
	}

	costMs := time.Since(start).Milliseconds()

	// Record audit if specific filter was searched
	target := "All Logs"
	if req.UserID != nil {
		target = fmt.Sprintf("UID: %d", *req.UserID)
	} else if req.Host != "" {
		target = fmt.Sprintf("Host: %s", req.Host)
	} else if req.UserIP != "" {
		target = fmt.Sprintf("IP: %s", req.UserIP)
	}
	s.auditRepo.Record(username, clientIP, "QUERY_LOGS", target, fmt.Sprintf("total=%d, page=%d", total, req.Page), costMs)

	return &model.LogQueryResponse{
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Data:     list,
		CostMs:   costMs,
	}, nil
}

// ExportCSV streams logs as CSV format to the provided writer
func (s *LogService) ExportCSV(ctx context.Context, req model.LogQueryRequest, writer io.Writer, username, clientIP string) (int64, error) {
	start := time.Now()
	startUTC, endUTC, err := ResolveTimeRange(req.StartTime, req.EndTime, req.Preset)
	if err != nil {
		return 0, fmt.Errorf("invalid time range: %w", err)
	}

	csvWriter := csv.NewWriter(writer)
	// Write UTF-8 BOM so Excel opens with correct Chinese/UTF-8 encoding
	_, _ = writer.Write([]byte{0xEF, 0xBB, 0xBF})

	// Header row
	header := []string{
		"时间(UTC+8)",
		"原始时间(UTC)",
		"Network",
		"Node ID",
		"UID",
		"User IP",
		"Host",
		"Dest IP",
		"Dest Port",
	}
	if err := csvWriter.Write(header); err != nil {
		return 0, err
	}
	csvWriter.Flush()

	var count int64
	err = s.repo.StreamLogsForExport(ctx, req, startUTC, endUTC, 100000, func(log model.AccessLog) error {
		count++
		row := []string{
			log.TimeLocal,
			log.TimeUTC,
			log.Network,
			strconv.Itoa(int(log.NodeID)),
			strconv.FormatInt(log.UserID, 10),
			log.UserIP,
			log.Host,
			log.DestIP,
			strconv.Itoa(int(log.DestPort)),
		}
		if err := csvWriter.Write(row); err != nil {
			return err
		}
		// Flush every 500 records to stream smoothly
		if count%500 == 0 {
			csvWriter.Flush()
		}
		return nil
	})

	csvWriter.Flush()
	costMs := time.Since(start).Milliseconds()
	s.auditRepo.Record(username, clientIP, "EXPORT_CSV", fmt.Sprintf("Exported %d records", count), "", costMs)

	return count, err
}

var (
	digitsRegex = regexp.MustCompile(`^\d+$`)
)

// DetectSearchType automatically recognizes user search input
func (s *LogService) DetectSearchType(raw string) model.SearchDetectResult {
	q := strings.TrimSpace(raw)
	if q == "" {
		return model.SearchDetectResult{Query: "", Type: "unknown", Label: "请输入查询内容"}
	}

	// 1. Check if UID (pure numbers)
	if digitsRegex.MatchString(q) {
		return model.SearchDetectResult{
			Query:     q,
			Type:      "uid",
			TargetURL: fmt.Sprintf("/users/%s", q),
			Label:     fmt.Sprintf("查询用户 UID: %s", q),
		}
	}

	// 2. Check if IP (IPv4 or IPv6)
	if ip := net.ParseIP(q); ip != nil {
		return model.SearchDetectResult{
			Query:     q,
			Type:      "ip",
			TargetURL: fmt.Sprintf("/ips/%s", q),
			Label:     fmt.Sprintf("查询 IP 行为: %s", q),
		}
	}

	// 3. Otherwise treat as Host / Domain
	return model.SearchDetectResult{
		Query:     q,
		Type:      "host",
		TargetURL: fmt.Sprintf("/hosts/%s", q),
		Label:     fmt.Sprintf("查询域名画像: %s", q),
	}
}
