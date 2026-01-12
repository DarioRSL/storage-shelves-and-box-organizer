import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load test environment variables
config({ path: resolve(__dirname, '.env.test') });

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Global test setup
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/**/*.{ts,tsx}',
        'src/lib/services/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/db/database.types.ts', // Auto-generated types
        'src/env.d.ts',
        'node_modules/**',
        'dist/**',
        '.astro/**',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      all: true,
    },

    // Test globals
    globals: true,

    // Test file patterns
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
    ],

    // Exclude E2E tests (run separately with Playwright)
    exclude: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      'tests/e2e/**',
    ],

    // Test timeout
    testTimeout: 10000,

    // Watch mode
    watch: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/components': resolve(__dirname, './src/components'),
      '@/db': resolve(__dirname, './src/db'),
    },
  },
});