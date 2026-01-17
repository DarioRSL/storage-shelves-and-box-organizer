/**
 * Integration Tests: Authentication - Delete Account
 *
 * Tests for:
 * - DELETE /api/auth/delete-account
 *
 * Coverage:
 * - Successful account deletion
 * - Cascade deletion of user data (workspaces, boxes, locations, QR codes)
 * - Session clearing after deletion
 * - Authentication requirements
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData, getTableCount } from "../../../helpers/db-setup";
import { createAuthenticatedUser } from "../../../helpers/auth-helper";
import { seedInitialDataset } from "../../../fixtures/initial-dataset";
import { authenticatedDelete, unauthenticatedGet, assertError } from "../../../helpers/api-client";
import { getAdminSupabaseClient } from "../../../helpers/supabase-test-client";

describe.skip("DELETE /api/auth/delete-account", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should delete user account with valid authentication", async () => {
      // Arrange: Create a test user
      const testUser = await createAuthenticatedUser({
        email: "delete-me@example.com",
        password: "SecurePass123!",
        full_name: "User To Delete",
      });

      const adminClient = getAdminSupabaseClient();

      // Verify user exists in database
      const { data: userBefore } = await adminClient.from("profiles").select("id").eq("id", testUser.id).single();
      expect(userBefore).toBeTruthy();

      // Act: Delete account
      const response = await authenticatedDelete("/api/auth/delete-account", testUser.token);

      // Assert: Should return 204 No Content
      expect(response.status).toBe(204);

      // Verify user is deleted from profiles table
      const { data: userAfter } = await adminClient.from("profiles").select("id").eq("id", testUser.id).single();
      expect(userAfter).toBeNull();
    });

    it.skip("should cascade delete all user workspaces", async () => {
      // Arrange: Create user with workspaces
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      const adminClient = getAdminSupabaseClient();

      // Verify workspaces exist
      const { data: workspacesBefore } = await adminClient.from("workspaces").select("id").eq("owner_id", adminUser.id);
      expect(workspacesBefore).toBeTruthy();
      expect(workspacesBefore!.length).toBeGreaterThan(0);

      // Act: Delete account
      const response = await authenticatedDelete("/api/auth/delete-account", adminUser.token);

      // Assert: Workspaces should be deleted
      expect(response.status).toBe(204);

      const { data: workspacesAfter } = await adminClient.from("workspaces").select("id").eq("owner_id", adminUser.id);
      expect(workspacesAfter).toEqual([]);
    });

    it("should cascade delete all workspace data (boxes, locations, QR codes)", async () => {
      // Arrange: Create full dataset
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();

      // Verify data exists
      const { data: boxesBefore } = await adminClient.from("boxes").select("id").eq("workspace_id", primaryWorkspaceId);
      expect(boxesBefore!.length).toBeGreaterThan(0);

      const { data: locationsBefore } = await adminClient
        .from("locations")
        .select("id")
        .eq("workspace_id", primaryWorkspaceId);
      expect(locationsBefore!.length).toBeGreaterThan(0);

      const { data: qrCodesBefore } = await adminClient
        .from("qr_codes")
        .select("id")
        .eq("workspace_id", primaryWorkspaceId);
      expect(qrCodesBefore!.length).toBeGreaterThan(0);

      // Act: Delete account
      const response = await authenticatedDelete("/api/auth/delete-account", adminUser.token);

      // Assert: All related data should be deleted via cascade
      expect(response.status).toBe(204);

      const { data: boxesAfter } = await adminClient.from("boxes").select("id").eq("workspace_id", primaryWorkspaceId);
      expect(boxesAfter).toEqual([]);

      const { data: locationsAfter } = await adminClient
        .from("locations")
        .select("id")
        .eq("workspace_id", primaryWorkspaceId);
      expect(locationsAfter).toEqual([]);

      const { data: qrCodesAfter } = await adminClient
        .from("qr_codes")
        .select("id")
        .eq("workspace_id", primaryWorkspaceId);
      expect(qrCodesAfter).toEqual([]);
    });

    it("should clear session cookie after account deletion", async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: "delete-session@example.com",
        password: "SecurePass123!",
        full_name: "Delete Session User",
      });

      // Act: Delete account
      const response = await authenticatedDelete("/api/auth/delete-account", testUser.token);

      // Assert: Response should indicate session cleared
      expect(response.status).toBe(204);

      // Try to use the token after deletion - should fail
      const verifyResponse = await unauthenticatedGet("/api/profiles/me");
      assertError(verifyResponse, 401);
    });

    it("should not affect other users workspaces", async () => {
      // Arrange: Create dataset with multiple users
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const memberUser = dataset.users.member;

      const adminClient = getAdminSupabaseClient();

      // Count member's workspaces before deletion
      const { data: memberWorkspacesBefore } = await adminClient
        .from("workspaces")
        .select("id")
        .eq("owner_id", memberUser.id);
      const memberWorkspaceCount = memberWorkspacesBefore!.length;

      // Act: Delete admin account
      const response = await authenticatedDelete("/api/auth/delete-account", adminUser.token);

      // Assert: Member's workspaces should remain untouched
      expect(response.status).toBe(204);

      const { data: memberWorkspacesAfter } = await adminClient
        .from("workspaces")
        .select("id")
        .eq("owner_id", memberUser.id);
      expect(memberWorkspacesAfter!.length).toBe(memberWorkspaceCount);
    });
  });

  describe.skip("Authentication Errors (401)", () => {
    it("should reject deletion without authentication", async () => {
      // Act: Try to delete without token
      const response = await authenticatedDelete("/api/auth/delete-account", "");

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject deletion with invalid token", async () => {
      // Act: Try to delete with fake token
      const response = await authenticatedDelete("/api/auth/delete-account", "invalid.jwt.token");

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Error Cases (404)", () => {
    it("should handle deletion of already deleted user gracefully", async () => {
      // Arrange: Create and delete user
      const testUser = await createAuthenticatedUser({
        email: "double-delete@example.com",
        password: "SecurePass123!",
        full_name: "Double Delete User",
      });

      // First deletion
      await authenticatedDelete("/api/auth/delete-account", testUser.token);

      // Act: Try to delete again with same token
      const response = await authenticatedDelete("/api/auth/delete-account", testUser.token);

      // Assert: Should return 401 (unauthorized) because token is invalid after deletion
      // or 404 (not found) depending on implementation
      expect([401, 404]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });
  });
});
