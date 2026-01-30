-- ============================================================================
-- ADD SECURITY DEFINER FUNCTIONS TO BYPASS RLS FOR AUTHENTICATED API CALLS
-- ============================================================================
-- Migration: 20260130150000_add_rls_bypass_functions
-- Description: Create functions with SECURITY DEFINER that bypass RLS policies
--              for use in server-side API calls where auth.uid() is not available
--              (custom session cookie authentication approach)
--
-- Problem: When using custom session cookies instead of Supabase's built-in auth,
--          auth.uid() returns NULL and RLS policies block queries even for
--          authenticated users.
--
-- Solution: Create SECURITY DEFINER functions that accept user_id as parameter
--           and bypass RLS. These are only called from server-side code where
--           the user_id has been validated from the session cookie.
-- ============================================================================

-- ============================================================================
-- Function: get_user_workspaces
-- Description: Retrieves all workspaces a user is a member of
-- ============================================================================
create or replace function get_user_workspaces(p_user_id uuid)
returns table (
  id uuid,
  owner_id uuid,
  name text,
  created_at timestamptz,
  updated_at timestamptz
)
security definer
set search_path = public
language plpgsql
as $$
begin
  return query
  select w.id, w.owner_id, w.name, w.created_at, w.updated_at
  from workspaces w
  inner join workspace_members wm on w.id = wm.workspace_id
  where wm.user_id = p_user_id
  order by w.created_at desc;
end;
$$;

-- Grant execute permission
grant execute on function get_user_workspaces(uuid) to authenticated;
grant execute on function get_user_workspaces(uuid) to anon;

comment on function get_user_workspaces(uuid) is
  'Retrieves all workspaces a user is a member of. Uses SECURITY DEFINER to bypass RLS for server-side API calls with custom session authentication.';


-- ============================================================================
-- Function: check_workspace_membership
-- Description: Checks if a user is a member of a workspace
-- ============================================================================
create or replace function check_workspace_membership(p_user_id uuid, p_workspace_id uuid)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1
    from workspace_members
    where user_id = p_user_id
      and workspace_id = p_workspace_id
  );
end;
$$;

-- Grant execute permission
grant execute on function check_workspace_membership(uuid, uuid) to authenticated;
grant execute on function check_workspace_membership(uuid, uuid) to anon;

comment on function check_workspace_membership(uuid, uuid) is
  'Checks if a user is a member of a workspace. Uses SECURITY DEFINER to bypass RLS for server-side API calls.';


-- ============================================================================
-- Function: get_workspace_locations
-- Description: Retrieves locations for a workspace (with membership check)
-- ============================================================================
create or replace function get_workspace_locations(
  p_user_id uuid,
  p_workspace_id uuid,
  p_parent_id uuid default null
)
returns table (
  id uuid,
  workspace_id uuid,
  path text,
  name text,
  description text,
  is_deleted boolean,
  created_at timestamptz,
  updated_at timestamptz
)
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Check membership first (use table alias to avoid ambiguity)
  if not exists (
    select 1 from workspace_members wm
    where wm.user_id = p_user_id and wm.workspace_id = p_workspace_id
  ) then
    raise exception 'User is not a member of this workspace';
  end if;

  -- Return locations
  return query
  select l.id, l.workspace_id, l.path::text, l.name, l.description, l.is_deleted, l.created_at, l.updated_at
  from locations l
  where l.workspace_id = p_workspace_id
    and l.is_deleted = false
  order by l.name asc;
end;
$$;

-- Grant execute permission
grant execute on function get_workspace_locations(uuid, uuid, uuid) to authenticated;
grant execute on function get_workspace_locations(uuid, uuid, uuid) to anon;

comment on function get_workspace_locations(uuid, uuid, uuid) is
  'Retrieves locations for a workspace with membership validation. Uses SECURITY DEFINER to bypass RLS for server-side API calls.';


-- ============================================================================
-- Function: create_location
-- Description: Creates a new location (with membership check)
-- ============================================================================
create or replace function create_location_for_user(
  p_user_id uuid,
  p_workspace_id uuid,
  p_name text,
  p_description text default null,
  p_parent_id uuid default null
)
returns uuid
security definer
set search_path = public
language plpgsql
as $$
declare
  v_location_id uuid;
  v_parent_path ltree;
  v_new_path ltree;
  v_normalized_name text;
  v_path_depth int;
begin
  -- Check membership first (use table alias to avoid ambiguity)
  if not exists (
    select 1 from workspace_members wm
    where wm.user_id = p_user_id and wm.workspace_id = p_workspace_id
  ) then
    raise exception 'User is not a member of this workspace';
  end if;

  -- Normalize name for ltree path (lowercase, replace special chars)
  v_normalized_name := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '_', 'g'));
  v_normalized_name := regexp_replace(v_normalized_name, '_+', '_', 'g');
  v_normalized_name := trim(both '_' from v_normalized_name);

  -- Handle empty normalized name
  if v_normalized_name = '' then
    v_normalized_name := 'location';
  end if;

  -- Build path based on parent
  if p_parent_id is null then
    -- Root level location
    v_new_path := ('root.' || v_normalized_name)::ltree;
  else
    -- Get parent path
    select l.path into v_parent_path
    from locations l
    where l.id = p_parent_id
      and l.workspace_id = p_workspace_id
      and l.is_deleted = false;

    if v_parent_path is null then
      raise exception 'Parent location not found';
    end if;

    v_new_path := (v_parent_path::text || '.' || v_normalized_name)::ltree;
  end if;

  -- Check depth (max 5 levels)
  v_path_depth := nlevel(v_new_path);
  if v_path_depth > 5 then
    raise exception 'Maximum location depth exceeded (max 5 levels)';
  end if;

  -- Check for duplicate path at same level
  if exists (
    select 1 from locations l
    where l.workspace_id = p_workspace_id
      and l.path = v_new_path
      and l.is_deleted = false
  ) then
    raise exception 'Location with this name already exists at this level';
  end if;

  -- Insert location
  insert into locations (workspace_id, path, name, description)
  values (p_workspace_id, v_new_path, p_name, p_description)
  returning id into v_location_id;

  return v_location_id;
end;
$$;

-- Grant execute permission
grant execute on function create_location_for_user(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function create_location_for_user(uuid, uuid, text, text, uuid) to anon;

comment on function create_location_for_user(uuid, uuid, text, text, uuid) is
  'Creates a new location with membership validation. Uses SECURITY DEFINER to bypass RLS for server-side API calls.';


-- ============================================================================
-- Function: get_user_profile
-- Description: Retrieves a user's profile by ID (bypasses RLS)
-- ============================================================================
create or replace function get_user_profile(p_user_id uuid)
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  theme_preference text
)
security definer
set search_path = public
language plpgsql
as $$
begin
  return query
  select p.id, p.email, p.full_name, p.avatar_url, p.created_at, p.updated_at, p.theme_preference
  from profiles p
  where p.id = p_user_id;
end;
$$;

-- Grant execute permission
grant execute on function get_user_profile(uuid) to authenticated;
grant execute on function get_user_profile(uuid) to anon;

comment on function get_user_profile(uuid) is
  'Retrieves a user profile by ID. Uses SECURITY DEFINER to bypass RLS for server-side API calls with custom session authentication.';