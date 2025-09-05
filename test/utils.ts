import { http, HttpResponse } from 'msw'
import { expect } from 'vitest'
import { mockServer } from './setup'

// 测试数据
export const testApiKey = 'test-api-key-123'
export const mockOpenAIApiKey = 'sk-test-openai-key'

// 标准的 Claude 请求数据
export const claudeRequestData = {
  model: 'claude-3-sonnet-20240229',
  messages: [
    {
      role: 'user' as const,
      content: 'Hello, how are you?'
    }
  ],
  max_tokens: 100,
  temperature: 0.7
}

// 带有 tools 的 Claude 请求数据
export const claudeRequestWithTools = {
  model: 'claude-3-sonnet-20240229',
  messages: [
    {
      role: 'user' as const,
      content: 'What is the weather like in San Francisco?'
    }
  ],
  max_tokens: 100,
  tools: [
    {
      name: 'get_weather',
      description: 'Get the current weather for a specific location',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'The unit for temperature'
          }
        },
        required: ['location']
      }
    }
  ],
  tool_choice: { type: 'auto' as const }
}

// 流式 Claude 请求
export const claudeStreamingRequest = {
  ...claudeRequestData,
  stream: true
}

// Haiku 模型请求
export const haikuRequest = {
  model: 'claude-3-haiku-20240307',
  messages: [
    {
      role: 'user' as const,
      content: 'Write a short haiku about code.'
    }
  ],
  max_tokens: 50
}

// 标准的 OpenAI 响应数据
export const openAIResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1677652288,
  model: 'gpt-3.5-turbo',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Hello! I\'m doing well, thank you for asking. How can I help you today?'
      },
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 12,
    completion_tokens: 18,
    total_tokens: 30
  }
}

// 带有 function call 的 OpenAI 响应
export const openAIResponseWithFunctionCall = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1677652288,
  model: 'gpt-3.5-turbo',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
            }
          }
        ]
      },
      finish_reason: 'tool_calls'
    }
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 15,
    total_tokens: 65
  }
}

// 流式 OpenAI 响应数据片段
export const openAIStreamChunks = [
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
  'data: [DONE]\n\n'
]

// 设置 mock OpenAI API 响应
export function setupMockOpenAIAPI(baseUrl: string = 'https://api.openai.com/v1') {
  // 普通聊天完成响应
  mockServer.use(
    http.post(`${baseUrl}/chat/completions`, async ({ request }) => {
      const requestBody = await request.json() as any
      
      if (requestBody.stream) {
        // 返回流式响应
        const stream = new ReadableStream({
          start(controller) {
            openAIStreamChunks.forEach(chunk => {
              controller.enqueue(new TextEncoder().encode(chunk))
            })
            controller.close()
          }
        })
        
        return new HttpResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        })
      }
      
      // 检查是否有工具调用
      if (requestBody.tools && requestBody.tools.length > 0) {
        return HttpResponse.json(openAIResponseWithFunctionCall)
      }
      
      return HttpResponse.json(openAIResponse)
    })
  )
}

// 设置 mock Groq API 响应
export function setupMockGroqAPI() {
  setupMockOpenAIAPI('https://api.groq.com/openai/v1')
}

// 创建测试用的 Env 对象
export function createTestEnv(overrides = {}) {
  return {
    HAIKU_MODEL_NAME: 'gpt-4o-mini',
    HAIKU_BASE_URL: 'https://api.openai.com/v1',
    HAIKU_API_KEY: 'test-haiku-api-key',
    ...overrides
  }
}

// 创建测试用的 Request 对象
export function createTestRequest(
  path: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
  } = {}
) {
  const url = `https://test-proxy.example.com${path}`
  const headers = new Headers({
    'Content-Type': 'application/json',
    'x-api-key': testApiKey,
    ...options.headers
  })
  
  return new Request(url, {
    method: options.method || 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
}

// 验证 Claude 响应格式
export function expectClaudeResponseFormat(responseData: any) {
  expect(responseData).toHaveProperty('id')
  expect(responseData).toHaveProperty('type', 'message')
  expect(responseData).toHaveProperty('role', 'assistant')
  expect(responseData).toHaveProperty('model')
  expect(responseData).toHaveProperty('content')
  expect(responseData).toHaveProperty('stop_reason')
  expect(responseData).toHaveProperty('usage')
  expect(responseData.usage).toHaveProperty('input_tokens')
  expect(responseData.usage).toHaveProperty('output_tokens')
}
