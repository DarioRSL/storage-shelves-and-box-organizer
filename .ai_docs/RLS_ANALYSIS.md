# RLS Policies Analysis & Action Plan

**Date**: 2026-01-10
**Status**: Workspace creation fixed, other operations need testing

## Problem Root Cause

**Issue**: Cookie-based authentication with `setSession()` doesn't properly set `auth.uid()` context for RLS policies in all scenarios.

**Why it happens**:
- `setSession()` with access_token + refresh_token (both same JWT) may not fully activate Supabase Auth session
- Authorization header in `global.headers` works for PostgREST queries but doesn't set `auth.uid()` for RLS
- RLS policies that check `auth.uid()` directly may fail even when user is authenticated

## Current Status

### ✅ Working Operations (Confirmed)
- **SELECT queries**: All working (profiles, workspaces, workspace_members, etc.)
- **Workspace creation**: Fixed via SECURITY DEFINER function `create_workspace_for_user()`

### ⚠️ Potentially Affected Operations (Need Testing)

All operations that use `auth.uid()` directly in RLS policies:

#### 1. **workspace_members INSERT** (High Risk)
```sql
-- Policy requires existing owner/admin - chicken-and-egg problem for first member
with check (
  exists (
    select 1 from workspace_members existing
    where existing.user_id = auth.uid()  -- ⚠️ Requires auth.uid()
    and existing.role in ('owner', 'admin')
  )
)
```
**Used by**: Inviting members to workspace
**Risk**: May fail when inviting first member
**Status**: Mitigated by workspace creation trigger, but manual invites may fail

#### 2. **workspaces UPDATE** (Medium Risk)
```sql
-- Policy requires auth.uid() to verify owner/admin
using (
  exists (
    select 1 from workspace_members
    where workspace_members.user_id = auth.uid()  -- ⚠️ Requires auth.uid()
    and workspace_members.role in ('owner', 'admin')
  )
)
```
**Used by**: Updating workspace name/settings
**Risk**: May fail to update workspace

#### 3. **workspaces DELETE** (Medium Risk)
```sql
-- Policy requires auth.uid() to verify owner
using (
  exists (
    select 1 from workspace_members
    where workspace_members.user_id = auth.uid()  -- ⚠️ Requires auth.uid()
    and workspace_members.role = 'owner'
  )
)
```
**Used by**: Deleting workspace
**Risk**: May fail to delete workspace

#### 4. **profiles SELECT/UPDATE** (Low Risk)
```sql
-- Policy requires auth.uid() = profile id
using (auth.uid() = id)  -- ⚠️ Requires auth.uid()
```
**Used by**: Viewing/updating own profile
**Status**: Currently working (seen in logs), so `auth.uid()` works for SELECT

### ✅ Likely Working Operations

Operations using `is_workspace_member()` function (SECURITY DEFINER):

```sql
-- This function has SECURITY DEFINER, so it works even if auth.uid() is not fully set
create function is_workspace_member(workspace_id_param uuid)
returns boolean as $$
begin
  return exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = workspace_id_param
      and workspace_members.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;
```

**Tables using this**:
- ✅ **locations** (all operations): `is_workspace_member(workspace_id)`
- ✅ **boxes** (all operations): `is_workspace_member(workspace_id)`
- ✅ **qr_codes** (all operations): `is_workspace_member(workspace_id)`
- ✅ **workspace_members SELECT**: `is_workspace_member(workspace_id)`

## Action Plan

### Phase 1: Immediate Testing (Now)

Test critical operations to identify failures:

1. ✅ **Workspace creation** - FIXED
2. **Workspace update** - Test renaming workspace
3. **Workspace deletion** - Test delete account flow
4. **Member invitation** - Test inviting a new member
5. **Profile operations** - Already working (confirmed in logs)

### Phase 2: Fix Strategy (Choose One)

#### Option A: Fix Auth Context Globally (Recommended)
**Goal**: Make `auth.uid()` work properly in middleware

**Approach**:
```typescript
// Store JWT in Supabase auth.session via custom implementation
// Instead of relying on setSession(), directly set auth context
```

**Pros**:
- Fixes all RLS policies at once
- No need for multiple SECURITY DEFINER functions
- Proper auth flow

**Cons**:
- More complex to implement
- May require changes to Supabase client initialization

#### Option B: SECURITY DEFINER Functions (Current Approach)
**Goal**: Create SECURITY DEFINER functions for failing operations

**Functions needed**:
1. ✅ `create_workspace_for_user()` - Done
2. `update_workspace_for_user(workspace_id, user_id, name)`
3. `delete_workspace_for_user(workspace_id, user_id)`
4. `invite_workspace_member(workspace_id, inviter_id, invitee_id, role)`

**Pros**:
- Surgical fixes, only where needed
- Works with current auth implementation
- Easy to test and verify

**Cons**:
- Requires creating multiple functions
- More boilerplate code
- Need to update TypeScript service layer for each

### Phase 3: Documentation & Migration

1. **Document the solution** in `AUTHENTICATION_ARCHITECTURE.md`
2. **Update CLAUDE.md** with RLS bypass patterns
3. **Create migration checklist** for future tables with RLS

## Test Plan

### Manual Testing Checklist

- [x] Create new workspace (FIXED - ✅)
- [x] Update workspace name (TESTED - ✅)
- [ ] Delete workspace
- [ ] Invite member to workspace
- [ ] Update member role
- [ ] Remove member from workspace
- [ ] Create location
- [ ] Create box
- [ ] Generate QR codes
- [x] Delete account (FIXED - ✅)

### Expected Results

- **If all pass**: `auth.uid()` works correctly, no further action needed
- **If some fail**: Implement Option A or B based on number of failures

## Recommended Next Steps

1. **Test workspace update/delete** first (highest risk after creation)
2. **If they fail**: Implement SECURITY DEFINER functions (Option B)
3. **If they work**: Test remaining operations and document findings
4. **Long-term**: Consider Option A for cleaner architecture

## Test Results

### ✅ Update Workspace Name
- **Status**: Works correctly
- **Conclusion**: RLS policies for workspace UPDATE work properly

### ✅ Delete Account
- **Status**: Fixed - now works correctly
- **Previous Problem**:
  1. Database deletion succeeded but JWT cookie wasn't cleared
  2. User stayed authenticated with invalid session
  3. Redirect to `/app` failed because profile was gone (500 error)
- **Fix Applied**:
  1. ✅ Added `Set-Cookie` header with `Max-Age=0` to clear JWT cookie
  2. Account deletion now properly logs user out
- **Remaining TODO**:
  - Supabase Auth user is not deleted from auth.users table (requires service role key)
  - This is documented in auth.service.ts and doesn't affect functionality

### ✅ User Signup (Registration)
- **Status**: Fixed - now works correctly (2026-01-10)
- **Previous Problem**:
  1. Frontend called `create_workspace_for_user()` RPC, creating "Mój Workspace"
  2. Database trigger also created "My Workspace" via `handle_new_user()`
  3. Result: Two workspaces created per signup
- **Fix Applied**:
  1. ✅ Removed duplicate workspace creation from `useAuthForm.ts`
  2. Now relies solely on `handle_new_user()` database trigger
  3. Frontend fetches the auto-created workspace instead of creating one
- **Files Modified**:
  - `src/components/hooks/useAuthForm.ts:193-212` - Changed from RPC create to workspace fetch

### ✅ Dashboard 403 Errors on Fresh Login
- **Status**: Fixed - now works correctly (2026-01-10)
- **Previous Problem**:
  1. Old workspace ID stored in localStorage from previous user session
  2. New user redirected to `/app` with invalid workspace ID in global state
  3. API calls failed with 403 Forbidden (user not member of old workspace)
- **Root Cause**:
  - `currentWorkspaceId` nano store persists to localStorage
  - When switching users, old workspace ID remained
  - `useWorkspaces` hook didn't validate stored ID against user's actual workspaces
- **Fix Applied**:
  1. ✅ Clear localStorage on successful authentication (`AuthLayout.tsx:39`)
  2. ✅ Validate stored workspace ID exists in user's workspaces (`useWorkspaces.ts:26`)
  3. Auto-switch to first workspace if stored ID is invalid or missing
- **Files Modified**:
  - `src/components/AuthLayout.tsx:36-42` - Added `localStorage.removeItem("currentWorkspaceId")`
  - `src/components/hooks/useWorkspaces.ts:24-30` - Added workspace existence validation

## Notes

- All SELECT queries currently work ✅
- `is_workspace_member()` SECURITY DEFINER function helps bypass many RLS issues
- The chicken-and-egg problem (workspace_members INSERT) is solved by trigger
- Profile operations work, confirming `auth.uid()` works in some contexts
- Workspace UPDATE operation confirmed working ✅
- Delete account cookie clearing fix applied ✅
- Signup workspace creation fix applied ✅ (2026-01-10)
- Dashboard localStorage validation fix applied ✅ (2026-01-10)