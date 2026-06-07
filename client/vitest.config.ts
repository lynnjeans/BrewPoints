import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Pure-logic tests (HMAC signing). Web Crypto is available as a global in Node 20.
    environment: 'node',
  },
})
