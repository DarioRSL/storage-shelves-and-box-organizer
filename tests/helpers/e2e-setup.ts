/**
 * E2E Test Setup Helper
 *
 * Provides utilities for setting up and tearing down E2E tests with Playwright.
 * Manages authentication, test data seeding, and cleanup for isolated E2E tests.
 *
 * Usage:
 * ```typescript
 * let testSetup: E2ETestSetup;
 *
 * beforeEach(async ({ browser }) => {
 *   testSetup = await setupE2ETest();
 *   const context = await browser.newContext();
 *   await context.addCookies([getSessionCookieForPlaywright(testSetup.user.session)]);
 * });
 *
 * afterEach(async () => {
 *   await cleanupE2ETest(testSetup.workspace.id);
 * });
 * ```
 */

import type { Session } from "@supabase/supabase-js";
import { createAuthenticatedUser, type TestUser } from "./auth-helper";
import { getAdminSupabaseClient } from "./supabase-test-client";
import { seedTable, seedTableWithUpsert, clearAllTestData } from "./db-setup";

/**
 * E2E Test Setup Result
 * Contains all data needed for E2E tests
 */
export interface E2ETestSetup {
  /** Authenticated test user with session */
  user: TestUser;
  /** Test workspace created for this test */
  workspace: {
    id: string;
    name: string;
  };
  /** Test locations seeded for this test */
  locations: {
    id: string;
    name: string;
    path: string;
  }[];
  /** Test QR codes generated for this test */
  qrCodes: {
    id: string;
    short_id: string;
    status: string;
  }[];
}

/**
 * Setup E2E test environment
 *
 * Creates authenticated user, workspace, locations, and QR codes for testing.
 * All data is scoped to a unique workspace for test isolation.
 *
 * @returns Promise<E2ETestSetup> - Complete test setup data
 */
export async function setupE2ETest(): Promise<E2ETestSetup> {
  const adminClient = getAdminSupabaseClient();

  // 1. Get test user from environment variables
  const testEmail = process.env.E2E_USERNAME;
  const testPassword = process.env.E2E_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
  }

  // 2. Create or login test user (ensures default workspace exists)
  const testUser = await createAuthenticatedUser({
    email: testEmail,
    password: testPassword,
    full_name: "E2E Test User",
  });

  // 3. Create a unique test workspace for this test (ensures isolation)
  const timestamp = Date.now();
  const workspaceData = await seedTable("workspaces", [
    {
      name: `E2E Test Workspace ${timestamp}`,
      owner_id: testUser.id,
    },
  ]);

  if (!workspaceData || workspaceData.length === 0) {
    throw new Error("Failed to create test workspace");
  }

  const workspace = workspaceData[0];

  console.log("[E2E Setup] Created unique workspace:", workspace.name, workspace.id);

  // 4. Add user as workspace member (use upsert to handle any edge cases)
  await seedTableWithUpsert(
    "workspace_members",
    [
      {
        workspace_id: workspace.id,
        user_id: testUser.id,
        role: "owner",
      },
    ],
    "workspace_id,user_id"
  );

  // 5. Create test locations (hierarchical structure)
  const locationsData = await seedTable("locations", [
    {
      workspace_id: workspace.id,
      name: "Garage",
      path: "root.garage",
    },
    {
      workspace_id: workspace.id,
      name: "Basement",
      path: "root.basement",
    },
    {
      workspace_id: workspace.id,
      name: "Metal Rack",
      path: "root.garage.metalrack",
    },
  ]);

  if (!locationsData || locationsData.length === 0) {
    throw new Error("Failed to create test locations");
  }

  // 6. Generate test QR codes
  const qrCodesData = await seedTable("qr_codes", [
    {
      workspace_id: workspace.id,
      short_id: `QR-E2E${Date.now().toString().slice(-6)}`,
      status: "generated",
    },
    {
      workspace_id: workspace.id,
      short_id: `QR-E2E${(Date.now() + 1).toString().slice(-6)}`,
      status: "generated",
    },
    {
      workspace_id: workspace.id,
      short_id: `QR-E2E${(Date.now() + 2).toString().slice(-6)}`,
      status: "generated",
    },
  ]);

  if (!qrCodesData || qrCodesData.length === 0) {
    throw new Error("Failed to generate test QR codes");
  }

  return {
    user: testUser,
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
    locations: locationsData.map((loc) => ({
      id: loc.id,
      name: loc.name,
      path: loc.path,
    })),
    qrCodes: qrCodesData.map((qr) => ({
      id: qr.id,
      short_id: qr.short_id,
      status: qr.status,
    })),
  };
}

/**
 * Cleanup E2E test data
 *
 * Removes all test data created for a workspace.
 * Uses proper deletion order to respect foreign key constraints.
 *
 * @param workspaceId - Workspace ID to clean up
 * @returns Promise<void>
 */
export async function cleanupE2ETest(workspaceId: string): Promise<void> {
  const adminClient = getAdminSupabaseClient();

  try {
    // Delete in correct order (children before parents)
    // 1. Boxes (references qr_codes, locations, workspaces)
    await adminClient.from("boxes").delete().eq("workspace_id", workspaceId);

    // 2. QR codes (references workspaces)
    await adminClient.from("qr_codes").delete().eq("workspace_id", workspaceId);

    // 3. Locations (references workspaces)
    await adminClient.from("locations").delete().eq("workspace_id", workspaceId);

    // 4. Workspace members (references workspaces)
    await adminClient.from("workspace_members").delete().eq("workspace_id", workspaceId);

    // 5. Workspace
    await adminClient.from("workspaces").delete().eq("id", workspaceId);

    // Note: We don't delete profiles/auth users - they persist for reuse
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to cleanup E2E test data: ${message}`);
  }
}

/**
 * Perform login via UI using Playwright page
 *
 * Navigates to the login page and fills in credentials to authenticate.
 * This is more reliable than cookie-based auth for E2E tests.
 *
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 * @returns Promise<void>
 */
/**
 * Perform login via UI using Playwright page
 *
 * Navigates to the login page and fills in credentials to authenticate.
 * This is more reliable than cookie-based auth for E2E tests.
 *
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 * @param workspaceId - Optional workspace ID to set after login
 * @returns Promise<void>
 */
export async function loginViaUI(page: any, email: string, password: string, workspaceId?: string): Promise<void> {
  console.log("[E2E Setup] Logging in via UI as:", email);

  // Navigate to auth page
  await page.goto("http://localhost:3000/auth");

  // Wait for the login form to be visible
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for the auth API call to complete (successful login with Supabase)
  await page.waitForResponse(
    (response: any) => response.url().includes("/auth/v1/token") && response.status() === 200,
    { timeout: 10000 }
  );

  console.log("[E2E Setup] Supabase login API call successful");

  // CRITICAL: Wait for the session establishment API call
  // After Supabase login, the client calls /api/auth/session to set HttpOnly cookie
  await page.waitForResponse(
    (response: any) => response.url().includes("/api/auth/session") && response.status() === 200,
    { timeout: 10000 }
  );

  console.log("[E2E Setup] Session cookie established via /api/auth/session");

  // Verify cookie was set
  const cookiesAfterLogin = await page.context().cookies();
  const sbSessionCookie = cookiesAfterLogin.find((c: any) => c.name === "sb_session");

  if (!sbSessionCookie) {
    console.log("[E2E Setup] ERROR: sb_session cookie not found!");
    console.log(
      "[E2E Setup] Available cookies:",
      cookiesAfterLogin.map((c: any) => c.name)
    );
    throw new Error("Session cookie was not set after login");
  }

  console.log("[E2E Setup] Session cookie verified:", sbSessionCookie.name);

  // Wait for automatic redirect to /app or navigate manually
  try {
    await page.waitForURL("**/app", { timeout: 5000 });
    console.log("[E2E Setup] Automatically redirected to /app");
  } catch {
    // If automatic redirect doesn't happen, navigate manually
    console.log("[E2E Setup] No automatic redirect, navigating to /app manually");
    await page.goto("http://localhost:3000/app");
  }

  // Wait for dashboard to load first
  await page.waitForSelector('[data-testid="new-box-button"]', { timeout: 10000 });
  console.log("[E2E Setup] Dashboard loaded");

  // Click on the workspace selector if it exists (for multiple workspaces)
  // If only one workspace, it will be auto-selected
  if (workspaceId) {
    console.log("[E2E Setup] Checking for workspace selector...");

    // Check if there's a workspace dropdown button
    const workspaceButton = page.locator('button:has-text("Workspace"), button:has-text("E2E Test Workspace")').first();
    const isWorkspaceButtonVisible = await workspaceButton.isVisible().catch(() => false);

    if (isWorkspaceButtonVisible) {
      console.log("[E2E Setup] Workspace button found, clicking it...");
      await workspaceButton.click();
      await page.waitForTimeout(500);

      // Click the first menu item (should be our workspace)
      const menuItem = page.locator('[role="menuitem"]').first();
      await menuItem.click();
      console.log("[E2E Setup] Workspace selected via dropdown");

      // Wait for workspace data to load
      await page.waitForTimeout(2000);
    } else {
      // If no dropdown, the workspace is already selected (single workspace case)
      console.log("[E2E Setup] No workspace dropdown found - workspace may be auto-selected");
      // Still wait a bit for data to load
      await page.waitForTimeout(2000);
    }
  }

  console.log("[E2E Setup] Dashboard loaded and workspace ready");

  console.log("[E2E Setup] Login complete, dashboard ready");
}

/**
 * Cleanup all E2E test data (nuclear option)
 *
 * Use this sparingly - clears ALL test data including profiles.
 * Mainly for test suite setup/teardown.
 *
 * @returns Promise<void>
 */
export async function cleanupAllE2ETests(): Promise<void> {
  await clearAllTestData();
}
