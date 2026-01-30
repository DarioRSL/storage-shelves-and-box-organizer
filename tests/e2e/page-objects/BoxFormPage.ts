/**
 * Box Form Page Object
 *
 * Page Object Model for the box creation/edit form.
 * Provides reusable methods for interacting with form elements.
 *
 * Usage:
 * ```typescript
 * const boxForm = new BoxFormPage(page);
 * await boxForm.fillName('Test Box');
 * await boxForm.submitForm();
 * ```
 */

import type { Page, Locator } from "@playwright/test";

export class BoxFormPage {
  readonly page: Page;

  // Locators for form elements
  readonly form: Locator;
  readonly nameInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form locators using data-testid attributes
    this.form = page.locator('[data-testid="box-form"]');
    this.nameInput = page.locator('[data-testid="box-name-input"]');
    this.descriptionTextarea = page.locator('[data-testid="box-description-textarea"]');
    this.submitButton = page.locator('[data-testid="box-form-submit-button"]');
  }

  /**
   * Fill the box name field
   * @param name - Box name to enter
   */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /**
   * Fill the description textarea
   * @param description - Description text to enter
   */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionTextarea.fill(description);
  }

  /**
   * Add a tag to the box
   * Note: This is simplified - actual implementation depends on TagInput component behavior
   * @param tag - Tag to add
   */
  async addTag(tag: string): Promise<void> {
    // Use the input ID for reliable selection
    const tagInput = this.page.locator("#box-tags");
    await tagInput.fill(tag);
    await this.page.keyboard.press("Enter");
    // Wait for tag to be processed before next interaction
    await this.page.waitForTimeout(300);
  }

  /**
   * Select a location from the dropdown
   * Note: Actual implementation depends on LocationSelector component
   * @param locationName - Name of the location to select
   */
  async selectLocation(locationName: string): Promise<void> {
    // Find the location selector and select by visible text
    const locationSelector = this.page
      .locator('select, [role="combobox"]')
      .filter({ hasText: /location/i })
      .first();

    // Try to find and click the location by text
    const locationOption = this.page.locator(`text="${locationName}"`).first();
    if (await locationOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locationOption.click();
    }
  }

  /**
   * Select a QR code from the selector
   * @param qrCode - QR code to select (e.g., "QR-A1B2C3")
   */
  async selectQRCode(qrCode: string): Promise<void> {
    // Find the QR code selector
    const qrSelector = this.page.locator("select").filter({ has: this.page.locator("option", { hasText: qrCode }) });
    if (await qrSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qrSelector.selectOption({ label: qrCode });
    }
  }

  /**
   * Submit the form
   */
  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Wait for the form to be visible
   */
  async waitForForm(): Promise<void> {
    await this.form.waitFor({ state: "visible" });
  }

  /**
   * Wait for successful form submission (redirect to dashboard)
   */
  async waitForSuccess(): Promise<void> {
    // Wait for redirect to dashboard
    await this.page.waitForURL("/app", { timeout: 10000 });
  }

  /**
   * Check if form has a validation error
   * @param fieldName - Field to check for error (e.g., 'name', 'description')
   */
  async hasError(fieldName: string): Promise<boolean> {
    const errorLocator = this.page.locator(`[id="${fieldName}-error"]`);
    return await errorLocator.isVisible().catch(() => false);
  }

  /**
   * Get the error message for a field
   * @param fieldName - Field to get error for
   */
  async getError(fieldName: string): Promise<string | null> {
    const errorLocator = this.page.locator(`[id="${fieldName}-error"]`);
    if (await errorLocator.isVisible().catch(() => false)) {
      return await errorLocator.textContent();
    }
    return null;
  }
}
