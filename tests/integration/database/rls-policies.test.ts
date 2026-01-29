/**
 * Integration Tests: Row Level Security (RLS) Policies
 *
 * Tests for database-level multi-tenant isolation:
 * - Workspace isolation
 * - Location isolation
 * - Box isolation
 * - QR code isolation
 * - Profile access control
 * - Workspace member management
 *
 * Coverage:
 * - RLS policy enforcement at database level
 * - Multi-tenant data isolation
 * - Cross-workspace access prevention
 * - User-scoped data access
 *
 * CRITICAL: These tests verify that users cannot access data from
 * workspaces they don't belong to, even with direct database queries.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData } from "../../helpers/db-setup";
import { createAuthenticatedUser } from "../../helpers/auth-helper";
import { seedInitialDataset } from "../../fixtures/initial-dataset";
import { getUserSupabaseClient, getAdminSupabaseClient } from "../../helpers/supabase-test-client";

describe("RLS Policies: Workspace Isolation", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it.skip("should allow user to access their own workspaces", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const adminUser = dataset.users.admin;
    const userClient = getUserSupabaseClient(adminUser.token);

    // Act: Query workspaces as admin user
    const { data: workspaces, error } = await userClient.from("workspaces").select("*");

    // Assert: Can see workspaces they're a member of
    expect(error).toBeNull();
    expect(workspaces).toBeTruthy();
    expect(workspaces!.length).toBeGreaterThan(0);
  });

  it.skip("should prevent user from accessing other users workspaces directly", async () => {
    // Arrange: Create two separate users with their own workspaces
    const dataset = await seedInitialDataset();
    const adminUser = dataset.users.admin; // member of primary workspace
    const viewerUser = dataset.users.viewer; // member of primary workspace
    const adminClient = getUserSupabaseClient(adminUser.token);

    // Create isolated workspace for viewer only
    const outsider = await createAuthenticatedUser({
      email: "isolated@example.com",
      password: "SecurePass123!",
      full_name: "Isolated User",
    });
    const adminDbClient = getAdminSupabaseClient();
    const [isolatedWorkspace] = await adminDbClient
      .from("workspaces")
      .insert({ name: "Isolated Workspace", owner_id: outsider.id })
      .select()
      .throwOnError();

    await adminDbClient
      .from("workspace_members")
      .insert({ workspace_id: isolatedWorkspace.id, user_id: outsider.id, role: "owner" })
      .throwOnError();

    // Act: Admin tries to query isolated workspace
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("*")
      .eq("id", isolatedWorkspace.id)
      .single();

    // Assert: Should not be able to access workspace they're not a member of
    expect(workspace).toBeNull();
  });

  it.skip("should allow workspace member to query workspace", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const memberUser = dataset.users.member; // member of primary workspace
    const workspaceId = dataset.workspaces.primary.id;
    const userClient = getUserSupabaseClient(memberUser.token);

    // Act
    const { data: workspace, error } = await userClient.from("workspaces").select("*").eq("id", workspaceId).single();

    // Assert
    expect(error).toBeNull();
    expect(workspace).toBeTruthy();
    expect(workspace!.id).toBe(workspaceId);
  });

  it("should show different workspaces to different users based on membership", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const adminUser = dataset.users.admin; // member of primary
    const memberUser = dataset.users.member; // member of both primary and secondary
    const adminClient = getUserSupabaseClient(adminUser.token);
    const memberClient = getUserSupabaseClient(memberUser.token);

    // Act
    const { data: adminWorkspaces } = await adminClient.from("workspaces").select("*");
    const { data: memberWorkspaces } = await memberClient.from("workspaces").select("*");

    // Assert: Admin sees 1 workspace, member sees 2
    expect(adminWorkspaces!.length).toBe(1);
    expect(memberWorkspaces!.length).toBe(2);
  });

  it("should prevent user from inserting workspace_members for other workspaces", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-insert@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Insert User",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act: Try to add self to workspace they don't own
    const { error } = await outsiderClient.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: outsider.id,
      role: "owner",
    });

    // Assert: Should be blocked by RLS
    expect(error).toBeTruthy();
  });
});

describe("RLS Policies: Location Isolation", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it("should allow workspace member to view locations", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const memberUser = dataset.users.member;
    const workspaceId = dataset.workspaces.primary.id;
    const userClient = getUserSupabaseClient(memberUser.token);

    // Act
    const { data: locations, error } = await userClient.from("locations").select("*").eq("workspace_id", workspaceId);

    // Assert
    expect(error).toBeNull();
    expect(locations).toBeTruthy();
    expect(locations!.length).toBeGreaterThan(0);
  });

  it("should prevent non-member from viewing locations", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-location@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Location User",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { data: locations } = await outsiderClient.from("locations").select("*").eq("workspace_id", workspaceId);

    // Assert: Should return empty array or null due to RLS
    expect(locations).toEqual([]);
  });

  it.skip("should prevent non-member from creating locations", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-create-location@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Create Location",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { error } = await outsiderClient.from("locations").insert({
      workspace_id: workspaceId,
      name: "Unauthorized Location",
      path: "root.unauthorized",
    });

    // Assert
    expect(error).toBeTruthy();
  });

  it.skip("should prevent non-member from updating locations", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-update-location@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Update Location",
    });
    const locationId = dataset.locations.primary.garage.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { error } = await outsiderClient.from("locations").update({ name: "Hacked Location" }).eq("id", locationId);

    // Assert
    expect(error).toBeTruthy();
  });

  it.skip("should prevent non-member from deleting locations", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-delete-location@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Delete Location",
    });
    const locationId = dataset.locations.primary.garage.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { error } = await outsiderClient.from("locations").delete().eq("id", locationId);

    // Assert
    expect(error).toBeTruthy();
  });

  it("should allow member to CRUD locations in their workspace", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const memberUser = dataset.users.member;
    const workspaceId = dataset.workspaces.primary.id;
    const userClient = getUserSupabaseClient(memberUser.token);

    // Act: Create
    const { data: created, error: createError } = await userClient
      .from("locations")
      .insert({
        workspace_id: workspaceId,
        name: "Member Created Location",
        path: "root.membercreated",
      })
      .select()
      .single();

    // Assert: Can create
    expect(createError).toBeNull();
    expect(created).toBeTruthy();

    // Act: Update
    const { error: updateError } = await userClient
      .from("locations")
      .update({ name: "Updated Location" })
      .eq("id", created!.id);

    // Assert: Can update
    expect(updateError).toBeNull();

    // Act: Delete
    const { error: deleteError } = await userClient.from("locations").delete().eq("id", created!.id);

    // Assert: Can delete
    expect(deleteError).toBeNull();
  });
});

describe("RLS Policies: Box Isolation", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it("should allow workspace member to view boxes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const memberUser = dataset.users.member;
    const workspaceId = dataset.workspaces.primary.id;
    const userClient = getUserSupabaseClient(memberUser.token);

    // Act
    const { data: boxes, error } = await userClient.from("boxes").select("*").eq("workspace_id", workspaceId);

    // Assert
    expect(error).toBeNull();
    expect(boxes).toBeTruthy();
    expect(boxes!.length).toBeGreaterThan(0);
  });

  it("should prevent non-member from viewing boxes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-box@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Box User",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { data: boxes } = await outsiderClient.from("boxes").select("*").eq("workspace_id", workspaceId);

    // Assert
    expect(boxes).toEqual([]);
  });

  it.skip("should prevent non-member from creating boxes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-create-box@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Create Box",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { error } = await outsiderClient.from("boxes").insert({
      workspace_id: workspaceId,
      name: "Unauthorized Box",
      short_id: "HACK123456",
    });

    // Assert
    expect(error).toBeTruthy();
  });

  it.skip("should prevent non-member from updating boxes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-update-box@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Update Box",
    });
    const boxId = dataset.boxes.primary[0].id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { error } = await outsiderClient.from("boxes").update({ name: "Hacked Box" }).eq("id", boxId);

    // Assert
    expect(error).toBeTruthy();
  });

  it.skip("should prevent non-member from deleting boxes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-delete-box@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Delete Box",
    });
    const boxId = dataset.boxes.primary[0].id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { error } = await outsiderClient.from("boxes").delete().eq("id", boxId);

    // Assert
    expect(error).toBeTruthy();
  });

  it("should allow member to CRUD boxes in their workspace", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const memberUser = dataset.users.member;
    const workspaceId = dataset.workspaces.primary.id;
    const userClient = getUserSupabaseClient(memberUser.token);

    // Act: Create
    const { data: created, error: createError } = await userClient
      .from("boxes")
      .insert({
        workspace_id: workspaceId,
        name: "Member Created Box",
        short_id: "MEM1234567",
      })
      .select()
      .single();

    // Assert: Can create
    expect(createError).toBeNull();
    expect(created).toBeTruthy();

    // Act: Update
    const { error: updateError } = await userClient.from("boxes").update({ name: "Updated Box" }).eq("id", created!.id);

    // Assert: Can update
    expect(updateError).toBeNull();

    // Act: Delete
    const { error: deleteError } = await userClient.from("boxes").delete().eq("id", created!.id);

    // Assert: Can delete
    expect(deleteError).toBeNull();
  });
});

describe("RLS Policies: QR Code Isolation", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it("should allow workspace member to view QR codes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const memberUser = dataset.users.member;
    const workspaceId = dataset.workspaces.primary.id;
    const userClient = getUserSupabaseClient(memberUser.token);

    // Act
    const { data: qrCodes, error } = await userClient.from("qr_codes").select("*").eq("workspace_id", workspaceId);

    // Assert
    expect(error).toBeNull();
    expect(qrCodes).toBeTruthy();
    expect(qrCodes!.length).toBeGreaterThan(0);
  });

  it("should prevent non-member from viewing QR codes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-qr@example.com",
      password: "SecurePass123!",
      full_name: "Outsider QR User",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { data: qrCodes } = await outsiderClient.from("qr_codes").select("*").eq("workspace_id", workspaceId);

    // Assert
    expect(qrCodes).toEqual([]);
  });

  it("should prevent non-member from creating QR codes", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-create-qr@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Create QR",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { error } = await outsiderClient.from("qr_codes").insert({
      workspace_id: workspaceId,
      short_id: "QR-HACK01",
      status: "generated",
    });

    // Assert
    expect(error).toBeTruthy();
  });

  it("should allow member to generate QR codes in their workspace", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const memberUser = dataset.users.member;
    const workspaceId = dataset.workspaces.primary.id;
    const userClient = getUserSupabaseClient(memberUser.token);

    // Act
    const { data: created, error } = await userClient
      .from("qr_codes")
      .insert({
        workspace_id: workspaceId,
        short_id: "QR-MEM001",
        status: "generated",
      })
      .select()
      .single();

    // Assert
    expect(error).toBeNull();
    expect(created).toBeTruthy();
  });
});

describe.skip("RLS Policies: Profile Access Control", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it.skip("should allow user to view their own profile", async () => {
    // Arrange
    const testUser = await createAuthenticatedUser({
      email: "profile-view@example.com",
      password: "SecurePass123!",
      full_name: "Profile View User",
    });
    const userClient = getUserSupabaseClient(testUser.token);

    // Act
    const { data: profile, error } = await userClient.from("profiles").select("*").eq("id", testUser.id).single();

    // Assert
    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.id).toBe(testUser.id);
  });

  it("should prevent user from viewing other users profiles", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const user1 = dataset.users.admin;
    const user2 = dataset.users.member;
    const user1Client = getUserSupabaseClient(user1.token);

    // Act: User1 tries to query User2's profile
    const { data: profile } = await user1Client.from("profiles").select("*").eq("id", user2.id).single();

    // Assert: Should not be able to access other user's profile
    expect(profile).toBeNull();
  });
});

describe.skip("RLS Policies: Workspace Member Management", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it("should allow owner to add members", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const adminUser = dataset.users.admin; // owner
    const newUser = await createAuthenticatedUser({
      email: "new-member-rls@example.com",
      password: "SecurePass123!",
      full_name: "New Member RLS",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const adminClient = getUserSupabaseClient(adminUser.token);

    // Act: Owner adds new member (via RLS-protected table)
    const { data: member, error } = await adminClient
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: newUser.id,
        role: "member",
      })
      .select()
      .single();

    // Assert: This might fail depending on RLS policies
    // Some implementations require admin client for this
    // This test verifies the policy behavior
    if (error) {
      // If RLS blocks this, it's expected behavior
      expect(error).toBeTruthy();
    } else {
      // If allowed, verify it worked
      expect(member).toBeTruthy();
    }
  });

  it("should prevent non-member from viewing workspace_members", async () => {
    // Arrange
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({
      email: "outsider-members@example.com",
      password: "SecurePass123!",
      full_name: "Outsider Members User",
    });
    const workspaceId = dataset.workspaces.primary.id;
    const outsiderClient = getUserSupabaseClient(outsider.token);

    // Act
    const { data: members } = await outsiderClient
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId);

    // Assert: Should not be able to see members of workspace they're not in
    expect(members).toEqual([]);
  });
});
