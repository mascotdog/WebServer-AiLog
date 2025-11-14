import 'dotenv/config';
import http from 'node:http';
import fetch from 'node-fetch';

const PORT = Number(process.env.FETCH_PORT || 8000);

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function handleFetch(args) {
  // 兼容旧版 Node: 去掉数值下划线写法
  const { url, max_length = 100000, start_index = 0, raw = true } = args || {};
  if (!url) throw new Error('url is required');
  if (!/^https?:\/\//i.test(url)) throw new Error('only http(s) is allowed');
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`fetch error ${r.status}`);
  const text = await r.text();
  const start = Math.max(0, Number(start_index));
  const end = Math.min(text.length, start + Number(max_length));
  const sliced = text.slice(start, end);
  if (raw) return sliced;
  return {
    url,
    status: r.status,
    length: text.length,
    start,
    end,
    snippet: sliced
  };
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
      if (tool !== 'fetch') return sendJson(res, 400, { error: `Unknown tool: ${tool}` });
      const result = await handleFetch(args);
      return sendJson(res, 200, { result });
    }
    res.writeHead(404);
    res.end('not found');
  } catch (e) {
    sendJson(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`[fetch-server] listening on http://localhost:${PORT}`);
});
