package config

import (
	"crypto/rand"
	"os"
	"path/filepath"
	"testing"
)

func TestBootstrapRequiresCredentials(t *testing.T) {
	t.Chdir(t.TempDir())
	t.Setenv("ADMIN_USER", "")
	t.Setenv("ADMIN_PASSWORD", "")
	t.Setenv("JWT_SECRET", "")
	if _, err := InitConfig(); err == nil {
		t.Fatal("startup accepted missing bootstrap credentials")
	}
}

func TestFailedAccountSaveKeepsCredentials(t *testing.T) {
	t.Chdir(t.TempDir())
	password := rand.Text()
	t.Setenv("ADMIN_USER", "fixture-user")
	t.Setenv("ADMIN_PASSWORD", password)
	t.Setenv("JWT_SECRET", "")
	if _, err := InitConfig(); err != nil {
		t.Fatal(err)
	}
	before := GetConfig()
	if len(before.JWTSecret) != 64 {
		t.Fatal("signing key was not generated")
	}
	if err := os.Rename(configPath, filepath.Join("data", "saved.json")); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(configPath, 0700); err != nil {
		t.Fatal(err)
	}
	if err := UpdateAdmin("fixture-user", password, "changed-user", rand.Text()); err == nil {
		t.Fatal("expected save to fail")
	}
	after := GetConfig()
	if before.AdminUser != after.AdminUser || before.AdminPassHash != after.AdminPassHash || before.JWTSecret != after.JWTSecret {
		t.Fatal("failed save changed active credentials")
	}
}
