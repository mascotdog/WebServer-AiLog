import 'dotenv/config';
import fetch from 'node-fetch';


const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const CHAT_MODEL = process.env.CHAT_MODEL || 'deepseek-chat';


if (!DEEPSEEK_API_KEY) {
console.error('DEEPSEEK_API_KEY 未设置，请在 .env 中配置');
process.exit(1);
}


// 发送消息到 DeepSeek，支持 function-calling 风格。返回完整的 response object。
export async function callModel(messages, functions = undefined) {
const payload = { model: CHAT_MODEL, messages };
if (functions) payload.functions = functions;


const resp = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
},
body: JSON.stringify(payload)
});


if (!resp.ok) {
const txt = await resp.text();
throw new Error(`DeepSeek API error ${resp.status}: ${txt}`);
}
const data = await resp.json();
return data;
}


// 便捷函数：解析 message object
export function extractMessageChoice(data) {
const choice = data.choices?.[0];
return choice?.message ?? null;
}