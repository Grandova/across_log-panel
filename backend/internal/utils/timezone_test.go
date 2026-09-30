package utils

import (
	"testing"
	"time"
)

func TestParseLocalTimeToUTC(t *testing.T) {
	// Test standard local format: 2026-09-30 08:00:00 (Asia/Shanghai) -> 2026-09-30 00:00:00 (UTC)
	input := "2026-09-30 08:00:00"
	utcTime, err := ParseLocalTimeToUTC(input)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	expectedUTC := time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)
	if !utcTime.Equal(expectedUTC) {
		t.Errorf("expected %v UTC, got %v", expectedUTC, utcTime)
	}

	// Verify formatting back to Shanghai
	shanghaiStr := FormatToShanghai(utcTime)
	if shanghaiStr != input {
		t.Errorf("expected %s, got %s", input, shanghaiStr)
	}

	// Verify formatting to UTC
	utcStr := FormatToUTC(utcTime)
	if utcStr != "2026-09-30 00:00:00" {
		t.Errorf("expected 2026-09-30 00:00:00, got %s", utcStr)
	}
}

func TestGetPresetRangeUTC(t *testing.T) {
	startUTC, endUTC := GetPresetRangeUTC("24h")
	if startUTC.After(endUTC) {
		t.Errorf("start time %v should be before end time %v", startUTC, endUTC)
	}

	diff := endUTC.Sub(startUTC)
	if diff < 23*time.Hour || diff > 25*time.Hour {
		t.Errorf("expected approx 24h, got %v", diff)
	}
}
