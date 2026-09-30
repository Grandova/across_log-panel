package repository

import (
	"os"
	"path/filepath"
	"sync"
	"testing"

	"access-log-analytics/internal/model"
)

func TestAuditClearPersists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "audit.jsonl")
	r := &AuditRepository{filePath: path, nextID: 1}
	r.Record("admin", "127.0.0.1", "QUERY_HOST", "example.com", "", 1)
	if err := r.Clear(); err != nil {
		t.Fatal(err)
	}
	if total, logs := r.Query(1, 50); total != 0 || len(logs) != 0 {
		t.Fatal("cleared logs remain in memory")
	}
	data, err := os.ReadFile(path)
	if err != nil || len(data) != 0 {
		t.Fatalf("cleared file: %q, error: %v", data, err)
	}
	reloaded := &AuditRepository{filePath: path, nextID: 1}
	reloaded.load()
	if total, _ := reloaded.Query(1, 50); total != 0 {
		t.Fatal("cleared logs returned after reload")
	}
	r.Record("admin", "127.0.0.1", "QUERY_UID", "42", "", 1)
	reloaded.load()
	if total, logs := reloaded.Query(1, 50); total != 1 || logs[0].Target != "42" {
		t.Fatal("new records were not persisted after clearing")
	}
	if err := r.Clear(); err != nil {
		t.Fatal(err)
	}
	if err := r.Clear(); err != nil {
		t.Fatalf("clearing an empty file failed: %v", err)
	}
}

func TestAuditClearFailureKeepsLogs(t *testing.T) {
	r := &AuditRepository{
		filePath: t.TempDir(),
		logs:     []model.AuditLogEntry{{ID: 1, Target: "keep"}},
		nextID:   2,
	}
	if err := r.Clear(); err == nil {
		t.Fatal("expected an error writing to a directory")
	}
	if total, logs := r.Query(1, 50); total != 1 || logs[0].Target != "keep" {
		t.Fatal("failed clear discarded in-memory logs")
	}
}

func TestAuditClearConcurrentRecords(t *testing.T) {
	path := filepath.Join(t.TempDir(), "audit.jsonl")
	r := &AuditRepository{filePath: path, nextID: 1}
	r.Record("admin", "127.0.0.1", "QUERY_HOST", "old", "", 0)
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r.Record("admin", "127.0.0.1", "QUERY_HOST", "new", "", 0)
		}()
	}
	if err := r.Clear(); err != nil {
		t.Error(err)
	}
	wg.Wait()
	reloaded := &AuditRepository{filePath: path, nextID: 1}
	reloaded.load()
	total, logs := r.Query(1, 100)
	storedTotal, storedLogs := reloaded.Query(1, 100)
	if total != storedTotal {
		t.Fatalf("memory has %d logs, file has %d", total, storedTotal)
	}
	for i, log := range logs {
		if log.Target == "old" || log.ID != storedLogs[i].ID {
			t.Fatalf("record mismatch after concurrent clear at index %d", i)
		}
	}
}
