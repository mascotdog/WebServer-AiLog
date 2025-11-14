# AI Log Analyzer 与对话助手使用说明（完整流程）

本工具提供：
- 交互式对话助手（带工具调用）：`npm run chat`


为保证工具调用可用（读取本地文件、抓取 URL），本项目内置了两个最小可用的 MCP 风格 HTTP 服务：
- 文件系统工具服务（端口 `9000`）
- HTTP 抓取工具服务（端口 `8000`）

二者实现了简单的 `/call` 接口，满足 `mcpClient.js` 的调用约定。若你已有外部 MCP/工具服务，可直接在 `.env` 中指向已有服务，无需启动内置服务。

(目前还在测试阶段，可能存在一些问题)

---

## 一、环境与准备
- Node.js 18+（推荐 20 LTS）
- npm（随 Node 提供）
- 可用的 DeepSeek API Key

安装 Node：
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v && npm -v
```

## 二、配置环境变量
1) 复制示例环境文件并填写你的 Key：
```bash
cp .env.example .env
```
2) 确认 `.env` 至少包含：
```ini
# 必需：DeepSeek API 访问凭证
DEEPSEEK_API_KEY=
DEEPSEEK_API_BASE=https://api.deepseek.com
CHAT_MODEL=deepseek-chat

# 内置工具服务地址（使用内置 servers/* 时保持默认即可）
FILESYSTEM_MCP_URL=http://localhost:9000
FETCH_MCP_URL=http://localhost:8000

# 文件系统服务可访问的根目录白名单（逗号分隔，多目录可配）
# 默认：当前仓库根目录
# FS_ALLOWED_DIRS=/home/mascot/Code/webserver_ailog/WebServer-AiLog


```

---

## 三、验证 DeepSeek API（强烈推荐）
确保网络与凭证正常：
```bash
export DEEPSEEK_API_KEY=$(grep -E '^DEEPSEEK_API_KEY=' .env | cut -d= -f2-)
curl -sS -X POST https://api.deepseek.com/v1/chat/completions \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $DEEPSEEK_API_KEY" \
	-d '{"model":"deepseek-chat","messages":[{"role":"user","content":"ping"}]}' | head -200
```
若能返回 `Pong!` 等文本说明可用。

---

## 四、启动工具服务（可选但推荐）
开两个终端（或后台进程）：
```bash
# 终端1：文件系统服务（默认 9000）
npm run start:fs

# 终端2：抓取服务（默认 8000）
npm run start:fetch
```
健康检查：
```bash
curl -sSf http://localhost:9000/health && echo OK
curl -sSf http://localhost:8000/health && echo OK
```

如果你已有外部服务，只需在 `.env` 修改 `FILESYSTEM_MCP_URL`/`FETCH_MCP_URL` 指向现有服务，无需启动内置服务。

---

## 五、运行对话助手
```bash
npm run chat
```
交互说明：
- 输入自然语言问题，输入 `exit` 退出。
- 模型需要读取本地文件或抓取网页时，会自动通过 function-calling 调用工具服务。

---