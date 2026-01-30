/**
 * Integration Tests: Workspace Member Management
 *
 * Tests for:
 * - GET /api/workspaces/:id/members - List workspace members
 * - POST /api/workspaces/:id/members - Add member
 * - PATCH /api/workspaces/:id/members/:user_id - Update member role
 * - DELETE /api/workspaces/:id/members/:user_id - Remove member
 *
 * Coverage:
 * - Member listing and management
 * - Role-based permissions (owner/member/read_only)
 * - Owner protection (cannot be removed or demoted)
 * - Authorization enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData } from "../../../helpers/db-setup";
import { createAuthenticatedUser } from "../../../helpers/auth-helper";
import { seedInitialDataset } from "../../../fixtures/initial-dataset";
import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPatch,
  authenticatedDelete,
  assertSuccess,
  assertError,
} from "../../../helpers/api-client";
import { getAdminSupabaseClient } from "../../../helpers/supabase-test-client";

describe.skip("GET /api/workspaces/:id/members", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should list all workspace members", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}/members`, adminUser.token);

      // Assert
      assertSuccess(response);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3); // admin, member, viewer

      // Verify member structure
      const member = response.body[0];
      expect(member).toHaveProperty("user_id");
      expect(member).toHaveProperty("workspace_id");
      expect(member).toHaveProperty("role");
      expect(member).toHaveProperty("created_at");
    });

    it("should include user details for each member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}/members`, adminUser.token);

      // Assert: Members should include user profile data
      assertSuccess(response);
      const member = response.body.find((m: any) => m.user_id === dataset.users.admin.id);
      expect(member).toBeTruthy();
      expect(member.role).toBe("owner");
    });

    it("should allow any member to view member list", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const viewerUser = dataset.users.viewer; // read_only role
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Even read-only member can view list
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}/members`, viewerUser.token);

      // Assert
      assertSuccess(response);
      expect(response.body.length).toBe(3);
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject request by non-member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const outsider = await createAuthenticatedUser({
        email: "outsider-list@example.com",
        password: "SecurePass123!",
        full_name: "Outsider List User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(`/api/workspaces/${workspaceId}/members`, outsider.token);

      // Assert
      assertError(response, 403);
    });
  });
});

describe.skip("POST /api/workspaces/:id/members", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should add member as owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin; // owner
      const newUser = await createAuthenticatedUser({
        email: "new-member@example.com",
        password: "SecurePass123!",
        full_name: "New Member User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: newUser.id,
        role: "member",
      });

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(201);
      expect(response.body.user_id).toBe(newUser.id);
      expect(response.body.role).toBe("member");
      expect(response.body.workspace_id).toBe(workspaceId);
    });

    it("should add member with read_only role", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const newUser = await createAuthenticatedUser({
        email: "readonly-member@example.com",
        password: "SecurePass123!",
        full_name: "Read Only Member",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: newUser.id,
        role: "read_only",
      });

      // Assert
      assertSuccess(response);
      expect(response.body.role).toBe("read_only");
    });

    it("should persist member in database", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const newUser = await createAuthenticatedUser({
        email: "persist-member@example.com",
        password: "SecurePass123!",
        full_name: "Persist Member",
      });
      const workspaceId = dataset.workspaces.primary.id;
      const adminClient = getAdminSupabaseClient();

      // Act
      await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: newUser.id,
        role: "member",
      });

      // Assert: Verify in database
      const { data: member } = await adminClient
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", newUser.id)
        .single();

      expect(member).toBeTruthy();
      expect(member!.role).toBe("member");
    });
  });

  describe.skip("Validation Errors (400)", () => {
    it("should reject invalid user_id", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Try with invalid UUID
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: "not-a-valid-uuid",
        role: "member",
      });

      // Assert
      assertError(response, 400);
    });

    it("should reject invalid role", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const newUser = await createAuthenticatedUser({
        email: "invalid-role@example.com",
        password: "SecurePass123!",
        full_name: "Invalid Role User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Try with invalid role
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: newUser.id,
        role: "invalid_role",
      });

      // Assert
      assertError(response, 400);
    });

    it("should reject missing user_id", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        role: "member",
      });

      // Assert
      assertError(response, 400);
    });

    it("should reject missing role", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const newUser = await createAuthenticatedUser({
        email: "missing-role@example.com",
        password: "SecurePass123!",
        full_name: "Missing Role User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: newUser.id,
      });

      // Assert
      assertError(response, 400);
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject member addition by non-owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member; // member role, not owner
      const newUser = await createAuthenticatedUser({
        email: "unauthorized-add@example.com",
        password: "SecurePass123!",
        full_name: "Unauthorized Add User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Member tries to add another member
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, memberUser.token, {
        user_id: newUser.id,
        role: "member",
      });

      // Assert
      assertError(response, 403);
    });

    it("should reject adding owner role by non-owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member;
      const newUser = await createAuthenticatedUser({
        email: "owner-attempt@example.com",
        password: "SecurePass123!",
        full_name: "Owner Attempt User",
      });
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Try to add someone as owner (should fail - only owner can do this)
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, memberUser.token, {
        user_id: newUser.id,
        role: "owner",
      });

      // Assert
      assertError(response, 403);
    });
  });

  describe.skip("Conflict Errors (409)", () => {
    it("should reject duplicate member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const memberUser = dataset.users.member; // already a member
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Try to add existing member
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: memberUser.id,
        role: "member",
      });

      // Assert
      assertError(response, 409);
      expect(response.body.error).toMatch(/already.*member/i);
    });
  });

  describe.skip("Not Found Errors (404)", () => {
    it("should reject non-existent user", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;
      const fakeUserId = "00000000-0000-0000-0000-000000000000";

      // Act
      const response = await authenticatedPost(`/api/workspaces/${workspaceId}/members`, adminUser.token, {
        user_id: fakeUserId,
        role: "member",
      });

      // Assert
      assertError(response, 404);
    });
  });
});

describe.skip("PATCH /api/workspaces/:id/members/:user_id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should update member role as owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const memberUser = dataset.users.member;
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Change member to read_only
      const response = await authenticatedPatch(
        `/api/workspaces/${workspaceId}/members/${memberUser.id}`,
        adminUser.token,
        { role: "read_only" }
      );

      // Assert
      assertSuccess(response);
      expect(response.body.role).toBe("read_only");
    });

    it("should promote member to owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const memberUser = dataset.users.member;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(
        `/api/workspaces/${workspaceId}/members/${memberUser.id}`,
        adminUser.token,
        { role: "owner" }
      );

      // Assert
      assertSuccess(response);
      expect(response.body.role).toBe("owner");
    });
  });

  describe.skip("Validation Errors (400)", () => {
    it("should reject invalid role", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const memberUser = dataset.users.member;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPatch(
        `/api/workspaces/${workspaceId}/members/${memberUser.id}`,
        adminUser.token,
        { role: "invalid_role" }
      );

      // Assert
      assertError(response, 400);
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject role update by non-owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member;
      const viewerUser = dataset.users.viewer;
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Member tries to change viewer's role
      const response = await authenticatedPatch(
        `/api/workspaces/${workspaceId}/members/${viewerUser.id}`,
        memberUser.token,
        { role: "member" }
      );

      // Assert
      assertError(response, 403);
    });

    it("should prevent demoting the last owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin; // only owner
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Try to demote self when only owner
      const response = await authenticatedPatch(
        `/api/workspaces/${workspaceId}/members/${adminUser.id}`,
        adminUser.token,
        { role: "member" }
      );

      // Assert: Should fail - cannot remove last owner
      assertError(response, 403);
      expect(response.body.error).toMatch(/last owner/i);
    });
  });
});

describe.skip("DELETE /api/workspaces/:id/members/:user_id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should remove member as owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const viewerUser = dataset.users.viewer;
      const workspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedDelete(
        `/api/workspaces/${workspaceId}/members/${viewerUser.id}`,
        adminUser.token
      );

      // Assert
      expect(response.status).toBe(204);
    });

    it("should allow member to remove themselves", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member;
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Member removes themselves
      const response = await authenticatedDelete(
        `/api/workspaces/${workspaceId}/members/${memberUser.id}`,
        memberUser.token
      );

      // Assert
      expect(response.status).toBe(204);
    });

    it("should remove member from database", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const memberUser = dataset.users.member;
      const workspaceId = dataset.workspaces.primary.id;
      const adminClient = getAdminSupabaseClient();

      // Act
      await authenticatedDelete(`/api/workspaces/${workspaceId}/members/${memberUser.id}`, adminUser.token);

      // Assert: Verify removed from database
      const { data: member } = await adminClient
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", memberUser.id)
        .single();

      expect(member).toBeNull();
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject member removal by non-owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member; // not owner
      const viewerUser = dataset.users.viewer;
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Member tries to remove viewer
      const response = await authenticatedDelete(
        `/api/workspaces/${workspaceId}/members/${viewerUser.id}`,
        memberUser.token
      );

      // Assert
      assertError(response, 403);
    });

    it.skip("should prevent owner from removing themselves when last owner", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin; // only owner
      const workspaceId = dataset.workspaces.primary.id;

      // Act: Owner tries to remove themselves
      const response = await authenticatedDelete(
        `/api/workspaces/${workspaceId}/members/${adminUser.id}`,
        adminUser.token
      );

      // Assert
      assertError(response, 403);
      expect(response.body.error).toMatch(/last owner/i);
    });
  });

  describe.skip("Not Found Errors (404)", () => {
    it("should return 404 for non-existent member", async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const workspaceId = dataset.workspaces.primary.id;
      const fakeUserId = "00000000-0000-0000-0000-000000000000";

      // Act
      const response = await authenticatedDelete(
        `/api/workspaces/${workspaceId}/members/${fakeUserId}`,
        adminUser.token
      );

      // Assert
      assertError(response, 404);
    });
  });
});
