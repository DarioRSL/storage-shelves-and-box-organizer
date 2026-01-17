/**
 * Integration Tests: Box Detail Operations
 *
 * Tests for:
 * - GET /api/boxes/:id - Get box details
 * - PATCH /api/boxes/:id - Update box
 * - DELETE /api/boxes/:id - Delete box
 *
 * Coverage:
 * - Box detail retrieval with QR code and location
 * - Box updates (name, description, tags, status, location)
 * - QR code assignment/unassignment
 * - Auto-update search_vector on content change (database trigger)
 * - Box deletion with QR code reset (database trigger)
 * - RLS policy enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData, seedTable } from "../../../helpers/db-setup";
import { createAuthenticatedUser } from "../../../helpers/auth-helper";
import { seedInitialDataset } from "../../../fixtures/initial-dataset";
import { createRootLocationFixture, createBoxFixture, createQRCodeFixture } from "../../../helpers/factory";
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedDelete,
  assertSuccess,
  assertError,
} from "../../../helpers/api-client";
import { getAdminSupabaseClient } from "../../../helpers/supabase-test-client";

describe.skip("GET /api/boxes/:id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should return box details for member", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Test Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedGet(`/api/boxes/${box.id}`, adminUser.token);

      assertSuccess(response);
      expect(response.body.id).toBe(box.id);
      expect(response.body.name).toBe("Test Box");
    });

    it("should include box metadata and relationships", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const qrData = createQRCodeFixture(primaryWorkspaceId);
      const [qrCode] = await seedTable("qr_codes", [qrData]);

      const boxData = {
        ...createBoxFixture(primaryWorkspaceId, location.id, "Box With QR"),
        qr_code_id: qrCode.id,
      };
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedGet(`/api/boxes/${box.id}`, adminUser.token);

      assertSuccess(response);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("short_id");
      expect(response.body).toHaveProperty("qr_code_id");
      expect(response.body).toHaveProperty("location_id");
      expect(response.body.qr_code_id).toBe(qrCode.id);
    });
  });

  describe("Errors", () => {
    it("should return 401 without authentication", async () => {
      const response = await authenticatedGet("/api/boxes/fake-id", "");
      assertError(response, 401);
    });

    it("should return 403 from non-member", async () => {
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Protected Box");
      const [box] = await seedTable("boxes", [boxData]);

      const outsider = await createAuthenticatedUser({
        email: "box-detail-outsider@example.com",
        password: "SecurePass123!",
        full_name: "Box Detail Outsider",
      });

      const response = await authenticatedGet(`/api/boxes/${box.id}`, outsider.token);
      assertError(response, 403);
    });

    it("should return 404 for non-existent box", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      const fakeId = "00000000-0000-0000-0000-000000000001";
      const response = await authenticatedGet(`/api/boxes/${fakeId}`, adminUser.token);
      assertError(response, 404);
    });
  });
});

describe.skip("PATCH /api/boxes/:id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should update box name", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Old Name");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        name: "New Name",
      });

      assertSuccess(response);
      expect(response.body.name).toBe("New Name");
    });

    it("should update box description and tags", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        description: "Updated description",
        tags: ["new", "tags"],
      });

      assertSuccess(response);
      expect(response.body.description).toBe("Updated description");
      expect(response.body.tags).toEqual(["new", "tags"]);
    });

    it.skip("should update box status", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        status: "archived",
      });

      assertSuccess(response);
      expect(response.body.status).toBe("archived");
    });

    it.skip("should move box to different location", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const [location1, location2] = await adminClient
        .from("locations")
        .insert([
          createRootLocationFixture(primaryWorkspaceId, "Location 1"),
          createRootLocationFixture(primaryWorkspaceId, "Location 2"),
        ])
        .select()
        .throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location1.id, "Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        location_id: location2.id,
      });

      assertSuccess(response);
      expect(response.body.location_id).toBe(location2.id);
    });

    it("should assign QR code to box", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const qrData = createQRCodeFixture(primaryWorkspaceId);
      const [qrCode] = await seedTable("qr_codes", [qrData]);

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        qr_code_id: qrCode.id,
      });

      assertSuccess(response);
      expect(response.body.qr_code_id).toBe(qrCode.id);

      const adminClient2 = getAdminSupabaseClient();
      const { data: updatedQR } = await adminClient2.from("qr_codes").select("status").eq("id", qrCode.id).single();
      expect(updatedQR.status).toBe("assigned");
    });

    it("should unassign QR code from box", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const qrData = createQRCodeFixture(primaryWorkspaceId);
      const [qrCode] = await seedTable("qr_codes", [qrData]);

      const boxData = {
        ...createBoxFixture(primaryWorkspaceId, location.id, "Box"),
        qr_code_id: qrCode.id,
      };
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        qr_code_id: null,
      });

      assertSuccess(response);
      expect(response.body.qr_code_id).toBeNull();
    });

    it("should auto-update search_vector when content changes (trigger)", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Original Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        name: "Updated Searchable Box",
        description: "New searchable description",
        tags: ["searchable"],
      });

      assertSuccess(response);

      const { data: updatedBox } = await adminClient.from("boxes").select("search_vector").eq("id", box.id).single();
      expect(updatedBox.search_vector).toBeTruthy();
    });
  });

  describe.skip("Validation Errors (400)", () => {
    it("should reject empty name", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        name: "",
      });

      assertError(response, 400);
    });

    it("should reject invalid status", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Box");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, adminUser.token, {
        status: "invalid_status",
      });

      assertError(response, 400);
    });
  });

  describe("Errors", () => {
    it("should return 401 without authentication", async () => {
      const response = await authenticatedPatch("/api/boxes/fake-id", "", { name: "Test" });
      assertError(response, 401);
    });

    it("should return 403 from non-member", async () => {
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Protected Box");
      const [box] = await seedTable("boxes", [boxData]);

      const outsider = await createAuthenticatedUser({
        email: "box-update-outsider@example.com",
        password: "SecurePass123!",
        full_name: "Box Update Outsider",
      });

      const response = await authenticatedPatch(`/api/boxes/${box.id}`, outsider.token, {
        name: "Unauthorized Update",
      });
      assertError(response, 403);
    });

    it("should return 404 for non-existent box", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      const fakeId = "00000000-0000-0000-0000-000000000001";
      const response = await authenticatedPatch(`/api/boxes/${fakeId}`, adminUser.token, {
        name: "Update Non-existent",
      });
      assertError(response, 404);
    });

    it("should return 409 when assigning already-assigned QR code", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const qrData = createQRCodeFixture(primaryWorkspaceId);
      const [qrCode] = await seedTable("qr_codes", [qrData]);

      const [box1, box2] = await seedTable("boxes", [
        { ...createBoxFixture(primaryWorkspaceId, location.id, "Box 1"), qr_code_id: qrCode.id },
        createBoxFixture(primaryWorkspaceId, location.id, "Box 2"),
      ]);

      const response = await authenticatedPatch(`/api/boxes/${box2.id}`, adminUser.token, {
        qr_code_id: qrCode.id,
      });

      assertError(response, 409);
    });
  });
});

describe.skip("DELETE /api/boxes/:id", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should delete box", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Box To Delete");
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedDelete(`/api/boxes/${box.id}`, adminUser.token);

      expect(response.status).toBe(204);

      const { data: deletedBox } = await adminClient.from("boxes").select("*").eq("id", box.id).maybeSingle();
      expect(deletedBox).toBeNull();
    });

    it('should reset QR code to "generated" status when box deleted (trigger)', async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const qrData = createQRCodeFixture(primaryWorkspaceId);
      const [qrCode] = await seedTable("qr_codes", [qrData]);

      const boxData = {
        ...createBoxFixture(primaryWorkspaceId, location.id, "Box With QR"),
        qr_code_id: qrCode.id,
      };
      const [box] = await seedTable("boxes", [boxData]);

      const response = await authenticatedDelete(`/api/boxes/${box.id}`, adminUser.token);

      expect(response.status).toBe(204);

      const { data: resetQR } = await adminClient
        .from("qr_codes")
        .select("status, box_id")
        .eq("id", qrCode.id)
        .single();
      expect(resetQR.status).toBe("generated");
      expect(resetQR.box_id).toBeNull();
    });
  });

  describe("Errors", () => {
    it("should return 401 without authentication", async () => {
      const response = await authenticatedDelete("/api/boxes/fake-id", "");
      assertError(response, 401);
    });

    it("should return 403 from non-member", async () => {
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, "Location");
      const [location] = await adminClient.from("locations").insert(locationData).select().throwOnError();

      const boxData = createBoxFixture(primaryWorkspaceId, location.id, "Protected Box");
      const [box] = await seedTable("boxes", [boxData]);

      const outsider = await createAuthenticatedUser({
        email: "box-delete-outsider@example.com",
        password: "SecurePass123!",
        full_name: "Box Delete Outsider",
      });

      const response = await authenticatedDelete(`/api/boxes/${box.id}`, outsider.token);
      assertError(response, 403);
    });

    it("should return 404 for non-existent box", async () => {
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      const fakeId = "00000000-0000-0000-0000-000000000001";
      const response = await authenticatedDelete(`/api/boxes/${fakeId}`, adminUser.token);
      assertError(response, 404);
    });
  });
});
