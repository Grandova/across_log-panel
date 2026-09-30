package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"access-log-analytics/internal/config"
	"access-log-analytics/internal/database"
	"access-log-analytics/internal/handler"
	"access-log-analytics/internal/middleware"
	"access-log-analytics/internal/service"
	"access-log-analytics/internal/web"
	"github.com/gin-gonic/gin"
)

// findDistDir searches for an external frontend build directory on disk
func findDistDir() string {
	candidates := []string{
		filepath.Join("frontend", "dist"),
		filepath.Join("..", "frontend", "dist"),
		filepath.Join(".", "dist"),
	}

	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && info.IsDir() {
			indexFile := filepath.Join(c, "index.html")
			if _, err := os.Stat(indexFile); err == nil {
				return c
			}
		}
	}
	return ""
}

func main() {
	// 1. Initialize configuration
	cfg, err := config.InitConfig()
	if err != nil {
		log.Fatalf("配置初始化失败: %v", err)
	}

	// 2. Initialize ClickHouse connection pool
	dbMgr := database.GetCKManager()
	if err := dbMgr.Connect(cfg.ClickHouse); err != nil {
		log.Printf("[警告] ClickHouse 初始连接失败: %v", err)
		log.Printf("[提示] 服务仍将继续启动，您可访问前端面板「系统设置」手动配置并连接 ClickHouse")
	} else {
		_, version, latency, _ := dbMgr.GetStatus()
		log.Printf("[成功] ClickHouse 连接就绪！服务器版本: %s (协议: %s, 地址: %s:%d, 延迟: %dms)",
			version, cfg.ClickHouse.Protocol, cfg.ClickHouse.Host, cfg.ClickHouse.Port, latency)
	}

	// 3. Initialize Services
	authSvc := service.NewAuthService()
	logSvc := service.NewLogService()
	statsSvc := service.NewStatsService()

	// 4. Initialize Handlers
	authHandler := handler.NewAuthHandler(authSvc)
	settingsHandler := handler.NewSettingsHandler()
	dashboardHandler := handler.NewDashboardHandler(statsSvc)
	hostHandler := handler.NewHostHandler(statsSvc, logSvc)
	userHandler := handler.NewUserHandler(statsSvc, logSvc)
	lookupHandler := handler.NewLookupHandler(statsSvc, logSvc)
	logHandler := handler.NewLogHandler(logSvc)
	ipHandler := handler.NewIPHandler(statsSvc, logSvc)
	nodeHandler := handler.NewNodeHandler(statsSvc, logSvc)
	auditHandler := handler.NewAuditHandler()

	// 5. Setup Gin Engine
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Middlewares
	r.Use(middleware.CorsMiddleware())

	// Health Check
	r.GET("/api/v1/health", func(c *gin.Context) {
		connected, version, latency, lastErr := dbMgr.GetStatus()
		c.JSON(http.StatusOK, gin.H{
			"status":            "ok",
			"clickhouse_online": connected,
			"version":           version,
			"latency_ms":        latency,
			"last_error":        lastErr,
		})
	})

	// API Routes
	api := r.Group("/api/v1")
	{
		// Auth Routes (Login is open)
		api.POST("/auth/login", authHandler.Login)

		// Protected Routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authSvc))
		{
			// Current user
			protected.GET("/auth/me", authHandler.GetMe)
			protected.POST("/auth/account", authHandler.UpdateAccount)
			protected.POST("/auth/logout", authHandler.Logout)

			// Database Settings & Reconnect
			protected.GET("/settings/database", settingsHandler.GetDatabaseSettings)
			protected.POST("/settings/database/test", settingsHandler.TestDatabaseConnection)
			protected.POST("/settings/database/save", settingsHandler.SaveDatabaseSettings)

			// Dashboard
			protected.GET("/dashboard/overview", dashboardHandler.GetOverview)
			protected.GET("/dashboard/trend", dashboardHandler.GetTrend)
			protected.GET("/dashboard/top-hosts", dashboardHandler.GetTopHosts)
			protected.GET("/dashboard/top-nodes", dashboardHandler.GetTopNodes)

			// Host Analytics
			protected.GET("/stats/hosts", hostHandler.GetHostRanking)
			protected.GET("/hosts/:host/overview", hostHandler.GetHostOverview)
			protected.GET("/hosts/:host/users", hostHandler.GetHostUsers)
			protected.GET("/hosts/:host/logs", hostHandler.GetHostLogs)

			// User Analytics
			protected.GET("/users/:uid/overview", userHandler.GetUserOverview)
			protected.GET("/users/:uid/hosts", userHandler.GetUserHosts)
			protected.GET("/users/:uid/logs", userHandler.GetUserLogs)

			// Reverse Domain Lookup & Search Intent Detect
			protected.GET("/lookup/domain", lookupHandler.DomainLookup)
			protected.GET("/search/detect", lookupHandler.DetectSearch)

			// Logs Data Explorer & CSV Export
			protected.POST("/logs/query", logHandler.QueryLogs)
			protected.POST("/logs/export", logHandler.ExportCSV)

			// IP Analytics
			protected.GET("/ips/:ip/overview", ipHandler.GetIPOverview)
			protected.GET("/ips/:ip/hosts", ipHandler.GetIPHosts)
			protected.GET("/ips/:ip/users", ipHandler.GetIPUsers)
			protected.GET("/ips/:ip/logs", ipHandler.GetIPLogs)

			// Node Analytics
			protected.GET("/nodes/ranking", nodeHandler.GetNodeRanking)
			protected.GET("/nodes/:node_id/overview", nodeHandler.GetNodeOverview)
			protected.GET("/nodes/:node_id/logs", nodeHandler.GetNodeLogs)

			// Audit Logs
			protected.GET("/audit/logs", auditHandler.GetAuditLogs)
			protected.DELETE("/audit/logs", auditHandler.ClearAuditLogs)
		}
	}

	// 6. Static files: Prioritize external directory if present, else fallback to embedded FS
	externalDist := findDistDir()
	indexHTML, err := web.ReadFile("index.html")
	hasEmbedded := err == nil && len(indexHTML) > 0

	if externalDist != "" {
		log.Printf("[前端静态资源] 从本地外部目录加载: %s", externalDist)
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path
			if strings.HasPrefix(path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"error": "API 接口不存在"})
				return
			}
			filePath := filepath.Join(externalDist, filepath.Clean(path))
			if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
				if strings.HasPrefix(path, "/assets/") {
					c.Header("Cache-Control", "public, max-age=31536000, immutable")
				}
				c.File(filePath)
				return
			}
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
			c.File(filepath.Join(externalDist, "index.html"))
		})
	} else if hasEmbedded {
		log.Printf("[前端静态资源] 从单一二进制内嵌资源中加载 (Zero External Dependency)")
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path
			if strings.HasPrefix(path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"error": "API 接口不存在"})
				return
			}
			trimmed := strings.TrimPrefix(path, "/")
			if trimmed != "" {
				if fileBytes, err := web.ReadFile(trimmed); err == nil {
					if strings.HasPrefix(path, "/assets/") {
						c.Header("Cache-Control", "public, max-age=31536000, immutable")
					}
					ext := filepath.Ext(trimmed)
					switch ext {
					case ".js":
						c.Header("Content-Type", "application/javascript")
					case ".css":
						c.Header("Content-Type", "text/css")
					case ".svg":
						c.Header("Content-Type", "image/svg+xml")
					case ".json":
						c.Header("Content-Type", "application/json")
					case ".html":
						c.Header("Content-Type", "text/html; charset=utf-8")
					}
					c.Data(http.StatusOK, c.Writer.Header().Get("Content-Type"), fileBytes)
					return
				}
			}
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Data(http.StatusOK, "text/html; charset=utf-8", indexHTML)
		})
	} else {
		log.Printf("[前端静态资源] 未找到前端构建资源，服务仅提供 API 接口")
	}

	// 7. Start listening
	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("=====================================================")
	log.Printf("  Access Log Analytics 后端服务正在启动...")
	log.Printf("  监听地址: http://0.0.0.0%s", addr)
	log.Printf("  时区设置: Asia/Shanghai (UTC+8)")
	log.Printf("=====================================================")

	if err := r.Run(addr); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
