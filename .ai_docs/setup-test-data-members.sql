-- Test Data Setup for Workspace Members Testing
--
-- This script creates test data for PATCH /api/workspaces/:workspace_id/members/:user_id endpoint
-- Run this via: podman exec supabase_db_supabase psql -U postgres -d postgres -f setup-test-data-members.sql
--
-- NOTE: This assumes you already have test users in auth.users
-- If not, create them via Supabase dashboard or auth API first

-- Begin transaction
BEGIN;

-- Create a test workspace for multi-member testing
INSERT INTO public.workspaces (id, owner_id, name, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
    (SELECT id FROM auth.users WHERE email = 'testuser@example.com' LIMIT 1),
    'Multi-Member Test Workspace',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      updated_at = NOW();

-- Add workspace owner
INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
    (SELECT id FROM auth.users WHERE email = 'testuser@example.com' LIMIT 1),
    'owner',
    NOW()
  )
ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

-- Add a member (for role update testing)
INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
    (SELECT id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1),
    'member',
    NOW()
  )
ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

-- Add an admin (for permission testing)
INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
    (SELECT id FROM auth.users WHERE email = 'apitest@example.com' LIMIT 1),
    'admin',
    NOW()
  )
ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

-- Create a workspace with single owner (for last-owner protection testing)
INSERT INTO public.workspaces (id, owner_id, name, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-000000000002'::uuid,
    (SELECT id FROM auth.users WHERE email = 'testuser@example.com' LIMIT 1),
    'Single Owner Test Workspace',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      updated_at = NOW();

-- Add single owner
INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-000000000002'::uuid,
    (SELECT id FROM auth.users WHERE email = 'testuser@example.com' LIMIT 1),
    'owner',
    NOW()
  )
ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

-- Commit transaction
COMMIT;

-- Display created test data
SELECT
  w.id as workspace_id,
  w.name as workspace_name,
  wm.user_id,
  p.email,
  wm.role
FROM public.workspaces w
JOIN public.workspace_members wm ON w.id = wm.workspace_id
JOIN public.profiles p ON wm.user_id = p.id
WHERE w.id IN (
  'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
  'aaaaaaaa-bbbb-cccc-dddd-000000000002'::uuid
)
ORDER BY w.name, wm.role DESC;

-- Print summary
\echo ''
\echo '=========================================='
\echo 'Test Data Setup Complete!'
\echo '=========================================='
\echo ''
\echo 'Multi-Member Workspace ID: aaaaaaaa-bbbb-cccc-dddd-000000000001'
\echo 'Single Owner Workspace ID: aaaaaaaa-bbbb-cccc-dddd-000000000002'
\echo ''
\echo 'You can now run: bash .ai_docs/test-patch-members-userid.sh'
\echo ''
