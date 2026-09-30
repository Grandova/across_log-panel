package service

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"access-log-analytics/internal/config"
	"access-log-analytics/internal/model"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	loginAttempts map[string]int
	lockoutUntil  map[string]time.Time
	mutex         sync.Mutex
}

func NewAuthService() *AuthService {
	return &AuthService{
		loginAttempts: make(map[string]int),
		lockoutUntil:  make(map[string]time.Time),
	}
}

// Claims defines custom JWT claims
type Claims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// Login verifies credentials and returns JWT token
func (s *AuthService) Login(username, password, clientIP string) (*model.LoginResponse, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Check brute-force lockout for IP
	if lockTime, exists := s.lockoutUntil[clientIP]; exists {
		if time.Now().Before(lockTime) {
			remainingSec := int(time.Until(lockTime).Seconds())
			return nil, fmt.Errorf("登录失败过多，已被锁定，请等待 %d 秒后再试", remainingSec)
		}
		delete(s.lockoutUntil, clientIP)
		delete(s.loginAttempts, clientIP)
	}

	appCfg := config.GetConfig()

	// Validate username
	if username != appCfg.AdminUser {
		s.recordFailedAttempt(clientIP)
		return nil, errors.New("用户名或密码错误")
	}

	// Validate password
	if err := bcrypt.CompareHashAndPassword([]byte(appCfg.AdminPassHash), []byte(password)); err != nil {
		s.recordFailedAttempt(clientIP)
		return nil, errors.New("用户名或密码错误")
	}

	// Reset attempts on successful login
	delete(s.loginAttempts, clientIP)
	delete(s.lockoutUntil, clientIP)

	// Issue JWT token (valid for 24 hours)
	expiresAt := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: username,
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "access-log-analytics",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(appCfg.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign token: %w", err)
	}

	return &model.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt,
		User: model.UserInfo{
			Username: username,
			Role:     "admin",
		},
	}, nil
}

func (s *AuthService) recordFailedAttempt(clientIP string) {
	s.loginAttempts[clientIP]++
	if s.loginAttempts[clientIP] >= 5 {
		// Lock for 5 minutes after 5 failed attempts
		s.lockoutUntil[clientIP] = time.Now().Add(5 * time.Minute)
	}
}

// ValidateToken parses and verifies JWT token string
func (s *AuthService) ValidateToken(tokenStr string) (*Claims, error) {
	appCfg := config.GetConfig()
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(appCfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
