import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest gives tests the same "#imports" and "@/" aliases as the extension,
  // plus an in-memory fake browser API (no real browser needed).
  plugins: [WxtVitest()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
