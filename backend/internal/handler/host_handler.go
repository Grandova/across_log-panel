package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type HostHandler struct {
	statsSvc *service.StatsService
	logSvc   *service.LogService
}

func NewHostHandler(statsSvc *service.StatsService, logSvc *service.LogService) *HostHandler {
	return &HostHandler{statsSvc: statsSvc, logSvc: logSvc}
}

// GetHostRanking handles GET /api/v1/stats/hosts
func (h *HostHandler) GetHostRanking(c *gin.Context) {
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	var nodeID *int32
	if nStr := c.Query("node_id"); nStr != "" {
		if n, err := strconv.Atoi(nStr); err == nil {
			val := int32(n)
			nodeID = &val
		}
	}

	var userID *int64
	if uStr := c.Query("user_id"); uStr != "" {
		if u, err := strconv.ParseInt(uStr, 10, 64); err == nil {
			userID = &u
		}
	}

	list, err := h.statsSvc.GetHostRanking(c.Request.Context(), startStr, endStr, preset, limit, nodeID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Host 排行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GetHostOverview handles GET /api/v1/hosts/:host/overview
func (h *HostHandler) GetHostOverview(c *gin.Context) {
	host := c.Param("host")
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")

	username, _ := c.Get("username")
	ov, err := h.statsSvc.GetHostOverview(c.Request.Context(), host, startStr, endStr, preset, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Host 详情失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, ov)
}

// GetHostUsers handles GET /api/v1/hosts/:host/users
func (h *HostHandler) GetHostUsers(c *gin.Context) {
	host := c.Param("host")
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")
	sortBy := c.DefaultQuery("sort_by", "requests")
	order := c.DefaultQuery("order", "desc")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	total, list, err := h.statsSvc.GetHostUsers(c.Request.Context(), host, startStr, endStr, preset, sortBy, order, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Host 用户列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"data":      list,
	})
}

// GetHostLogs handles GET /api/v1/hosts/:host/logs
func (h *HostHandler) GetHostLogs(c *gin.Context) {
	host := c.Param("host")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "100"))

	req := model.LogQueryRequest{
		StartTime: c.Query("start_time"),
		EndTime:   c.Query("end_time"),
		Preset:    c.Query("preset"),
		Host:      host,
		HostMatch: "exact",
		Page:      page,
		PageSize:  pageSize,
	}

	username, _ := c.Get("username")
	resp, err := h.logSvc.QueryLogs(c.Request.Context(), req, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Host 访问日志失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
