/**
 * Authentication Helper
 *
 * Manages test user sessions and tokens for integration testing.
 * Provides functions for:
 * - Creating authenticated test users
 * - Managing login/logout
 * - Generating authorization headers
 * - Creating multiple users for RLS testing
 */

import type { Session, User } from "@supabase/supabase-js";
import { getAdminSupabaseClient, getTestSupabaseClient } from "./supabase-test-client";

/**
 * Test User with authentication session
 */
export interface TestUser {
  /** User ID from auth.users */
  id: string;
  /** User email */
  email: string;
  /** User password (for login tests) */
  password: string;
  /** JWT access token */
  token: string;
  /** Refresh token */
  refreshToken: string;
  /** Full Supabase session */
  session: Session;
  /** Full user object */
  user: User;
}

/**
 * Default test password
 * Meets minimum requirements (8 characters)
 */
const DEFAULT_TEST_PASSWORD = "TestPass123!";

/**
 * Delay between auth operations to avoid overwhelming local Supabase
 * Helps prevent rate limiting and database errors
 */
const AUTH_OPERATION_DELAY_MS = 50;

/**
 * Sleep helper for adding delays between operations
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 100): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already been registered") || message.includes("Invalid")) {
        throw error;
      }

      // Exponential backoff: 100ms, 200ms, 400ms
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[retryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Create authenticated test user with session
 *
 * Creates both auth.users record and profiles record.
 * Returns user data with access token for API requests.
 *
 * IDEMPOTENT: If user already exists with same credentials, logs in instead of recreating.
 * This avoids overwhelming Supabase Auth with delete/create cycles.
 *
 * @example
 * ```typescript
 * const testUser = await createAuthenticatedUser();
 * const response = await request(app)
 *   .get('/api/workspaces')
 *   .set(getAuthHeader(testUser.token));
 * ```
 *
 * @param userData - Optional user data overrides
 * @returns Promise<TestUser> - User with session and token
 */
export async function createAuthenticatedUser(
  userData?: Partial<{
    email: string;
    password: string;
    full_name: string;
    avatar_url: string;
  }>
): Promise<TestUser> {
  const adminClient = getAdminSupabaseClient();
  const client = getTestSupabaseClient();

  // Generate unique email if not provided
  const email = userData?.email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
  const password = userData?.password || DEFAULT_TEST_PASSWORD;
  const full_name = userData?.full_name || `Test User ${Date.now()}`;

  try {
    // FIRST: Try to log in with existing credentials (idempotent approach)
    // This avoids the expensive delete/create cycle when user already exists
    const loginResult = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (loginResult.data?.session && loginResult.data?.user) {
      // User exists and credentials match - reuse this user
      // Ensure profile exists (might have been deleted in cleanup)
      await adminClient
        .from("profiles")
        .upsert({
          id: loginResult.data.user.id,
          email: email, // Use the email we passed in, not the user object
          full_name,
          avatar_url: userData?.avatar_url || null,
          theme_preference: "system",
        })
        .select();

      // IMPORTANT: Ensure user has at least one workspace
      // This handles cases where the user was created manually or workspace was deleted
      const { data: existingWorkspaces } = await adminClient
        .from("workspaces")
        .select("id")
        .eq("owner_id", loginResult.data.user.id)
        .limit(1);

      if (!existingWorkspaces || existingWorkspaces.length === 0) {
        // No workspace exists - create default workspace
        const { data: newWorkspace } = await adminClient
          .from("workspaces")
          .insert({
            owner_id: loginResult.data.user.id,
            name: "My Workspace",
          })
          .select()
          .single();

        // Ensure workspace membership (should be created by trigger, but ensure it exists)
        if (newWorkspace) {
          await adminClient.from("workspace_members").upsert(
            {
              workspace_id: newWorkspace.id,
              user_id: loginResult.data.user.id,
              role: "owner",
            },
            {
              onConflict: "workspace_id,user_id",
            }
          );
        }
      }

      return {
        id: loginResult.data.user.id,
        email,
        password,
        token: loginResult.data.session.access_token,
        refreshToken: loginResult.data.session.refresh_token,
        session: loginResult.data.session,
        user: loginResult.data.user,
      };
    }

    // User doesn't exist or credentials don't match - create new user
    await sleep(AUTH_OPERATION_DELAY_MS);

    // Create auth user via Admin API with retry logic
    const createUserResult = await retryWithBackoff(async () => {
      return await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation in tests
        user_metadata: {
          full_name,
        },
      });
    });

    const authData = createUserResult.data;
    const authError = createUserResult.error;

    if (authError || !authData?.user) {
      // If user already exists but login failed (wrong password), throw clear error
      if (authError?.message?.includes("already been registered") || authError?.message?.includes("already exists")) {
        throw new Error(`User ${email} exists but password doesn't match. Clear test data or use correct password.`);
      }
      throw new Error(`Failed to create auth user: ${authError?.message || "Unknown error"}`);
    }

    // Create profile record using upsert to handle any race conditions
    const { data: profiles, error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: email, // Use the email we passed in, not the user object
        full_name,
        avatar_url: userData?.avatar_url || null,
        theme_preference: "system",
      })
      .select();

    if (profileError || !profiles || profiles.length === 0) {
      throw new Error(`Failed to create profile: ${profileError?.message || "Unknown error"}`);
    }

    // Sign in to get session and tokens
    await sleep(AUTH_OPERATION_DELAY_MS);

    const sessionResult = await retryWithBackoff(async () => {
      const result = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (result.error || !result.data.session) {
        throw new Error(`Failed to create session: ${result.error?.message || "Unknown error"}`);
      }

      return result.data;
    });

    if (!sessionResult.session) {
      throw new Error("Failed to create session: No session returned");
    }

    return {
      id: authData.user.id,
      email,
      password,
      token: sessionResult.session.access_token,
      refreshToken: sessionResult.session.refresh_token,
      session: sessionResult.session,
      user: authData.user,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create authenticated test user: ${message}`);
  }
}

/**
 * Create multiple test users with different roles
 *
 * Useful for testing multi-tenant isolation and RLS policies.
 *
 * @example
 * ```typescript
 * const [userA, userB, userC] = await createTestUsers(3);
 * // Test that userA cannot access userB's data
 * ```
 *
 * @param count - Number of users to create
 * @returns Promise<TestUser[]> - Array of authenticated users
 */
export async function createTestUsers(count: number): Promise<TestUser[]> {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createAuthenticatedUser({
      email: `test-user-${i}-${Date.now()}@test.com`,
      full_name: `Test User ${i + 1}`,
    });
    users.push(user);
  }

  return users;
}

/**
 * Get authorization header for authenticated requests
 *
 * Returns header object to pass to Supertest requests.
 *
 * @example
 * ```typescript
 * const response = await request(app)
 *   .get('/api/workspaces')
 *   .set(getAuthHeader(testUser.token));
 * ```
 *
 * @param token - JWT access token
 * @returns Authorization header object
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Get custom session cookie header for requests
 *
 * The app uses custom sb_session cookie instead of standard Supabase cookies.
 * Use this for testing cookie-based authentication.
 *
 * @param session - Supabase session
 * @returns Cookie header object
 */
export function getSessionCookieHeader(session: Session): { Cookie: string } {
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };

  const encodedSession = encodeURIComponent(JSON.stringify(sessionData));

  return {
    Cookie: `sb_session=${encodedSession}`,
  };
}

/**
 * Login existing test user and get fresh token
 *
 * Useful for testing login flow or getting fresh tokens.
 *
 * @param email - User email
 * @param password - User password
 * @returns Promise<TestUser> - User with new session
 */
export async function loginTestUser(email: string, password: string): Promise<TestUser> {
  const client = getTestSupabaseClient();

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new Error(`Login failed: ${error?.message || "Unknown error"}`);
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      password, // Return original password
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      session: data.session,
      user: data.user,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to login test user: ${message}`);
  }
}

/**
 * Logout test user and invalidate session
 *
 * @param token - JWT access token
 * @returns Promise<void>
 */
export async function logoutTestUser(token: string): Promise<void> {
  const client = getTestSupabaseClient();

  // Set session before signing out
  const { error: sessionError } = await client.auth.setSession({
    access_token: token,
    refresh_token: "", // Not needed for logout
  });

  if (sessionError) {
    throw new Error(`Failed to set session: ${sessionError.message}`);
  }

  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(`Failed to logout: ${error.message}`);
  }
}

/**
 * Delete test user and all associated data
 *
 * Uses admin client to permanently delete user from auth.users.
 * Associated data in other tables should be cascade deleted by database FK constraints.
 *
 * @param userId - User ID to delete
 * @returns Promise<void>
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const adminClient = getAdminSupabaseClient();

  try {
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete test user: ${message}`);
  }
}

/**
 * Create test user with specific email and password
 *
 * Useful for testing specific scenarios with known credentials.
 *
 * @param email - User email
 * @param password - User password
 * @param full_name - User full name (optional)
 * @returns Promise<TestUser> - Authenticated user
 */
export async function createUserWithCredentials(
  email: string,
  password: string,
  full_name?: string
): Promise<TestUser> {
  return createAuthenticatedUser({
    email,
    password,
    full_name: full_name || `User ${email}`,
  });
}

/**
 * Refresh user token
 *
 * Gets new access token using refresh token.
 * Useful for testing token expiration scenarios.
 *
 * @param refreshToken - Refresh token
 * @returns Promise<TestUser> - User with refreshed token
 */
export async function refreshUserToken(refreshToken: string): Promise<TestUser> {
  const client = getTestSupabaseClient();

  try {
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw new Error(`Token refresh failed: ${error?.message || "Unknown error"}`);
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      password: "", // Password not available after refresh
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      session: data.session,
      user: data.user,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to refresh token: ${message}`);
  }
}

// Re-export user pool functions for convenience
export { getUsersFromPool, initializeUserPool, destroyUserPool, getPoolStatus } from "./user-pool";
