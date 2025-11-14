# WebServer-AiLog

一个基于 C++14 的高性能轻量 Web 服务器，集成线程池、连接池（MySQL）、定时器、异步日志，支持静态资源服务及简单登录/注册示例。仓库内同时提供一个可选的 AI 助手模块用于分析运行日志（见 `ai_log_analyzer/` 目录，本文仅简要提及）。

## 功能特性
- Epoll + 非阻塞 IO，支持 ET/LT 触发模式
- 线程池处理读写与业务逻辑
- 小根堆定时器处理连接超时
- 异步日志记录到 `bin/log/`（按天滚动）
- MySQL 连接池（简例：用户表登录/注册）
- 静态资源服务（HTML/CSS/JS）

## 目录结构（核心）
- `code/` 源码
  - `buffer/` 网络缓冲区
  - `http/` HTTP 解析与响应
  - `log/` 日志系统
  - `pool/` 线程池、MySQL 连接池
  - `server/` WebServer 主体、epoller、计时器
  - `main.cpp` 服务入口（含运行参数及 MySQL 配置）
- `build/Makefile` 构建脚本
- `bin/` 可执行文件与日志目录
  - `server` 编译产物
  - `log/` 运行日志（如 `2025_11_14.log`）
- `resources/` 静态资源（HTML/CSS/JS/图片/视频）
- `ai_log_analyzer/` 可选 AI 助手（详见该目录 README）

## 运行环境
- Linux（建议 x86_64）
- g++（支持 C++14）、make
- MySQL 服务端（或 MariaDB）与开发库

Ubuntu/Debian 依赖安装（示例）：
```bash
sudo apt-get update
sudo apt-get install -y build-essential libmysqlclient-dev mysql-server
```

## 构建
使用仓库内的 Makefile：
```bash
cd build
make
```
编译成功后生成 `../bin/server`。

## 启动
推荐从仓库根目录启动（确保静态资源路径正确指向 `resources/`）：
```bash
# 在仓库根目录
./bin/server
```
- 程序会将工作目录 `getcwd()` 作为根路径，并追加 `/resources/`：
  - 若从“仓库根目录”启动：静态资源路径为 `./resources/`（推荐）
  - 若从“bin 目录”启动：静态资源路径为 `./bin/resources/`（需自行确保该路径下存在资源）
- 启动日志可在 `bin/log/` 中查看（例如 `2025_11_14.log`）
- 默认监听端口：`9006`

访问示例：
- 主页：`http://127.0.0.1:9006/`
- 资源文件：例如 `http://127.0.0.1:9006/index.html`

## 数据库（MySQL）配置
默认配置在 `code/main.cpp` 中：
```cpp
WebServer server(
  9006, 3, 60000, false,       // 端口、EPOLL ET 模式、超时、优雅退出
  3306, "root", "123456", "webserver", // MySQL: 端口、用户、密码、数据库名
  12, 6, true, 1, 1024         // 连接池数、线程数、日志开关、日志等级、异步队列
);
```
请根据你的环境修改连接参数并重新编译。

初始化数据库（示例）：
```sql
CREATE DATABASE IF NOT EXISTS webserver DEFAULT CHARSET utf8mb4;
USE webserver;
CREATE TABLE IF NOT EXISTS user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
登录/注册演示依赖该表。默认登录接口在代码中通过 `POST` 的 `application/x-www-form-urlencoded` 进行用户名/密码校验。

## 日志
- 位置：`bin/log/`，按日期生成，例如 `2025_11_14.log`
- 查看启动信息、客户端连接/断开、警告与错误信息
- 示例日志片段：
  - `========== Server init ==========`
  - `srcDir: /path/to/.../resources/`
  - `Client[18](127.0.0.1:57581) in, userCount:1`

## 常见问题
- 访问 404 或资源加载失败：
  - 确认启动时的当前目录；从仓库根目录启动能自动定位到 `./resources/`
  - 若从 `bin/` 启动，请确保存在 `bin/resources/`（可软链到仓库根的 `resources/`）
- 无法连接 MySQL：
  - 检查主机、端口、用户名/密码、数据库是否存在
  - 确认已安装 `libmysqlclient-dev` 并在编译时链接 `-lmysqlclient`
- 端口被占用：修改 `code/main.cpp` 的端口或释放占用
- 编译失败：确保 g++ 支持 C++14，开发库已安装

## 性能与参数
- 线程池大小、连接池大小、日志开关/等级均可在 `main.cpp` 中设置
- 触发模式（ET/LT）在 `WebServer` 构造参数中通过 `trigMode` 控制（3 为监听与连接均 ET）

## AI 模块（简要）
- 可选的日志分析助手位于 `ai_log_analyzer/` 目录
- 使用 Node.js 连接 DeepSeek API，并通过“工具调用”读取本地日志进行统计/汇总
- 详细使用请阅读 `ai_log_analyzer/README.md`