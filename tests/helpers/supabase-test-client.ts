/**
 * Supabase Test Client Helper
 *
 * Provides configured Supabase clients for integration testing:
 * - Standard client (anon key) for regular operations
 * - Admin client (service role key) for setup/teardown bypassing RLS
 * - User-scoped client for testing RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@/db/supabase.client';

/**
 * Get environment variables for test Supabase instance
 * Throws error if required variables are missing
 */
function getTestEnvVars() {
  const url = process.env.TEST_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.TEST_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      'TEST_SUPABASE_URL or PUBLIC_SUPABASE_URL environment variable is required for tests. ' +
      'Make sure .env.test is loaded.'
    );
  }

  if (!anonKey) {
    throw new Error(
      'TEST_SUPABASE_ANON_KEY or PUBLIC_SUPABASE_ANON_KEY environment variable is required for tests. ' +
      'Make sure .env.test is loaded.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'TEST_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required for tests. ' +
      'Make sure .env.test is loaded.'
    );
  }

  return { url, anonKey, serviceRoleKey };
}

/**
 * Get standard Supabase test client with anon key
 * Uses RLS policies (normal user access)
 *
 * @returns SupabaseClient configured for testing
 */
export function getTestSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getTestEnvVars();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false, // Don't persist in tests
      autoRefreshToken: false, // Don't auto-refresh in tests
      detectSessionInUrl: false, // Don't detect session from URL
    },
  });
}

/**
 * Get admin Supabase client with service role key
 * Bypasses RLS policies - use for test setup/teardown only
 *
 * IMPORTANT: This client has full database access. Use only for:
 * - Clearing test data (beforeEach/afterEach)
 * - Seeding test fixtures
 * - Verifying database state in tests
 *
 * @returns SupabaseClient with service role (bypasses RLS)
 */
export function getAdminSupabaseClient(): SupabaseClient {
  const { url, serviceRoleKey } = getTestEnvVars();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Get user-scoped Supabase client with access token
 * Uses RLS policies with specific user context
 *
 * Used for testing RLS policy enforcement with different users.
 *
 * @param accessToken - JWT access token from Supabase Auth
 * @returns SupabaseClient configured with user session
 */
export function getUserSupabaseClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getTestEnvVars();

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return client;
}

/**
 * Verify test database connection
 * Throws error if connection fails
 *
 * Call this in test setup (beforeAll) to fail fast if database is unavailable
 *
 * @returns Promise<void>
 */
export async function verifyTestDatabaseConnection(): Promise<void> {
  const client = getAdminSupabaseClient();

  try {
    // Try a simple query to verify connection
    const { error } = await client.from('profiles').select('count').limit(1);

    if (error) {
      throw new Error(`Test database connection failed: ${error.message}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to connect to test database. Make sure Supabase test instance is running. Error: ${message}`
    );
  }
}

/**
 * Get test database URL for direct connections
 * Useful for database migration testing or direct SQL queries
 *
 * @returns Database connection URL
 */
export function getTestDatabaseUrl(): string {
  const host = process.env.TEST_DB_HOST || '127.0.0.1';
  const port = process.env.TEST_DB_PORT || '54422';
  const user = process.env.TEST_DB_USER || 'postgres';
  const password = process.env.TEST_DB_PASSWORD || 'postgres';
  const database = process.env.TEST_DB_NAME || 'postgres';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
