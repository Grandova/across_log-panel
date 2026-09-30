package handler

import (
	"net/http"
	"strconv"

	"access-log-analytics/internal/repository"
	"github.com/gin-gonic/gin"
)

type AuditHandler struct {
	auditRepo *repository.AuditRepository
}

func NewAuditHandler() *AuditHandler {
	return &AuditHandler{auditRepo: repository.GetAuditRepo()}
}

func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	total, list := h.auditRepo.Query(page, pageSize)
	c.JSON(http.StatusOK, gin.H{
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"data":      list,
	})
}

func (h *AuditHandler) ClearAuditLogs(c *gin.Context) {
	if err := h.auditRepo.Clear(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "清空审计日志失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "审计日志已清空"})
}
