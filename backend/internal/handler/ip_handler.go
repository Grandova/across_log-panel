package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type IPHandler struct {
	statsSvc *service.StatsService
	logSvc   *service.LogService
}

func NewIPHandler(statsSvc *service.StatsService, logSvc *service.LogService) *IPHandler {
	return &IPHandler{statsSvc: statsSvc, logSvc: logSvc}
}

// GetIPOverview handles GET /api/v1/ips/:ip/overview
func (h *IPHandler) GetIPOverview(c *gin.Context) {
	ip := c.Param("ip")
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")

	username, _ := c.Get("username")
	ov, err := h.statsSvc.GetIPOverview(c.Request.Context(), ip, startStr, endStr, preset, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 IP 概况失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, ov)
}

// GetIPHosts handles GET /api/v1/ips/:ip/hosts
func (h *IPHandler) GetIPHosts(c *gin.Context) {
	ip := c.Param("ip")
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	list, err := h.statsSvc.GetIPTopHosts(c.Request.Context(), ip, startStr, endStr, preset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 IP Host 失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GetIPUsers handles GET /api/v1/ips/:ip/users
func (h *IPHandler) GetIPUsers(c *gin.Context) {
	ip := c.Param("ip")
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	list, err := h.statsSvc.GetIPUsers(c.Request.Context(), ip, startStr, endStr, preset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 IP 关联用户失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GetIPLogs handles GET /api/v1/ips/:ip/logs
func (h *IPHandler) GetIPLogs(c *gin.Context) {
	ip := c.Param("ip")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "100"))

	req := model.LogQueryRequest{
		StartTime: c.Query("start_time"),
		EndTime:   c.Query("end_time"),
		Preset:    c.Query("preset"),
		UserIP:    ip,
		Page:      page,
		PageSize:  pageSize,
	}

	username, _ := c.Get("username")
	resp, err := h.logSvc.QueryLogs(c.Request.Context(), req, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 IP 访问日志失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
