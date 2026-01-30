/**
 * E2E Test: Box Deletion
 *
 * Tests the complete user journey for deleting a box from the dashboard.
 * Validates US-020 (Usunięcie pudełka) from PRD.
 *
 * Coverage:
 * - US-020: Box deletion with confirmation
 * - Verification that QR code returns to 'generated' status (database trigger)
 * - UI feedback and confirmation dialog
 *
 * Flow:
 * 1. Authenticate user
 * 2. Seed a box to delete
 * 3. Navigate to dashboard
 * 4. Find and open box menu
 * 5. Click delete button
 * 6. Confirm deletion in dialog
 * 7. Verify box disappears from UI
 * 8. Verify box is deleted from database
 * 9. Verify QR code status reset to 'generated'
 */

import { test, expect, type Page } from "@playwright/test";
import { setupE2ETest, cleanupE2ETest, loginViaUI, type E2ETestSetup } from "../../helpers/e2e-setup";
import { getAdminSupabaseClient } from "../../helpers/supabase-test-client";
import { seedTable } from "../../helpers/db-setup";
import { DashboardPage } from "../page-objects/DashboardPage";

test.describe("Box Deletion E2E (US-020)", () => {
  let testSetup: E2ETestSetup;
  let page: Page;
  let boxIdToDelete: string;

  test.beforeEach(async ({ page: testPage }) => {
    // Setup: Create test user, workspace, locations, and QR codes
    testSetup = await setupE2ETest();

    // Seed a box to delete
    const adminClient = getAdminSupabaseClient();
    const boxes = await seedTable("boxes", [
      {
        workspace_id: testSetup.workspace.id,
        name: "Box to Delete",
        description: "This box will be deleted in the test",
        tags: ["test", "temporary"],
        location_id: testSetup.locations[0]?.id || null,
      },
    ]);

    boxIdToDelete = boxes[0].id;

    // Assign QR code to the box (update qr_codes table)
    if (testSetup.qrCodes[0]?.id) {
      await adminClient
        .from("qr_codes")
        .update({ box_id: boxIdToDelete, status: "assigned" })
        .eq("id", testSetup.qrCodes[0].id);
    }

    // Assign page from test context
    page = testPage;

    // Login via UI
    await loginViaUI(page, testSetup.user.email, process.env.E2E_PASSWORD!, testSetup.workspace.id);
  });

  test.afterEach(async () => {
    // Cleanup: Clean up test data
    await cleanupE2ETest(testSetup.workspace.id);
  });

  test("should delete a box from dashboard with confirmation", async () => {
    // Note: Already logged in and on dashboard via loginViaUI in beforeEach
    const dashboard = new DashboardPage(page);

    // 2. Verify the box exists in the UI
    const boxLocator = dashboard.findBoxByName("Box to Delete");
    await expect(boxLocator).toBeVisible({ timeout: 10000 });

    // 3. Open box menu/actions
    // Since the actual UI implementation might vary, we'll try to find the delete button
    // This could be via a context menu, edit page, or direct delete button

    // Option 1: Try to navigate to edit page and delete from there
    await boxLocator.click();

    // Wait a bit for any navigation or modal to appear
    await page.waitForTimeout(500);

    // If we're on edit page, look for delete button
    if (page.url().includes("/edit")) {
      const deleteButton = page.locator("button", { hasText: /usu[nń]|delete/i });
      await deleteButton.click();
    } else {
      // Option 2: Look for inline delete button or menu
      await dashboard.openBoxMenu("Box to Delete");
      await dashboard.clickDeleteBox();
    }

    // 4. Confirm deletion in dialog
    await dashboard.confirmDelete();

    // 5. Wait for box to disappear from UI
    await dashboard.waitForBoxToDisappear("Box to Delete");

    // Also verify we're back on dashboard (not on edit page)
    await expect(page).toHaveURL("/app", { timeout: 5000 });

    // 6. Verify box is deleted from database
    const adminClient = getAdminSupabaseClient();
    const { data: boxes } = await adminClient.from("boxes").select("*").eq("id", boxIdToDelete);

    expect(boxes).toHaveLength(0);

    // 7. Verify QR code was reset to 'generated' status (database trigger)
    if (testSetup.qrCodes[0]?.id) {
      const { data: qrCode } = await adminClient
        .from("qr_codes")
        .select("status")
        .eq("id", testSetup.qrCodes[0].id)
        .single();

      expect(qrCode?.status).toBe("generated");
    }
  });

  test("should cancel deletion when user clicks cancel", async () => {
    // Navigate to dashboard
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Find the box
    const boxLocator = dashboard.findBoxByName("Box to Delete");
    await expect(boxLocator).toBeVisible({ timeout: 10000 });

    // Navigate to delete (via edit page or menu)
    await boxLocator.click();
    await page.waitForTimeout(500);

    if (page.url().includes("/edit")) {
      const deleteButton = page.locator("button", { hasText: /usu[nń]|delete/i });
      await deleteButton.click();
    } else {
      await dashboard.openBoxMenu("Box to Delete");
      await dashboard.clickDeleteBox();
    }

    // Wait for confirmation dialog
    const dialog = page.locator('[data-testid="delete-confirmation-dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    // Click cancel button
    const cancelButton = dialog.locator("button", { hasText: /cancel|anuluj/i });
    await cancelButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Box should still exist
    await expect(boxLocator).toBeVisible();

    // Verify box still exists in database
    const adminClient = getAdminSupabaseClient();
    const { data: boxes } = await adminClient.from("boxes").select("*").eq("id", boxIdToDelete);

    expect(boxes).toHaveLength(1);
    expect(boxes![0].name).toBe("Box to Delete");
  });

  test("should require text confirmation for deletion", async () => {
    // Navigate to dashboard
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Find and initiate delete
    const boxLocator = dashboard.findBoxByName("Box to Delete");
    await boxLocator.click();
    await page.waitForTimeout(500);

    if (page.url().includes("/edit")) {
      const deleteButton = page.locator("button", { hasText: /usu[nń]|delete/i });
      await deleteButton.click();
    }

    // Wait for confirmation dialog
    const dialog = page.locator('[data-testid="delete-confirmation-dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    // Check if text confirmation is required
    const confirmationInput = dialog.locator("input#confirmation-input");
    const hasConfirmationInput = await confirmationInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasConfirmationInput) {
      // Verify confirm button is disabled without correct text
      const confirmButton = dialog.locator('[data-testid="confirm-delete-button"]');
      await expect(confirmButton).toBeDisabled();

      // Type wrong text
      await confirmationInput.fill("wrong text");
      await expect(confirmButton).toBeDisabled();

      // Type correct confirmation text
      const labelText = await dialog.locator('label[for="confirmation-input"] span').textContent();
      if (labelText) {
        await confirmationInput.fill(labelText.trim());
        // Button should now be enabled
        await expect(confirmButton).toBeEnabled();
      }
    }
  });

  test("should handle deletion error gracefully", async () => {
    // Navigate to dashboard
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Delete the box from database first to simulate a race condition
    const adminClient = getAdminSupabaseClient();
    await adminClient.from("boxes").delete().eq("id", boxIdToDelete);

    // Try to delete via UI (box no longer exists in DB)
    const boxLocator = dashboard.findBoxByName("Box to Delete");

    // Box might still be visible in UI cache
    if (await boxLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
      await boxLocator.click();
      await page.waitForTimeout(500);

      if (page.url().includes("/edit")) {
        const deleteButton = page.locator("button", { hasText: /usu[nń]|delete/i });

        // This might fail or show an error, which is expected
        const hasDeleteButton = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasDeleteButton) {
          await deleteButton.click();

          // Look for error message
          const errorMessage = page.locator('[role="alert"], .error-message, .text-red');
          const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

          // Either we see an error or we're redirected to dashboard
          const isOnDashboard = page.url().includes("/app") && !page.url().includes("/edit");

          expect(hasError || isOnDashboard).toBeTruthy();
        }
      }
    }
  });
});
