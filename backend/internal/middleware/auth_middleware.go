package middleware

import (
	"net/http"
	"strings"

	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware(authSvc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Allow health check and login without token
		path := c.Request.URL.Path
		if path == "/api/v1/auth/login" || path == "/api/v1/health" {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未提供认证 Token，请先登录"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token 格式无效，必须为 Bearer <Token>"})
			c.Abort()
			return
		}

		claims, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "登录状态已失效，请重新登录"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}
