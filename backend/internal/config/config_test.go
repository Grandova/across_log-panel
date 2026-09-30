package config

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"golang.org/x/crypto/bcrypt"
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

func TestConfigureAdmin(t *testing.T) {
	t.Chdir(t.TempDir())
	t.Setenv("ADMIN_USER", "")
	t.Setenv("ADMIN_PASSWORD", "")
	t.Setenv("JWT_SECRET", "")
	password := rand.Text()
	if err := ConfigureAdmin("first-user", password); err != nil {
		t.Fatal(err)
	}
	before := GetConfig()
	ck := before.ClickHouse
	ck.Host = "db.example.test"
	ck.Password = rand.Text()
	if err := SaveClickHouseConfig(ck); err != nil {
		t.Fatal(err)
	}
	storedBefore, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatal(err)
	}
	for _, input := range []struct{ user, password string }{{" ", password}, {"new-user", "short"}} {
		if err := ConfigureAdmin(input.user, input.password); err == nil {
			t.Fatal("invalid account accepted")
		}
		stored, _ := os.ReadFile(configPath)
		if !bytes.Equal(stored, storedBefore) {
			t.Fatal("invalid account changed stored configuration")
		}
	}
	newPassword := " $'\"\\" + rand.Text() + " "
	if err := ConfigureAdmin("new-user", newPassword); err != nil {
		t.Fatal(err)
	}
	cfg, err := InitConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.AdminUser != "new-user" || cfg.ClickHouse != ck || cfg.JWTSecret == before.JWTSecret {
		t.Fatal("reset did not preserve database configuration and rotate session key")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(cfg.AdminPassHash), []byte(newPassword)); err != nil {
		t.Fatal("password was changed by escaping")
	}
	stored, _ := os.ReadFile(configPath)
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(stored, &raw); err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(raw["admin_pass_hash"], []byte(newPassword)) {
		t.Fatal("plaintext admin password stored")
	}
}

func TestReadConfigDoesNotWrite(t *testing.T) {
	t.Chdir(t.TempDir())
	t.Setenv("ADMIN_USER", "")
	t.Setenv("ADMIN_PASSWORD", "")
	t.Setenv("PORT", "9091")
	if err := ConfigureAdmin("fixture-user", rand.Text()); err != nil {
		t.Fatal(err)
	}
	before, _ := os.Stat(configPath)
	cfg, err := LoadConfig(false)
	if err != nil {
		t.Fatal(err)
	}
	after, _ := os.Stat(configPath)
	if cfg.Port != 9091 || !before.ModTime().Equal(after.ModTime()) {
		t.Fatal("reading settings changed file or used wrong port")
	}
}
