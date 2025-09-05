import { describe, it, expect, beforeEach } from 'vitest'
import proxyModule from '../source/proxy'
import {
  createTestEnv,
  createTestRequest,
  expectClaudeResponseFormat,
  claudeRequestWithTools,
  openAIResponseWithFunctionCall,
  setupMockOpenAIAPI
} from './utils'

describe('Tool Calling Tests', () => {
  let env: any

  beforeEach(() => {
    env = createTestEnv()
  })

  describe('Claude tools to OpenAI function calling transformation', () => {
    it('should transform Claude tools to OpenAI functions correctly', async () => {
      let capturedRequest: any = null
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedRequest = JSON.parse(options.body)
        return new Response(JSON.stringify(openAIResponseWithFunctionCall), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: claudeRequestWithTools
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(200)
        
        // Verify tools transformation
        expect(capturedRequest).toBeTruthy()
        expect(capturedRequest.tools).toHaveLength(1)
        
        const tool = capturedRequest.tools[0]
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBe('get_weather')
        expect(tool.function.description).toBe('Get the current weather for a specific location')
        expect(tool.function.parameters).toHaveProperty('type', 'object')
        expect(tool.function.parameters.properties).toHaveProperty('location')
        expect(tool.function.parameters.properties).toHaveProperty('unit')
        expect(tool.function.parameters.required).toEqual(['location'])
        
        // Verify tool_choice transformation
        expect(capturedRequest.tool_choice).toBe('auto')
        
        const responseData = await response.json()
        expectClaudeResponseFormat(responseData)
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should clean input_schema for compatibility', async () => {
      let capturedRequest: any = null
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedRequest = JSON.parse(options.body)
        return new Response(JSON.stringify(openAIResponseWithFunctionCall), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const requestWithComplexSchema = {
          ...claudeRequestWithTools,
          tools: [
            {
              name: 'complex_function',
              description: 'A function with complex schema',
              input_schema: {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                additionalProperties: false,
                properties: {
                  text: {
                    type: 'string',
                    format: 'custom-format',
                    description: 'Some text'
                  },
                  date: {
                    type: 'string',
                    format: 'date-time',
                    description: 'A datetime'
                  },
                  options: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                      nested: {
                        type: 'string',
                        format: 'uuid'
                      }
                    }
                  }
                },
                required: ['text']
              }
            }
          ]
        }

        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: requestWithComplexSchema
        })

        await proxyModule.fetch(request, env, {})
        
        const tool = capturedRequest.tools[0]
        const params = tool.function.parameters
        
        // Verify schema cleaning
        expect(params).not.toHaveProperty('$schema')
        expect(params).not.toHaveProperty('additionalProperties')
        
        // Verify format cleaning for string fields (except date-time)
        expect(params.properties.text).not.toHaveProperty('format')
        expect(params.properties.date.format).toBe('date-time') // Should preserve date-time
        expect(params.properties.options.properties.nested).not.toHaveProperty('format')
        
        // Verify structure is preserved
        expect(params.properties.text.type).toBe('string')
        expect(params.required).toEqual(['text'])
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should transform OpenAI function call response to Claude tool_use', async () => {
      setupMockOpenAIAPI()
      
      const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
        body: claudeRequestWithTools
      })

      const response = await proxyModule.fetch(request, env, {})
      
      expect(response.status).toBe(200)
      const responseData = await response.json()
      
      expectClaudeResponseFormat(responseData)
      expect(responseData.content).toHaveLength(1)
      
      const toolUse = responseData.content[0]
      expect(toolUse.type).toBe('tool_use')
      expect(toolUse.id).toBe('call_123')
      expect(toolUse.name).toBe('get_weather')
      expect(toolUse.input).toEqual({
        location: 'San Francisco, CA',
        unit: 'celsius'
      })
      
      expect(responseData.stop_reason).toBe('tool_use')
    })

    it('should handle multiple tools correctly', async () => {
      let capturedRequest: any = null
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedRequest = JSON.parse(options.body)
        return new Response(JSON.stringify({
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
                      arguments: JSON.stringify({ location: 'San Francisco, CA' })
                    }
                  },
                  {
                    id: 'call_456',
                    type: 'function',
                    function: {
                      name: 'get_time',
                      arguments: JSON.stringify({ timezone: 'PST' })
                    }
                  }
                ]
              },
              finish_reason: 'tool_calls'
            }
          ],
          usage: { prompt_tokens: 50, completion_tokens: 15, total_tokens: 65 }
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const multiToolRequest = {
          ...claudeRequestWithTools,
          tools: [
            ...claudeRequestWithTools.tools,
            {
              name: 'get_time',
              description: 'Get the current time',
              input_schema: {
                type: 'object',
                properties: {
                  timezone: {
                    type: 'string',
                    description: 'The timezone'
                  }
                }
              }
            }
          ]
        }

        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: multiToolRequest
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(200)
        
        // Verify multiple tools were sent
        expect(capturedRequest.tools).toHaveLength(2)
        
        const responseData = await response.json()
        expect(responseData.content).toHaveLength(2)
        
        expect(responseData.content[0].type).toBe('tool_use')
        expect(responseData.content[0].name).toBe('get_weather')
        expect(responseData.content[1].type).toBe('tool_use')
        expect(responseData.content[1].name).toBe('get_time')
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should handle different tool_choice options', async () => {
      let capturedRequest: any = null
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedRequest = JSON.parse(options.body)
        return new Response(JSON.stringify(openAIResponseWithFunctionCall), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const testCases = [
          {
            claude: { type: 'auto' as const },
            openai: 'auto'
          },
          {
            claude: { type: 'any' as const },
            openai: 'auto'
          },
          {
            claude: { type: 'tool' as const, name: 'get_weather' },
            openai: { type: 'function', function: { name: 'get_weather' } }
          }
        ]

        for (const testCase of testCases) {
          const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
            body: {
              ...claudeRequestWithTools,
              tool_choice: testCase.claude
            }
          })

          await proxyModule.fetch(request, env, {})
          
          expect(capturedRequest.tool_choice).toEqual(testCase.openai)
        }
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should handle tool result messages correctly', async () => {
      let capturedRequest: any = null
      
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        capturedRequest = JSON.parse(options.body)
        return new Response(JSON.stringify({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Based on the weather data, it\'s sunny in San Francisco!' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 70, completion_tokens: 15, total_tokens: 85 }
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const requestWithToolResult = {
          model: 'claude-3-sonnet-20240229',
          messages: [
            {
              role: 'user' as const,
              content: 'What is the weather like in San Francisco?'
            },
            {
              role: 'assistant' as const,
              content: [
                {
                  type: 'tool_use' as const,
                  id: 'call_123',
                  name: 'get_weather',
                  input: { location: 'San Francisco, CA' }
                }
              ]
            },
            {
              role: 'user' as const,
              content: [
                {
                  type: 'tool_result' as const,
                  tool_use_id: 'call_123',
                  content: 'The weather in San Francisco is 72°F and sunny.'
                }
              ]
            }
          ],
          max_tokens: 100
        }

        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: requestWithToolResult
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(200)
        
        // Verify tool result was transformed to tool message
        const toolMessage = capturedRequest.messages.find((m: any) => m.role === 'tool')
        expect(toolMessage).toBeTruthy()
        expect(toolMessage.tool_call_id).toBe('call_123')
        expect(toolMessage.content).toBe('The weather in San Francisco is 72°F and sunny.')
        
        // Verify assistant message with tool_calls
        const assistantMessage = capturedRequest.messages.find((m: any) => m.role === 'assistant' && m.tool_calls)
        expect(assistantMessage).toBeTruthy()
        expect(assistantMessage.tool_calls).toHaveLength(1)
        expect(assistantMessage.tool_calls[0].id).toBe('call_123')
        expect(assistantMessage.tool_calls[0].function.name).toBe('get_weather')
      } finally {
        global.fetch = mockFetch
      }
    })

    it('should handle mixed content with text and tool_use', async () => {
      const mockFetch = global.fetch
      global.fetch = async (url: any, options: any) => {
        return new Response(JSON.stringify({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Let me check the weather for you.',
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: JSON.stringify({ location: 'San Francisco, CA' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        const request = createTestRequest('/https/api.openai.com/v1/gpt-3.5-turbo/v1/messages', {
          body: claudeRequestWithTools
        })

        const response = await proxyModule.fetch(request, env, {})
        
        expect(response.status).toBe(200)
        const responseData = await response.json()
        
        expect(responseData.content).toHaveLength(2)
        
        // First block should be text
        expect(responseData.content[0].type).toBe('text')
        expect(responseData.content[0].text).toBe('Let me check the weather for you.')
        
        // Second block should be tool_use
        expect(responseData.content[1].type).toBe('tool_use')
        expect(responseData.content[1].name).toBe('get_weather')
      } finally {
        global.fetch = mockFetch
      }
    })
  })
})
