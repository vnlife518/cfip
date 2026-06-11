# CFIP Cloudflare Multi-Proxy VPS Builder

一个极简、极其轻量的 SOCKS5 多落地 IP 代理一键生成器。帮助您在 Ubuntu/Debian VPS 上，利用 Docker 瞬间将单台 VPS 扩展为拥有 N 个独立出网 IP 的 SOCKS5 代理集群。

---

## 🚀 方式一：在 VPS 上“一键启动”配置网页（推荐）

如果您想在 VPS 里运行这个生成网页，打开浏览器点点鼠标配置数量、密码，并自动生成导出列表，请在 VPS 终端执行以下一键命令：

```bash
# 自动安装 Docker 并在 3000 端口启动本配置生成器
curl -fsSL https://raw.githubusercontent.com/vnlife518/cfip/main/install-web-builder.sh -o install-web.sh && chmod +x install-web.sh && ./install-web.sh
```

**运行完成后：**
直接在浏览器访问 `http://您的VPS_IP:3000` 即可秒开本配置面板：
- 自由拉动滑块设定代理数量（N个）。
- 设定代理账号、密码防扫描防白嫖。
- 一键复制已适配指纹浏览器（AdsPower、比特等）批量导入的多端口代理列表。

---

## ⚡ 方式二：在 VPS 上“一键直接生成代理”（不看网页，直接用）

如果您**不想打开网页**，想在 VPS 终端输入一条命令直接把代理拉起来并打印出指纹浏览器导入列表，可以直接执行以下命令：

```bash
# 【极简极速】一键安装并自动配置：5个代理，起始端口 10001，账号 cf_proxy，密码 cf_secure_pass_99
curl -fsSL "https://cfip-builder-api.example.com/api/script?count=5&startPort=10001&socksUser=cf_proxy&socksPass=cf_secure_pass_99" -o install.sh && chmod +x install.sh && sudo ./install.sh
```

*(温馨提示：您可以将上面的链接参数修改为您需要的值：`count` 数量、`startPort` 起始端口、`socksUser` 代理账号、`socksPass` 代理密码。运行完毕就会把 IP 网卡完美适配，并在屏幕上打印出一键复制的代理清单)*
