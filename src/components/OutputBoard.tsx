import React, { useState } from "react";
import { Copy, Check, Download } from "lucide-react";

interface Props {
  dockerCompose: string;
  installerScript: string;
  vpsIp: string;
  startPort: number;
  count: number;
  socksUser: string;
  socksPass: string;
}

export default function OutputBoard({
  dockerCompose,
  vpsIp,
  startPort,
  count,
  socksUser,
  socksPass,
}: Props) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedList, setCopiedList] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);

  const cleanIp = vpsIp.trim() || "YOUR_VPS_IP";

  // Build the copy-paste proxy list formatted for direct fingerprint browser bulk imports
  const proxyListLines = Array.from({ length: count }, (_, i) => {
    const port = startPort + i;
    if (socksUser && socksPass) {
      return `${cleanIp}:${port}:${socksUser}:${socksPass}`;
    } else if (socksUser) {
      return `${cleanIp}:${port}:${socksUser}`;
    }
    return `${cleanIp}:${port}`;
  }).join("\n");

  const curlCommand = `curl -fsSL "${window.location.origin}/api/script?count=${count}&startPort=${startPort}${
    socksUser ? `&socksUser=${socksUser}` : ""
  }${socksPass ? `&socksPass=${socksPass}` : ""}" -o install.sh && chmod +x install.sh && sudo ./install.sh`;

  const copyToClipboard = (text: string, callback: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    callback(true);
    setTimeout(() => callback(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([dockerCompose], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "docker-compose.yml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Command Box */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">2. VPS 终端一键运行命令</h3>
          <button
            onClick={() => copyToClipboard(curlCommand, setCopiedCmd)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCmd ? "已复制" : "复制命令"}</span>
          </button>
        </div>
        <div className="bg-[#0b0f19] p-3 rounded font-mono text-xs text-slate-300 break-all border border-slate-900 select-all">
          {curlCommand}
        </div>
        <p className="text-[11px] text-slate-500">
          💡 此脚本会自动在您的 VPS 上安装 Docker 重构环境、拉取最新 Warp 多出口内核并绑定您设定的端口组。
        </p>
      </div>

      {/* 2. Proxy List Grid representing fingerprint browser list */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">3. 浏览器直接导入列表</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">支持批量复制，直接粘贴到独立指纹浏览器后台 import</p>
          </div>
          <button
            onClick={() => copyToClipboard(proxyListLines, setCopiedList)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {copiedList ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedList ? "一键复制全部" : "复制列表"}</span>
          </button>
        </div>
        <textarea
          readOnly
          value={proxyListLines}
          className="w-full h-32 bg-[#0b0f19] text-xs font-mono text-cyan-400 rounded p-3/5 border border-slate-900 focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* 3. docker-compose.yml config file */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">生成的文件预览 (docker-compose.yml)</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => copyToClipboard(dockerCompose, setCopiedFile)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile ? "已复制" : "复制"}</span>
            </button>
            <button
              onClick={handleDownload}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载</span>
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value={dockerCompose}
          className="w-full h-48 bg-[#0b0f19] text-xs font-mono text-slate-400 rounded p-3 border border-slate-900 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
