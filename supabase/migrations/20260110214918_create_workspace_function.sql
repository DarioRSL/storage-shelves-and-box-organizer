-- ============================================================================
-- CREATE WORKSPACE FUNCTION WITH SECURITY DEFINER
-- ============================================================================
-- Migration: 20260110214918_create_workspace_function
-- Description: Create a PostgreSQL function with SECURITY DEFINER to handle
--              workspace creation, bypassing RLS policies
--
-- Problem: RLS policy requires auth.uid() to be set, but our cookie-based
--          auth doesn't properly set this context in all scenarios
--
-- Solution: Use SECURITY DEFINER function that can bypass RLS and create
--           workspace with proper ownership
-- ============================================================================

-- Drop existing function if it exists
drop function if exists create_workspace_for_user(uuid, text);

-- Create function to create workspace with SECURITY DEFINER
create or replace function create_workspace_for_user(
  p_user_id uuid,
  p_workspace_name text
)
returns uuid
security definer
set search_path = public
language plpgsql
as $$
declare
  v_workspace_id uuid;
begin
  -- Validate input
  if p_user_id is null then
    raise exception 'User ID cannot be null';
  end if;

  if p_workspace_name is null or trim(p_workspace_name) = '' then
    raise exception 'Workspace name cannot be empty';
  end if;

  if char_length(p_workspace_name) > 64 then
    raise exception 'Workspace name cannot exceed 64 characters';
  end if;

  -- Insert workspace (bypasses RLS due to SECURITY DEFINER)
  insert into public.workspaces (owner_id, name)
  values (p_user_id, trim(p_workspace_name))
  returning id into v_workspace_id;

  -- The after_workspace_insert trigger will automatically add the user
  -- to workspace_members with role 'owner'

  return v_workspace_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function create_workspace_for_user(uuid, text) to authenticated;

-- Add comment
comment on function create_workspace_for_user(uuid, text) is
  'Creates a new workspace for the specified user with SECURITY DEFINER privileges to bypass RLS policies. The after_workspace_insert trigger automatically adds the user as owner in workspace_members.';