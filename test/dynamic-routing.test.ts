import { describe, it, expect, beforeEach } from 'vitest'
import proxyModule from '../source/proxy'
import {
  createTestEnv,
  createTestRequest,
  expectClaudeResponseFormat,
  claudeRequestData,
  setupMockOpenAIAPI,
  setupMockGroqAPI
} from './utils'

describe('Dynamic Routing Tests', () => {
  let env: any

  beforeEach(() => {
    env = createTestEnv()
  })

  describe('URL parsing and routing', () => {
    it('should route to OpenAI API with https prefix', async () => {
      setupMockOpenAIAPI()
      
      const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
        body: claudeRequestData
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expectClaudeResponseFormat(responseData)
    })

    it('should route to OpenAI API without protocol (defaults to https)', async () => {
      setupMockOpenAIAPI()
      
      const request = createTestRequest('/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
        body: claudeRequestData
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expectClaudeResponseFormat(responseData)
    })

    it('should route to Groq API correctly', async () => {
      setupMockGroqAPI()
      
      const request = createTestRequest('/https/api.groq.com/openai/v1/llama3-70b-8192/v1/messages', {
        body: { ...claudeRequestData, model: 'llama3-70b-8192' }
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expectClaudeResponseFormat(responseData)
      expect(responseData.model).toBe('llama3-70b-8192')
    })

    it('should handle different model names in URL', async () => {
      setupMockOpenAIAPI()
      
      const testCases = [
        {
          path: '/https/api.openai.com/v1/gpt-4/v1/messages',
          model: 'gpt-4'
        },
        {
          path: '/https/api.openai.com/v1/gpt-3.5-turbo-16k/v1/messages',
          model: 'gpt-3.5-turbo-16k'
        },
        {
          path: '/api.openai.com/v1/gpt-4o/v1/messages',
          model: 'gpt-4o'
        }
      ]

      for (const testCase of testCases) {
        const request = createTestRequest(testCase.path, {
          body: { ...claudeRequestData, model: testCase.model }
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expectClaudeResponseFormat(responseData)
        expect(responseData.model).toBe(testCase.model)
      }
    })

    it('should handle complex API paths', async () => {
      setupMockOpenAIAPI('https://api.some-provider.com/api/v2/openai')
      
      const request = createTestRequest('/https/api.some-provider.com/api/v2/openai/custom-model/v1/messages', {
        body: { ...claudeRequestData, model: 'custom-model' }
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expectClaudeResponseFormat(responseData)
    })
  })

  describe('API key handling', () => {
    it('should pass x-api-key as Authorization Bearer token', async () => {
      let capturedHeaders: any = null
      
      // Custom mock to capture headers
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedHeaders = options.headers
        return new Response(JSON.stringify({
          id: 'test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-3.5-turbo',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const customApiKey = 'custom-test-key-123'
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          headers: { 'x-api-key': customApiKey },
          body: claudeRequestData
        })

        await proxyModule.fetch(request, env, {})
        
        expect(capturedHeaders).toBeTruthy()
        expect(capturedHeaders.Authorization).toBe(`Bearer ${customApiKey}`)
      } finally {
        global.fetch = mockFetch
      }
    })
  })

  describe('Request transformation', () => {
    it('should transform Claude request to OpenAI format', async () => {
      let capturedRequest: any = null
      
      // Custom mock to capture the transformed request
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedRequest = JSON.parse(options.body)
        return new Response(JSON.stringify({
          id: 'test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-3.5-turbo',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: {
            ...claudeRequestData,
            system: 'You are a helpful assistant.'
          }
        })

        await proxyModule.fetch(request, env, {})
        
        expect(capturedRequest).toBeTruthy()
        expect(capturedRequest.model).toBe('gpt-3.5-turbo')
        expect(capturedRequest.messages).toHaveLength(2) // system + user message
        expect(capturedRequest.messages[0].role).toBe('system')
        expect(capturedRequest.messages[0].content).toBe('You are a helpful assistant.')
        expect(capturedRequest.messages[1].role).toBe('user')
        expect(capturedRequest.max_tokens).toBe(claudeRequestData.max_tokens)
        expect(capturedRequest.temperature).toBe(claudeRequestData.temperature)
      } finally {
        global.fetch = mockFetch
      }
    })
  })

  describe('Error scenarios', () => {
    it('should handle invalid URL patterns gracefully', async () => {
      const invalidPaths = [
        '/invalid/v1/messages',
        '/https/v1/messages',
        '//v1/messages'
      ]

      for (const path of invalidPaths) {
        const request = createTestRequest(path, {
          body: claudeRequestData
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(401)
        const responseData = await response.json()
        expect(responseData.error).toContain('url')
      }
    })

    it('should handle malformed URLs', async () => {
      const request = createTestRequest('/https///invalid//url/model/v1/messages', {
        body: claudeRequestData
      })

      const response = await proxyModule.fetch(request, env, {})
      
      // Should fail gracefully
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})
