import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client to prevent crash if key is missing on start
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// Service 1: Generate Raw Docker Compose File
function buildDockerCompose(params: {
  count: number;
  startPort: number;
  warpKey?: string;
  socksUser?: string;
  socksPass?: string;
  customEndpoint?: string;
}) {
  const { count, startPort, warpKey = "", socksUser = "", socksPass = "", customEndpoint = "" } = params;

  let services = "";
  for (let i = 1; i <= count; i++) {
    const port = startPort + i - 1;
    let envVars = "";

    if (warpKey) {
      envVars += `      - WARP_LICENSE_KEY=${warpKey}\n`;
    }
    if (socksUser && socksPass) {
      envVars += `      - SOCKS5_USER=${socksUser}\n`;
      envVars += `      - SOCKS5_PASS=${socksPass}\n`;
    }
    if (customEndpoint) {
      envVars += `      - WARP_ENDPOINT=${customEndpoint}\n`;
    }

    services += `  warp-socks-${i}:
    image: caomingjun/warp-socks:latest
    container_name: cf-warp-socks-${i}
    restart: always
    ports:
      - "${port}:1080"
    volumes:
      - cf-warp-vol-${i}:/var/lib/cloudflare-warp
`;

    if (envVars) {
      services += `    environment:\n${envVars}`;
    }
  }

  let volumes = "\nvolumes:\n";
  for (let i = 1; i <= count; i++) {
    volumes += `  cf-warp-vol-${i}:\n`;
  }

  return `version: '3.8'

services:
${services}${volumes}`;
}

// Service 2: Generate Bash Installation Script
function buildBashInstaller(params: {
  count: number;
  startPort: number;
  warpKey?: string;
  socksUser?: string;
  socksPass?: string;
  customEndpoint?: string;
}) {
  const { count, startPort, warpKey = "", socksUser = "", socksPass = "", customEndpoint = "" } = params;
  const composeContent = buildDockerCompose(params);
  
  // Format details for displaying in the terminal
  const portList = Array.from({ length: count }, (_, i) => startPort + i);

  return `#!/bin/bash

# --- Cloudflare Multi-Proxy VPS Installer ---
# Project: CFIP Standalone Container Deployer
# Created dynamically via Cloudflare Multi-Proxy VPS Builder

set -e

# Visual formatting
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0;31m' # No Color
CLEAR='\\033[0m'

echo -e "\${CYAN}==================================================\${CLEAR}"
echo -e "\${CYAN}     Cloudflare Multi-Proxy VPS Installer         \${CLEAR}"
echo -e "\${CYAN}==================================================\${CLEAR}"

# 1. Root permission check
if [ "$EUID" -ne 0 ]; then
  echo -e "\${RED}错误: 请以 root 用户运行此脚本！\${CLEAR}"
  exit 1
fi

# 2. Check and Install Docker & Docker Compose
echo -e "\${YELLOW}[1/4] 检查系统 Docker 依赖环境...\${CLEAR}"
if ! command -v docker &> /dev/null; then
  echo -e "未检测到 Docker，正在自动安装..."
  apt-get update -y
  apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io
fi

if ! docker compose version &> /dev/null; then
  echo -e "未检测到 Docker Compose v2, 正在自动安装 Docker Compose 插件..."
  apt-get update -y
  apt-get install -y docker-compose-plugin
fi

echo -e "\${GREEN}Docker 及 Docker Compose 环境已准备就绪！\${CLEAR}"

# 3. Create CFIP Deployment Directory
echo -e "\${YELLOW}[2/4] 创建并配置 CFIP 项目根目录 [/root/CFIP]...\${CLEAR}"
mkdir -p /root/CFIP
cd /root/CFIP

# Write docker-compose.yml
cat << 'EOF' > /root/CFIP/docker-compose.yml
${composeContent}
EOF

echo -e "\${GREEN}配置文件 docker-compose.yml 成功写入 /root/CFIP/\${CLEAR}"

# 4. Deploying Containers
echo -e "\${YELLOW}[3/4] 启动 SOCKS5 代理容器集群 (N=${count})...\${CLEAR}"
docker compose down || true
docker compose pull
docker compose up -d

echo -e "\${GREEN}代理容器集群已全部在后台启动！\${CLEAR}"

# 5. Network connectivity & output results
echo -e "\${YELLOW}[4/4] 正在智能检测 VPS 系统网卡与公网 IP 地段...\${CLEAR}"

# Auto-detect public IP
VPS_IP=\$(curl -s --max-time 4 https://ipinfo.io/ip || curl -s --max-time 4 https://api.ipify.org || curl -s --max-time 4 https://ifconfig.me || echo "")

if [ -z "\$VPS_IP" ]; then
  # Fallback to local network bind address
  VPS_IP=\$(hostname -I | awk '{print \$1}')
  echo -e "\${YELLOW}提示: 无法获取外网 IP，改用本地网络主地址: \$VPS_IP\${CLEAR}"
fi

# Auto-detect primary network interface card
PRIMARY_IFACE=\$(ip route | grep default | awk '{print \$5}' | head -n1)

echo -e "系统检测到主网卡接口: \${CYAN}\${PRIMARY_IFACE:-"未检测到"}\${CLEAR}"
echo -e "系统当前公网落地 IPv4: \${GREEN}\$VPS_IP\${CLEAR}"

# Verify Port Availability
echo -e "正在验证端口可用性..."
OCCUPIED_PORTS=""
for port in ${portList.join(" ")}; do
  if ss -tuln | grep -q ":\${port} " &> /dev/null; then
    OCCUPIED_PORTS="\${OCCUPIED_PORTS} \${port}"
  fi
done

if [ ! -z "\$OCCUPIED_PORTS" ]; then
  echo -e "\${RED}⚠️ 警告: 检测到以下端口在您的 VPS 上已遭占用: \$OCCUPIED_PORTS ！建议分配其他起始端口。\${CLEAR}"
else
  echo -e "\${GREEN}恭喜! 所有待监听端口 (${startPort}-${startPort + count - 1}) 均纯净、空闲可用。\${CLEAR}"
fi

echo -e ""
echo -e "\${GREEN}==================================================\${CLEAR}"
echo -e "\${GREEN}🎉 部署完成! 本地指纹浏览器可以直接配置以下代理: \${CLEAR}"
echo -e "\${GREEN}==================================================\${CLEAR}"
echo -e "代理协议: \${CYAN}SOCKS5\${CLEAR}"
echo -e "服务器IP: \${CYAN}\${VPS_IP}\${CLEAR}"
${socksUser ? `echo -e "代理账号: \\\${CYAN}${socksUser}\\\${CLEAR}"\necho -e "代理密码: \\\${CYAN}${socksPass}\\\${CLEAR}"\n` : `echo -e "验证方式: \\\${CYAN}无需账号密码（无限制公开访问）\\\${CLEAR}"\n`}
echo -e "👇 批量复制下方格式，可直接在 AdsPower / 其它指纹浏览器内一键导入 👇"
echo -e "--------------------------------------------------"
${portList.map(p => {
  if (socksUser && socksPass) {
    return `echo -e "\${VPS_IP}:${p}:${socksUser}:${socksPass}"`;
  } else if (socksUser) {
    return `echo -e "\${VPS_IP}:${p}:${socksUser}"`;
  }
  return `echo -e "\${VPS_IP}:${p}"`;
}).join("\n")}
echo -e "--------------------------------------------------"
echo -e ""
echo -e "\${YELLOW}正在抽样测试随机端口 Egress 落地节点信息 (等待 5 秒握手)...\${CLEAR}"
sleep 5

# Connectivity test
TEST_PORT=${startPort}
if command -v curl &> /dev/null; then
  ${socksUser && socksPass ? 
    `OUT_IP=\$(curl -s --socks5-hostname ${socksUser}:${socksPass}@127.0.0.1:\${TEST_PORT} --max-time 6 https://ipinfo.io/ip || echo "超时")` : 
    `OUT_IP=\$(curl -s --socks5-hostname 127.0.0.1:\${TEST_PORT} --max-time 6 https://ipinfo.io/ip || echo "超时")`
  }
  echo -e "端口 \${TEST_PORT} 出网 IP (Cloudflare 节点): \${GREEN}\${OUT_IP}\${CLEAR}"
else
  echo -e "当前系统未安装 curl, 跳过抽样连通性检测"
fi

echo -e "\${CYAN}--------------------------------------------------\${CLEAR}"
echo -e "管理命令提示:"
echo -e " - 进入目录: \${YELLOW}cd /root/CFIP\${CLEAR}"
echo -e " - 停止并删除代理: \${YELLOW}docker compose down\${CLEAR}"
echo -e " - 查看容器状态: \${YELLOW}docker compose ps\${CLEAR}"
echo -e " - 重启所有代理: \${YELLOW}docker compose restart\${CLEAR}"
echo -e "\${CYAN}==================================================\${CLEAR}"
`;
}

// API endpoint to serve standard/custom script content directly
app.get("/api/script", (req, res) => {
  const count = parseInt(req.query.count as string) || 5;
  const startPort = parseInt(req.query.startPort as string) || 10001;
  const warpKey = (req.query.warpKey as string) || "";
  const socksUser = (req.query.socksUser as string) || "";
  const socksPass = (req.query.socksPass as string) || "";
  const customEndpoint = (req.query.customEndpoint as string) || "";

  const script = buildBashInstaller({
    count,
    startPort,
    warpKey,
    socksUser,
    socksPass,
    customEndpoint,
  });

  res.setHeader("Content-Type", "application/x-sh");
  res.setHeader("Content-Disposition", `attachment; filename="install-cfip-${count}.sh"`);
  res.send(script);
});

// JSON config builder for UI interactions
app.post("/api/generate", (req, res) => {
  const { count, startPort, warpKey, socksUser, socksPass, customEndpoint } = req.body;

  const numericCount = parseInt(count) || 5;
  const numericStartPort = parseInt(startPort) || 10001;

  const compose = buildDockerCompose({
    count: numericCount,
    startPort: numericStartPort,
    warpKey,
    socksUser,
    socksPass,
    customEndpoint,
  });

  const installer = buildBashInstaller({
    count: numericCount,
    startPort: numericStartPort,
    warpKey,
    socksUser,
    socksPass,
    customEndpoint,
  });

  res.json({
    dockerCompose: compose,
    installerScript: installer,
  });
});

// Intelligent Advisor endpoint powered by Gemini API
app.post("/api/advisor", async (req, res) => {
  const { message, configContext } = req.body;

  const client = getGeminiClient();
  if (!client) {
    return res.status(500).json({
      error: "Gemini API Key is not configured in Secrets. Unable to ask advisor.",
    });
  }

  try {
    const prompt = `You are an expert Network Systems DevOps Engineer specializing in proxy architectures (SOCKS5, WireGuard, Cloudflare Warp), fingerprint browser setup (AdsPower, Linken Sphere, Multilogin, Hubstudio), IP masking, and web scraping deployment on Linux.

The user is planning or running a multi-outbound proxy setup using Cloudflare Warp on an Ubuntu VPS.
Current Config context:
- Requested proxies: ${configContext?.count || "N/A"}
- Starting port: ${configContext?.startPort || "N/A"}
- Authenticaton user: ${configContext?.socksUser ? "Active" : "Inactive"}
- Custom Cloudflare clean endpoint IP: ${configContext?.customEndpoint || "Default"}

User's query: "${message}"

Give a highly technical, precise yet humanly helpful advice in Chinese (中文).
Advice guidelines:
- Be encouraging and clear.
- Explain the underlying mechanics if they ask about distinct outbound IPs (Each Cloudflare Warp container starts its own WireGuard instance, connects to different CF target servers, and gets assigned different IPv4/IPv6 egress addresses dynamically).
- Provide performance hints: 
  1. Low-spec VPS tips (each caomingjun/warp-socks takes only ~15-20MB memory; N=10 takes less than 200MB, making it extremely lightweight).
  2. Cloudflare rate limits or browser captcha tips (Cloudflare IPs are shared, some premium services like Google or Cloudflare-protected sites might trigger challenges. Suggest Warp+ keys to improve IP reputation and speed, or using optimized CF endpoint IPs to bypass region local speed blocks).
  3. Security recommendations (Remind them that public open SOCKS5 on VPS will get scanned instantly; using a strong username and password is critical).`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      reply: response.text,
    });
  } catch (error: any) {
    console.error("Gemini Advisor query failed:", error);
    res.status(500).json({ error: error.message || "Advisor error" });
  }
});

// Configure Vite integration for SPA development preview
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production client handling
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CFIP Builder] Fullstack server running at http://localhost:${PORT}`);
  });
}

startServer();
