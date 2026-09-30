package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type LookupHandler struct {
	statsSvc *service.StatsService
	logSvc   *service.LogService
}

func NewLookupHandler(statsSvc *service.StatsService, logSvc *service.LogService) *LookupHandler {
	return &LookupHandler{statsSvc: statsSvc, logSvc: logSvc}
}

// DomainLookup handles GET /api/v1/lookup/domain
func (h *LookupHandler) DomainLookup(c *gin.Context) {
	domain := strings.TrimSpace(c.Query("domain"))
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供查询域名参数 domain"})
		return
	}

	mode := c.DefaultQuery("mode", "subdomain") // "subdomain", "exact", "contains"
	startStr := c.Query("start_time")
	endStr := c.Query("end_time")
	preset := c.Query("preset")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	username, _ := c.Get("username")
	total, items, err := h.statsSvc.DomainLookup(
		c.Request.Context(),
		domain,
		mode,
		startStr,
		endStr,
		preset,
		fmt.Sprintf("%v", username),
		c.ClientIP(),
		page,
		pageSize,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "域名反查失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"data":      items,
	})
}

// DetectSearch handles GET /api/v1/search/detect
func (h *LookupHandler) DetectSearch(c *gin.Context) {
	q := c.Query("q")
	res := h.logSvc.DetectSearchType(q)
	c.JSON(http.StatusOK, res)
}
