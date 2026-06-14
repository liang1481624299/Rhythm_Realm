#!/bin/bash
# ============================================
#   Sposobin 和声写作台 V1.3 启动脚本
#   适用于 Linux / macOS / Windows WSL
# ============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Sposobin 和声写作台 V1.3 启动脚本${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查 Python3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[错误] 未找到 Python3，请先安装 Python 3.11.9${NC}"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "$SCRIPT_DIR/.venv" ]; then
    echo -e "${YELLOW}[提示] 未找到虚拟环境，正在创建...${NC}"
    python3 -m venv "$SCRIPT_DIR/.venv"
    if [ $? -ne 0 ]; then
        echo -e "${RED}[错误] 虚拟环境创建失败${NC}"
        exit 1
    fi
fi

# 激活虚拟环境
echo -e "${YELLOW}[1/4] 激活虚拟环境...${NC}"
source "$SCRIPT_DIR/.venv/bin/activate"

# 安装后端依赖
echo -e "${YELLOW}[2/4] 安装后端依赖...${NC}"
cd "$SCRIPT_DIR"
pip install -q -r requirements.txt

# 检查前端目录
if [ -d "$SCRIPT_DIR/frontend" ]; then
    echo -e "${YELLOW}[3/4] 检测到前端目录，请手动运行:${NC}"
    echo -e "    cd frontend"
    echo -e "    npm install"
    echo ""
else
    echo -e "${YELLOW}[3/4] 跳过前端依赖安装${NC}"
fi

# 启动后端
echo -e "${YELLOW}[4/4] 启动后端服务...${NC}"
echo ""
cd "$SCRIPT_DIR/apps/sposobin"
echo -e "${GREEN}后端 API: http://localhost:8000${NC}"
echo -e "${GREEN}管理后台: http://localhost:8000/admin${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo ""

# 使用 uvicorn 启动
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
