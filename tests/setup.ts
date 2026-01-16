/**
 * Vitest Global Setup File
 *
 * This file runs before all tests and configures:
 * - Global mocks (Supabase, window objects, etc.)
 * - Custom matchers
 * - Environment setup
 * - Testing library utilities
 */

import { expect, vi, beforeAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables
beforeAll(() => {
  process.env.PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global Supabase mock factory
// Use this pattern in individual tests: vi.mock('@/db/supabase.client')
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

// Helper to create mock authenticated user
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Helper to create mock workspace
export const createMockWorkspace = (overrides = {}) => ({
  id: 'test-workspace-id',
  name: 'Test Workspace',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  owner_id: 'test-user-id',
  ...overrides,
});

// Custom matchers can be added here
// Example: expect.extend({ toBeValidUUID: (received) => { ... } })