import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      JWT_SECRET: 'test-secret-not-for-production',
      // MONGODB_URI is provided at runtime by global-setup (in-memory replica set) and is also
      // required by config.ts at import time, so we set a placeholder here; tests connect to the
      // real in-memory URI injected via setupFiles.
      MONGODB_URI: 'mongodb://127.0.0.1:27017/placeholder',
    },
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    // DB tests share one in-memory MongoDB instance — run them serially in a single process.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
