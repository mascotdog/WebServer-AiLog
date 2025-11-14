import 'dotenv/config';
import http from 'node:http';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.FILESYSTEM_PORT || 9000);
// 默认允许访问仓库根目录（ai_log_analyzer 的上一级）
const defaultRoot = path.resolve(__dirname, '..', '..');
const FS_ALLOWED_DIRS = (process.env.FS_ALLOWED_DIRS || defaultRoot)
  .split(',')
  .map(p => path.resolve(p.trim()))
  .filter(Boolean);

function isPathAllowed(p) {
  const resolved = path.resolve(p);
  // 必须落在任一白名单目录下
  return FS_ALLOWED_DIRS.some(root => {
    const rootNorm = path.join(root, path.sep);
    const resNorm = path.join(resolved, path.sep);
    return resNorm.startsWith(rootNorm);
  });
}

async function handleReadTextFile(args) {
  const { path: p, head, tail } = args || {};
  if (!p) throw new Error('path is required');
  const abs = path.resolve(p);
  if (!isPathAllowed(abs)) throw new Error('path not allowed');
  const content = await readFile(abs, 'utf8');
  if (!head && !tail) return content;
  const lines = content.split(/\r?\n/);
  if (head) return lines.slice(0, Number(head)).join('\n');
  if (tail) return lines.slice(-Number(tail)).join('\n');
  return content;
}

async function handleWriteFile(args) {
  const { path: p, content } = args || {};
  if (!p) throw new Error('path is required');
  const abs = path.resolve(p);
  if (!isPathAllowed(abs)) throw new Error('path not allowed');
  // 兼容旧版 Node: 避免使用 nullish 合并运算符
  const toWrite = (content !== undefined && content !== null) ? content : '';
  await writeFile(abs, toWrite, 'utf8');
  return 'OK';
}

async function handleListDirectory(args) {
  const { path: p } = args || {};
  const dir = path.resolve(p || defaultRoot);
  if (!isPathAllowed(dir)) throw new Error('path not allowed');
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }));
}

async function handleListAllowedDirs() {
  return FS_ALLOWED_DIRS;
}

async function handleDirectoryTree(args) {
  const { path: p, depth = 2, maxEntries = 200 } = args || {};
  const start = path.resolve(p || defaultRoot);
  if (!isPathAllowed(start)) throw new Error('path not allowed');
  let count = 0;
  async function walk(dir, d) {
    if (d < 0 || count >= maxEntries) return [];
    const items = await readdir(dir, { withFileTypes: true });
    const out = [];
    for (const it of items) {
      if (count >= maxEntries) break;
      const full = path.join(dir, it.name);
      const node = { name: it.name, path: full, type: it.isDirectory() ? 'dir' : 'file' };
      out.push(node);
      count++;
      if (it.isDirectory()) {
        node.children = await walk(full, d - 1);
      }
    }
    return out;
  }
  return await walk(start, Number(depth));
}

async function route(tool, args) {
  switch (tool) {
    case 'read_text_file':
      return await handleReadTextFile(args);
    case 'write_file':
      return await handleWriteFile(args);
    case 'list_directory':
      return await handleListDirectory(args);
    case 'list_allowed_directories':
      return await handleListAllowedDirs();
    case 'directory_tree':
      return await handleDirectoryTree(args);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end('ok');
      return;
    }
    if (req.method === 'POST' && req.url === '/call') {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const raw = Buffer.concat(chunks).toString('utf8');
      let payload = {};
      try { payload = JSON.parse(raw || '{}'); } catch {}
      const { tool, args } = payload;
      if (!tool) return sendJson(res, 400, { error: 'tool is required' });
      const result = await route(tool, args);
      return sendJson(res, 200, { result });
    }
    res.writeHead(404);
    res.end('not found');
  } catch (e) {
    sendJson(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`[filesystem-server] listening on http://localhost:${PORT}`);
  console.log('[filesystem-server] allowed roots:', FS_ALLOWED_DIRS);
});
