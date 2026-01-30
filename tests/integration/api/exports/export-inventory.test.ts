/**
 * Integration Tests: Export Inventory (10 tests)
 * GET /api/export/inventory - Export boxes as CSV
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData, seedTable } from "../../../helpers/db-setup";
import { createAuthenticatedUser } from "../../../helpers/auth-helper";
import { seedInitialDataset } from "../../../fixtures/initial-dataset";
import { createRootLocationFixture, createBoxFixture } from "../../../helpers/factory";
import { authenticatedGet, assertSuccess, assertError } from "../../../helpers/api-client";
import { getAdminSupabaseClient } from "../../../helpers/supabase-test-client";

describe.skip("GET /api/export/inventory", () => {
  beforeEach(async () => await clearAllTestData());
  afterEach(async () => await clearAllTestData());

  it("should export all boxes as CSV", async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet(
      `/api/export/inventory?workspace_id=${dataset.workspaces.primary.id}`,
      dataset.users.admin.token
    );
    assertSuccess(response);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain("Name,Description,Tags,Location,QR Code,Status,Short ID");
  });

  it.skip("should filter by location_id", async () => {
    const dataset = await seedInitialDataset();
    const adminClient = getAdminSupabaseClient();
    const [location] = await adminClient
      .from("locations")
      .insert(createRootLocationFixture(dataset.workspaces.primary.id, "Loc"))
      .select()
      .throwOnError();
    await seedTable("boxes", [createBoxFixture(dataset.workspaces.primary.id, location.id, "Box")]);
    const response = await authenticatedGet(
      `/api/export/inventory?workspace_id=${dataset.workspaces.primary.id}&location_id=${location.id}`,
      dataset.users.admin.token
    );
    assertSuccess(response);
    expect(response.text).toContain("Box");
  });

  it("should include name, description, tags, location, QR, status, short_id", async () => {
    const dataset = await seedInitialDataset();
    const adminClient = getAdminSupabaseClient();
    const [location] = await adminClient
      .from("locations")
      .insert(createRootLocationFixture(dataset.workspaces.primary.id, "TestLoc"))
      .select()
      .throwOnError();
    const boxData = {
      ...createBoxFixture(dataset.workspaces.primary.id, location.id, "TestBox"),
      description: "Test desc",
      tags: ["tag1", "tag2"],
    };
    await seedTable("boxes", [boxData]);
    const response = await authenticatedGet(
      `/api/export/inventory?workspace_id=${dataset.workspaces.primary.id}`,
      dataset.users.admin.token
    );
    assertSuccess(response);
    expect(response.text).toContain("TestBox");
    expect(response.text).toContain("Test desc");
    expect(response.text).toContain("tag1");
  });

  it("should set CSV headers correctly", async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet(
      `/api/export/inventory?workspace_id=${dataset.workspaces.primary.id}`,
      dataset.users.admin.token
    );
    assertSuccess(response);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toContain("attachment");
    expect(response.headers["content-disposition"]).toContain("inventory.csv");
  });

  it("should handle special characters in CSV (quotes, commas, newlines)", async () => {
    const dataset = await seedInitialDataset();
    const adminClient = getAdminSupabaseClient();
    const [location] = await adminClient
      .from("locations")
      .insert(createRootLocationFixture(dataset.workspaces.primary.id, "Loc"))
      .select()
      .throwOnError();
    const boxData = {
      ...createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box, with "quotes"'),
      description: "Line1\nLine2",
    };
    await seedTable("boxes", [boxData]);
    const response = await authenticatedGet(
      `/api/export/inventory?workspace_id=${dataset.workspaces.primary.id}`,
      dataset.users.admin.token
    );
    assertSuccess(response);
    expect(response.text).toContain('"Box, with ""quotes"""');
  });

  it("should handle empty workspace", async () => {
    const testUser = await createAuthenticatedUser({
      email: "export-empty@example.com",
      password: "SecurePass123!",
      full_name: "Export Empty",
    });
    const adminClient = getAdminSupabaseClient();
    const [workspace] = await adminClient
      .from("workspaces")
      .insert({ name: "Empty WS", owner_id: testUser.id })
      .select()
      .throwOnError();
    await adminClient
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: testUser.id, role: "owner" })
      .throwOnError();
    const response = await authenticatedGet(`/api/export/inventory?workspace_id=${workspace.id}`, testUser.token);
    assertSuccess(response);
    expect(response.text).toContain("Name,Description");
  });

  it("should reject without workspace_id", async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet("/api/export/inventory", dataset.users.admin.token);
    assertError(response, 400);
  });

  it("should reject invalid location_id format", async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet(
      `/api/export/inventory?workspace_id=${dataset.workspaces.primary.id}&location_id=not-uuid`,
      dataset.users.admin.token
    );
    assertError(response, 400);
  });

  it("should reject without authentication", async () => {
    const response = await authenticatedGet("/api/export/inventory?workspace_id=123", "");
    assertError(response, 401);
  });

  it("should reject from non-member", async () => {
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "export-out@example.com",
      password: "SecurePass123!",
      full_name: "Export Out",
    });
    const response = await authenticatedGet(
      `/api/export/inventory?workspace_id=${dataset.workspaces.primary.id}`,
      outsider.token
    );
    assertError(response, 403);
  });
});
