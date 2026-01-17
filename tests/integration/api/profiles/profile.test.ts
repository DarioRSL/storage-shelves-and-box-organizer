/**
 * Integration Tests: User Profiles
 *
 * Tests for:
 * - GET /api/profiles/me
 * - PATCH /api/profiles/me/theme
 *
 * Coverage:
 * - Retrieve current user profile
 * - Update theme preference (light, dark, system)
 * - Authentication requirements
 * - Validation errors
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { clearAllTestData } from "../../../helpers/db-setup";
import { createAuthenticatedUser, type TestUser } from "../../../helpers/auth-helper";
import {
  authenticatedGet,
  authenticatedPatch,
  unauthenticatedGet,
  assertSuccess,
  assertError,
} from "../../../helpers/api-client";
import { getAdminSupabaseClient } from "../../../helpers/supabase-test-client";

describe.skip("GET /api/profiles/me", () => {
  // SHARED USER - created once, reused across all tests
  let testUser: TestUser;

  beforeAll(async () => {
    await clearAllTestData();
    // Create user ONCE for all tests in this describe block
    testUser = await createAuthenticatedUser({
      email: "profile-test@example.com",
      password: "SecurePass123!",
      full_name: "Profile Test User",
    });
  });

  afterAll(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should return current user profile with authentication", async () => {
      // Act: Get profile
      const response = await authenticatedGet("/api/profiles/me", testUser.token);

      // Assert: Should return profile data
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body.id).toBe(testUser.id);
      expect(response.body).toHaveProperty("email");
      expect(response.body).toHaveProperty("full_name");
    });

    it("should include theme preference in profile data", async () => {
      // Act
      const response = await authenticatedGet("/api/profiles/me", testUser.token);

      // Assert: Theme should be present (default or set)
      assertSuccess(response);
      expect(response.body).toHaveProperty("theme_preference");
      expect(["light", "dark", "system"]).toContain(response.body.theme_preference);
    });

    it("should return profile with all expected fields", async () => {
      // Act
      const response = await authenticatedGet("/api/profiles/me", testUser.token);

      // Assert: Check all expected profile fields
      assertSuccess(response);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("email");
      expect(response.body).toHaveProperty("full_name");
      expect(response.body).toHaveProperty("theme_preference");
      expect(response.body).toHaveProperty("created_at");
      expect(response.body).toHaveProperty("updated_at");
    });
  });

  describe.skip("Authentication Errors (401)", () => {
    it("should reject request without authentication token", async () => {
      // Act: Try to get profile without authentication
      const response = await unauthenticatedGet("/api/profiles/me");

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject request with invalid token", async () => {
      // Act: Try with fake token
      const response = await authenticatedGet("/api/profiles/me", "invalid.jwt.token");

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });
  });
});

describe.skip("PATCH /api/profiles/me/theme", () => {
  // SHARED USER - created once, reused across all tests
  let testUser: TestUser;
  const adminClient = getAdminSupabaseClient();

  beforeAll(async () => {
    await clearAllTestData();
    // Create user ONCE for all tests in this describe block
    testUser = await createAuthenticatedUser({
      email: "theme-test@example.com",
      password: "SecurePass123!",
      full_name: "Theme Test User",
    });
  });

  // Reset theme to default before each test
  beforeEach(async () => {
    await adminClient.from("profiles").update({ theme_preference: "system" }).eq("id", testUser.id);
  });

  afterAll(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should update theme to light", async () => {
      // Act: Update theme to light
      const response = await authenticatedPatch("/api/profiles/me/theme", testUser.token, {
        theme_preference: "light",
      });

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("theme_preference");
      expect(response.body.theme_preference).toBe("light");
    });

    it("should update theme to dark", async () => {
      // Act
      const response = await authenticatedPatch("/api/profiles/me/theme", testUser.token, { theme_preference: "dark" });

      // Assert
      assertSuccess(response);
      expect(response.body.theme_preference).toBe("dark");
    });

    it("should update theme to system", async () => {
      // Act
      const response = await authenticatedPatch("/api/profiles/me/theme", testUser.token, {
        theme_preference: "system",
      });

      // Assert
      assertSuccess(response);
      expect(response.body.theme_preference).toBe("system");
    });

    it("should persist theme change in database", async () => {
      // Act: Update theme
      await authenticatedPatch("/api/profiles/me/theme", testUser.token, {
        theme_preference: "dark",
      });

      // Assert: Verify in database
      const { data: profile } = await adminClient
        .from("profiles")
        .select("theme_preference")
        .eq("id", testUser.id)
        .single();

      expect(profile).toBeTruthy();
      expect(profile!.theme_preference).toBe("dark");
    });

    it("should update updated_at timestamp", async () => {
      // Get initial timestamp
      const { data: profileBefore } = await adminClient
        .from("profiles")
        .select("updated_at")
        .eq("id", testUser.id)
        .single();

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act: Update theme
      await authenticatedPatch("/api/profiles/me/theme", testUser.token, {
        theme_preference: "light",
      });

      // Assert: updated_at should be different
      const { data: profileAfter } = await adminClient
        .from("profiles")
        .select("updated_at")
        .eq("id", testUser.id)
        .single();

      expect(profileAfter!.updated_at).not.toBe(profileBefore!.updated_at);
      expect(new Date(profileAfter!.updated_at).getTime()).toBeGreaterThan(
        new Date(profileBefore!.updated_at).getTime()
      );
    });
  });

  describe.skip("Validation Errors (400)", () => {
    it("should reject invalid theme value", async () => {
      // Act: Try to set invalid theme
      const response = await authenticatedPatch("/api/profiles/me/theme", testUser.token, {
        theme_preference: "invalid-value",
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject missing theme field", async () => {
      // Act: Try to update without theme field
      const response = await authenticatedPatch("/api/profiles/me/theme", testUser.token, {});

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject empty theme value", async () => {
      // Act
      const response = await authenticatedPatch("/api/profiles/me/theme", testUser.token, { theme_preference: "" });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject null theme value", async () => {
      // Act
      const response = await authenticatedPatch("/api/profiles/me/theme", testUser.token, { theme_preference: null });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe.skip("Authentication Errors (401)", () => {
    it("should reject theme update without authentication", async () => {
      // Act: Try to update without token
      const response = await authenticatedPatch("/api/profiles/me/theme", "", {
        theme_preference: "dark",
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject theme update with invalid token", async () => {
      // Act: Try with fake token
      const response = await authenticatedPatch("/api/profiles/me/theme", "invalid.jwt.token", {
        theme_preference: "dark",
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
