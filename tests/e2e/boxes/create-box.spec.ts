/**
 * E2E Test: Box Creation
 *
 * Tests the complete user journey for creating a box manually from the dashboard.
 * Validates US-028 (Szybkie dodanie pudełka bez skanowania QR) from PRD.
 *
 * Coverage:
 * - US-028: Quick box addition from dashboard
 * - US-007: Adding description and tags
 * - US-009: Assigning location
 * - US-026: Assigning QR code
 *
 * Flow:
 * 1. Authenticate user
 * 2. Navigate to dashboard
 * 3. Click "Dodaj pudełko" button
 * 4. Fill box form with all fields
 * 5. Submit form
 * 6. Verify redirect to dashboard
 * 7. Verify box appears in UI
 * 8. Verify box exists in database
 */

import { test, expect, type Page } from '@playwright/test';
import { setupE2ETest, cleanupE2ETest, loginViaUI, type E2ETestSetup } from '../../helpers/e2e-setup';
import { getAdminSupabaseClient } from '../../helpers/supabase-test-client';
import { DashboardPage } from '../page-objects/DashboardPage';
import { BoxFormPage } from '../page-objects/BoxFormPage';

test.describe('Box Creation E2E (US-028)', () => {
  let testSetup: E2ETestSetup;
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    // Setup: Create test user, workspace, locations, and QR codes
    testSetup = await setupE2ETest();

    // Assign page from test context
    page = testPage;

    // Login via UI and set workspace
    await loginViaUI(page, testSetup.user.email, process.env.E2E_PASSWORD!, testSetup.workspace.id);
  });

  test.afterEach(async () => {
    // Cleanup: Clean up test data
    await cleanupE2ETest(testSetup.workspace.id);
  });

  test('should create a new box with all fields filled', async () => {
    // Note: Already logged in and on dashboard via loginViaUI in beforeEach
    const dashboard = new DashboardPage(page);

    // 1. Click "New Box" button
    await dashboard.navigateToNewBox();

    // 3. Verify we're on the new box form page
    await expect(page).toHaveURL('/app/boxes/new');

    // 4. Fill out form using Page Object
    const boxForm = new BoxFormPage(page);
    await boxForm.waitForForm();

    // Fill required and optional fields
    await boxForm.fillName('Test Electronics Box');
    await boxForm.fillDescription('Cables, chargers, and old electronics components');
    await boxForm.addTag('electronics');
    await boxForm.addTag('cables');

    // Select location (first location from test setup)
    if (testSetup.locations.length > 0) {
      await boxForm.selectLocation(testSetup.locations[0].name);
    }

    // Select QR code (first QR from test setup)
    if (testSetup.qrCodes.length > 0) {
      await boxForm.selectQRCode(testSetup.qrCodes[0].short_id);
    }

    // 5. Submit form
    await boxForm.submitForm();

    // 6. Wait for redirect to dashboard
    await boxForm.waitForSuccess();
    await expect(page).toHaveURL('/app');

    // 7. Verify box appears in dashboard
    // Note: May need to wait for the box list to update
    await page.waitForTimeout(1000); // Give time for data to load

    const boxLocator = dashboard.findBoxByName('Test Electronics Box');
    await expect(boxLocator).toBeVisible({ timeout: 10000 });

    // 8. Verify database state
    const adminClient = getAdminSupabaseClient();
    const { data: boxes, error } = await adminClient
      .from('boxes')
      .select('*')
      .eq('workspace_id', testSetup.workspace.id)
      .eq('name', 'Test Electronics Box');

    expect(error).toBeNull();
    expect(boxes).toHaveLength(1);
    expect(boxes![0].description).toBe('Cables, chargers, and old electronics components');
    expect(boxes![0].tags).toContain('electronics');
    expect(boxes![0].tags).toContain('cables');

    // Verify QR code was assigned
    if (testSetup.qrCodes.length > 0) {
      expect(boxes![0].qr_code_id).toBe(testSetup.qrCodes[0].id);

      // Verify QR code status changed to 'assigned'
      const { data: qrCode } = await adminClient
        .from('qr_codes')
        .select('status')
        .eq('id', testSetup.qrCodes[0].id)
        .single();

      expect(qrCode?.status).toBe('assigned');
    }
  });

  test('should create a box with minimal fields (name only)', async () => {
    // Navigate to new box form
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToNewBox();

    // Fill only the required name field
    const boxForm = new BoxFormPage(page);
    await boxForm.waitForForm();
    await boxForm.fillName('Minimal Box');

    // Submit form
    await boxForm.submitForm();

    // Wait for success
    await boxForm.waitForSuccess();
    await expect(page).toHaveURL('/app');

    // Verify box exists in database
    const adminClient = getAdminSupabaseClient();
    const { data: boxes } = await adminClient
      .from('boxes')
      .select('*')
      .eq('workspace_id', testSetup.workspace.id)
      .eq('name', 'Minimal Box');

    expect(boxes).toHaveLength(1);
    expect(boxes![0].description).toBeNull();
    expect(boxes![0].tags).toEqual([]);
    expect(boxes![0].location_id).toBeNull();
  });

  test('should show validation error for empty name', async () => {
    // Navigate to new box form
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToNewBox();

    // Try to submit form without filling name
    const boxForm = new BoxFormPage(page);
    await boxForm.waitForForm();

    // Attempt submission (name is empty)
    await boxForm.submitForm();

    // Should still be on the form page (not redirected)
    await expect(page).toHaveURL('/app/boxes/new');

    // Check for validation error
    const hasError = await boxForm.hasError('box-name');
    expect(hasError).toBeTruthy();

    // Verify no box was created
    const adminClient = getAdminSupabaseClient();
    const { data: boxes } = await adminClient
      .from('boxes')
      .select('*')
      .eq('workspace_id', testSetup.workspace.id);

    expect(boxes).toHaveLength(0);
  });

  test('should handle form cancellation', async () => {
    // Navigate to new box form
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToNewBox();

    // Fill some fields
    const boxForm = new BoxFormPage(page);
    await boxForm.waitForForm();
    await boxForm.fillName('Cancelled Box');

    // Click cancel button
    const cancelButton = page.locator('button', { hasText: /anuluj|cancel/i });
    await cancelButton.click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/app', { timeout: 5000 });

    // Verify no box was created
    const adminClient = getAdminSupabaseClient();
    const { data: boxes } = await adminClient
      .from('boxes')
      .select('*')
      .eq('workspace_id', testSetup.workspace.id)
      .eq('name', 'Cancelled Box');

    expect(boxes).toHaveLength(0);
  });
});
