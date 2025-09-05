import { describe, it, expect, beforeEach } from 'vitest'
import proxyModule from '../source/proxy'
import {
  createTestEnv,
  createTestRequest,
  expectClaudeResponseFormat,
  haikuRequest,
  setupMockOpenAIAPI
} from './utils'

describe('Haiku Model Tests', () => {
  let env: any

  beforeEach(() => {
    env = createTestEnv({
      HAIKU_MODEL_NAME: 'gpt-4o-mini',
      HAIKU_BASE_URL: 'https://api.openai.com/v1',
      HAIKU_API_KEY: 'sk-haiku-specific-key'
    })
    setupMockOpenAIAPI()
  })

  describe('Haiku model routing', () => {
    it('should route haiku model to pre-configured endpoint', async () => {
      let capturedRequest: any = null
      let capturedHeaders: any = null
      
      // Custom mock to capture the request
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedRequest = JSON.parse(options.body)
        capturedHeaders = options.headers
        return new Response(JSON.stringify({
          id: 'test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4o-mini',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Code flows like water,\nBugs dance in moonlit silence,\nDebug with patience.' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const request = createTestRequest('/v1/messages', {
          body: haikuRequest
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(200)
        
        // Verify the request was sent to the correct endpoint with correct model
        expect(capturedRequest).toBeTruthy()
        expect(capturedRequest.model).toBe('gpt-4o-mini') // Should use env.HAIKU_MODEL_NAME
        
        // Verify the correct API key was used
        expect(capturedHeaders).toBeTruthy()
        expect(capturedHeaders.Authorization).toBe('Bearer sk-haiku-specific-key')
        
        const responseData = await response.json()
        expectClaudeResponseFormat(responseData)
        expect(responseData.model).toBe('claude-3-haiku-20240307') // Original model name should be preserved in response
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should detect haiku model by model name containing "haiku"', async () => {
      const testCases = [
        'claude-3-haiku-20240307',
        'haiku-v1',
        'some-haiku-model',
        'HAIKU-MODEL',
        'Claude-Haiku-Latest'
      ]

      for (const modelName of testCases) {
        let capturedRequest: any = null
        
        const mockFetch = global.fetch
        global.fetch = async (url: any, options: any) => {
          capturedRequest = JSON.parse(options.body)
          return new Response(JSON.stringify({
            id: 'test',
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-4o-mini',
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
          const request = createTestRequest('/v1/messages', {
            body: { ...haikuRequest, model: modelName }
          })

          const response = await proxyModule.fetch(request, env, {})
          
          expect(response.status).toBe(200)
          expect(capturedRequest.model).toBe('gpt-4o-mini') // Should use configured Haiku model
          
          const responseData = await response.json()
          expect(responseData.model).toBe(modelName) // Original model name preserved
        } finally {
          global.fetch = mockFetch
        }
      }
    })

    it('should not route non-haiku models to haiku endpoint', async () => {
      let capturedUrl: string = ''
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedUrl = url.toString()
        return new Response('{}', { status: 404 })
      }

      try {
        const request = createTestRequest('/v1/messages', {
          body: { ...haikuRequest, model: 'claude-3-sonnet-20240229' }
        })

        const response = await proxyModule.fetch(request, env, {})
        
        // Should fail because it tries to use dynamic routing but there's no URL path
        expect(response.status).toBe(401)
        const responseData = await response.json()
        expect(responseData.error).toContain('url')
      } finally {
        global.fetch = mockFetch
      }
    })
  })

  describe('Haiku model configuration', () => {
    it('should handle missing haiku configuration gracefully', async () => {
      const envWithoutHaiku = createTestEnv({
        HAIKU_MODEL_NAME: '',
        HAIKU_BASE_URL: '',
        HAIKU_API_KEY: ''
      })

      const request = createTestRequest('/v1/messages', {
        body: haikuRequest
      })

      const response = await proxyModule.fetch(request, envWithoutHaiku, {})
      
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Could not determine target base URL or model name')
    })

    it('should use haiku-specific API key when available', async () => {
      let capturedHeaders: any = null
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedHeaders = options.headers
        return new Response(JSON.stringify({
          id: 'test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4o-mini',
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
        const request = createTestRequest('/v1/messages', {
          headers: { 'x-api-key': 'user-provided-key' },
          body: haikuRequest
        })

        await proxyModule.fetch(request, env, {})
        
        // Should use the haiku-specific API key, not the user-provided one
        expect(capturedHeaders.Authorization).toBe('Bearer sk-haiku-specific-key')
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should work with different haiku base URLs', async () => {
      const customEnv = createTestEnv({
        HAIKU_MODEL_NAME: 'custom-haiku-model',
        HAIKU_BASE_URL: 'https://api.custom-provider.com/v1',
        HAIKU_API_KEY: 'custom-haiku-key'
      })

      let capturedUrl: string = ''
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedUrl = url.toString()
        return new Response(JSON.stringify({
          id: 'test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'custom-haiku-model',
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
        const request = createTestRequest('/v1/messages', {
          body: haikuRequest
        })

        const response = await proxyModule.fetch(request, customEnv, {})
        
        expect(response.status).toBe(200)
        expect(capturedUrl).toBe('https://api.custom-provider.com/v1/chat/completions')
      } finally {
        global.fetch = mockFetch
      }
    })
  })
})
