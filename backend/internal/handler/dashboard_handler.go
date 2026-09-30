package handler

import (
	"net/http"
	"strconv"

	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	statsSvc *service.StatsService
}

func NewDashboardHandler(statsSvc *service.StatsService) *DashboardHandler {
	return &DashboardHandler{statsSvc: statsSvc}
}

// GetOverview returns top stats cards
func (h *DashboardHandler) GetOverview(c *gin.Context) {
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.DefaultQuery("preset", "today")

	ov, err := h.statsSvc.GetDashboardOverview(c.Request.Context(), startStr, endStr, preset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取大盘统计失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, ov)
}

// GetTrend returns timeline series data
func (h *DashboardHandler) GetTrend(c *gin.Context) {
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.DefaultQuery("preset", "24h")
	interval := c.Query("interval")

	points, err := h.statsSvc.GetTrend(c.Request.Context(), startStr, endStr, preset, interval)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取访问趋势失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, points)
}

// GetTopHosts returns top hosts for dashboard
func (h *DashboardHandler) GetTopHosts(c *gin.Context) {
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.DefaultQuery("preset", "24h")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	list, err := h.statsSvc.GetHostRanking(c.Request.Context(), startStr, endStr, preset, limit, nil, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取 Host 排行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

// GetTopNodes returns node ranking for dashboard
func (h *DashboardHandler) GetTopNodes(c *gin.Context) {
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.DefaultQuery("preset", "24h")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	list, err := h.statsSvc.GetNodeRanking(c.Request.Context(), startStr, endStr, preset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取节点排行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}
