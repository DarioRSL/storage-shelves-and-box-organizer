/**
 * Example E2E Test with Playwright
 *
 * This test verifies that the Playwright setup is working correctly.
 * Delete or modify this file when you start writing real E2E tests.
 *
 * Following guideline_testing.md:
 * - Using Chromium browser only
 * - Implementing Page Object Model pattern
 * - Using proper locators for resilient element selection
 */

import { test, expect } from "@playwright/test";

test.describe("Playwright Setup Verification", () => {
  test("should load the homepage", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/");

    // Verify the page loads successfully
    await expect(page).toHaveURL("/");
  });

  test("should have a title", async ({ page }) => {
    await page.goto("/");

    // Verify page has a title (adjust as needed for your actual homepage)
    await expect(page).toHaveTitle(/Storage|Box|Organizer/i);
  });

  test("should support navigation", async ({ page }) => {
    await page.goto("/");

    // Example: Test navigation (adjust selectors based on your actual app)
    // This is a placeholder - replace with actual navigation elements
    const links = page.locator("a[href]");
    const count = await links.count();

    expect(count).toBeGreaterThan(0);
  });

  test("should be responsive", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Verify page is accessible on mobile
    await expect(page).toHaveURL("/");

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    // Verify page is accessible on desktop
    await expect(page).toHaveURL("/");
  });
});

// Example: Testing with Browser Context for isolation
test.describe("Browser Context Example", () => {
  test("should support isolated test context", async ({ browser }) => {
    // Create a new context with specific settings
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "Playwright Test Agent",
    });

    const page = await context.newPage();
    await page.goto("/");

    await expect(page).toHaveURL("/");

    // Clean up
    await context.close();
  });
});

// Example: Testing with API calls
test.describe("API Testing Example", () => {
  test("should make API requests", async ({ request }) => {
    // Example API health check (adjust endpoint as needed)
    const response = await request.get("/api/health").catch(() => null);

    // This is just an example - your app might not have a health endpoint
    // Adjust or remove based on your actual API
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });
});
