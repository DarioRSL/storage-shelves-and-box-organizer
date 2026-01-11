# RLS Policies Testing Guide

**Status:** ⏳ Migration Created, Awaiting Testing
**Migration File:** `supabase/migrations/20260106200458_enable_rls_policies.sql`
**Created:** 2026-01-06
**Related Issues:** #88, #89, #90, #91, #92, #93

## Overview

This guide provides step-by-step instructions for testing the Row Level Security (RLS) policies implementation for the Storage & Box Organizer multi-tenant system.

## Migration Summary

The migration implements:
- **Helper Function:** `is_workspace_member(workspace_id_param uuid)` - checks if current user is a member of specified workspace
- **6 Tables Secured:** workspaces, workspace_members, locations, boxes, qr_codes, profiles
- **22+ RLS Policies:** Granular SELECT, INSERT, UPDATE, DELETE policies per table
- **Security Model:** Workspace-scoped data isolation with role-based access control

## Prerequisites

1. Local Supabase instance running
2. Two test user accounts
3. Database with existing data OR ability to create test data
4. Access to Supabase SQL Editor or `psql` client

## Testing Approach

### Phase 1: Apply Migration

**Option A: Via Supabase CLI (Recommended)**
```bash
# Reset local database to clean state
npx supabase db reset

# Start Supabase (will auto-apply migrations)
npx supabase start
```

**Option B: Manual SQL Application**
```bash
# Connect to local Supabase database
npx supabase db push

# Or use psql directly
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20260106200458_enable_rls_policies.sql
```

### Phase 2: Verify RLS Enabled

Run this query in Supabase SQL Editor:

```sql
-- Check RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('workspaces', 'workspace_members', 'locations', 'boxes', 'qr_codes', 'profiles');
```

**Expected Result:** All 6 tables should have `rowsecurity = true`

### Phase 3: Verify Policies Created

Run this query:

```sql
-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Result:** 22+ policies across 6 tables

### Phase 4: Create Test Users and Data

#### Step 1: Create Test Users

Use Supabase Dashboard → Authentication → Users → Add User:

- **User A:** `test-user-a@example.com` / Password: `Test123!@#`
- **User B:** `test-user-b@example.com` / Password: `Test123!@#`

**Note User IDs** for later use.

#### Step 2: Create Test Workspaces

As **User A** (via API or SQL):

```sql
-- Insert workspace for User A
INSERT INTO workspaces (id, name, description, created_by, updated_by)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'User A Workspace',
  'Test workspace for User A',
  '<user-a-id>',
  '<user-a-id>'
);

-- Add User A as workspace owner
INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '<user-a-id>',
  'owner',
  '<user-a-id>'
);
```

As **User B** (via API or SQL):

```sql
-- Insert workspace for User B
INSERT INTO workspaces (id, name, description, created_by, updated_by)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'User B Workspace',
  'Test workspace for User B',
  '<user-b-id>',
  '<user-b-id>'
);

-- Add User B as workspace owner
INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '<user-b-id>',
  'owner',
  '<user-b-id>'
);
```

#### Step 3: Create Test Locations

As **User A**:

```sql
-- Create location in User A's workspace
INSERT INTO locations (id, workspace_id, name, path, created_by, updated_by)
VALUES (
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'User A Garage',
  'root.garage',
  '<user-a-id>',
  '<user-a-id>'
);
```

As **User B**:

```sql
-- Create location in User B's workspace
INSERT INTO locations (id, workspace_id, name, path, created_by, updated_by)
VALUES (
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'User B Garage',
  'root.garage',
  '<user-b-id>',
  '<user-b-id>'
);
```

#### Step 4: Create Test Boxes

As **User A**:

```sql
-- Create box in User A's workspace
INSERT INTO boxes (id, workspace_id, name, description, created_by, updated_by)
VALUES (
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'User A Box 1',
  'Box belonging to User A',
  '<user-a-id>',
  '<user-a-id>'
);
```

As **User B**:

```sql
-- Create box in User B's workspace
INSERT INTO boxes (id, workspace_id, name, description, created_by, updated_by)
VALUES (
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'User B Box 1',
  'Box belonging to User B',
  '<user-b-id>',
  '<user-b-id>'
);
```

### Phase 5: Cross-Workspace Isolation Tests

**CRITICAL:** All queries below should be executed **as User A** (set JWT in Supabase SQL Editor or use API with User A's auth token).

#### Test 1: User A Cannot View User B's Workspaces ✅

```sql
-- Set role to simulate User A
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';

-- Try to query User B's workspace
SELECT * FROM workspaces WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```

**Expected Result:** 0 rows (blocked by RLS)

#### Test 2: User A Cannot View User B's Locations ✅

```sql
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';

SELECT * FROM locations WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```

**Expected Result:** 0 rows (blocked by RLS)

#### Test 3: User A Cannot View User B's Boxes ✅

```sql
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';

SELECT * FROM boxes WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```

**Expected Result:** 0 rows (blocked by RLS)

#### Test 4: User A Cannot View User B's QR Codes ✅

```sql
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';

SELECT * FROM qr_codes WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```

**Expected Result:** 0 rows (blocked by RLS)

#### Test 5: User A Cannot UPDATE User B's Boxes ✅

```sql
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';

UPDATE boxes
SET name = 'HACKED!'
WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```

**Expected Result:** 0 rows updated (blocked by RLS)

#### Test 6: User A Cannot DELETE User B's Boxes ✅

```sql
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';

DELETE FROM boxes
WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
```

**Expected Result:** 0 rows deleted (blocked by RLS)

#### Test 7: User A CAN View Own Workspace Data ✅

```sql
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';

-- User A should see own workspace
SELECT * FROM workspaces WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- User A should see own locations
SELECT * FROM locations WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- User A should see own boxes
SELECT * FROM boxes WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

**Expected Result:** All queries return data (RLS allows access to own workspace)

### Phase 6: Role-Based Access Tests

#### Test 8: Workspace Members Can Access Shared Workspace Data ✅

1. **User A adds User B as member** to User A's workspace:

```sql
INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '<user-b-id>',
  'member',
  '<user-a-id>'
);
```

2. **User B queries User A's workspace** (should now succeed):

```sql
SET LOCAL "request.jwt.claims" = '{"sub": "<user-b-id>"}';

-- User B should now see User A's workspace (as member)
SELECT * FROM workspaces WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- User B should see User A's locations
SELECT * FROM locations WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- User B should see User A's boxes
SELECT * FROM boxes WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

**Expected Result:** User B can now view User A's workspace data (RLS allows workspace members)

#### Test 9: Only Owner/Admin Can Update Workspaces ✅

```sql
-- User B (role: member) tries to update User A's workspace
SET LOCAL "request.jwt.claims" = '{"sub": "<user-b-id>"}';

UPDATE workspaces
SET name = 'User B Changed This!'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

**Expected Result:** 0 rows updated (blocked by RLS - only owner/admin can update)

#### Test 10: Only Owner Can Delete Workspaces ✅

```sql
-- User B (role: member) tries to delete User A's workspace
SET LOCAL "request.jwt.claims" = '{"sub": "<user-b-id>"}';

DELETE FROM workspaces
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

**Expected Result:** 0 rows deleted (blocked by RLS - only owner can delete)

### Phase 7: API Endpoint Tests

**Use curl or Postman** to test RLS enforcement via API endpoints.

#### Test 11: API Respects RLS for GET Requests ✅

```bash
# Get User A's auth token
USER_A_TOKEN="<user-a-jwt-token>"

# User A queries own boxes (should succeed)
curl -H "Authorization: Bearer $USER_A_TOKEN" \
     http://localhost:3000/api/boxes

# Expected: Returns User A's boxes only (not User B's boxes)
```

#### Test 12: API Respects RLS for POST Requests ✅

```bash
# User A tries to create box in User B's workspace (should fail)
curl -X POST \
     -H "Authorization: Bearer $USER_A_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"workspace_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","name":"Hacked Box"}' \
     http://localhost:3000/api/boxes

# Expected: 403 Forbidden or 0 rows inserted
```

### Phase 8: Profile Isolation Tests

#### Test 13: Users Can View Own Profile Only ✅

```sql
-- User A views own profile (should succeed)
SET LOCAL "request.jwt.claims" = '{"sub": "<user-a-id>"}';
SELECT * FROM profiles WHERE id = '<user-a-id>';

-- User A tries to view User B's profile (should fail)
SELECT * FROM profiles WHERE id = '<user-b-id>';
```

**Expected Result:**
- First query returns User A's profile
- Second query returns 0 rows (blocked by RLS)

## Test Completion Checklist

- [ ] **Phase 1:** Migration applied successfully
- [ ] **Phase 2:** RLS enabled on all 6 tables
- [ ] **Phase 3:** 22+ policies created and verified
- [ ] **Phase 4:** Test users and data created
- [ ] **Phase 5:** All 7 cross-workspace isolation tests pass
- [ ] **Phase 6:** All 3 role-based access tests pass
- [ ] **Phase 7:** Both API endpoint tests pass
- [ ] **Phase 8:** Profile isolation test passes

## Troubleshooting

### Issue: Migration Fails with "duplicate key"

**Solution:** Reset local database:
```bash
npx supabase db reset
npx supabase start
```

### Issue: RLS Not Blocking Cross-Workspace Access

**Possible Causes:**
1. RLS not enabled on table (check Phase 2)
2. User is postgres superuser (RLS bypassed for superusers)
3. JWT claims not set correctly in test queries

**Solution:** Verify RLS enabled and use authenticated users (not postgres superuser).

### Issue: Cannot Set JWT Claims in SQL Editor

**Solution:** Use API endpoints with actual user auth tokens instead of SQL queries, OR use Supabase SQL Editor's "User Impersonation" feature.

### Issue: Supabase Storage Container Fails to Start

**Error:** `Migration failed. Reason: duplicate key value violates unique constraint "migrations_name_key"`

**Solution:**
```bash
# Stop Supabase completely
npx supabase stop

# Remove all Supabase volumes
docker volume ls --filter label=com.supabase.cli.project=supabase
docker volume rm $(docker volume ls -q --filter label=com.supabase.cli.project=supabase)

# Start fresh
npx supabase start
```

## Security Audit Checklist

After testing, verify the following security requirements:

- [ ] **Multi-Tenant Isolation:** Users cannot access other workspaces' data (Tests 1-6)
- [ ] **Workspace Membership:** Members can access shared workspace data (Test 8)
- [ ] **Role-Based Access:** Only owners/admins can manage workspaces (Tests 9-10)
- [ ] **API Enforcement:** API endpoints respect RLS policies (Tests 11-12)
- [ ] **Profile Privacy:** Users can only view/update own profiles (Test 13)
- [ ] **No Superuser Bypass:** RLS cannot be bypassed by regular users
- [ ] **All CRUD Operations:** SELECT, INSERT, UPDATE, DELETE all protected

## Next Steps

1. **Complete Testing:** Run all tests in this guide
2. **Document Results:** Update GitHub Issue #93 with test results
3. **Update db-plan.md:** Add RLS policies section (already done)
4. **Update ROADMAP.md:** Mark Milestone 1 tasks as complete
5. **Create Pull Request:** Merge RLS implementation to main branch
6. **Deploy to Staging:** Test RLS in staging environment
7. **Deploy to Production:** Enable RLS in production database

## References

- **Migration File:** [supabase/migrations/20260106200458_enable_rls_policies.sql](../supabase/migrations/20260106200458_enable_rls_policies.sql)
- **Database Plan:** [.ai_docs/db-plan.md](./db-plan.md) - Section 10: Row Level Security
- **Roadmap:** [.ai_docs/ROADMAP.md](./ROADMAP.md) - Milestone 1: Security Hardening
- **GitHub Issues:** #88, #89, #90, #91, #92, #93
- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS Docs:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
