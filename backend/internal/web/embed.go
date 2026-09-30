package web

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed dist/*
var distEmbedFS embed.FS

// GetFS returns the http.FileSystem rooted at dist/
func GetFS() (http.FileSystem, error) {
	sub, err := fs.Sub(distEmbedFS, "dist")
	if err != nil {
		return nil, err
	}
	return http.FS(sub), nil
}

// ReadFile reads a file from embedded dist
func ReadFile(name string) ([]byte, error) {
	return distEmbedFS.ReadFile("dist/" + name)
}
