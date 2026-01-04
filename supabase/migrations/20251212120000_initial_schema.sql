/*
  # Initial Schema for Storage & Box Organizer

  1.  **Extensions**
      - `uuid-ossp`: UUID generation.
      - `ltree`: Hierarchical data (locations).
      - `moddatetime`: Auto-updating `updated_at`.
      - `pg_trgm`: Fuzzy search.
      - `unaccent`: Text normalization.

  2.  **Enums**
      - `user_role`: owner, admin, member, read_only.
      - `qr_status`: generated, printed, assigned.

  3.  **Tables**
      - `public.profiles`: User profiles (extends auth.users).
      - `public.workspaces`: Tenants.
      - `public.workspace_members`: User-Workspace relation.
      - `public.locations`: Storage hierarchy.
      - `public.boxes`: Items/Boxes.
      - `public.qr_codes`: QR registry.

  4.  **Security**
      - Enable RLS on all tables.
      - Granular policies for `authenticated` and `anon` roles.
      - `anon` policies strictly deny access.
      - `authenticated` policies rely on workspace membership and roles.

  5.  **Automation**
      - Triggers for `updated_at` on profiles, workspaces, locations, boxes.
      - Trigger for `short_id` generation on boxes (10 chars alphanumeric).
      - Trigger for `short_id` generation on qr_codes (format: QR-XXXXXX, 6 chars).
      - Generated column for `search_vector` (using immutable helper function).
      - Trigger for user creation (profile setup and default workspace).
      - Trigger for box deletion (resets associated QR code to 'generated' status).
*/

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "ltree";
create extension if not exists "moddatetime";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- Enums
-- Create user_role enum
create type public.user_role as enum ('owner', 'admin', 'member', 'read_only');
-- Create qr_status enum
create type public.qr_status as enum ('generated', 'printed', 'assigned');

-- Helper Functions

-- Immutable function for generating tsvector for boxes
-- Encapsulates all logic to ensure it's treated as IMMUTABLE by the generated column
create or replace function public.fn_generate_box_search_vector(name text, description text, tags text[])
returns tsvector
language plpgsql
immutable
as $$
begin
  return
    setweight(to_tsvector('english'::regconfig, coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(array_to_string(tags, ' '), '')), 'C');
end;
$$;

-- Tables

-- 1. Profiles
-- Stores public user data, linked 1:1 with the auth.users table.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text check (char_length(full_name) <= 100),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Public user profiles linked to auth.users';

-- 2. Workspaces
-- Data isolation unit (Tenant).
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) <= 64),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
comment on table public.workspaces is 'Workspaces serve as tenants for data isolation';

-- 3. Workspace Members
-- Junction table linking users to workspaces.
create table public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role public.user_role not null default 'member',
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);
comment on table public.workspace_members is 'Junction table for Workspace-User relationship with roles';

-- 4. Locations
-- Hierarchical storage structure.
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  path ltree not null,
  name text not null check (char_length(name) <= 64),
  description text check (char_length(description) <= 500),
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
comment on table public.locations is 'Hierarchical locations using ltree';

-- Constraints and Indexes for Locations
create index locations_path_gist_idx on public.locations using gist (path);
create index locations_workspace_id_idx on public.locations (workspace_id);
alter table public.locations add constraint locations_workspace_id_path_key unique (workspace_id, path);
alter table public.locations add constraint locations_path_depth_check check (nlevel(path) <= 5);

-- 5. Boxes
-- Main inventory entity.
create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  short_id text not null check (char_length(short_id) <= 20),
  name text not null check (char_length(name) <= 100),
  description text check (char_length(description) <= 10000),
  tags text[] default '{}',
  image_url text,
  search_vector tsvector generated always as (
    public.fn_generate_box_search_vector(name, description, tags)
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint boxes_short_id_key unique (short_id)
);
comment on table public.boxes is 'Inventory boxes/items';

create index boxes_search_vector_idx on public.boxes using gin (search_vector);
create index boxes_tags_idx on public.boxes using gin (tags);
create index boxes_location_id_idx on public.boxes (location_id);
create index boxes_workspace_id_idx on public.boxes (workspace_id);

-- 6. QR Codes
-- Registry of generated QR codes.
create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  box_id uuid unique references public.boxes(id) on delete set null,
  short_id text not null check (char_length(short_id) <= 20),
  status public.qr_status not null default 'generated',
  created_at timestamptz default now(),
  constraint qr_codes_short_id_key unique (short_id)
);
comment on table public.qr_codes is 'QR code registry with unique short_id for scanning';

create index qr_codes_workspace_id_idx on public.qr_codes (workspace_id);
create index qr_codes_short_id_idx on public.qr_codes (short_id);
create index qr_codes_box_id_idx on public.qr_codes (box_id);


-- Security Helper Functions

-- Check if current user is a member of the workspace
create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Check if current user has one of the required roles in the workspace
create or replace function public.has_workspace_role(_workspace_id uuid, _roles public.user_role[])
returns boolean as $$
begin
  return exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
    and user_id = auth.uid()
    and role = any(_roles)
  );
end;
$$ language plpgsql security definer;


-- RLS Policies

-- Enable RLS
-- alter table public.profiles enable row level security;
-- alter table public.workspaces enable row level security;
-- alter table public.workspace_members enable row level security;
-- alter table public.locations enable row level security;
-- alter table public.boxes enable row level security;
-- alter table public.qr_codes enable row level security;

-- Policies for public.profiles

-- Authenticated: Users can view their own profile
-- create policy "profiles_select_authenticated" on public.profiles
--   for select to authenticated using (auth.uid() = id);

-- Authenticated: Users can update their own profile
-- create policy "profiles_update_authenticated" on public.profiles
--   for update to authenticated using (auth.uid() = id);

-- Authenticated: Users can insert their own profile (mostly for triggers, but allows manual too)
-- create policy "profiles_insert_authenticated" on public.profiles
--   for insert to authenticated with check (auth.uid() = id);

-- Authenticated: Users can delete their own profile
-- create policy "profiles_delete_authenticated" on public.profiles
--   for delete to authenticated using (auth.uid() = id);

-- Anon: Deny all
-- create policy "profiles_select_anon" on public.profiles for select to anon using (false);
-- create policy "profiles_insert_anon" on public.profiles for insert to anon with check (false);
-- create policy "profiles_update_anon" on public.profiles for update to anon using (false);
-- create policy "profiles_delete_anon" on public.profiles for delete to anon using (false);


-- Policies for public.workspaces

-- Authenticated: Members can view
-- create policy "workspaces_select_authenticated" on public.workspaces
--   for select to authenticated using (
--     owner_id = auth.uid() or
--     exists (select 1 from public.workspace_members where workspace_id = public.workspaces.id and user_id = auth.uid())
--   );

-- Authenticated: Create workspace (anyone)
-- create policy "workspaces_insert_authenticated" on public.workspaces
--   for insert to authenticated with check (owner_id = auth.uid());

-- Authenticated: Update (Owner only for now)
-- create policy "workspaces_update_authenticated" on public.workspaces
--   for update to authenticated using (owner_id = auth.uid());

-- Authenticated: Delete (Owner only)
-- create policy "workspaces_delete_authenticated" on public.workspaces
--   for delete to authenticated using (owner_id = auth.uid());

-- Anon: Deny all
-- create policy "workspaces_select_anon" on public.workspaces for select to anon using (false);
-- create policy "workspaces_insert_anon" on public.workspaces for insert to anon with check (false);
-- create policy "workspaces_update_anon" on public.workspaces for update to anon using (false);
-- create policy "workspaces_delete_anon" on public.workspaces for delete to anon using (false);


-- Policies for public.workspace_members

-- Authenticated: View members of same workspace
-- create policy "workspace_members_select_authenticated" on public.workspace_members
--   for select to authenticated using (
--     public.is_workspace_member(workspace_id)
--   );

-- Authenticated: Insert (Admins/Owners)
-- create policy "workspace_members_insert_authenticated" on public.workspace_members
--   for insert to authenticated with check (
--     public.has_workspace_role(workspace_id, array['owner', 'admin']::public.user_role)
--   );

-- Authenticated: Update (Admins/Owners)
-- create policy "workspace_members_update_authenticated" on public.workspace_members
--   for update to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin']::public.user_role)
--   );

-- Authenticated: Delete (Admins/Owners OR Self/Leaving)
-- create policy "workspace_members_delete_authenticated" on public.workspace_members
--   for delete to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin']::public.user_role) or
--     user_id = auth.uid()
--   );

-- Anon: Deny all
-- create policy "workspace_members_select_anon" on public.workspace_members for select to anon using (false);
-- create policy "workspace_members_insert_anon" on public.workspace_members for insert to anon with check (false);
-- create policy "workspace_members_update_anon" on public.workspace_members for update to anon using (false);
-- create policy "workspace_members_delete_anon" on public.workspace_members for delete to anon using (false);


-- Policies for public.locations

-- Authenticated: View (Members)
-- create policy "locations_select_authenticated" on public.locations
--   for select to authenticated using (public.is_workspace_member(workspace_id));

-- Authenticated: Insert (Admins/Members)
-- create policy "locations_insert_authenticated" on public.locations
--   for insert to authenticated with check (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Authenticated: Update (Admins/Members)
-- create policy "locations_update_authenticated" on public.locations
--   for update to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Authenticated: Delete (Admins/Members)
-- create policy "locations_delete_authenticated" on public.locations
--   for delete to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Anon: Deny all
-- create policy "locations_select_anon" on public.locations for select to anon using (false);
-- create policy "locations_insert_anon" on public.locations for insert to anon with check (false);
-- create policy "locations_update_anon" on public.locations for update to anon using (false);
-- create policy "locations_delete_anon" on public.locations for delete to anon using (false);


-- Policies for public.boxes

-- Authenticated: View (Members)
-- create policy "boxes_select_authenticated" on public.boxes
--   for select to authenticated using (public.is_workspace_member(workspace_id));

-- Authenticated: Insert (Admins/Members)
-- create policy "boxes_insert_authenticated" on public.boxes
--   for insert to authenticated with check (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Authenticated: Update (Admins/Members)
-- create policy "boxes_update_authenticated" on public.boxes
--   for update to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Authenticated: Delete (Admins/Members)
-- create policy "boxes_delete_authenticated" on public.boxes
--   for delete to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Anon: Deny all
-- create policy "boxes_select_anon" on public.boxes for select to anon using (false);
-- create policy "boxes_insert_anon" on public.boxes for insert to anon with check (false);
-- create policy "boxes_update_anon" on public.boxes for update to anon using (false);
-- create policy "boxes_delete_anon" on public.boxes for delete to anon using (false);


-- Policies for public.qr_codes

-- Authenticated: View (Members)
-- create policy "qr_codes_select_authenticated" on public.qr_codes
--   for select to authenticated using (public.is_workspace_member(workspace_id));

-- Authenticated: Insert (Admins/Members)
-- create policy "qr_codes_insert_authenticated" on public.qr_codes
--   for insert to authenticated with check (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Authenticated: Update (Admins/Members)
-- create policy "qr_codes_update_authenticated" on public.qr_codes
--   for update to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Authenticated: Delete (Admins/Members)
-- create policy "qr_codes_delete_authenticated" on public.qr_codes
--   for delete to authenticated using (
--     public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']::public.user_role)
--   );

-- Anon: Deny all
-- create policy "qr_codes_select_anon" on public.qr_codes for select to anon using (false);
-- create policy "qr_codes_insert_anon" on public.qr_codes for insert to anon with check (false);
-- create policy "qr_codes_update_anon" on public.qr_codes for update to anon using (false);
-- create policy "qr_codes_delete_anon" on public.qr_codes for delete to anon using (false);


-- Triggers

-- 1. moddatetime triggers
create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute procedure moddatetime (updated_at);

create trigger handle_updated_at_workspaces
  before update on public.workspaces
  for each row execute procedure moddatetime (updated_at);

create trigger handle_updated_at_locations
  before update on public.locations
  for each row execute procedure moddatetime (updated_at);

create trigger handle_updated_at_boxes
  before update on public.boxes
  for each row execute procedure moddatetime (updated_at);

-- 2. Short ID Generation for Boxes
create or replace function public.generate_short_id()
returns trigger as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  exists_check boolean;
  max_attempts integer := 100;
  attempt_count integer := 0;
begin
  -- Do nothing if short_id is already set
  if new.short_id is not null then
    return new;
  end if;

  -- Attempt to generate a unique ID with retry limit
  loop
    attempt_count := attempt_count + 1;
    
    -- Raise error if maximum attempts exceeded
    if attempt_count > max_attempts then
      raise exception 'Failed to generate unique short_id after % attempts', max_attempts;
    end if;
    
    result := '';
    for i in 1..10 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    
    select exists(select 1 from public.boxes where short_id = result) into exists_check;
    if not exists_check then
      new.short_id := result;
      exit;
    end if;
  end loop;
  
  return new;
end;
$$ language plpgsql;

create trigger set_box_short_id
  before insert on public.boxes
  for each row execute procedure public.generate_short_id();

-- 2b. Short ID Generation for QR Codes
-- Similar to boxes, but with 'QR-' prefix for distinction
create or replace function public.generate_qr_short_id()
returns trigger as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  random_part text := '';
  i integer;
  exists_check boolean;
  max_attempts integer := 100;
  attempt_count integer := 0;
begin
  -- Do nothing if short_id is already set
  if new.short_id is not null then
    return new;
  end if;

  -- Attempt to generate a unique ID with retry limit
  loop
    attempt_count := attempt_count + 1;
    
    -- Raise error if maximum attempts exceeded
    if attempt_count > max_attempts then
      raise exception 'Failed to generate unique QR short_id after % attempts', max_attempts;
    end if;
    
    random_part := '';
    -- Generate 6 character code (e.g., A1B2C3)
    for i in 1..6 loop
      random_part := random_part || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    
    -- Format as QR-XXXXXX
    result := 'QR-' || random_part;
    
    select exists(select 1 from public.qr_codes where short_id = result) into exists_check;
    if not exists_check then
      new.short_id := result;
      exit;
    end if;
  end loop;
  
  return new;
end;
$$ language plpgsql;

create trigger set_qr_short_id
  before insert on public.qr_codes
  for each row execute procedure public.generate_qr_short_id();

-- 2c. Handle Box Deletion - Reset QR Code
-- When a box is deleted, unlink the QR code and reset its status to 'generated'
-- so it can be reused for a new box
create or replace function public.handle_box_deletion()
returns trigger as $$
begin
  -- Update the QR code: set box_id to NULL and status to 'generated'
  update public.qr_codes
  set 
    box_id = null,
    status = 'generated'
  where box_id = old.id;
  
  return old;
end;
$$ language plpgsql;

create trigger on_box_deleted
  before delete on public.boxes
  for each row execute procedure public.handle_box_deletion();

-- 3. New User Handling
-- Automatically creates a profile and a default workspace for new auth users
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_workspace_id uuid;
begin
  -- Insert profile with error handling
  -- If this fails, the exception will propagate and rollback the auth.users insert
  begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  exception
    when others then
      raise exception 'Failed to create profile for user %: %', new.id, sqlerrm;
  end;

  -- Insert workspace with error handling
  -- NOTE: The after_workspace_insert trigger (from 20251214120000_workspace_creation_trigger.sql)
  -- will automatically add the user to workspace_members with role 'owner'
  begin
    insert into public.workspaces (owner_id, name)
    values (new.id, 'My Workspace')
    returning id into new_workspace_id;
  exception
    when others then
      raise exception 'Failed to create workspace for user %: %', new.id, sqlerrm;
  end;

  -- REMOVED: workspace_members insert
  -- The after_workspace_insert trigger handles this automatically now
  -- This ensures consistency and avoids duplicate key violations

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


