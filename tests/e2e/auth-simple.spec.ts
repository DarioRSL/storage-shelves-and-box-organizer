/**
 * Simple Auth Test
 * Tests that UI-based login works correctly
 */

import { test, expect } from "@playwright/test";
import { setupE2ETest, loginViaUI, cleanupE2ETest } from "../helpers/e2e-setup";
import type { E2ETestSetup } from "../helpers/e2e-setup";

test.describe("Simple Auth Test", () => {
  let testSetup: E2ETestSetup;

  test("should login via UI and access dashboard", async ({ page }) => {
    // Setup test data
    testSetup = await setupE2ETest();

    // Login
    await loginViaUI(page, testSetup.user.email, process.env.E2E_PASSWORD!, testSetup.workspace.id);

    // Verify we're on the dashboard
    const url = page.url();
    expect(url).toContain("/app");

    // Verify dashboard elements are visible
    await expect(page.locator('[data-testid="new-box-button"]')).toBeVisible();

    console.log("✅ Login test passed!");

    // Cleanup
    await cleanupE2ETest(testSetup.workspace.id);
  });
});
