package utils

import (
	"fmt"
	"time"
)

var (
	// LocationShanghai is the default display location (Asia/Shanghai, UTC+8)
	LocationShanghai *time.Location
)

func init() {
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		// Fallback to fixed zone UTC+8 if tzdata is missing in minimal container
		LocationShanghai = time.FixedZone("CST", 8*3600)
	} else {
		LocationShanghai = loc
	}
}

// TimeLayoutStandard is the common datetime layout
const (
	TimeLayoutStandard = "2006-01-02 15:04:05"
	TimeLayoutDate     = "2006-01-02"
)

// ParseLocalTimeToUTC parses a local (UTC+8) time string into UTC time.Time
func ParseLocalTimeToUTC(timeStr string) (time.Time, error) {
	if timeStr == "" {
		return time.Time{}, nil
	}

	// Try RFC3339 / ISO8601 first
	if t, err := time.Parse(time.RFC3339, timeStr); err == nil {
		return t.UTC(), nil
	}

	// Try Standard Layout in Asia/Shanghai
	if t, err := time.ParseInLocation(TimeLayoutStandard, timeStr, LocationShanghai); err == nil {
		return t.UTC(), nil
	}

	// Try Date Only in Asia/Shanghai
	if t, err := time.ParseInLocation(TimeLayoutDate, timeStr, LocationShanghai); err == nil {
		return t.UTC(), nil
	}

	return time.Time{}, fmt.Errorf("invalid time format: %s, expected 'YYYY-MM-DD HH:mm:ss' or RFC3339", timeStr)
}

// FormatToShanghai formats a UTC time to "YYYY-MM-DD HH:mm:ss" in Asia/Shanghai
func FormatToShanghai(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	return t.In(LocationShanghai).Format(TimeLayoutStandard)
}

// FormatToUTC formats a time to "YYYY-MM-DD HH:mm:ss" in UTC
func FormatToUTC(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	return t.UTC().Format(TimeLayoutStandard)
}

// FormatISO8601 formats a time to RFC3339 UTC
func FormatISO8601(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

// GetPresetRangeUTC returns UTC start and end time based on common presets (evaluated in Asia/Shanghai)
func GetPresetRangeUTC(preset string) (time.Time, time.Time) {
	nowShanghai := time.Now().In(LocationShanghai)

	switch preset {
	case "1h":
		start := nowShanghai.Add(-1 * time.Hour)
		return start.UTC(), nowShanghai.UTC()
	case "6h":
		start := nowShanghai.Add(-6 * time.Hour)
		return start.UTC(), nowShanghai.UTC()
	case "24h":
		start := nowShanghai.Add(-24 * time.Hour)
		return start.UTC(), nowShanghai.UTC()
	case "today":
		start := time.Date(nowShanghai.Year(), nowShanghai.Month(), nowShanghai.Day(), 0, 0, 0, 0, LocationShanghai)
		return start.UTC(), nowShanghai.UTC()
	case "yesterday":
		start := time.Date(nowShanghai.Year(), nowShanghai.Month(), nowShanghai.Day()-1, 0, 0, 0, 0, LocationShanghai)
		end := time.Date(nowShanghai.Year(), nowShanghai.Month(), nowShanghai.Day(), 0, 0, 0, 0, LocationShanghai).Add(-time.Second)
		return start.UTC(), end.UTC()
	case "3d":
		start := nowShanghai.Add(-3 * 24 * time.Hour)
		return start.UTC(), nowShanghai.UTC()
	case "7d":
		start := nowShanghai.Add(-7 * 24 * time.Hour)
		return start.UTC(), nowShanghai.UTC()
	case "30d":
		start := nowShanghai.Add(-30 * 24 * time.Hour)
		return start.UTC(), nowShanghai.UTC()
	default:
		// Default to 24h
		start := nowShanghai.Add(-24 * time.Hour)
		return start.UTC(), nowShanghai.UTC()
	}
}
