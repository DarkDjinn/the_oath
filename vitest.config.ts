import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      // Runs against the production build: `npm run build && npm run test:e2e`.
      { test: { name: 'e2e', include: ['tests/e2e/**/*.test.ts'], environment: 'node', testTimeout: 20_000, hookTimeout: 40_000 } },
    ],
  },
})
