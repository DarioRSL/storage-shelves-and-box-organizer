/**
 * User Fixtures
 *
 * Predefined test users with different roles and characteristics.
 * Use these for consistent testing across integration tests.
 */

export interface UserFixture {
  email: string;
  password: string;
  full_name: string;
  role?: "admin" | "member" | "viewer";
}

/**
 * Admin user with full permissions
 */
export const ADMIN_USER: UserFixture = {
  email: "admin@test.com",
  password: "AdminPass123!",
  full_name: "Admin Test User",
  role: "admin",
};

/**
 * Regular member user with standard permissions
 */
export const MEMBER_USER: UserFixture = {
  email: "member@test.com",
  password: "MemberPass123!",
  full_name: "Member Test User",
  role: "member",
};

/**
 * Read-only viewer user
 */
export const VIEWER_USER: UserFixture = {
  email: "viewer@test.com",
  password: "ViewerPass123!",
  full_name: "Viewer Test User",
  role: "viewer",
};

/**
 * Isolated user for RLS testing (not a member of any workspace)
 */
export const ISOLATED_USER: UserFixture = {
  email: "isolated@test.com",
  password: "IsolatedPass123!",
  full_name: "Isolated Test User",
};

/**
 * User for testing account deletion
 */
export const DELETABLE_USER: UserFixture = {
  email: "deletable@test.com",
  password: "DeletePass123!",
  full_name: "Deletable Test User",
};

/**
 * All predefined test users
 */
export const ALL_TEST_USERS = [ADMIN_USER, MEMBER_USER, VIEWER_USER, ISOLATED_USER, DELETABLE_USER] as const;
