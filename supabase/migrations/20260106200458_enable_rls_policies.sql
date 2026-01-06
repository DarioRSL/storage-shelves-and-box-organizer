-- ============================================================================
-- RLS POLICIES IMPLEMENTATION
-- ============================================================================
-- Migration: 20260106200458_enable_rls_policies
-- Description: Enable Row Level Security on all tables and create policies
--              for multi-tenant data isolation
--
-- Security: CRITICAL - This migration implements RLS policies to prevent
--           users from accessing data outside their workspaces
--
-- Tables affected:
--   1. workspaces (4 policies)
--   2. workspace_members (4 policies)
--   3. locations (4 policies)
--   4. boxes (4 policies)
--   5. qr_codes (4 policies)
--   6. profiles (2 policies)
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: is_workspace_member
-- ============================================================================
-- Purpose: Check if current user is a member of a specific workspace
-- Used by: All workspace-scoped RLS policies
-- Security: SECURITY DEFINER allows function to check workspace_members table
-- ============================================================================

-- Drop existing function if it exists (may have different parameter name)
drop function if exists is_workspace_member(uuid);

create or replace function is_workspace_member(workspace_id_param uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from workspace_members
    where workspace_members.workspace_id = workspace_id_param
      and workspace_members.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function is_workspace_member(uuid) to authenticated;

-- ============================================================================
-- TABLE 1: WORKSPACES
-- ============================================================================
-- Enable RLS
alter table workspaces enable row level security;

-- Policy 1: SELECT - Users can view workspaces they are members of
create policy "Users can view their workspaces"
  on workspaces
  for select
  using (is_workspace_member(id));

-- Policy 2: INSERT - Any authenticated user can create a workspace
-- Note: Trigger will automatically add creator as owner in workspace_members
create policy "Users can create workspaces"
  on workspaces
  for insert
  with check (auth.uid() is not null);

-- Policy 3: UPDATE - Only workspace owners and admins can update
create policy "Workspace owners and admins can update"
  on workspaces
  for update
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin')
    )
  );

-- Policy 4: DELETE - Only workspace owners can delete
create policy "Workspace owners can delete"
  on workspaces
  for delete
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role = 'owner'
    )
  );

-- ============================================================================
-- TABLE 2: WORKSPACE_MEMBERS
-- ============================================================================
-- Enable RLS
alter table workspace_members enable row level security;

-- Policy 1: SELECT - Users can view members of their workspaces
create policy "Users can view workspace members"
  on workspace_members
  for select
  using (is_workspace_member(workspace_id));

-- Policy 2: INSERT - Only workspace owners and admins can add members
create policy "Workspace owners and admins can add members"
  on workspace_members
  for insert
  with check (
    exists (
      select 1
      from workspace_members existing
      where existing.workspace_id = workspace_members.workspace_id
        and existing.user_id = auth.uid()
        and existing.role in ('owner', 'admin')
    )
  );

-- Policy 3: UPDATE - Only workspace owners and admins can update member roles
create policy "Workspace owners and admins can update members"
  on workspace_members
  for update
  using (
    exists (
      select 1
      from workspace_members existing
      where existing.workspace_id = workspace_members.workspace_id
        and existing.user_id = auth.uid()
        and existing.role in ('owner', 'admin')
    )
  );

-- Policy 4: DELETE - Only workspace owners and admins can remove members
create policy "Workspace owners and admins can remove members"
  on workspace_members
  for delete
  using (
    exists (
      select 1
      from workspace_members existing
      where existing.workspace_id = workspace_members.workspace_id
        and existing.user_id = auth.uid()
        and existing.role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- TABLE 3: LOCATIONS
-- ============================================================================
-- Enable RLS
alter table locations enable row level security;

-- Policy 1: SELECT - Users can view locations in their workspaces
create policy "Users can view locations in their workspaces"
  on locations
  for select
  using (is_workspace_member(workspace_id));

-- Policy 2: INSERT - Workspace members can create locations
create policy "Workspace members can create locations"
  on locations
  for insert
  with check (is_workspace_member(workspace_id));

-- Policy 3: UPDATE - Workspace members can update locations
create policy "Workspace members can update locations"
  on locations
  for update
  using (is_workspace_member(workspace_id));

-- Policy 4: DELETE - Workspace members can soft-delete locations
-- Note: Actual deletion is soft delete via deleted_at column
create policy "Workspace members can delete locations"
  on locations
  for delete
  using (is_workspace_member(workspace_id));

-- ============================================================================
-- TABLE 4: BOXES
-- ============================================================================
-- Enable RLS
alter table boxes enable row level security;

-- Policy 1: SELECT - Users can view boxes in their workspaces
create policy "Users can view boxes in their workspaces"
  on boxes
  for select
  using (is_workspace_member(workspace_id));

-- Policy 2: INSERT - Workspace members can create boxes
create policy "Workspace members can create boxes"
  on boxes
  for insert
  with check (is_workspace_member(workspace_id));

-- Policy 3: UPDATE - Workspace members can update boxes
create policy "Workspace members can update boxes"
  on boxes
  for update
  using (is_workspace_member(workspace_id));

-- Policy 4: DELETE - Workspace members can delete boxes
create policy "Workspace members can delete boxes"
  on boxes
  for delete
  using (is_workspace_member(workspace_id));

-- ============================================================================
-- TABLE 5: QR_CODES
-- ============================================================================
-- Enable RLS
alter table qr_codes enable row level security;

-- Policy 1: SELECT - Users can view QR codes in their workspaces
create policy "Users can view QR codes in their workspaces"
  on qr_codes
  for select
  using (is_workspace_member(workspace_id));

-- Policy 2: INSERT - System-generated via batch generation endpoint
-- Only workspace members can generate QR codes
create policy "Workspace members can generate QR codes"
  on qr_codes
  for insert
  with check (is_workspace_member(workspace_id));

-- Policy 3: UPDATE - Automatic via trigger (box assignment/unassignment)
-- Only workspace members can update QR codes
create policy "Workspace members can update QR codes"
  on qr_codes
  for update
  using (is_workspace_member(workspace_id));

-- Policy 4: DELETE - Only workspace owners can delete QR codes
-- (typically happens on workspace deletion via cascade)
create policy "Workspace owners can delete QR codes"
  on qr_codes
  for delete
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = qr_codes.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role = 'owner'
    )
  );

-- ============================================================================
-- TABLE 6: PROFILES
-- ============================================================================
-- Enable RLS
alter table profiles enable row level security;

-- Policy 1: SELECT - Users can view their own profile
create policy "Users can view own profile"
  on profiles
  for select
  using (auth.uid() = id);

-- Policy 2: UPDATE - Users can update their own profile
create policy "Users can update own profile"
  on profiles
  for update
  using (auth.uid() = id);

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================
-- Run these queries after migration to verify RLS is working:
--
-- 1. Check RLS is enabled on all tables:
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--      AND tablename IN ('workspaces', 'workspace_members', 'locations',
--                        'boxes', 'qr_codes', 'profiles');
--
-- 2. List all policies:
--    SELECT schemaname, tablename, policyname, permissive, roles, cmd
--    FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;
--
-- 3. Test cross-workspace isolation (requires 2 test users):
--    -- As User A:
--    SELECT * FROM boxes WHERE workspace_id = '<user-b-workspace-id>';
--    -- Should return 0 rows (blocked by RLS)
-- ============================================================================

-- Add comment to migration
comment on function is_workspace_member(uuid) is 'Helper function to check if current user is a member of specified workspace. Used by RLS policies for multi-tenant data isolation.';
