package service

import (
	"strings"
	"time"

	"access-log-analytics/internal/utils"
)

// ResolveTimeRange converts preset or user input strings (UTC+8) into UTC time.Time
func ResolveTimeRange(startStr, endStr, preset string) (time.Time, time.Time, error) {
	// If preset is specified, use preset range
	if preset != "" {
		startUTC, endUTC := utils.GetPresetRangeUTC(preset)
		return startUTC, endUTC, nil
	}

	// If explicit start/end provided
	if startStr != "" || endStr != "" {
		var startUTC, endUTC time.Time
		var err error

		cleanStart := strings.TrimSpace(startStr)
		cleanEnd := strings.TrimSpace(endStr)

		if cleanStart != "" {
			startUTC, err = utils.ParseLocalTimeToUTC(cleanStart)
			if err != nil {
				return time.Time{}, time.Time{}, err
			}
		}

		if cleanEnd != "" {
			// If date-only format like "2026-09-30", append 23:59:59
			if len(cleanEnd) == 10 && !strings.Contains(cleanEnd, " ") && !strings.Contains(cleanEnd, "T") {
				cleanEnd += " 23:59:59"
			}
			endUTC, err = utils.ParseLocalTimeToUTC(cleanEnd)
			if err != nil {
				return time.Time{}, time.Time{}, err
			}
		}

		// If start is set but end is empty, default end to now
		if !startUTC.IsZero() && endUTC.IsZero() {
			endUTC = time.Now().UTC()
		}
		// If end is set but start is empty, default start to 24h before end
		if startUTC.IsZero() && !endUTC.IsZero() {
			startUTC = endUTC.Add(-24 * time.Hour)
		}

		return startUTC, endUTC, nil
	}

	// Default fallback: past 24h
	startUTC, endUTC := utils.GetPresetRangeUTC("24h")
	return startUTC, endUTC, nil
}
