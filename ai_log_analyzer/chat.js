import 'dotenv/config';
import readlineSync from 'readline-sync';
import { callModel, extractMessageChoice } from './deepseek.js';
import { readTextFile, fetchUrl } from './mcpClient.js';

const WELCOME = '进入对话，管理员。你可以向 AI 提问，AI 会根据需要调用本地工具（filesystem/fetch）来获取信息。输入 `exit` 退出。';
console.log(WELCOME);

const system = {
  role: 'system',
  content: `你是一名服务器运维专家。可用工具：read_text_file(path), fetch(url)。当你需要外部信息，请通过 function-calling 请求工具。返回时请使用 Markdown 格式。`
};

const functions = [
  {
    name: 'read_text_file',
    description: 'Read text file from server',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        head: { type: 'integer' },
        tail: { type: 'integer' }
      },
      required: ['path']
    }
  },
  {
    name: 'fetch',
    description: 'Fetch URL content',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }
  }
];

const conversation = [system];

while (true) {
  const q = readlineSync.question('管理员> ');
  if (!q || q.toLowerCase() === 'exit') break;

  conversation.push({ role: 'user', content: q });

  const modelResponse = await callModel(conversation, functions);
  const choice = extractMessageChoice(modelResponse);

  if (choice?.message?.function_call) {
    const { name, arguments: args } = choice.message.function_call;
    console.log(`🛠 工具调用请求: ${name}`, args);

    let toolResult = '';

    if (name === 'read_text_file') {
      const parsed = JSON.parse(args || '{}');
      toolResult = await readTextFile(parsed.path, parsed.head, parsed.tail);
    } else if (name === 'fetch') {
      const parsed = JSON.parse(args || '{}');
      toolResult = await fetchUrl(parsed.url);
    }

    conversation.push({
      role: 'tool',
      name,
      content: toolResult || '（工具没有返回内容）'
    });

    const secondResponse = await callModel(conversation);
    const finalMessage = extractMessageChoice(secondResponse);
    console.log(finalMessage?.message?.content || '（无输出）');

  } else {
    console.log(choice?.message?.content || '（无输出）');
  }
}

console.log('👋 对话结束');
