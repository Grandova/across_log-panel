package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	statsSvc *service.StatsService
	logSvc   *service.LogService
}

func NewUserHandler(statsSvc *service.StatsService, logSvc *service.LogService) *UserHandler {
	return &UserHandler{statsSvc: statsSvc, logSvc: logSvc}
}

// GetUserOverview handles GET /api/v1/users/:uid/overview
func (h *UserHandler) GetUserOverview(c *gin.Context) {
	uidStr := c.Param("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 UID 格式"})
		return
	}

	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")

	username, _ := c.Get("username")
	ov, err := h.statsSvc.GetUserOverview(c.Request.Context(), userID, startStr, endStr, preset, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户统计失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, ov)
}

// GetUserHosts handles GET /api/v1/users/:uid/hosts
func (h *UserHandler) GetUserHosts(c *gin.Context) {
	uidStr := c.Param("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 UID 格式"})
		return
	}

	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	list, err := h.statsSvc.GetUserTopHosts(c.Request.Context(), userID, startStr, endStr, preset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户 Host 排行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GetUserLogs handles GET /api/v1/users/:uid/logs
func (h *UserHandler) GetUserLogs(c *gin.Context) {
	uidStr := c.Param("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 UID 格式"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "100"))

	req := model.LogQueryRequest{
		StartTime: c.Query("start_time"),
		EndTime:   c.Query("end_time"),
		Preset:    c.Query("preset"),
		UserID:    &userID,
		Page:      page,
		PageSize:  pageSize,
	}

	username, _ := c.Get("username")
	resp, err := h.logSvc.QueryLogs(c.Request.Context(), req, fmt.Sprintf("%v", username), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户访问日志失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
