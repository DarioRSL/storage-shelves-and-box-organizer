-- migration: add trigger to automatically add owner to workspace_members after workspace creation
-- description: ensures atomicity of workspace creation and owner assignment
-- date: 2025-12-14

-- Step 1: Create function to add owner to workspace_members
-- This function is called automatically after a workspace is inserted
create or replace function public.add_owner_to_workspace_members()
returns trigger as $$
begin
  -- insert the workspace owner into workspace_members with 'owner' role
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  return new;
end;
$$ language plpgsql;

-- Step 2: Create trigger that fires after workspace insertion
-- This ensures every workspace automatically has an owner in workspace_members
create trigger after_workspace_insert
after insert on public.workspaces
for each row
execute function public.add_owner_to_workspace_members();

-- Step 3: Update handle_new_user to remove duplicate workspace_members insert
-- Since the after_workspace_insert trigger now handles this automatically,
-- we need to remove the manual insert to avoid duplicate key violations
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_workspace_id uuid;
begin
  -- Insert profile with error handling
  begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  exception
    when others then
      raise exception 'Failed to create profile for user %: %', new.id, sqlerrm;
  end;

  -- Insert workspace with error handling
  -- NOTE: The after_workspace_insert trigger (created above) will automatically
  -- add the user to workspace_members with role 'owner'
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

  return new;
end;
$$ language plpgsql security definer;

-- Add comment for documentation
comment on function public.add_owner_to_workspace_members() is
  'Automatically adds the workspace owner to workspace_members table with owner role when a new workspace is created. Ensures data integrity and atomicity.';