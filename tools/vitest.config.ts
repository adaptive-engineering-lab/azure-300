import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['../tests/**/*.test.ts'],
    globalSetup: ['./test-helpers/global-setup.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
