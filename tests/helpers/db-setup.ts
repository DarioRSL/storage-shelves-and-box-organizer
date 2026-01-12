/**
 * Database Setup Helper
 *
 * Manages test database lifecycle with isolation between tests.
 * Provides functions for:
 * - Clearing all test data in correct order (respects foreign keys)
 * - Seeding tables with test data
 * - Setting up and tearing down test database state
 */

import { getAdminSupabaseClient } from './supabase-test-client';
import type { SupabaseClient } from '@/db/supabase.client';

/**
 * Test Database interface
 * Provides methods for managing test data lifecycle
 */
export interface TestDatabase {
  /**
   * Clean up all test data
   */
  cleanup: () => Promise<void>;

  /**
   * Seed a specific table with test data
   */
  seedData: <T>(table: string, data: Partial<T>[]) => Promise<T[]>;

  /**
   * Clear a specific table
   */
  clearTable: (table: string) => Promise<void>;

  /**
   * Clear all tables in correct order
   */
  clearAllTables: () => Promise<void>;
}

/**
 * Initialize test database for a test suite
 *
 * Returns TestDatabase interface with cleanup and seeding utilities.
 * Call in beforeEach to ensure clean slate for each test.
 *
 * @example
 * ```typescript
 * let testDb: TestDatabase;
 *
 * beforeEach(async () => {
 *   testDb = await setupTestDatabase();
 * });
 *
 * afterEach(async () => {
 *   await testDb.cleanup();
 * });
 * ```
 *
 * @returns TestDatabase instance
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const client = getAdminSupabaseClient();

  return {
    cleanup: async () => {
      await clearAllTestData(client);
    },
    seedData: async <T>(table: string, data: Partial<T>[]): Promise<T[]> => {
      return await seedTable<T>(client, table, data);
    },
    clearTable: async (table: string) => {
      await clearTable(client, table);
    },
    clearAllTables: async () => {
      await clearAllTestData(client);
    },
  };
}

/**
 * Clear all test data from database tables in correct order
 *
 * IMPORTANT: Order matters due to foreign key constraints!
 * Delete children before parents to avoid FK violations.
 *
 * Deletion order:
 * 1. boxes (references qr_codes, locations, workspaces)
 * 2. qr_codes (references workspaces)
 * 3. locations (references workspaces)
 * 4. workspace_members (references workspaces, users)
 * 5. workspaces (references users)
 * 6. profiles (references auth.users)
 *
 * Uses admin client (service role) to bypass RLS policies.
 *
 * @param client - Admin Supabase client (optional, creates if not provided)
 * @returns Promise<void>
 */
export async function clearAllTestData(client?: SupabaseClient): Promise<void> {
  const adminClient = client || getAdminSupabaseClient();

  try {
    // Order matters! Delete children before parents
    // Using neq with impossible UUID to delete all rows (workaround for delete all)
    const IMPOSSIBLE_UUID = '00000000-0000-0000-0000-000000000000';

    // 1. Clear boxes (has FK to qr_codes, locations, workspaces)
    await adminClient.from('boxes').delete().neq('id', IMPOSSIBLE_UUID);

    // 2. Clear qr_codes (has FK to workspaces, boxes)
    await adminClient.from('qr_codes').delete().neq('id', IMPOSSIBLE_UUID);

    // 3. Clear locations (has FK to workspaces)
    await adminClient.from('locations').delete().neq('id', IMPOSSIBLE_UUID);

    // 4. Clear workspace_members (has FK to workspaces, users)
    await adminClient
      .from('workspace_members')
      .delete()
      .neq('workspace_id', IMPOSSIBLE_UUID);

    // 5. Clear workspaces (has FK to users/profiles)
    await adminClient.from('workspaces').delete().neq('id', IMPOSSIBLE_UUID);

    // 6. Clear profiles explicitly (don't rely on CASCADE from auth user deletion)
    await adminClient.from('profiles').delete().neq('id', IMPOSSIBLE_UUID);

    // 7. Delete auth users (via Supabase Admin API)
    const { data: authResponse } = await adminClient.auth.admin.listUsers();
    if (authResponse?.users) {
      for (const user of authResponse.users) {
        await adminClient.auth.admin.deleteUser(user.id);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clear test data: ${message}`);
  }
}

/**
 * Seed a specific table with test data
 *
 * Returns inserted records with generated fields (id, timestamps, etc.)
 * Uses admin client to bypass RLS policies.
 *
 * @example
 * ```typescript
 * const workspaces = await seedTable('workspaces', [
 *   { name: 'Test Workspace', owner_id: userId },
 * ]);
 * ```
 *
 * @param client - Admin Supabase client (optional)
 * @param table - Table name to seed
 * @param data - Array of records to insert
 * @returns Promise<T[]> - Inserted records with generated fields
 */
export async function seedTable<T>(
  clientOrTable: SupabaseClient | string,
  tableOrData: string | Partial<T>[],
  maybeData?: Partial<T>[]
): Promise<T[]> {
  // Handle both signatures: seedTable(client, table, data) and seedTable(table, data)
  let client: SupabaseClient;
  let table: string;
  let data: Partial<T>[];

  if (typeof clientOrTable === 'string') {
    // seedTable(table, data) - create client
    client = getAdminSupabaseClient();
    table = clientOrTable;
    data = tableOrData as Partial<T>[];
  } else {
    // seedTable(client, table, data)
    client = clientOrTable;
    table = tableOrData as string;
    data = maybeData!;
  }

  if (!data || data.length === 0) {
    return [];
  }

  try {
    const { data: inserted, error } = await client
      .from(table)
      .insert(data)
      .select();

    if (error) {
      throw new Error(`Failed to seed table "${table}": ${error.message}`);
    }

    return (inserted || []) as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to seed table "${table}": ${message}`);
  }
}

/**
 * Clear a specific table
 *
 * WARNING: This deletes all rows in the table. Use with caution.
 * Uses admin client to bypass RLS policies.
 *
 * @param client - Admin Supabase client (optional)
 * @param table - Table name to clear
 * @returns Promise<void>
 */
export async function clearTable(
  clientOrTable: SupabaseClient | string,
  maybeTable?: string
): Promise<void> {
  // Handle both signatures: clearTable(client, table) and clearTable(table)
  let client: SupabaseClient;
  let table: string;

  if (typeof clientOrTable === 'string') {
    client = getAdminSupabaseClient();
    table = clientOrTable;
  } else {
    client = clientOrTable;
    table = maybeTable!;
  }

  try {
    const IMPOSSIBLE_UUID = '00000000-0000-0000-0000-000000000000';
    const { error } = await client.from(table).delete().neq('id', IMPOSSIBLE_UUID);

    if (error) {
      throw new Error(`Failed to clear table "${table}": ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clear table "${table}": ${message}`);
  }
}

/**
 * Get count of records in a table
 *
 * Useful for verifying test data was inserted or cleared correctly.
 *
 * @param table - Table name
 * @param client - Supabase client (optional, uses admin if not provided)
 * @returns Promise<number> - Record count
 */
export async function getTableCount(table: string, client?: SupabaseClient): Promise<number> {
  const adminClient = client || getAdminSupabaseClient();

  try {
    const { count, error } = await adminClient
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to get count for table "${table}": ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get count for table "${table}": ${message}`);
  }
}

/**
 * Verify all tables are empty
 *
 * Useful in afterEach to ensure cleanup worked correctly.
 * Throws error if any table has records.
 *
 * @param client - Admin Supabase client (optional)
 * @returns Promise<void>
 */
export async function verifyTablesEmpty(client?: SupabaseClient): Promise<void> {
  const adminClient = client || getAdminSupabaseClient();

  const tables = ['boxes', 'qr_codes', 'locations', 'workspace_members', 'workspaces', 'profiles'];

  for (const table of tables) {
    const count = await getTableCount(table, adminClient);
    if (count > 0) {
      throw new Error(`Table "${table}" is not empty after cleanup (${count} records remaining)`);
    }
  }
}
