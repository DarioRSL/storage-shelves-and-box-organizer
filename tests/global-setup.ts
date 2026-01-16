/**
 * Vitest Global Setup
 *
 * Starts the Astro dev server before running integration tests
 * and stops it when tests complete.
 */

import { spawn, ChildProcess } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';
// User pool removed - module state doesn't persist across test files
// Each test file creates its own users in beforeAll

let devServer: ChildProcess | null = null;

// Load test environment variables
config({ path: resolve(__dirname, '../.env.test') });

/**
 * Start Astro dev server for integration tests
 */
export async function setup() {
  console.log('[Global Setup] Starting Astro dev server for integration tests...');

  // Start dev server first
  await new Promise<void>((resolve, reject) => {
    // Start dev server with test environment
    devServer = spawn('npm', ['run', 'dev'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';

    // Capture stdout
    devServer.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;

      // Server is ready when we see the "Local:" message (any port)
      if (text.includes('Local:') || text.includes('localhost:')) {
        // Extract port from output (e.g., "http://localhost:3001/")
        const portMatch = text.match(/localhost:(\d+)/);
        if (portMatch) {
          const port = portMatch[1];
          process.env.TEST_API_URL = `http://localhost:${port}`;
          console.log(`[Global Setup] ✓ Astro dev server started on port ${port}`);
        } else {
          console.log('[Global Setup] ✓ Astro dev server started successfully');
        }
        resolve();
      }
    });

    // Capture stderr
    devServer.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;

      // Also check stderr for server ready message (any port)
      if (text.includes('Local:') || text.includes('localhost:')) {
        console.log('[Global Setup] ✓ Astro dev server started successfully');
        resolve();
      }
    });

    // Handle server process errors
    devServer.on('error', (error: Error) => {
      console.error('[Global Setup] Failed to start dev server:', error);
      reject(error);
    });

    // Handle server exit
    devServer.on('exit', (code: number | null) => {
      if (code !== 0 && code !== null) {
        console.error('[Global Setup] Dev server exited with code:', code);
        console.error('[Global Setup] Output:', output);
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (devServer && !devServer.killed) {
        console.error('[Global Setup] Timeout waiting for dev server to start');
        console.error('[Global Setup] Output:', output);
        devServer.kill();
        reject(new Error('Timeout waiting for dev server to start'));
      }
    }, 30000);
  });

  console.log('[Global Setup] ✓ Setup complete');
}

/**
 * Stop Astro dev server after tests complete
 */
export async function teardown() {
  console.log('[Global Teardown] Starting cleanup...');
  console.log('[Global Teardown] Stopping Astro dev server...');

  if (devServer && !devServer.killed) {
    return new Promise<void>((resolve) => {
      devServer!.on('exit', () => {
        console.log('[Global Teardown] ✓ Dev server stopped');
        resolve();
      });

      // Send SIGTERM to gracefully shutdown
      devServer!.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (devServer && !devServer.killed) {
          console.warn('[Global Teardown] Force killing dev server');
          devServer.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    });
  }

  console.log('[Global Teardown] ✓ No dev server to stop');
}