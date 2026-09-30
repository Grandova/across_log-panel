#!/usr/bin/env bash
# ==============================================================================
# Access Log Analytics - Linux 一键安装与管理脚本
# GitHub: https://github.com/Grandova/across_log-panel
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

INSTALL_DIR="/opt/across_log-panel"
BIN_TARGET="/usr/local/bin/access-log-analytics"
SERVICE_FILE="/etc/systemd/system/access-log-analytics.service"
CLI_TARGET="/usr/local/bin/access-log"
REPO_URL="https://raw.githubusercontent.com/Grandova/across_log-panel/main"

# Check root
if [ "$(id -u)" != "0" ]; then
    echo -e "${RED}[错误] 请使用 root 权限运行此脚本 (例如: sudo bash install.sh)${NC}"
    exit 1
fi

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}         Access Log Analytics - Linux 一键部署安装程序             ${NC}"
echo -e "${CYAN}         GitHub: https://github.com/Grandova/across_log-panel     ${NC}"
echo -e "${CYAN}===================================================================${NC}"

# Detect Architecture
ARCH=$(uname -m)
if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "amd64" ]; then
    echo -e "${RED}[错误] 当前仅支持 x86_64 / amd64 架构 Linux 系统，当前架构: $ARCH${NC}"
    exit 1
fi

# Detect package manager & install curl if missing
if ! command -v curl &> /dev/null; then
    echo -e "${YELLOW}[信息] 正在安装必要依赖 curl...${NC}"
    if command -v apt-get &> /dev/null; then
        apt-get update -y && apt-get install -y curl
    elif command -v yum &> /dev/null; then
        yum install -y curl
    elif command -v dnf &> /dev/null; then
        dnf install -y curl
    elif command -v apk &> /dev/null; then
        apk add --no-cache curl
    fi
fi

# 1. Create directories
echo -e "${BLUE}[1/5] 创建程序安装目录: ${INSTALL_DIR} ...${NC}"
mkdir -p "${INSTALL_DIR}/data"

# Stop running service if active to avoid "Text file busy"
if systemctl is-active --quiet access-log-analytics 2>/dev/null; then
    echo -e "${YELLOW}[提示] 检测到服务正在运行，正在停止旧服务以进行更新...${NC}"
    systemctl stop access-log-analytics 2>/dev/null || true
fi

# 2. Download or copy executable
echo -e "${BLUE}[2/5] 获取 Access Log Analytics 独立运行文件...${NC}"
TMP_BIN="/tmp/access-log-analytics-tmp.$$"

# If installed from cloned repo locally
if [ -f "./bin/access-log-analytics-linux-amd64" ]; then
    echo -e "${GREEN}[提示] 从本地工程目录部署可执行文件...${NC}"
    cp "./bin/access-log-analytics-linux-amd64" "${TMP_BIN}"
elif [ -f "./access-log-analytics-linux-amd64" ]; then
    cp "./access-log-analytics-linux-amd64" "${TMP_BIN}"
else
    echo -e "${YELLOW}[提示] 从 GitHub 下载预编译单二进制程序...${NC}"
    DOWNLOAD_URL="${REPO_URL}/bin/access-log-analytics-linux-amd64"
    if ! curl -fSL --progress-bar "${DOWNLOAD_URL}" -o "${TMP_BIN}"; then
        rm -f "${TMP_BIN}"
        echo -e "${RED}[错误] 下载二进制文件失败，请检查网络连接。${NC}"
        exit 1
    fi
fi

chmod +x "${TMP_BIN}"
mv -f "${TMP_BIN}" "${BIN_TARGET}"

# 3. Create initial .env config if not exists
echo -e "${BLUE}[3/5] 初始化环境配置 .env ...${NC}"
if [ ! -f "${INSTALL_DIR}/.env" ]; then
    umask 077
    cat > "${INSTALL_DIR}/.env" << 'EOF'
# Access Log Analytics 配置
PORT=8080
JWT_SECRET=

# 初始管理员账号密码
ADMIN_USER=
ADMIN_PASSWORD=

# ClickHouse 连接 (可通过 Web 面板「系统设置」随时修改)
CLICKHOUSE_PROTOCOL=http
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=default
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_SECURE=false

# 展示时区
APP_TIMEZONE=Asia/Shanghai
EOF
    chmod 600 "${INSTALL_DIR}/.env"
    echo -e "${GREEN}[成功] 已创建配置文件: ${INSTALL_DIR}/.env${NC}"
    echo -e "请填写 ADMIN_USER 和 ADMIN_PASSWORD 后重新运行安装命令。JWT_SECRET 留空会自动生成。"
    exit 0
else
    echo -e "${YELLOW}[提示] 配置文件已存在，保留现有配置。${NC}"
fi

# 4. Create systemd service
echo -e "${BLUE}[4/5] 配置 systemd 后台常驻服务...${NC}"
cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=Access Log Analytics Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${BIN_TARGET}
Restart=always
RestartSec=5s
EnvironmentFile=-${INSTALL_DIR}/.env
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# Create access-log command helper
cat > "${CLI_TARGET}" << 'EOF'
#!/usr/bin/env bash
SERVICE_NAME="access-log-analytics"
CONFIG_FILE="/opt/across_log-panel/.env"

case "$1" in
    start)
        systemctl start $SERVICE_NAME
        echo "Access Log Analytics 已启动"
        ;;
    stop)
        systemctl stop $SERVICE_NAME
        echo "Access Log Analytics 已停止"
        ;;
    restart)
        systemctl restart $SERVICE_NAME
        echo "Access Log Analytics 已重启"
        ;;
    status)
        systemctl status $SERVICE_NAME
        ;;
    logs)
        journalctl -u $SERVICE_NAME -f -n 50
        ;;
    config)
        ${EDITOR:-nano} $CONFIG_FILE
        ;;
    uninstall)
        read -p "确定要彻底卸载 Access Log Analytics 吗? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            systemctl stop $SERVICE_NAME 2>/dev/null || true
            systemctl disable $SERVICE_NAME 2>/dev/null || true
            rm -f /etc/systemd/system/access-log-analytics.service
            rm -f /usr/local/bin/access-log-analytics
            rm -f /usr/local/bin/access-log
            systemctl daemon-reload
            echo "服务已停止并移除。数据目录 /opt/across_log-panel 已保留。"
        fi
        ;;
    *)
        echo "使用方法: access-log {start|stop|restart|status|logs|config|uninstall}"
        exit 1
        ;;
esac
EOF
chmod +x "${CLI_TARGET}"

# Reload & start systemd
systemctl daemon-reload
systemctl enable access-log-analytics
systemctl restart access-log-analytics

# 5. Verify service running
echo -e "${BLUE}[5/5] 验证服务运行状态...${NC}"
sleep 2

if systemctl is-active --quiet access-log-analytics; then
    # Get server IP
    SERVER_IP=$(curl -s4 --connect-timeout 3 ifconfig.me || curl -s4 --connect-timeout 3 ipinfo.io/ip || hostname -I | awk '{print $1}')
    
    echo -e "\n${GREEN}===================================================================${NC}"
    echo -e "${GREEN}             🎉 Access Log Analytics 安装启动成功！                 ${NC}"
    echo -e "${GREEN}===================================================================${NC}"
    echo -e "访问地址: ${CYAN}http://${SERVER_IP:-localhost}:8080${NC}"
    echo -e "登录账号: 使用您自行配置的管理员账号与密码"
    echo -e "配置文件: ${PURPLE}${INSTALL_DIR}/.env${NC}"
    echo -e "-------------------------------------------------------------------"
    echo -e "快捷管理命令:"
    echo -e "  ${GREEN}access-log status${NC}     - 查看运行状态"
    echo -e "  ${GREEN}access-log restart${NC}    - 重启服务"
    echo -e "  ${GREEN}access-log logs${NC}       - 实时查看日志"
    echo -e "  ${GREEN}access-log stop${NC}       - 停止服务"
    echo -e "  ${GREEN}access-log uninstall${NC}  - 卸载服务"
    echo -e "-------------------------------------------------------------------"
    echo -e "首次使用提醒: 登录后请进入「系统设置」填写 ClickHouse 8123 端口地址！"
    echo -e "${GREEN}===================================================================${NC}\n"
else
    echo -e "${RED}[警告] 服务启动异常，请运行 journalctl -u access-log-analytics -n 50 查看详情${NC}"
fi
