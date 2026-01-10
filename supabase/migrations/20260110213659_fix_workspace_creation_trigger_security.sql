-- ============================================================================
-- FIX: Workspace Creation Trigger Security
-- ============================================================================
-- Migration: 20260110213659_fix_workspace_creation_trigger_security
-- Description: Add SECURITY DEFINER to workspace creation trigger function
--              to allow it to bypass RLS policies when adding owner to
--              workspace_members table
--
-- Problem: The add_owner_to_workspace_members() trigger function was
--          running with invoker privileges, causing it to fail RLS checks
--          when inserting into workspace_members (chicken-and-egg: no
--          existing members yet for new workspace)
--
-- Solution: Add SECURITY DEFINER to run with elevated privileges and
--           SET search_path for security
-- ============================================================================

-- Drop and recreate the function with SECURITY DEFINER
create or replace function public.add_owner_to_workspace_members()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  -- insert the workspace owner into workspace_members with 'owner' role
  -- SECURITY DEFINER allows this to bypass RLS policies
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  return new;
end;
$$;

-- Update comment
comment on function public.add_owner_to_workspace_members() is
  'Automatically adds the workspace owner to workspace_members table with owner role when a new workspace is created. Runs with SECURITY DEFINER to bypass RLS policies during workspace creation.';