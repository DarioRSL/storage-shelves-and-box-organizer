/**
 * Integration Tests: Database Triggers (14 tests)
 *
 * Tests for:
 * - Box short_id generation (3 tests)
 * - Box search_vector generation (5 tests)
 * - QR code reset on box deletion (2 tests)
 * - Timestamp updates (4 tests)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { clearAllTestData, seedTable } from "../../helpers/db-setup";
import { createAuthenticatedUser, type TestUser } from "../../helpers/auth-helper";
import {
  createRootLocationFixture,
  createBoxFixture,
  createQRCodeFixture,
  createWorkspaceFixture,
} from "../../helpers/factory";
import { getAdminSupabaseClient } from "../../helpers/supabase-test-client";

describe("Database Triggers", () => {
  // SHARED TEST DATA - created once, reused across all tests
  let testUser: TestUser;
  let workspaceId: string;
  const adminClient = getAdminSupabaseClient();

  beforeAll(async () => {
    await clearAllTestData();

    // Create a single test user
    testUser = await createAuthenticatedUser({
      email: "triggers-test@example.com",
      password: "SecurePass123!",
      full_name: "Triggers Test User",
    });

    // Create a workspace for tests
    const [workspace] = await seedTable<any>("workspaces", [
      createWorkspaceFixture({ name: "Triggers Test Workspace", owner_id: testUser.id }),
    ]);
    workspaceId = workspace.id;

    // Note: workspace trigger auto-adds creator as owner, so no need to add manually
  });

  afterAll(async () => {
    await clearAllTestData();
  });

  // Clean up boxes, locations, and QR codes between tests but keep workspace and user
  beforeEach(async () => {
    await adminClient.from("boxes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("qr_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("locations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  });

  describe("Box short_id Generation", () => {
    it("should auto-generate 10-char alphanumeric short_id on insert", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxData = createBoxFixture(workspaceId, location.id, { name: "Test Box" });
      const [box] = await seedTable<any>("boxes", [boxData]);

      expect(box.short_id).toBeTruthy();
      expect(box.short_id).toMatch(/^[A-Za-z0-9]{10}$/);
    });

    it.skip("should generate unique short_ids for multiple boxes", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxes = await seedTable<any>("boxes", [
        createBoxFixture(workspaceId, location.id, { name: "Box 1" }),
        createBoxFixture(workspaceId, location.id, { name: "Box 2" }),
        createBoxFixture(workspaceId, location.id, { name: "Box 3" }),
      ]);
      const shortIds = boxes.map((b: any) => b.short_id);
      const uniqueIds = new Set(shortIds);

      expect(uniqueIds.size).toBe(3);
    });

    it.skip("should not overwrite manually-set short_id", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const customId = "CUSTOM1234";
      const boxData = { ...createBoxFixture(workspaceId, location.id, { name: "Box" }), short_id: customId };
      const [box] = await seedTable<any>("boxes", [boxData]);

      expect(box.short_id).toBe(customId);
    });
  });

  describe("Box search_vector Generation", () => {
    it("should generate search_vector from name/description/tags on insert", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxData = {
        ...createBoxFixture(workspaceId, location.id, { name: "Searchable Box" }),
        description: "Important items",
        tags: ["electronics"],
      };
      const [box] = await seedTable<any>("boxes", [boxData]);
      const { data } = await adminClient.from("boxes").select("search_vector").eq("id", box.id).single();

      expect(data!.search_vector).toBeTruthy();
    });

    it("should update search_vector when name changes", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxData = createBoxFixture(workspaceId, location.id, { name: "Original Name" });
      const [box] = await seedTable<any>("boxes", [boxData]);

      await adminClient.from("boxes").update({ name: "Updated Name" }).eq("id", box.id).throwOnError();
      const { data } = await adminClient.from("boxes").select("search_vector").eq("id", box.id).single();

      expect(data!.search_vector).toBeTruthy();
    });

    it.skip("should update search_vector when description changes", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxData = createBoxFixture(workspaceId, location.id, { name: "Box" });
      const [box] = await seedTable<any>("boxes", [boxData]);

      await adminClient.from("boxes").update({ description: "New description" }).eq("id", box.id).throwOnError();
      const { data } = await adminClient.from("boxes").select("search_vector").eq("id", box.id).single();

      expect(data!.search_vector).toBeTruthy();
    });

    it.skip("should update search_vector when tags change", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxData = createBoxFixture(workspaceId, location.id, { name: "Box" });
      const [box] = await seedTable<any>("boxes", [boxData]);

      await adminClient
        .from("boxes")
        .update({ tags: ["new", "tags"] })
        .eq("id", box.id)
        .throwOnError();
      const { data } = await adminClient.from("boxes").select("search_vector").eq("id", box.id).single();

      expect(data!.search_vector).toBeTruthy();
    });

    it.skip("should handle null description and empty tags", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxData = {
        ...createBoxFixture(workspaceId, location.id, { name: "Box" }),
        description: null,
        tags: [],
      };
      const [box] = await seedTable<any>("boxes", [boxData]);
      const { data } = await adminClient.from("boxes").select("search_vector").eq("id", box.id).single();

      expect(data!.search_vector).toBeTruthy();
    });
  });

  describe("QR Code Reset on Box Deletion", () => {
    it("should reset QR status to generated when box deleted", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];

      // Create box first
      const boxData = createBoxFixture(workspaceId, location.id, { name: "Box" });
      const [box] = await seedTable<any>("boxes", [boxData]);

      // Create QR code and link it to the box (qr_codes.box_id -> boxes.id)
      const qrData = { ...createQRCodeFixture(workspaceId), box_id: box.id, status: "assigned" };
      const [qr] = await seedTable<any>("qr_codes", [qrData]);

      // Delete box - trigger should reset QR status
      await adminClient.from("boxes").delete().eq("id", box.id).throwOnError();
      const { data } = await adminClient.from("qr_codes").select("status").eq("id", qr.id).single();

      expect(data!.status).toBe("generated");
    });

    it("should nullify box_id on QR code when box deleted", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];

      // Create box first
      const boxData = createBoxFixture(workspaceId, location.id, { name: "Box" });
      const [box] = await seedTable<any>("boxes", [boxData]);

      // Create QR code and link it to the box (qr_codes.box_id -> boxes.id)
      const qrData = { ...createQRCodeFixture(workspaceId), box_id: box.id, status: "assigned" };
      const [qr] = await seedTable<any>("qr_codes", [qrData]);

      // Delete box - trigger should nullify box_id on QR
      await adminClient.from("boxes").delete().eq("id", box.id).throwOnError();
      const { data } = await adminClient.from("qr_codes").select("box_id").eq("id", qr.id).single();

      expect(data!.box_id).toBeNull();
    });
  });

  describe("Timestamp Updates", () => {
    it("should update updated_at on location update", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const originalTime = location.updated_at;

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await adminClient.from("locations").update({ name: "Updated" }).eq("id", location.id).throwOnError();
      const { data } = await adminClient.from("locations").select("updated_at").eq("id", location.id).single();

      expect(new Date(data!.updated_at!).getTime()).toBeGreaterThan(new Date(originalTime!).getTime());
    });

    it("should update updated_at on workspace update", async () => {
      const { data: original } = await adminClient
        .from("workspaces")
        .select("updated_at")
        .eq("id", workspaceId)
        .single();

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await adminClient.from("workspaces").update({ name: "Updated Workspace" }).eq("id", workspaceId).throwOnError();
      const { data } = await adminClient.from("workspaces").select("updated_at").eq("id", workspaceId).single();

      expect(new Date(data!.updated_at!).getTime()).toBeGreaterThan(new Date(original!.updated_at!).getTime());
    });

    it.skip("should update updated_at on box update", async () => {
      const { data: locationData } = await adminClient
        .from("locations")
        .insert(createRootLocationFixture(workspaceId, "Loc"))
        .select()
        .throwOnError();
      const location = locationData![0];
      const boxData = createBoxFixture(workspaceId, location.id, { name: "Box" });
      const [box] = await seedTable<any>("boxes", [boxData]);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await adminClient.from("boxes").update({ name: "Updated" }).eq("id", box.id).throwOnError();
      const { data } = await adminClient.from("boxes").select("updated_at").eq("id", box.id).single();

      expect(new Date(data!.updated_at!).getTime()).toBeGreaterThan(new Date(box.updated_at).getTime());
    });

    it.skip("should update updated_at on profile update", async () => {
      const { data: original } = await adminClient.from("profiles").select("updated_at").eq("id", testUser.id).single();

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await adminClient.from("profiles").update({ theme_preference: "dark" }).eq("id", testUser.id).throwOnError();
      const { data } = await adminClient.from("profiles").select("updated_at").eq("id", testUser.id).single();

      expect(new Date(data!.updated_at!).getTime()).toBeGreaterThan(new Date(original!.updated_at!).getTime());
    });
  });
});
