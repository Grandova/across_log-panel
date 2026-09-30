package handler

import (
	"fmt"
	"net/http"
	"time"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type LogHandler struct {
	logSvc *service.LogService
}

func NewLogHandler(logSvc *service.LogService) *LogHandler {
	return &LogHandler{logSvc: logSvc}
}

// QueryLogs handles POST /api/v1/logs/query
func (h *LogHandler) QueryLogs(c *gin.Context) {
	var req model.LogQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "查询参数解析失败: " + err.Error()})
		return
	}

	username, _ := c.Get("username")
	resp, err := h.logSvc.QueryLogs(c.Request.Context(), req, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询日志失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ExportCSV handles POST /api/v1/logs/export
func (h *LogHandler) ExportCSV(c *gin.Context) {
	var req model.LogQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数解析失败: " + err.Error()})
		return
	}

	filename := fmt.Sprintf("access_log_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Transfer-Encoding", "chunked")

	username, _ := c.Get("username")
	_, err := h.logSvc.ExportCSV(c.Request.Context(), req, c.Writer, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		// Log error if already writing stream
		_ = c.Error(err)
	}
}
