/**
 * Integration Tests: Workspace Detail Operations
 *
 * Tests for:
 * - GET /api/workspaces/:id - Get workspace details
 * - PATCH /api/workspaces/:id - Update workspace
 * - DELETE /api/workspaces/:id - Delete workspace
 *
 * Coverage:
 * - Workspace retrieval with member list
 * - Workspace updates (owner-only operations)
 * - Workspace deletion with cascade
 * - RLS policy enforcement
 * - Authorization (owner vs member permissions)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData } from "../../../helpers/db-setup";
import { createAuthenticatedUser } from "../../../helpers/auth-helper";
import { seedInitialDataset } from "../../../fixtures/initial-dataset";
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedDelete,
  assertSuccess,
  assertError,
} from "../../../helpers/api-client";
import { getAdminSupabaseClient } from "../../../helpers/supabase-test-client";

describe.skip("GET /api/workspaces/:id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should return workspace details for member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}`, adminUser.token);

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workspaceId);
      expect(response.body.name).toBe("Primary Test Workspace");
      expect(response.body).toHaveProperty("owner_id");
      expect(response.body).toHaveProperty("created_at");
      expect(response.body).toHaveProperty("updated_at");
    });

    it.skip("should include member list in workspace details", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}`, adminUser.token);

      // Assert: Should include members array
      assertSuccess(response);
      expect(response.body).toHaveProperty("members");
      expect(Array.isArray(response.body.members)).toBe(true);
      expect(response.body.members.length).toBeGreaterThan(0);

      // Verify member structure
      const member = response.body.members[0];
      expect(member).toHaveProperty("user_id");
      expect(member).toHaveProperty("role");
      expect(["owner", "member", "read_only"]).toContain(member.role);
    });

    it.skip("should allow different roles to view workspace", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const viewerUser = dataset.users.viewer; // read_only role
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Viewer can view workspace
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}`, viewerUser.token);

      // Assert
      assertSuccess(response);
      expect(response.body.id).toBe(workspaceId);
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject access by non-member", async () => {
      // Arrange: Create dataset and separate user
      const dataset = await seedInitialDataset();
      const outsider = await createAuthenticatedUser({
        email: "outsider@example.com",
        password: "SecurePass123!",
        full_name: "Outsider User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Outsider tries to access workspace
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}`, outsider.token);

      // Assert
      assertError(response, 403);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe.skip("Authentication Errors (401)", () => {
    it("should reject request without authentication", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}`, "");

      // Assert
      assertError(response, 401);
    });
  });

  describe.skip("Not Found Errors (404)", () => {
    it("should return 404 for non-existent workspace", async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: "notfound@example.com",
        password: "SecurePass123!",
        full_name: "Not Found User",
      });
      const fakeWorkspaceId = "00000000-0000-0000-0000-000000000000";

      // Act
      const response = await authenticatedGet(`/api/workspaces/${fakeWorkspaceId}`, testUser.token);

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty("error");
    });
  });
});

describe.skip("PATCH /api/workspaces/:id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should update workspace name as owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin; // owner
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, {
        name: "Updated Workspace Name",
      });

      // Assert
      assertSuccess(response);
      expect(response.body.name).toBe("Updated Workspace Name");
    });

    it("should update workspace description as owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, {
        description: "Updated description text",
      });

      // Assert
      assertSuccess(response);
      expect(response.body.description).toBe("Updated description text");
    });

    it("should update both name and description together", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, {
        name: "New Name",
        description: "New Description",
      });

      // Assert
      assertSuccess(response);
      expect(response.body.name).toBe("New Name");
      expect(response.body.description).toBe("New Description");
    });

    it("should persist changes in database", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;
      const adminClient = getAdminSupabaseClient();

      // Act
      await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, { name: "Persisted Name" });

      // Assert: Verify in database
      const { data: workspace } = await adminClient.from("workspaces").select("name").eq("id", workspaceId).single();

      expect(workspace).toBeTruthy();
      expect(workspace!.name).toBe("Persisted Name");
    });

    it("should update updated_at timestamp", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;
      const adminClient = getAdminSupabaseClient();

      // Get initial timestamp
      const { data: before } = await adminClient.from("workspaces").select("updated_at").eq("id", workspaceId).single();

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act
      await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, { name: "Updated Name" });

      // Assert: Timestamp should change
      const { data: after } = await adminClient.from("workspaces").select("updated_at").eq("id", workspaceId).single();

      expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(new Date(before!.updated_at).getTime());
    });
  });

  describe.skip("Validation Errors (400)", () => {
    it("should reject empty workspace name", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, { name: "" });

      // Assert
      assertError(response, 400);
    });

    it("should reject name exceeding max length", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, {
        name: "A".repeat(101),
      });

      // Assert
      assertError(response, 400);
    });

    it("should reject description exceeding max length", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, adminUser.token, {
        description: "A".repeat(501),
      });

      // Assert
      assertError(response, 400);
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject update by non-owner member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member; // member role, not owner
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Member tries to update
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, memberUser.token, {
        name: "Unauthorized Update",
      });

      // Assert
      assertError(response, 403);
    });

    it("should reject update by read-only member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const viewerUser = dataset.users.viewer; // read_only role
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, viewerUser.token, {
        name: "Viewer Update Attempt",
      });

      // Assert
      assertError(response, 403);
    });

    it("should reject update by non-member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const outsider = await createAuthenticatedUser({
        email: "outsider-update@example.com",
        password: "SecurePass123!",
        full_name: "Outsider Update User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${workspaceId}`, outsider.token, {
        name: "Outsider Update",
      });

      // Assert
      assertError(response, 403);
    });
  });

  describe.skip("Not Found Errors (404)", () => {
    it("should return 404 for non-existent workspace", async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: "update-notfound@example.com",
        password: "SecurePass123!",
        full_name: "Update Not Found User",
      });
      const fakeId = "00000000-0000-0000-0000-000000000000";

      // Act
      const response = await authenticatedPatch(`/api/workspaces/${fakeId}`, testUser.token, {
        name: "New Name",
      });

      // Assert
      assertError(response, 404);
    });
  });
});

describe.skip("DELETE /api/workspaces/:id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should delete workspace as owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin; // owner
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedDelete(`/api/workspaces/${workspaceId}`, adminUser.token);

      // Assert
      expect(response.status).toBe(204);
    });

    it("should cascade delete all workspace data", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;
      const adminClient = getAdminSupabaseClient();

      // Verify data exists before deletion
      const { data: boxesBefore } = await adminClient.from("boxes").select("id").eq("workspace_id", workspaceId);
      expect(boxesBefore!.length).toBeGreaterThan(0);

      const { data: locationsBefore } = await adminClient
        .from("locations")
        .select("id")
        .eq("workspace_id", workspaceId);
      expect(locationsBefore!.length).toBeGreaterThan(0);

      // Act: Delete workspace
      const response = await authenticatedDelete(`/api/workspaces/${workspaceId}`, adminUser.token);

      expect(response.status).toBe(204);

      // Assert: All related data should be deleted
      const { data: workspaceAfter } = await adminClient.from("workspaces").select("id").eq("id", workspaceId).single();
      expect(workspaceAfter).toBeNull();

      const { data: boxesAfter } = await adminClient.from("boxes").select("id").eq("workspace_id", workspaceId);
      expect(boxesAfter).toEqual([]);

      const { data: locationsAfter } = await adminClient.from("locations").select("id").eq("workspace_id", workspaceId);
      expect(locationsAfter).toEqual([]);
    });

    it("should not affect other workspaces", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;
      const secondaryWorkspaceId = dataset.workspaces.secondary.id;
      const adminClient = getAdminSupabaseClient();

      // Act: Delete primary workspace
      await authenticatedDelete(`/api/workspaces/${primaryWorkspaceId}`, adminUser.token);

      // Assert: Secondary workspace should still exist
      const { data: secondaryWorkspace } = await adminClient
        .from("workspaces")
        .select("id")
        .eq("id", secondaryWorkspaceId)
        .single();

      expect(secondaryWorkspace).toBeTruthy();
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject deletion by non-owner member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member; // member role
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedDelete(`/api/workspaces/${workspaceId}`, memberUser.token);

      // Assert
      assertError(response, 403);
    });

    it("should reject deletion by read-only member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const viewerUser = dataset.users.viewer;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedDelete(`/api/workspaces/${workspaceId}`, viewerUser.token);

      // Assert
      assertError(response, 403);
    });

    it("should reject deletion by non-member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const outsider = await createAuthenticatedUser({
        email: "outsider-delete@example.com",
        password: "SecurePass123!",
        full_name: "Outsider Delete User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedDelete(`/api/workspaces/${workspaceId}`, outsider.token);

      // Assert
      assertError(response, 403);
    });
  });

  describe.skip("Not Found Errors (404)", () => {
    it("should return 404 for non-existent workspace", async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: "delete-notfound@example.com",
        password: "SecurePass123!",
        full_name: "Delete Not Found User",
      });
      const fakeId = "00000000-0000-0000-0000-000000000000";

      // Act
      const response = await authenticatedDelete(`/api/workspaces/${fakeId}`, testUser.token);

      // Assert
      assertError(response, 404);
    });
  });
});
