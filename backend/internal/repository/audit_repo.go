package repository

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/utils"
)

type AuditRepository struct {
	logs     []model.AuditLogEntry
	mutex    sync.RWMutex
	filePath string
	nextID   int64
}

var (
	globalAuditRepo *AuditRepository
	auditOnce       sync.Once
)

func GetAuditRepo() *AuditRepository {
	auditOnce.Do(func() {
		path := filepath.Join("data", "audit.jsonl")
		globalAuditRepo = &AuditRepository{
			logs:     make([]model.AuditLogEntry, 0, 1000),
			filePath: path,
			nextID:   1,
		}
		globalAuditRepo.load()
	})
	return globalAuditRepo
}

func (r *AuditRepository) load() {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	f, err := os.Open(r.filePath)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	var loaded []model.AuditLogEntry
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var entry model.AuditLogEntry
		if err := json.Unmarshal([]byte(line), &entry); err == nil {
			loaded = append(loaded, entry)
			if entry.ID >= r.nextID {
				r.nextID = entry.ID + 1
			}
		}
	}

	// Reverse so latest is first
	for i := len(loaded) - 1; i >= 0; i-- {
		r.logs = append(r.logs, loaded[i])
		if len(r.logs) >= 2000 {
			break
		}
	}
}

func (r *AuditRepository) Record(username, clientIP, action, target, details string, costMs int64) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	now := time.Now()
	entry := model.AuditLogEntry{
		ID:        r.nextID,
		Time:      now,
		TimeLocal: utils.FormatToShanghai(now),
		Username:  username,
		ClientIP:  clientIP,
		Action:    action,
		Target:    target,
		Details:   details,
		CostMs:    costMs,
	}
	r.nextID++

	// Prepend to slice (latest first)
	r.logs = append([]model.AuditLogEntry{entry}, r.logs...)
	if len(r.logs) > 2000 {
		r.logs = r.logs[:2000]
	}

	// Append to file asynchronously
	go func(item model.AuditLogEntry) {
		bytes, err := json.Marshal(item)
		if err == nil {
			bytes = append(bytes, '\n')
			_ = os.MkdirAll("data", 0755)
			f, err := os.OpenFile(r.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if err == nil {
				_, _ = f.Write(bytes)
				_ = f.Close()
			}
		}
	}(entry)
}

func (r *AuditRepository) Query(page, pageSize int) (int64, []model.AuditLogEntry) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	total := int64(len(r.logs))
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}

	start := (page - 1) * pageSize
	if int64(start) >= total {
		return total, []model.AuditLogEntry{}
	}

	end := start + pageSize
	if int64(end) > total {
		end = int(total)
	}

	result := make([]model.AuditLogEntry, end-start)
	copy(result, r.logs[start:end])
	return total, result
}
