import { describe, it, expect, beforeEach } from 'vitest'
import proxyModule from '../source/proxy'
import {
  createTestEnv,
  createTestRequest,
  claudeStreamingRequest,
  openAIStreamChunks,
  setupMockOpenAIAPI
} from './utils'

describe('Streaming Response Tests', () => {
  let env: any

  beforeEach(() => {
    env = createTestEnv()
  })

  describe('Streaming response transformation', () => {
    it('should handle streaming response correctly', async () => {
      // Mock streaming response
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        const requestBody = JSON.parse(options.body)
        
        if (requestBody.stream) {
          const stream = new ReadableStream({
            start(controller) {
              openAIStreamChunks.forEach(chunk => {
                controller.enqueue(new TextEncoder().encode(chunk))
              })
              controller.close()
            }
          })
          
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          })
        }
        
        return new Response('{}')
      }

      try {
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: claudeStreamingRequest
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('text/event-stream')
        
        // Read the streaming response
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        const chunks: string[] = []
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(decoder.decode(value, { stream: true }))
          }
        } finally {
          reader.releaseLock()
        }
        
        const fullResponse = chunks.join('')
        
        // Verify Claude SSE format
        expect(fullResponse).toContain('event: message_start')
        expect(fullResponse).toContain('event: content_block_start')
        expect(fullResponse).toContain('event: content_block_delta')
        expect(fullResponse).toContain('event: content_block_stop')
        expect(fullResponse).toContain('event: message_delta')
        expect(fullResponse).toContain('event: message_stop')
        
        // Parse the events to verify structure
        const events = fullResponse.split('\n\n').filter(chunk => chunk.trim())
        
        const messageStartEvent = events.find(e => e.includes('event: message_start'))
        expect(messageStartEvent).toBeTruthy()
        
        const dataLine = messageStartEvent!.split('\n').find(line => line.startsWith('data: '))
        expect(dataLine).toBeTruthy()
        
        const messageStartData = JSON.parse(dataLine!.substring(6))
        expect(messageStartData.type).toBe('message_start')
        expect(messageStartData.message).toHaveProperty('id')
        expect(messageStartData.message).toHaveProperty('role', 'assistant')
        expect(messageStartData.message).toHaveProperty('model')
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should transform content delta events correctly', async () => {
      const customStreamChunks = [
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n'
      ]

      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        const stream = new ReadableStream({
          start(controller) {
            customStreamChunks.forEach(chunk => {
              controller.enqueue(new TextEncoder().encode(chunk))
            })
            controller.close()
          }
        })
        
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' }
        })
      }

      try {
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: claudeStreamingRequest
        })

        const response = await proxyModule.fetch(request, env, {})
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        const chunks: string[] = []
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(decoder.decode(value, { stream: true }))
          }
        } finally {
          reader.releaseLock()
        }
        
        const fullResponse = chunks.join('')
        
        // 验证事件流格式和内容块事件
        expect(fullResponse).toContain('event: message_start')
        expect(fullResponse).toContain('event: content_block_start')
        // 验证 content_block_delta 事件
        expect(fullResponse).toContain('event: content_block_delta')
        // 验证 message_delta 事件和 stop_reason
        expect(fullResponse).toContain('event: message_delta')
        expect(fullResponse).toContain('"stop_reason":"end_turn"')
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should handle tool calls in streaming response', async () => {
      const toolCallStreamChunks = [
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather","arguments":""}}]},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"location\\""}}]},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":": \\"San Francisco\\"}"}}]},"finish_reason":null}]}\n\n',
        'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}\n\n',
        'data: [DONE]\n\n'
      ]

      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        const stream = new ReadableStream({
          start(controller) {
            toolCallStreamChunks.forEach(chunk => {
              controller.enqueue(new TextEncoder().encode(chunk))
            })
            controller.close()
          }
        })
        
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' }
        })
      }

      try {
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: claudeStreamingRequest
        })

        const response = await proxyModule.fetch(request, env, {})
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        const chunks: string[] = []
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(decoder.decode(value, { stream: true }))
          }
        } finally {
          reader.releaseLock()
        }
        
        const fullResponse = chunks.join('')
        
  // 验证 tool_use 相关事件
  expect(fullResponse).toContain('event: content_block_start')
  expect(fullResponse).toContain('call_123')
  expect(fullResponse).toContain('get_weather')
  expect(fullResponse).toContain('event: content_block_delta')
  expect(fullResponse).toContain('partial_json')
  // 验证 message_delta 事件和 stop_reason
  expect(fullResponse).toContain('event: message_delta')
  expect(fullResponse).toContain('"stop_reason":"end_turn"')
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should handle streaming errors gracefully', async () => {
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        return new Response('Internal Server Error', { status: 500 })
      }

      try {
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: claudeStreamingRequest
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(500)
        expect(await response.text()).toBe('Internal Server Error')
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should preserve original model name in streaming response', async () => {
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        const stream = new ReadableStream({
          start(controller) {
            openAIStreamChunks.forEach(chunk => {
              controller.enqueue(new TextEncoder().encode(chunk))
            })
            controller.close()
          }
        })
        
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' }
        })
      }

      try {
        const originalModel = 'claude-3-sonnet-20240229'
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: { ...claudeStreamingRequest, model: originalModel }
        })

        const response = await proxyModule.fetch(request, env, {})
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        const chunks: string[] = []
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(decoder.decode(value, { stream: true }))
          }
        } finally {
          reader.releaseLock()
        }
        
        const fullResponse = chunks.join('')
        
        // Should preserve the original Claude model name in the response
        expect(fullResponse).toContain(`"model":"${originalModel}"`)
      } finally {
        global.fetch = mockFetch
      }
    })
  })
})
