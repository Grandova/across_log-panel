# ====================================================================
# Access Log Analytics - Production Multi-Stage Dockerfile
# ====================================================================

# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install --registry=https://registry.npmmirror.com

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend

RUN apk add --no-cache git ca-certificates tzdata

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# Stage 3: Final Minimal Runtime
FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai

COPY --from=backend-builder /app/server /app/server
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

RUN mkdir -p /app/data

EXPOSE 8080

VOLUME ["/app/data"]

ENTRYPOINT ["/app/server"]
