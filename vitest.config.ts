import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['source/**/*.ts'],
      exclude: ['source/**/*.d.ts', 'source/**/*.test.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage'
    },
    env: {
      NODE_ENV: 'test',
      HAIKU_MODEL_NAME: 'gpt-4o-mini',
      HAIKU_BASE_URL: 'https://api.openai.com/v1',
      HAIKU_API_KEY: 'test-api-key-haiku'
    }
  }
})
