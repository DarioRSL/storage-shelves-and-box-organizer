#!/usr/bin/env node
/**
 * Cleanup E2E Test Data Script
 *
 * Removes all workspaces and related data for the E2E test user.
 * Run this to clean up leftover data from failed test runs.
 *
 * Usage:
 *   node scripts/cleanup-e2e-data.mjs
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const E2E_USER_ID = process.env.E2E_USERNAME_ID;
const E2E_USERNAME = process.env.E2E_USERNAME;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables in .env.test");
  console.error("   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!E2E_USER_ID || !E2E_USERNAME) {
  console.error("❌ Missing E2E user credentials in .env.test");
  console.error("   Required: E2E_USERNAME_ID, E2E_USERNAME");
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("🧹 Starting E2E test data cleanup...");
console.log(`📧 E2E User: ${E2E_USERNAME} (${E2E_USER_ID})`);
console.log("");

try {
  // Step 1: Get all workspaces owned by the E2E user
  console.log("1️⃣  Fetching workspaces for E2E user...");
  const { data: workspaces, error: fetchError } = await adminClient
    .from("workspaces")
    .select("id, name, created_at")
    .eq("owner_id", E2E_USER_ID);

  if (fetchError) {
    throw new Error(`Failed to fetch workspaces: ${fetchError.message}`);
  }

  if (!workspaces || workspaces.length === 0) {
    console.log("✅ No workspaces found. Database is clean!");
    process.exit(0);
  }

  console.log(`   Found ${workspaces.length} workspace(s) to delete:`);
  workspaces.forEach((ws, i) => {
    const date = new Date(ws.created_at).toLocaleString();
    console.log(`   ${i + 1}. ${ws.name} (created: ${date})`);
  });
  console.log("");

  // Step 2: Delete all related data for each workspace
  for (const workspace of workspaces) {
    console.log(`2️⃣  Cleaning workspace: ${workspace.name}`);

    // Delete boxes (references qr_codes, locations, workspaces)
    const { error: boxesError } = await adminClient.from("boxes").delete().eq("workspace_id", workspace.id);

    if (boxesError) {
      console.error(`   ⚠️  Failed to delete boxes: ${boxesError.message}`);
    } else {
      console.log("   ✓ Deleted boxes");
    }

    // Delete QR codes (references workspaces)
    const { error: qrError } = await adminClient.from("qr_codes").delete().eq("workspace_id", workspace.id);

    if (qrError) {
      console.error(`   ⚠️  Failed to delete QR codes: ${qrError.message}`);
    } else {
      console.log("   ✓ Deleted QR codes");
    }

    // Delete locations (references workspaces)
    const { error: locError } = await adminClient.from("locations").delete().eq("workspace_id", workspace.id);

    if (locError) {
      console.error(`   ⚠️  Failed to delete locations: ${locError.message}`);
    } else {
      console.log("   ✓ Deleted locations");
    }

    // Delete workspace members (references workspaces)
    const { error: membersError } = await adminClient
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspace.id);

    if (membersError) {
      console.error(`   ⚠️  Failed to delete workspace members: ${membersError.message}`);
    } else {
      console.log("   ✓ Deleted workspace members");
    }

    // Delete workspace
    const { error: wsError } = await adminClient.from("workspaces").delete().eq("id", workspace.id);

    if (wsError) {
      console.error(`   ⚠️  Failed to delete workspace: ${wsError.message}`);
    } else {
      console.log("   ✓ Deleted workspace");
    }

    console.log("");
  }

  console.log("✅ Cleanup completed successfully!");
  console.log(`   Deleted ${workspaces.length} workspace(s) and all related data`);
  console.log("");
  console.log("ℹ️  Note: User profile and auth account were preserved for reuse");
} catch (error) {
  console.error("❌ Cleanup failed:", error.message);
  process.exit(1);
}
