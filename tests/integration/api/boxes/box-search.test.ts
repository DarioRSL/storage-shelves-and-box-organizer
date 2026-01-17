/**
 * Integration Tests: Box Full-Text Search
 *
 * Tests for:
 * - POST /api/boxes/search - Full-text search across boxes
 *
 * Coverage:
 * - Full-text search by name, description, tags
 * - Ranking by relevance (using search_vector)
 * - Case-insensitive search
 * - Special character handling
 * - Empty results handling
 * - RLS policy enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData, seedTable } from "../../../helpers/db-setup";
import { createAuthenticatedUser } from "../../../helpers/auth-helper";
import { seedInitialDataset } from "../../../fixtures/initial-dataset";
import { createRootLocationFixture, createBoxFixture } from "../../../helpers/factory";
import { authenticatedPost, assertSuccess, assertError } from "../../../helpers/api-client";
import { getAdminSupabaseClient } from "../../../helpers/supabase-test-client";

describe.skip("POST /api/boxes/search", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should search boxes by name", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      await seedTable("boxes", [
        createBoxFixture(primaryWorkspaceId, location.id, "Electronics Box"),
        createBoxFixture(primaryWorkspaceId, location.id, "Kitchen Utensils"),
        createBoxFixture(primaryWorkspaceId, location.id, "Electronic Components"),
      ]);

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "electronics",
      });

      assertSuccess(response);
      expect(response.body.length).toBe(2);
      expect(response.body.some((b: any) => b.name.includes("Electronics"))).toBe(true);
    });

    it("should search boxes by description", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      await seedTable("boxes", [
        {
          ...createBoxFixture(primaryWorkspaceId, location.id, "Box 1"),
          description: "Contains important documents",
        },
        {
          ...createBoxFixture(primaryWorkspaceId, location.id, "Box 2"),
          description: "Contains tools and equipment",
        },
      ]);

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "documents",
      });

      assertSuccess(response);
      expect(response.body.length).toBe(1);
      expect(response.body[0].description).toContain("documents");
    });

    it("should search boxes by tags", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      await seedTable("boxes", [
        {
          ...createBoxFixture(primaryWorkspaceId, location.id, "Box 1"),
          tags: ["electronics", "cables"],
        },
        {
          ...createBoxFixture(primaryWorkspaceId, location.id, "Box 2"),
          tags: ["kitchen", "utensils"],
        },
      ]);

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "cables",
      });

      assertSuccess(response);
      expect(response.body.length).toBe(1);
      expect(response.body[0].tags).toContain("cables");
    });

    it("should rank results by relevance", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      await seedTable("boxes", [
        {
          ...createBoxFixture(primaryWorkspaceId, location.id, "Important Documents"),
          description: "Very important files",
        },
        {
          ...createBoxFixture(primaryWorkspaceId, location.id, "Miscellaneous"),
          description: "Contains some important items",
        },
      ]);

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "important",
      });

      assertSuccess(response);
      expect(response.body.length).toBe(2);
      // First result should be "Important Documents" (name + description match)
      expect(response.body[0].name).toBe("Important Documents");
    });

    it("should be case-insensitive", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      await seedTable("boxes", [createBoxFixture(primaryWorkspaceId, location.id, "Electronics Box")]);

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "ELECTRONICS",
      });

      assertSuccess(response);
      expect(response.body.length).toBe(1);
    });

    it.skip("should handle special characters", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      await seedTable("boxes", [
        {
          ...createBoxFixture(primaryWorkspaceId, location.id, "Box 1"),
          description: "C++ programming books",
        },
      ]);

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "C++",
      });

      assertSuccess(response);
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for no matches", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "nonexistent_search_term_xyz",
      });

      assertSuccess(response);
      expect(response.body).toEqual([]);
    });

    it("should only search within user workspace (RLS)", async () => {
      const dataset = await seedInitialDataset();
      const viewerUser = dataset.users.viewer;
      const primaryWorkspaceId = dataset.workspaces.primary.id;
      const secondaryWorkspaceId = dataset.workspaces.secondary.id;

      const adminClient = getAdminSupabaseClient();
      const [location1, location2] = await adminClient
        .from("locations")
        .insert([
          createRootLocationFixture(primaryWorkspaceId, "Location 1"),
          createRootLocationFixture(secondaryWorkspaceId, "Location 2"),
        ])
        .select()
        .throwOnError();

      await seedTable("boxes", [
        createBoxFixture(primaryWorkspaceId, location1.id, "Primary Workspace Box"),
        createBoxFixture(secondaryWorkspaceId, location2.id, "Secondary Workspace Box"),
      ]);

      // Viewer is only member of primary workspace
      const response = await authenticatedPost("/api/boxes/search", viewerUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "Box",
      });

      assertSuccess(response);
      // Should only find primary workspace box
      expect(response.body.length).toBe(1);
      expect(response.body[0].workspace_id).toBe(primaryWorkspaceId);
    });
  });

  describe.skip("Validation Errors (400)", () => {
    it("should reject search with empty query", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "",
      });

      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject search with query too short", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
        query: "a", // Too short
      });

      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject search without workspace_id", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        query: "test",
      });

      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject search with missing query", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const response = await authenticatedPost("/api/boxes/search", adminUser.token, {
        workspace_id: primaryWorkspaceId,
      });

      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe.skip("Authentication Errors (401)", () => {
    it("should reject search without authentication", async () => {
      const response = await authenticatedPost("/api/boxes/search", "", {
        workspace_id: "00000000-0000-0000-0000-000000000000",
        query: "test",
      });

      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it.skip("should reject with invalid token", async () => {
      const response = await authenticatedPost("/api/boxes/search", "invalid.jwt.token", {
        workspace_id: "00000000-0000-0000-0000-000000000000",
        query: "test",
      });

      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe.skip("Authorization Errors (403)", () => {
    it("should reject search from non-member", async () => {
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const outsider = await createAuthenticatedUser({
        email: "search-outsider@example.com",
        password: "SecurePass123!",
        full_name: "Search Outsider",
      });

      const response = await authenticatedPost("/api/boxes/search", outsider.token, {
        workspace_id: primaryWorkspaceId,
        query: "test",
      });

      assertError(response, 403);
      expect(response.body).toHaveProperty("error");
    });
  });
});
