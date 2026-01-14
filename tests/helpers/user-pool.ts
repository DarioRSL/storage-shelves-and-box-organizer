/**
 * User Pool Helper
 *
 * Manages a pool of reusable test users to avoid overwhelming Supabase Auth.
 * Creates users once and reuses them across tests to reduce auth API calls.
 */

import { createAuthenticatedUser, type TestUser } from "./auth-helper";
import { getAdminSupabaseClient } from "./supabase-test-client";

/**
 * Global user pool
 * Stores created users to reuse across tests
 */
const userPool: TestUser[] = [];
let poolInitialized = false;

/**
 * Initialize user pool with predefined users
 * Call this in global setup to create users once for all tests
 */
export async function initializeUserPool(count = 10): Promise<void> {
  if (poolInitialized) {
    console.log("[UserPool] Already initialized, skipping...");
    return;
  }

  console.log(`[UserPool] Initializing pool with ${count} users...`);

  try {
    // Create users with delays to avoid rate limiting
    for (let i = 0; i < count; i++) {
      const user = await createAuthenticatedUser({
        email: `pool-user-${i}@test.com`,
        full_name: `Pool User ${i}`,
      });
      userPool.push(user);

      // Progress indicator
      if ((i + 1) % 3 === 0) {
        console.log(`[UserPool] Created ${i + 1}/${count} users...`);
      }

      // Small delay between user creations
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    poolInitialized = true;
    console.log(`[UserPool] ✓ Pool initialized with ${userPool.length} users`);
  } catch (error) {
    console.error("[UserPool] Failed to initialize pool:", error);
    throw error;
  }
}

/**
 * Get a user from the pool
 * Returns a user and cleans up their data for reuse
 *
 * @param index - Optional specific user index
 * @returns TestUser from pool
 */
export async function getUserFromPool(index?: number): Promise<TestUser> {
  if (!poolInitialized || userPool.length === 0) {
    // Fallback: If pool not initialized (can happen in isolated test contexts),
    // try to initialize it now
    console.warn('[UserPool] Pool not available, attempting late initialization...');
    await initializeUserPool(10);

    // If still not initialized, throw error
    if (!poolInitialized || userPool.length === 0) {
      throw new Error("Failed to initialize user pool. Cannot proceed with tests.");
    }
  }

  // Get user by index or round-robin
  const userIndex = index !== undefined ? index % userPool.length : Math.floor(Math.random() * userPool.length);
  const user = userPool[userIndex];

  // Clean up user's data before returning (keep auth user, delete their data)
  await cleanUserData(user.id);

  return user;
}

/**
 * Get multiple users from pool
 * Useful for tests that need admin, member, viewer roles
 */
export async function getUsersFromPool(count: number): Promise<TestUser[]> {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    const user = await getUserFromPool(i);
    users.push(user);
  }

  return users;
}

/**
 * Clean a user's data without deleting the auth user
 * Allows user to be reused for next test
 */
async function cleanUserData(userId: string): Promise<void> {
  const adminClient = getAdminSupabaseClient();

  try {
    const IMPOSSIBLE_UUID = "00000000-0000-0000-0000-000000000000";

    // Delete user's workspaces and related data
    // This will cascade to workspace_members, locations, boxes, qr_codes
    await adminClient.from("workspaces").delete().eq("owner_id", userId);

    // Clean up any workspace memberships
    await adminClient.from("workspace_members").delete().eq("user_id", userId);

    // Small delay to ensure deletions propagate
    await new Promise((resolve) => setTimeout(resolve, 50));
  } catch (error) {
    console.warn(`[UserPool] Failed to clean user ${userId} data:`, error);
    // Don't throw - allow test to continue
  }
}

/**
 * Destroy user pool
 * Deletes all pool users from auth
 * Call this in global teardown
 */
export async function destroyUserPool(): Promise<void> {
  if (userPool.length === 0) {
    console.log("[UserPool] No users to destroy");
    return;
  }

  console.log(`[UserPool] Destroying pool (${userPool.length} users)...`);

  const adminClient = getAdminSupabaseClient();

  try {
    // Delete all pool users
    const deletePromises = userPool.map((user) =>
      adminClient.auth.admin.deleteUser(user.id).catch((error) => {
        console.warn(`[UserPool] Failed to delete user ${user.id}:`, error);
        return null;
      })
    );

    await Promise.all(deletePromises);

    // Clear pool
    userPool.length = 0;
    poolInitialized = false;

    console.log("[UserPool] ✓ Pool destroyed");
  } catch (error) {
    console.error("[UserPool] Error destroying pool:", error);
  }
}

/**
 * Get pool status
 */
export function getPoolStatus(): { initialized: boolean; size: number } {
  return {
    initialized: poolInitialized,
    size: userPool.length,
  };
}
