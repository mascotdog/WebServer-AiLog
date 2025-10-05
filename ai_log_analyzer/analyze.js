import 'dotenv/config';
const conversation = [system];
conversation.push(user);


while (true) {
  const resp = await callModel(conversation, functions);
  const msg = extractMessageChoice(resp);
  if (!msg) {
    throw new Error('模型未返回有效消息');
  }


  if (msg.function_call) {
    // 模型想调用某个工具
    const fname = msg.function_call.name;
    let fargs = {};
    try {
      fargs = JSON.parse(msg.function_call.arguments || '{}');
    } catch (e) {
      // arguments 可能不是严格 JSON
      console.warn('解析 function_call.arguments 失败，尝试容错处理');
    }


    console.log(`模型请求调用工具: ${fname}，参数:`, fargs);


    let toolResult = null;
    try {
      if (fname === 'read_text_file') {
        toolResult = await readTextFile(fargs.path, { head: fargs.head, tail: fargs.tail });
      } else if (fname === 'fetch') {
        toolResult = await (await import('./mcpClient.js')).fetchUrl(fargs.url, { max_length: fargs.max_length, start_index: fargs.start_index, raw: fargs.raw });
      } else {
        toolResult = `Unknown tool: ${fname}`;
      }
    } catch (e) {
      toolResult = `工具调用失败: ${e.message}`;
    }


    // 将工具结果作为 function response 送回模型
    conversation.push({ role: 'tool', name: fname, content: String(toolResult) });
    continue; // 让模型继续生成最终分析
  }


  // 正常文本回复
  const finalText = msg.content || resp.choices?.[0]?.text || JSON.stringify(resp);


  const reportPath = logPath.replace('.log', '_report.txt');
  await writeFile(reportPath, finalText);


  console.log('✅ 分析完成，报告已写入：', reportPath);
  console.log('\n--- 模型输出开始 ---\n');
  console.log(finalText);
  console.log('\n--- 模型输出结束 ---\n');
  break;
}



const arg = process.argv[2];
run(arg).catch(e => { console.error(e); process.exit(1); });