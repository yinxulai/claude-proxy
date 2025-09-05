import { describe, it, expect, beforeEach } from 'vitest'
import proxyModule from '../source/proxy'
import {
  createTestEnv,
  createTestRequest,
  expectClaudeResponseFormat,
  claudeRequestData,
  setupMockOpenAIAPI
} from './utils'

describe('Basic API Integration Tests', () => {
  let env: any

  beforeEach(() => {
    env = createTestEnv()
    setupMockOpenAIAPI()
  })

  describe('Request validation', () => {
    it('should reject requests not ending with /v1/messages', async () => {
      const request = createTestRequest('/invalid/path')

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(404)
      expect(await response.text()).toContain('Not Found. URL must end with /v1/messages')
    })

    it('should reject non-POST requests to /v1/messages', async () => {
      const request = createTestRequest('/v1/messages', {
        method: 'GET'
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(405)
      expect(await response.text()).toBe('Method Not Allowed')
    })

    it('should reject requests without x-api-key header', async () => {
      const request = new Request('https://test-proxy.example.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No x-api-key header
        },
        body: JSON.stringify({ ...claudeRequestData, model: 'claude-3-haiku-20240307' })
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(401)
      const responseData = await response.json()
      expect(responseData.error).toContain('x-api-key')
    })

    it('should reject requests with invalid JSON body', async () => {
      const request = new Request('https://test-proxy.example.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key'
        },
        body: 'invalid json'
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(500)
    })
  })

  describe('Request routing', () => {
    it('should fail when URL format is invalid for dynamic routing', async () => {
      const request = createTestRequest('/v1/messages', {
        body: { ...claudeRequestData, model: 'some-model' }
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(401)
      const responseData = await response.json()
      expect(responseData.error).toContain('url')
    })
  })

  describe('Error handling', () => {
    it('should handle missing required fields gracefully', async () => {
      const invalidRequest = {
        // missing model field
        messages: [],
        max_tokens: 100
      }

      const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
        body: invalidRequest
      })

      const response = await proxyModule.fetch(request, env, {})
      
      // Should handle the error gracefully
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle network errors to target API', async () => {
      // Mock a network error
      setupMockOpenAIAPI()
      
      const request = createTestRequest('/https/api.unavailable.com/v1/gpt-3.5-turbo/v1/messages', {
        body: claudeRequestData
      })

      const response = await proxyModule.fetch(request, env, {})
      
      // Should fail to connect to unavailable API
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})
