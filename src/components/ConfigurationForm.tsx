import React from "react";
import { ProxyConfig } from "../types";

interface Props {
  config: ProxyConfig;
  onChange: (newConfig: ProxyConfig) => void;
}

export default function ConfigurationForm({ config, onChange }: Props) {
  const handleFieldChange = (field: keyof ProxyConfig, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleFieldChange("socksPass", pass);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-200">1. 配置核心参数</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Proxy Count */}
        <div>
          <label className="block text-xs font-medium text-slate-450 mb-1">
            需要生成的 IP 数量 (N)
          </label>
          <input
            type="number"
            min="1"
            max="200"
            value={config.count}
            onChange={(e) => handleFieldChange("count", parseInt(e.target.value) || 10)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
          />
        </div>

        {/* Start Port */}
        <div>
          <label className="block text-xs font-medium text-slate-450 mb-1">
            起始端口号
          </label>
          <input
            type="number"
            min="1024"
            max="65535"
            value={config.startPort}
            onChange={(e) => handleFieldChange("startPort", parseInt(e.target.value) || 10001)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
          />
        </div>

        {/* SOCKS5 Username */}
        <div>
          <label className="block text-xs font-medium text-slate-450 mb-1">
            SOCKS5 代理账号 (留空代表无验证)
          </label>
          <input
            type="text"
            value={config.socksUser}
            onChange={(e) => handleFieldChange("socksUser", e.target.value)}
            placeholder="例如: admin"
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
          />
        </div>

        {/* SOCKS5 Password */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="block text-xs font-medium text-slate-450">
              SOCKS5 代理密码
            </label>
            {config.socksUser && (
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                生成随机密码
              </button>
            )}
          </div>
          <input
            type="text"
            value={config.socksPass}
            onChange={(e) => handleFieldChange("socksPass", e.target.value)}
            disabled={!config.socksUser}
            placeholder={config.socksUser ? "例如: MySecurePass1" : "无需密码"}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none disabled:opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
