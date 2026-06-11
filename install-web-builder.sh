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

# 等待 APT 锁释放的鲁棒工具函数
wait_for_apt_lock() {
  echo -e "${YELLOW}正在智能排查并等待 APT 进程锁释放 (防锁死)...${CLEAR}"
  local count=0
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1 || pgrep dkg &>/dev/null || pgrep apt-get &>/dev/null; do
    count=$((count+1))
    if [ $count -gt 36 ]; then
      echo -e "${RED}⚠️ APT 锁定已超时 (3分钟)。正在强制断开锁以便继续部署...${CLEAR}"
      rm -f /var/lib/dpkg/lock-frontend
      rm -f /var/lib/apt/lists/lock
      rm -f /var/lib/dpkg/lock
      dpkg --configure -a || true
      break
    fi
    echo -e "${YELLOW}APT 安装锁目前被系统后台占满 (可能是云厂商默认在处理开机自动更新 / apt-get)，已等待 ${count}0 秒，继续监控中...${CLEAR}"
    sleep 10
  done
  echo -e "${GREEN}✔ APT 锁定排查完成，开始进行关键下载部署。${CLEAR}"
}

if ! command -v git &> /dev/null; then
  echo -e "系统未发现 Git，开始部署 Git 安装..."
  if command -v apt-get &> /dev/null; then
    wait_for_apt_lock
    apt-get update && apt-get install -y git
  elif command -v yum &> /dev/null; then
    yum install -y git
  else
    echo -e "${RED}❌ 无法识别的 Linux 平台包管理器，请您手动在 VPS 安装 git 命令后重试此一键脚本。${CLEAR}"
    exit 1
  fi
fi

# 再次验证 git
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git 安装异常失败，请更换源或者重启 VPS 后重试！${CLEAR}"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo -e "系统未检测到 Docker，开始自动安装官方 Docker 引擎..."
  wait_for_apt_lock
  curl -fsSL https://get.docker.com | bash
  
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 官方 Docker 引擎自动下载失败。正在尝试辅助备用源安装...${CLEAR}"
    if command -v apt-get &> /dev/null; then
      apt-get update && apt-get install -y docker.io
    elif command -v yum &> /dev/null; then
      yum install -y docker
    fi
  fi
fi

# 再次检测 Docker 状态
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker 引擎多次尝试自动安装均以失败告终！请先手动安装 Docker (例如: apt install docker.io) 后再试。${CLEAR}"
  exit 1
fi

systemctl start docker || true
systemctl enable docker || true

echo -e "${GREEN}✔ 依赖基础环境检测成功！${CLEAR}"

# 3. 部署代码并构建容器
echo -e "${YELLOW}[2/4] 正在克隆或更新项目代码...${CLEAR}"
DEPLOY_DIR="/opt/cfip-builder"

if [ -d "$DEPLOY_DIR" ]; then
  echo "发现已有部署目录，执行增量代码拉取..."
  cd "$DEPLOY_DIR"
  git fetch --all && git reset --hard origin/main
else
  echo "开始克隆 CFIP 项目代码到 /opt/cfip-builder..."
  git clone https://github.com/vnlife518/cfip.git "$DEPLOY_DIR"
  if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${RED}❌ 克隆 GitHub 代码仓库失败！请检查您的 VPS 的网络是否能够正常访问 github.com。${CLEAR}"
    exit 1
  fi
  cd "$DEPLOY_DIR"
fi

echo -e "${YELLOW}[3/4] 正在使用 Docker 本地编译程序并运行容器...${CLEAR}"
# 停止老版本容器（如果存在）
docker stop cfip-builder &> /dev/null || true
docker rm cfip-builder &> /dev/null || true

# 编译并运行
docker build -t cfip-builder .
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Docker 镜像编译构建失败，请检查 Dockerfile 文件或系统内存剩余。${CLEAR}"
  exit 1
fi

docker run -d \
  --name cfip-builder \
  --restart always \
  -p 3000:3000 \
  cfip-builder

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 网页容器启动异常失败！错误原因一般为 3000 端口已被其他服务占用。${CLEAR}"
  exit 1
fi

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
