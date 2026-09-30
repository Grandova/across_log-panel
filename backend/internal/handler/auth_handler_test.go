package handler_test

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"access-log-analytics/internal/config"
	"access-log-analytics/internal/handler"
	"access-log-analytics/internal/middleware"
	"access-log-analytics/internal/service"
	"github.com/gin-gonic/gin"
)

func TestAccountUpdate(t *testing.T) {
	t.Chdir(t.TempDir())
	password := rand.Text()
	t.Setenv("ADMIN_USER", "fixture-user")
	t.Setenv("ADMIN_PASSWORD", password)
	t.Setenv("JWT_SECRET", "")
	if _, err := config.InitConfig(); err != nil {
		t.Fatal(err)
	}
	svc := service.NewAuthService()
	h := handler.NewAuthHandler(svc)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/auth/login", h.Login)
	protected := router.Group("", middleware.AuthMiddleware(svc))
	protected.POST("/auth/account", h.UpdateAccount)
	protected.GET("/auth/me", h.GetMe)
	protected.POST("/api/v1/settings/database/test", func(c *gin.Context) { c.Status(http.StatusOK) })
	request := func(path, token string, body map[string]string) *httptest.ResponseRecorder {
		t.Helper()
		data, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(data))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		return res
	}
	if res := request("/api/v1/settings/database/test", "", nil); res.Code != http.StatusUnauthorized {
		t.Fatal("database connection test bypassed authentication")
	}
	login := request("/auth/login", "", map[string]string{"username": "fixture-user", "password": password})
	if login.Code != http.StatusOK {
		t.Fatalf("initial login status: %d", login.Code)
	}
	var auth struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(login.Body.Bytes(), &auth); err != nil {
		t.Fatal(err)
	}
	newPassword := rand.Text()
	change := map[string]string{"username": "changed-user", "current_password": password, "password": newPassword}
	if res := request("/auth/account", "", change); res.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated update status: %d", res.Code)
	}
	change["current_password"] = rand.Text()
	if res := request("/auth/account", auth.Token, change); res.Code != http.StatusBadRequest {
		t.Fatalf("wrong password status: %d", res.Code)
	}
	if _, err := svc.ValidateToken(auth.Token); err != nil {
		t.Fatal("failed change invalidated existing session")
	}
	change["current_password"] = password
	change["password"] = "short"
	if res := request("/auth/account", auth.Token, change); res.Code != http.StatusBadRequest {
		t.Fatalf("short password status: %d", res.Code)
	}
	change["password"] = strings.Repeat("密", 25)
	if res := request("/auth/account", auth.Token, change); res.Code != http.StatusBadRequest {
		t.Fatalf("oversize bcrypt password status: %d", res.Code)
	}
	change["password"] = newPassword
	if res := request("/auth/account", auth.Token, change); res.Code != http.StatusOK {
		t.Fatalf("update status: %d", res.Code)
	}
	if _, err := svc.ValidateToken(auth.Token); err == nil {
		t.Fatal("old session remains valid")
	}
	if res := request("/auth/login", "", map[string]string{"username": "fixture-user", "password": password}); res.Code != http.StatusUnauthorized {
		t.Fatal("old credentials still work")
	}
	stored, err := os.ReadFile(filepath.Join("data", "config.json"))
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(stored, []byte(password)) || bytes.Contains(stored, []byte(newPassword)) {
		t.Fatal("plaintext password persisted")
	}
	// Bootstrap credentials still exist in the environment; saved changes must win after restart.
	if _, err := config.InitConfig(); err != nil {
		t.Fatal(err)
	}
	svc = service.NewAuthService()
	if _, err := svc.ValidateToken(auth.Token); err == nil {
		t.Fatal("old session returned after restart")
	}
	session, err := svc.Login("changed-user", newPassword, "restart")
	if err != nil {
		t.Fatal("new credentials failed after restart")
	}
	if err := svc.UpdateAccount("changed-user", newPassword, "renamed-user", "", "rename"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ValidateToken(session.Token); err == nil {
		t.Fatal("rename did not revoke session")
	}
	if _, err := svc.Login("renamed-user", newPassword, "rename"); err != nil {
		t.Fatal("blank password did not preserve password")
	}
	for i := 0; i < 5; i++ {
		_ = svc.UpdateAccount("renamed-user", "incorrect", "ignored", "", "locked")
	}
	if err := svc.UpdateAccount("renamed-user", newPassword, "ignored", "", "locked"); err == nil {
		t.Fatal("password attempts were not rate limited")
	}
}
