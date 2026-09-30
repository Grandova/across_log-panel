package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type NodeHandler struct {
	statsSvc *service.StatsService
	logSvc   *service.LogService
}

func NewNodeHandler(statsSvc *service.StatsService, logSvc *service.LogService) *NodeHandler {
	return &NodeHandler{statsSvc: statsSvc, logSvc: logSvc}
}

// GetNodeOverview handles GET /api/v1/nodes/:node_id/overview
func (h *NodeHandler) GetNodeOverview(c *gin.Context) {
	nodeIDStr := c.Param("node_id")
	nodeID, err := strconv.Atoi(nodeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的节点 ID 格式"})
		return
	}

	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")

	ov, err := h.statsSvc.GetNodeOverview(c.Request.Context(), int32(nodeID), startStr, endStr, preset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取节点概况失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, ov)
}

// GetNodeRanking handles GET /api/v1/nodes/ranking
func (h *NodeHandler) GetNodeRanking(c *gin.Context) {
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	list, err := h.statsSvc.GetNodeRanking(c.Request.Context(), startStr, endStr, preset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取节点排行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GetNodeLogs handles GET /api/v1/nodes/:node_id/logs
func (h *NodeHandler) GetNodeLogs(c *gin.Context) {
	nodeIDStr := c.Param("node_id")
	nodeID, err := strconv.Atoi(nodeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的节点 ID 格式"})
		return
	}

	val := int32(nodeID)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "100"))

	req := model.LogQueryRequest{
		StartTime: c.Query("start_time"),
		EndTime:   c.Query("end_time"),
		Preset:    c.Query("preset"),
		NodeID:    &val,
		Page:      page,
		PageSize:  pageSize,
	}

	username, _ := c.Get("username")
	resp, err := h.logSvc.QueryLogs(c.Request.Context(), req, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取节点访问日志失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
