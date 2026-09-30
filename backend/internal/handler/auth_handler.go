package handler

import (
	"net/http"
	"strings"

	"access-log-analytics/internal/model"
	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}

	clientIP := c.ClientIP()
	resp, err := h.authSvc.Login(req.Username, req.Password, clientIP)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	username, _ := c.Get("username")
	role, _ := c.Get("role")
	c.JSON(http.StatusOK, gin.H{
		"username": username,
		"role":     role,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "已成功登出"})
}

func (h *AuthHandler) UpdateAccount(c *gin.Context) {
	var req struct {
		Username        string `json:"username" binding:"required"`
		CurrentPassword string `json:"current_password" binding:"required"`
		Password        string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入用户名和当前密码"})
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || len([]rune(req.Username)) > 64 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名长度应为 1–64 个字符"})
		return
	}
	if req.Password != "" && (len(req.Password) < 8 || len(req.Password) > 72) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "新密码长度应为 8–72 字节"})
		return
	}
	if err := h.authSvc.UpdateAccount(c.GetString("username"), req.CurrentPassword, req.Username, req.Password, c.ClientIP()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "管理员账号已更新，请重新登录"})
}
