import * as http from 'http';
import proxyModule, { Env } from './proxy';

// 从环境变量读取配置
const env: Env = {
  HAIKU_MODEL_NAME: process.env.HAIKU_MODEL_NAME || '',
  HAIKU_BASE_URL: process.env.HAIKU_BASE_URL || '',
  HAIKU_API_KEY: process.env.HAIKU_API_KEY || ''
};

// 模拟 ExecutionContext（Cloudflare Workers 环境）
class MockExecutionContext { }

// 读取请求体
function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Node.js Request 转换为 Web API Request
async function nodeRequestToWebRequest(req: http.IncomingMessage, body: string): Promise<Request> {
  const protocol = 'http';
  const host = req.headers.host || 'localhost';
  const fullUrl = `${protocol}://${host}${req.url}`;
  
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  });

  return new Request(fullUrl, {
    method: req.method,
    headers,
    body: req.method === 'POST' ? body : undefined,
  });
}

// Web API Response 转换为 Node.js Response
async function webResponseToNodeResponse(webResponse: Response, res: http.ServerResponse) {
  // 设置状态码
  res.statusCode = webResponse.status;

  // 设置头部
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // 处理响应体
  if (webResponse.body) {
    const contentType = webResponse.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      // 流式响应
      const reader = webResponse.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        res.end();
      }
    } else {
      // 普通响应
      const text = await webResponse.text();
      res.end(text);
    }
  } else {
    res.end();
  }
}

// 主要的请求处理函数
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    // 读取请求体
    const body = req.method === 'POST' ? await readRequestBody(req) : '';

    // 转换为 Web API Request
    const webRequest = await nodeRequestToWebRequest(req, body);

    // 创建模拟的执行上下文
    const ctx = new MockExecutionContext();

    // 调用原始的 proxy 处理函数
    const webResponse = await proxyModule.fetch(webRequest, env, ctx as any);

    // 转换并发送响应
    await webResponseToNodeResponse(webResponse, res);

  } catch (error) {
    console.error('Request handling error:', error);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// 创建 HTTP 服务器
const server = http.createServer(handleRequest);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Claude Proxy Server is running on port ${PORT}`);
  console.log(`Environment variables configured:`);
  console.log(`- HAIKU_MODEL_NAME: ${env.HAIKU_MODEL_NAME || 'Not set'}`);
  console.log(`- HAIKU_BASE_URL: ${env.HAIKU_BASE_URL || 'Not set'}`);
  console.log(`- HAIKU_API_KEY: ${env.HAIKU_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`\nExample usage:`);
  console.log(`curl -X POST http://localhost:${PORT}/v1/messages \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "x-api-key: YOUR_API_KEY" \\`);
  console.log(`  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 100}'`);
});

export default server;
