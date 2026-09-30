package handler

import (
	"fmt"
	"net/http"

	"access-log-analytics/internal/config"
	"access-log-analytics/internal/database"
	"access-log-analytics/internal/model"
	"access-log-analytics/internal/repository"
	"github.com/gin-gonic/gin"
)

type SettingsHandler struct {
	dbMgr     *database.ClickHouseManager
	auditRepo *repository.AuditRepository
}

func NewSettingsHandler() *SettingsHandler {
	return &SettingsHandler{
		dbMgr:     database.GetCKManager(),
		auditRepo: repository.GetAuditRepo(),
	}
}

// GetDatabaseSettings returns connection status and masked config
func (h *SettingsHandler) GetDatabaseSettings(c *gin.Context) {
	appCfg := config.GetConfig()
	ck := appCfg.ClickHouse
	connected, version, latencyMs, lastErr := h.dbMgr.GetStatus()

	resp := model.ClickHouseConfigResponse{
		Protocol:    ck.Protocol,
		Host:        ck.Host,
		Port:        ck.Port,
		Database:    ck.Database,
		Username:    ck.Username,
		HasPassword: ck.Password != "",
		Secure:      ck.Secure,
		Connected:   connected,
		Version:     version,
		LatencyMs:   latencyMs,
		LastError:   lastErr,
	}

	c.JSON(http.StatusOK, resp)
}

// TestDatabaseConnection tests a connection without persisting it
func (h *SettingsHandler) TestDatabaseConnection(c *gin.Context) {
	var req model.ClickHouseConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误: " + err.Error()})
		return
	}

	// If password is blank, use current password
	if req.Password == "" {
		req.Password = config.GetConfig().ClickHouse.Password
	}

	version, latency, err := h.dbMgr.TestConnection(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"error":   fmt.Sprintf("ClickHouse 连接失败: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"version":    version,
		"latency_ms": latency,
		"message":    fmt.Sprintf("连接成功！ClickHouse 版本: %s (耗时 %dms)", version, latency),
	})
}

// SaveDatabaseSettings saves and reconnects ClickHouse
func (h *SettingsHandler) SaveDatabaseSettings(c *gin.Context) {
	var req model.ClickHouseConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数格式错误: " + err.Error()})
		return
	}

	// If password is blank, retain current password
	currentCK := config.GetConfig().ClickHouse
	if req.Password == "" {
		req.Password = currentCK.Password
	}

	// 1. Test first
	version, latency, err := h.dbMgr.TestConnection(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("新配置无法连接 ClickHouse，保存中止: %v", err),
		})
		return
	}

	// 2. Persist to disk
	if err := config.SaveClickHouseConfig(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "保存配置文件失败: " + err.Error(),
		})
		return
	}

	// 3. Reconnect
	if err := h.dbMgr.Connect(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "热重载连接池失败: " + err.Error(),
		})
		return
	}

	username, _ := c.Get("username")
	h.auditRepo.Record(
		fmt.Sprintf("%v", username),
		c.ClientIP(),
		"UPDATE_CONFIG",
		fmt.Sprintf("ClickHouse %s:%d/%s", req.Host, req.Port, req.Database),
		fmt.Sprintf("Version: %s, Latency: %dms", version, latency),
		latency,
	)

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "配置已成功保存并即时生效！",
		"version":    version,
		"latency_ms": latency,
	})
}
