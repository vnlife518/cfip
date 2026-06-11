#!/bin/bash
# install-web-builder.sh - 一键在 VPS 上部署 CFIP Web 配置器网页版

# 颜色控制台输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
CLEAR='\033[0m'

echo -e "${CYAN}==================================================${CLEAR}"
echo -e "${GREEN}    CFIP 多落地 IP 配置器 Web 网页端一键安装脚本  ${CLEAR}"
echo -e "${CYAN}==================================================${CLEAR}"

# 1. 检查根用户权限
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}错误：请使用 root 权限运行此脚本 (例如：sudo ./install-web.sh)${CLEAR}"
  exit 1
fi

# 2. 自动安装 Docker 与必要依赖
echo -e "${YELLOW}[1/4] 正在检测并安装系统依赖 (Docker/Git)...${CLEAR}"

if ! command -v git &> /dev/null; then
  echo -e "正在安装 Git..."
  if command -v apt-get &> /dev/null; then
    apt-get update && apt-get install -y git
  elif command -v yum &> /dev/null; then
    yum install -y git
  else
    echo -e "${RED}不支持的包管理器，请手动安装 git 后重试${CLEAR}"
    exit 1
  fi
fi

if ! command -v docker &> /dev/null; then
  echo -e "系统未检测到 Docker，开始自动安装官方 Docker 引擎..."
  curl -fsSL https://get.docker.com | bash
  systemctl start docker
  systemctl enable docker
fi

echo -e "${GREEN}✔ 依赖基础环境检测成功！${CLEAR}"

# 3. 部署代码并构建容器
echo -e "${YELLOW}[2/4] 正在克隆或更新项目代码...${CLEAR}"
DEPLOY_DIR="/opt/cfip-builder"

if [ -d "$DEPLOY_DIR" ]; then
  echo "发现已有部署目录，执行增量代码拉取..."
  cd "$DEPLOY_DIR" && git fetch --all && git reset --hard origin/main
else
  echo "开始克隆 CFIP 项目代码到 /opt/cfip-builder..."
  git clone https://github.com/vnlife518/cfip.git "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi

echo -e "${YELLOW}[3/4] 正在使用 Docker 本地编译程序并运行容器...${CLEAR}"
# 停止老版本容器（如果存在）
docker stop cfip-builder &> /dev/null || true
docker rm cfip-builder &> /dev/null || true

# 编译并运行
docker build -t cfip-builder .
docker run -d \
  --name cfip-builder \
  --restart always \
  -p 3000:3000 \
  cfip-builder

echo -e "${GREEN}✔ 网页服务器编译打包并在后台启动成功！${CLEAR}"

# 4. 获取公网 IP 地段
echo -e "${YELLOW}[4/4] 正在提取 VPS 外网公网 IP 数据...${CLEAR}"
VPS_IP=$(curl -s --max-time 4 https://ipinfo.io/ip || curl -s --max-time 4 https://api.ipify.org || curl -s --max-time 4 https://ifconfig.me || echo "127.0.0.1")

echo -e ""
echo -e "${GREEN}==================================================${CLEAR}"
echo -e "${GREEN}🎉 恭喜您！网页配置端已全部部署完毕！${CLEAR}"
echo -e "${GREEN}==================================================${CLEAR}"
echo -e "访问链接: ${CYAN}http://${VPS_IP}:3000${CLEAR}"
echo -e "提示建议: 如果您无法打开网页，请放行您的云服务商安全组 (防火墙) 关闭限制 TCP ${CYAN}3000${CLEAR} 端口号。"
echo -e "--------------------------------------------------"
echo -e "一站式操作：打开此网页可以直接用键盘极简配置数量、代理账号及密码。"
echo -e "配置完毕即可直观地复制出一键导入到 AdsPower、比特、快/紫鸟等指纹浏览器的代理文本！"
echo -e "${GREEN}==================================================${CLEAR}"
