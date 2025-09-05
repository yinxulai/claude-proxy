import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { beforeAll, afterEach, afterAll } from 'vitest'

// Mock 服务器用于模拟外部 API 响应
export const mockServer = setupServer()

// 在所有测试开始前启动 mock 服务器
beforeAll(() => mockServer.listen())

// 每个测试后重置处理器
afterEach(() => mockServer.resetHandlers())

// 所有测试结束后关闭 mock 服务器
afterAll(() => mockServer.close())

// 设置全局变量以支持 Web API
global.fetch = global.fetch || fetch
global.Request = global.Request || Request
global.Response = global.Response || Response
global.Headers = global.Headers || Headers
global.ReadableStream = global.ReadableStream || ReadableStream
global.TransformStream = global.TransformStream || TransformStream
global.WritableStream = global.WritableStream || WritableStream
global.TextEncoder = global.TextEncoder || TextEncoder
global.TextDecoder = global.TextDecoder || TextDecoder
