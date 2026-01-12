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

import type { Session, User } from '@supabase/supabase-js';
import { getAdminSupabaseClient, getTestSupabaseClient } from './supabase-test-client';
import { seedTable } from './db-setup';

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
const DEFAULT_TEST_PASSWORD = 'TestPass123!';

/**
 * Create authenticated test user with session
 *
 * Creates both auth.users record and profiles record.
 * Returns user data with access token for API requests.
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

  // Generate unique email if not provided
  const email = userData?.email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
  const password = userData?.password || DEFAULT_TEST_PASSWORD;
  const full_name = userData?.full_name || `Test User ${Date.now()}`;

  try {
    // Create auth user via Admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation in tests
      user_metadata: {
        full_name,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`);
    }

    // Delete any existing profile with this ID (shouldn't happen, but local Supabase might have stale data)
    await adminClient.from('profiles').delete().eq('id', authData.user.id);

    // Create profile record using upsert to handle any race conditions
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .upsert([
        {
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          avatar_url: userData?.avatar_url || null,
          theme_preference: 'system',
        },
      ])
      .select();

    if (profileError || !profiles || profiles.length === 0) {
      throw new Error(`Failed to create profile: ${profileError?.message || 'Unknown error'}`);
    }

    // Sign in to get session and tokens
    const client = getTestSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !sessionData.session) {
      throw new Error(`Failed to create session: ${sessionError?.message || 'Unknown error'}`);
    }

    return {
      id: authData.user.id,
      email,
      password,
      token: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      session: sessionData.session,
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
      throw new Error(`Login failed: ${error?.message || 'Unknown error'}`);
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
    refresh_token: '', // Not needed for logout
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
      throw new Error(`Token refresh failed: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      password: '', // Password not available after refresh
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
