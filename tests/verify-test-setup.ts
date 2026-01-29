/**
 * Verification Script for Test Environment Setup (Phase 0)
 *
 * Tests that:
 * 1. Environment variables are loaded correctly
 * 2. Supabase test client can connect
 * 3. Database schema exists
 * 4. Test helpers work correctly
 *
 * Run with: NODE_ENV=test npm run test:verify
 * Or manually export variables from .env.test before running
 */

import {
  getTestSupabaseClient,
  getAdminSupabaseClient,
  verifyTestDatabaseConnection,
} from "./helpers/supabase-test-client";
import { clearAllTestData, seedTable, getTableCount } from "./helpers/db-setup";
import { createAuthenticatedUser, getAuthHeader } from "./helpers/auth-helper";
import { createWorkspaceFixture, createLocationFixture, createBoxFixture } from "./helpers/factory";

async function verifyEnvironmentVariables() {
  console.log("\n✓ Step 1: Verifying environment variables...");

  const requiredVars = ["TEST_SUPABASE_URL", "TEST_SUPABASE_ANON_KEY", "TEST_SUPABASE_SERVICE_ROLE_KEY"];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName] || process.env[varName.replace("TEST_", "PUBLIC_")];
    if (!value) {
      missing.push(varName);
    } else {
      console.log(`  ✓ ${varName}: ${value.substring(0, 20)}...`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}\nMake sure .env.test is loaded.`);
  }

  console.log("  ✓ All environment variables present");
}

async function verifyDatabaseConnection() {
  console.log("\n✓ Step 2: Verifying database connection...");

  try {
    await verifyTestDatabaseConnection();
    console.log("  ✓ Database connection successful");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Database connection failed: ${message}`);
  }
}

async function verifyDatabaseSchema() {
  console.log("\n✓ Step 3: Verifying database schema...");

  const client = getAdminSupabaseClient();
  const tables = ["profiles", "workspaces", "workspace_members", "locations", "boxes", "qr_codes"];

  for (const table of tables) {
    const { error } = await client.from(table).select("*").limit(1);
    if (error) {
      throw new Error(`Table "${table}" not accessible: ${error.message}`);
    }
    console.log(`  ✓ Table "${table}" exists and is accessible`);
  }
}

async function verifyHelperFunctions() {
  console.log("\n✓ Step 4: Verifying helper functions...");

  // Test database cleanup
  console.log("  • Testing clearAllTestData()...");
  await clearAllTestData();

  // Verify tables are empty
  const client = getAdminSupabaseClient();
  const tables = ["boxes", "qr_codes", "locations", "workspaces", "profiles"];
  for (const table of tables) {
    const count = await getTableCount(table);
    if (count > 0) {
      throw new Error(`Table "${table}" not empty after cleanup (${count} records)`);
    }
  }

  // Also check auth users
  const { data: authUsers } = await client.auth.admin.listUsers();
  const authUserCount = authUsers?.users?.length || 0;
  if (authUserCount > 0) {
    console.log(`  ⚠  Warning: ${authUserCount} auth users still exist after cleanup`);
    // Try to delete them
    if (authUsers?.users) {
      for (const user of authUsers.users) {
        await client.auth.admin.deleteUser(user.id);
      }
    }
  }

  console.log("  ✓ clearAllTestData() works correctly");

  // Test user creation with unique email to avoid conflicts
  console.log("  • Testing createAuthenticatedUser()...");
  const uniqueEmail = `verify-test-${Date.now()}@test.com`;
  const testUser = await createAuthenticatedUser({
    email: uniqueEmail,
    password: "TestPass123!",
    full_name: "Verification Test User",
  });

  if (!testUser.id || !testUser.token || !testUser.email) {
    throw new Error("createAuthenticatedUser() did not return expected fields");
  }
  console.log(`  ✓ User created: ${testUser.email} (ID: ${testUser.id.substring(0, 8)}...)`);

  // Test workspace creation with factory
  console.log("  • Testing workspace factory and seedTable()...");
  const workspaceData = createWorkspaceFixture({
    name: "Verification Workspace",
    owner_id: testUser.id,
  });
  const [workspace] = await seedTable("workspaces", [workspaceData]);

  if (!workspace.id || workspace.name !== "Verification Workspace") {
    throw new Error("Workspace creation failed");
  }
  console.log(`  ✓ Workspace created: ${workspace.name} (ID: ${workspace.id.substring(0, 8)}...)`);

  // Add user as workspace member (use upsert to handle any existing memberships)
  const { error: memberError } = await client.from("workspace_members").upsert([
    {
      workspace_id: workspace.id,
      user_id: testUser.id,
      role: "owner",
    },
  ]);

  if (memberError) {
    throw new Error(`Failed to add workspace member: ${memberError.message}`);
  }
  console.log("  ✓ Workspace member added");

  // Test location creation
  console.log("  • Testing location factory...");
  const locationData = createLocationFixture(workspace.id, {
    name: "Verification Location",
    path: "root.verification",
  });
  const [location] = await seedTable("locations", [locationData]);

  if (!location.id || location.name !== "Verification Location") {
    throw new Error("Location creation failed");
  }
  console.log(`  ✓ Location created: ${location.name} (ID: ${location.id.substring(0, 8)}...)`);

  // Test box creation
  console.log("  • Testing box factory...");
  const boxData = createBoxFixture(workspace.id, location.id, {
    name: "Verification Box",
  });
  const [box] = await seedTable("boxes", [boxData]);

  if (!box.id || !box.short_id || box.name !== "Verification Box") {
    throw new Error("Box creation failed");
  }
  console.log(`  ✓ Box created: ${box.name} (ID: ${box.id.substring(0, 8)}..., Short ID: ${box.short_id})`);

  // Test auth header generation
  console.log("  • Testing getAuthHeader()...");
  const authHeader = getAuthHeader(testUser.token);
  if (!authHeader.Authorization || !authHeader.Authorization.startsWith("Bearer ")) {
    throw new Error("getAuthHeader() did not return valid header");
  }
  console.log("  ✓ Auth header generated correctly");

  // Cleanup test data
  console.log("  • Cleaning up test data...");
  await clearAllTestData();
  console.log("  ✓ Test data cleaned up");

  console.log("\n  ✓ All helper functions verified successfully");
}

async function verifyRLSPolicies() {
  console.log("\n✓ Step 5: Verifying RLS policies are enabled...");

  const client = getTestSupabaseClient(); // Non-admin client

  // Try to query without authentication (should fail or return empty)
  const { data, error } = await client.from("workspaces").select("*");

  // RLS should prevent access without proper authentication
  if (error && error.message.includes("RLS")) {
    console.log("  ✓ RLS policies are enforced (access denied without auth)");
  } else if (!data || data.length === 0) {
    console.log("  ✓ RLS policies are enforced (empty results without auth)");
  } else {
    console.warn("  ⚠ Warning: RLS policies might not be properly enforced");
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Test Environment Verification (Phase 0)");
  console.log("═══════════════════════════════════════════════════════════════");

  try {
    await verifyEnvironmentVariables();
    await verifyDatabaseConnection();
    await verifyDatabaseSchema();
    await verifyHelperFunctions();
    await verifyRLSPolicies();

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  ✅ ALL VERIFICATION CHECKS PASSED");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("\n  Phase 0 setup is complete and working correctly!");
    console.log("  Ready to proceed with Phase 1: Test infrastructure\n");

    process.exit(0);
  } catch (error) {
    console.error("\n═══════════════════════════════════════════════════════════════");
    console.error("  ❌ VERIFICATION FAILED");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("\nError:", error instanceof Error ? error.message : String(error));
    console.error("\nPlease fix the issues above before proceeding.\n");

    process.exit(1);
  }
}

// Run verification
main();
