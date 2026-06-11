import React, { useState, useEffect } from "react";
import { ProxyConfig, GenerationResponse } from "./types";
import ConfigurationForm from "./components/ConfigurationForm";
import OutputBoard from "./components/OutputBoard";
import { Cloud } from "lucide-react";

export default function App() {
  const [config, setConfig] = useState<ProxyConfig>({
    count: 10,
    startPort: 10001,
    warpKey: "",
    socksUser: "cf_proxy",
    socksPass: "cf_secure_pass_99",
    customEndpoint: "",
  });

  const vpsIp = "YOUR_VPS_IP";
  const [payloads, setPayloads] = useState<GenerationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPayloads = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const data = await response.json();
        setPayloads(data);
      } catch (err) {
        console.error("生成代理清单出错", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayloads();
  }, [config]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header - Simple Logo and title */}
        <div className="flex items-center space-x-3 pb-2 border-b border-slate-900">
          <div className="h-9 w-9 bg-cyan-600 rounded flex items-center justify-center text-white">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">CF 多落地 IP 转 SOCKS5 一键生成器</h1>
            <p className="text-xs text-slate-400">在 VPS 上为每个端口配置独立的 Cloudflare 落地出口 IP</p>
          </div>
        </div>

        {/* Config and Output list */}
        <ConfigurationForm config={config} onChange={setConfig} />

        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <span className="text-xs text-slate-500">正在重构编译中...</span>
          </div>
        ) : (
          payloads && (
            <OutputBoard
              dockerCompose={payloads.dockerCompose}
              installerScript={payloads.installerScript}
              vpsIp={vpsIp}
              startPort={config.startPort}
              count={config.count}
              socksUser={config.socksUser}
              socksPass={config.socksPass}
            />
          )
        )}

      </div>
    </div>
  );
}
