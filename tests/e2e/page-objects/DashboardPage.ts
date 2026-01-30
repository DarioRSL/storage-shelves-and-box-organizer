/**
 * Dashboard Page Object
 *
 * Page Object Model for the main dashboard page.
 * Provides reusable methods for navigating and interacting with dashboard elements.
 *
 * Usage:
 * ```typescript
 * const dashboard = new DashboardPage(page);
 * await dashboard.navigateToNewBox();
 * await dashboard.findBoxByName('Test Box');
 * ```
 */

import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;

  // Locators for dashboard elements
  readonly newBoxButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Dashboard element locators
    this.newBoxButton = page.locator('[data-testid="new-box-button"]');
  }

  /**
   * Navigate to the new box form
   * Clicks the "Dodaj pudełko" button
   */
  async navigateToNewBox(): Promise<void> {
    await this.newBoxButton.click();
    // Wait for navigation to complete
    await this.page.waitForURL("/app/boxes/new", { timeout: 10000 });
  }

  /**
   * Find a box by its name in the dashboard
   * @param name - Name of the box to find
   * @returns Locator for the box element
   */
  findBoxByName(name: string): Locator {
    // Look for box name within the box list
    return this.page.locator('[data-testid="box-list"]').locator('[data-testid="box-name"]', { hasText: name }).first();
  }

  /**
   * Open the context menu for a specific box
   * @param boxName - Name of the box
   */
  async openBoxMenu(boxName: string): Promise<void> {
    const boxElement = this.findBoxByName(boxName);

    // Find the box item container and then the menu button within it
    const boxItem = boxElement.locator("..").locator("..").locator(".."); // Navigate up to article element
    const menuButton = boxItem.locator('[data-testid="box-menu-button"]');

    await menuButton.click();
  }

  /**
   * Click the delete button for a box
   * Assumes the menu is already open
   */
  async clickDeleteBox(): Promise<void> {
    // Use the delete button test ID
    const deleteButton = this.page.locator('[data-testid="box-delete-button"]');
    await deleteButton.click();
  }

  /**
   * Confirm the deletion in the confirmation dialog
   * Handles text confirmation requirement
   */
  async confirmDelete(): Promise<void> {
    // Wait for confirmation dialog to appear
    const dialog = this.page.locator('[data-testid="delete-confirmation-dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 5000 });

    // Type confirmation text if required
    const confirmationInput = dialog.locator("input#confirmation-input");
    if (await confirmationInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Get the confirmation text from the label
      const labelText = await dialog.locator('label[for="confirmation-input"] span').textContent();
      if (labelText) {
        await confirmationInput.fill(labelText.trim());
      }
    }

    // Click confirm button
    const confirmButton = dialog.locator('[data-testid="confirm-delete-button"]');
    await confirmButton.click();
  }

  /**
   * Wait for a box to disappear from the list
   * Useful after deletion
   * @param boxName - Name of the box that should disappear
   */
  async waitForBoxToDisappear(boxName: string): Promise<void> {
    const box = this.findBoxByName(boxName);
    await box.waitFor({ state: "hidden", timeout: 10000 });
  }

  /**
   * Search for boxes using the search input
   * @param query - Search query
   */
  async searchBoxes(query: string): Promise<void> {
    const searchInput = this.page.locator('[data-testid="search-input"], input[type="search"]').first();
    await searchInput.fill(query);

    // Wait for search results to update
    await this.page.waitForTimeout(500); // Debounce
  }

  /**
   * Clear the search input
   */
  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator('[data-testid="search-input"], input[type="search"]').first();
    await searchInput.fill("");

    // Wait for results to reset
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the count of visible boxes in the list
   * @returns Number of boxes visible
   */
  async getBoxCount(): Promise<number> {
    const boxes = this.page.locator('[data-testid="box-list"] > *');
    return await boxes.count();
  }

  /**
   * Check if the dashboard has loaded successfully
   */
  async waitForDashboardLoad(): Promise<void> {
    // Wait for the new box button to be visible (indicates dashboard loaded)
    await this.newBoxButton.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Navigate to the dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto("/app");
    await this.waitForDashboardLoad();
  }
}
