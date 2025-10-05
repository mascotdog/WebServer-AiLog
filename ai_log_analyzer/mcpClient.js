import 'dotenv/config';
import fetch from 'node-fetch';


const FILESYSTEM_MCP_URL = process.env.FILESYSTEM_MCP_URL || 'http://localhost:9000';
const FETCH_MCP_URL = process.env.FETCH_MCP_URL || 'http://localhost:8000';


// Generic MCP caller - 注意：不同 MCP server 可能使用不同的 HTTP 路径和格式，
// 如果你使用的 mcp-server-* 实现需要不同的 endpoint，请修改这里的 endpoint 路径。
async function callMCPServer(serverUrl, tool, args) {
    // 默认我们跟 server 约定的 API 是 POST { tool, args } -> { result }
    // 若实际 server 使用其他路径或协议，请调整。
    const url = `${serverUrl}/call`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, args })
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`MCP server error ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    // 期望服务器返回 { result: ... }
    return data.result ?? data;
}


export async function readTextFile(path, options = {}) {
    // options: { head, tail }
    const args = { path };
    if (options.head) args.head = options.head;
    if (options.tail) args.tail = options.tail;
    return await callMCPServer(FILESYSTEM_MCP_URL, 'read_text_file', args);
}


export async function writeFile(path, content) {
    return await callMCPServer(FILESYSTEM_MCP_URL, 'write_file', { path, content });
}


export async function listDirectory(path) {
    return await callMCPServer(FILESYSTEM_MCP_URL, 'list_directory', { path });
}


export async function fetchUrl(urlToFetch, options = {}) {
    const args = { url: urlToFetch };
    if (options.max_length) args.max_length = options.max_length;
    if (options.start_index) args.start_index = options.start_index;
    if (options.raw) args.raw = !!options.raw;
    return await callMCPServer(FETCH_MCP_URL, 'fetch', args);
}


export async function listAllowedDirectories() {
    return await callMCPServer(FILESYSTEM_MCP_URL, 'list_allowed_directories', {});
}


// Helper: resolve server health (optional)
export async function health(serverUrl) {
    try {
        const r = await fetch(`${serverUrl}/health`);
        return r.ok;
    } catch (e) {
        return false;
    }
}