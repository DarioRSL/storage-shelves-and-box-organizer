# RLS Testing - Next Steps Action Plan

**Date Created**: 2026-01-10
**Status**: Ready for execution
**Previous Session**: Fixed workspace creation and 403 errors

---

## Overview

This document outlines the systematic testing plan for the remaining RLS-protected operations that haven't been fully validated yet. Based on [RLS_ANALYSIS.md](./RLS_ANALYSIS.md), we need to verify workspace management, member operations, and core CRUD functionality.

---

## ✅ Already Tested & Fixed

### 2026-01-10

1. **Workspace Creation** ✅ - Works via SECURITY DEFINER function
2. **Workspace Update** ✅ - Tested and confirmed working
3. **Delete Account** ✅ - Fixed with cookie clearing
4. **User Signup** ✅ - Fixed duplicate workspace creation
5. **Dashboard 403 Errors** ✅ - Fixed localStorage contamination
6. **Profile SELECT** ✅ - Confirmed working in logs

### 2026-01-11

1. **Login 406 Error** ✅ - Fixed missing refresh_token issue
2. **Locations CRUD** ✅ - All operations (CREATE/READ/UPDATE/DELETE) tested and working
3. **Boxes CRUD** ✅ - All operations (CREATE/READ/UPDATE/DELETE) tested and working

---

## 🔍 Phase 1: Workspace Management Operations (Priority: HIGH)

### 1.1 Test Workspace Deletion

**Why**: Workspace DELETE policy requires `auth.uid()` to verify owner role

**Test Steps**:

```bash
# Test as workspace owner
1. Login as user with workspace
2. Navigate to Settings
3. Try to delete workspace
4. Check for errors in browser console
5. Verify workspace is actually deleted from database
```

**Expected Result**:

- Workspace deleted successfully
- User redirected appropriately
- All related data handled correctly (cascade or soft delete)

**Failure Scenario**:

- If fails: Create `delete_workspace_for_user()` SECURITY DEFINER function

**Files to Monitor**:

- `src/pages/api/workspaces/[workspace_id].ts` - DELETE handler
- `src/lib/services/workspace.service.ts` - deleteWorkspace()
- Database RLS policy: `workspaces DELETE policy`

---

### 1.2 Test Workspace Rename (Already Passed)

**Status**: ✅ **CONFIRMED WORKING** (from RLS_ANALYSIS.md)

**Why**: Already tested and verified in previous session

**Evidence**: RLS_ANALYSIS.md line 187-188

```
### ✅ Update Workspace Name
- **Status**: Works correctly
```

---

## 🔍 Phase 2: Workspace Member Operations (Priority: HIGH)

### 2.1 Test Invite New Member to Workspace

**Why**: `workspace_members INSERT` policy requires existing owner/admin via `auth.uid()`

**Test Steps**:

```bash
# Setup: Need two user accounts
1. Login as User A (workspace owner)
2. Navigate to Settings > Workspace Members
3. Try to invite User B (by email or user_id)
4. Check for 403 or RLS policy violation errors
5. Verify invitation record created in workspace_members table
```

**Expected Result**:

- Member invitation succeeds
- New member record created with correct role
- No RLS policy violations

**Failure Scenario**:

- If fails: Create `invite_workspace_member()` SECURITY DEFINER function
- Alternative: Use existing `create_workspace_for_user()` pattern

**Files to Monitor**:

- `src/pages/api/workspaces/[workspace_id]/members.ts` - POST handler
- `src/lib/services/workspace.service.ts` - addWorkspaceMember()
- Database RLS policy: `workspace_members INSERT policy`

**RLS Policy**:

```sql
-- From RLS_ANALYSIS.md lines 26-35
with check (
  exists (
    select 1 from workspace_members existing
    where existing.user_id = auth.uid()  -- ⚠️ Requires auth.uid()
    and existing.role in ('owner', 'admin')
  )
)
```

---

### 2.2 Test Update Member Role

**Why**: Verify owner/admin can change member roles

**Test Steps**:

```bash
1. Login as workspace owner (User A)
2. Navigate to workspace members list
3. Try to change User B's role from 'member' to 'admin'
4. Check for errors
5. Verify role updated in database
```

**Expected Result**:

- Role updated successfully
- Changes reflected immediately in UI

**Failure Scenario**:

- If fails: Create `update_member_role()` SECURITY DEFINER function

**Files to Monitor**:

- `src/pages/api/workspaces/[workspace_id]/members/[user_id].ts` - PATCH handler
- `src/lib/services/workspace.service.ts` - updateWorkspaceMember()

---

### 2.3 Test Remove Member from Workspace

**Why**: Verify owner/admin can remove members

**Test Steps**:

```bash
1. Login as workspace owner
2. Navigate to workspace members
3. Try to remove a member
4. Check for errors
5. Verify member removed from workspace_members table
```

**Expected Result**:

- Member removed successfully
- No cascade deletion of user's data

**Failure Scenario**:

- If fails: Create `remove_workspace_member()` SECURITY DEFINER function

**Files to Monitor**:

- `src/pages/api/workspaces/[workspace_id]/members/[user_id].ts` - DELETE handler
- `src/lib/services/workspace.service.ts` - removeWorkspaceMember()

---

## 🔍 Phase 3: Core CRUD Operations (Priority: MEDIUM)

### 3.1 Test Location Creation

**Why**: Uses `is_workspace_member()` SECURITY DEFINER helper - likely works

**Test Steps**:

```bash
1. Login as workspace member
2. Navigate to dashboard
3. Create new location (e.g., "Test Location")
4. Verify location appears in location tree
5. Check database for new record
```

**Expected Result**: ✅ Should work (uses SECURITY DEFINER helper)

**Files to Monitor**:

- `src/pages/api/locations/index.ts` - POST handler
- `src/lib/services/location.service.ts` - createLocation()

**RLS Policy**: Uses `is_workspace_member(workspace_id)` - SECURITY DEFINER ✅

---

### 3.2 Test Location Update & Delete

**Why**: Verify location management works end-to-end

**Test Steps**:

```bash
# Update
1. Select existing location
2. Rename location
3. Verify update succeeds

# Delete (Soft Delete)
1. Select location with boxes
2. Delete location
3. Verify boxes moved to "Unassigned"
4. Verify location marked as deleted
```

**Expected Result**: ✅ Should work (uses SECURITY DEFINER helper)

**Files to Monitor**:

- `src/pages/api/locations/[id].ts` - PATCH/DELETE handlers
- `src/lib/services/location.service.ts`

---

### 3.3 Test Box Creation

**Why**: Uses `is_workspace_member()` - likely works

**Test Steps**:

```bash
1. Login as workspace member
2. Navigate to dashboard
3. Click "Add Box"
4. Fill form (name, description, tags, location)
5. Submit
6. Verify box appears in list
```

**Expected Result**: ✅ Should work (uses SECURITY DEFINER helper)

**Files to Monitor**:

- `src/pages/api/boxes.ts` - POST handler
- `src/lib/services/box.service.ts` - createBox()

---

### 3.4 Test Box Update & Delete

**Why**: Verify box CRUD works end-to-end

**Test Steps**:

```bash
# Update
1. Select existing box
2. Edit name, description, tags, or location
3. Save changes
4. Verify updates reflected

# Delete
1. Select box
2. Delete box
3. Verify QR code released (status: 'generated')
4. Verify box removed from list
```

**Expected Result**: ✅ Should work (uses SECURITY DEFINER helper)

**Files to Monitor**:

- `src/pages/api/boxes/[id].ts` - PATCH/DELETE handlers
- `src/lib/services/box.service.ts`

---

### 3.5 Test QR Code Generation (Batch)

**Why**: Uses `is_workspace_member()` - likely works

**Test Steps**:

```bash
1. Navigate to QR Generator page
2. Request batch generation (e.g., 10 codes)
3. Verify codes generated
4. Check database for new qr_codes records
5. Verify all codes have status 'generated'
```

**Expected Result**: ✅ Should work (uses SECURITY DEFINER helper)

**Files to Monitor**:

- `src/pages/api/qr-codes/batch.ts` - POST handler
- `src/lib/services/qr-code.service.ts` - generateQRCodes()

---

## 🔍 Phase 4: Multi-User Isolation Testing (Priority: HIGH)

### 4.1 Test Workspace Data Isolation

**Why**: CRITICAL - Verify RLS actually prevents cross-workspace access

**Test Steps**:

```bash
# Setup: Two users in different workspaces
User A: Workspace "Alpha" (ID: xxx)
User B: Workspace "Beta" (ID: yyy)

1. Login as User A
2. Create box in Workspace Alpha
3. Note box ID
4. Logout

5. Login as User B
6. Try to access User A's box via direct URL:
   /app/boxes/[user_a_box_id]
7. Try to fetch via API:
   GET /api/boxes/[user_a_box_id]

EXPECTED: 403 Forbidden or 404 Not Found
```

**Expected Result**:

- User B **CANNOT** see User A's data
- API returns 403 or 404
- No data leakage in responses

**CRITICAL FAILURE**: If User B can see User A's data → RLS IS BROKEN

**Files to Monitor**:

- All API endpoints with `workspace_id` filtering
- Middleware auth checks
- Database RLS policies

---

### 4.2 Test Workspace Member Access

**Why**: Verify members can ONLY see workspace data

**Test Steps**:

```bash
# Setup: User C is member (not owner) of Workspace Alpha

1. Login as User C
2. Try to view boxes in Workspace Alpha
   EXPECTED: ✅ Can see (is member)

3. Try to view boxes in Workspace Beta
   EXPECTED: ❌ Cannot see (not member)

4. Try to invite new member to Workspace Alpha
   EXPECTED: ❌ Forbidden (not owner/admin)
```

**Expected Result**:

- Members can view workspace data
- Members cannot modify workspace settings
- Members cannot invite others (unless admin)

---

### 4.3 Test Owner vs Admin vs Member Permissions

**Why**: Verify role-based access control

**Test Matrix**:

| Action           | Owner | Admin | Member | Expected Behavior        |
| ---------------- | ----- | ----- | ------ | ------------------------ |
| View boxes       | ✅    | ✅    | ✅     | All can view             |
| Create box       | ✅    | ✅    | ✅     | All can create           |
| Delete box       | ✅    | ✅    | ✅     | All can delete own boxes |
| Invite member    | ✅    | ✅    | ❌     | Only owner/admin         |
| Remove member    | ✅    | ✅    | ❌     | Only owner/admin         |
| Delete workspace | ✅    | ❌    | ❌     | Only owner               |
| Update workspace | ✅    | ✅    | ❌     | Only owner/admin         |

**Test Steps**:

```bash
# Create test users with different roles
1. User A: Owner of "Test Workspace"
2. User B: Admin of "Test Workspace"
3. User C: Member of "Test Workspace"

# Test each action for each role
# Document which actions succeed/fail
```

---

## 📋 Testing Checklist Summary

### High Priority (Must Test)

- [ ] Workspace deletion (DELETE policy uses auth.uid())
- [ ] Invite member to workspace (INSERT policy uses auth.uid())
- [ ] Update member role
- [ ] Remove member from workspace
- [ ] **Multi-user data isolation** (CRITICAL SECURITY)
- [ ] Role-based permission matrix

### Medium Priority (✅ COMPLETED - 2026-01-11)

- [x] Create location (uses SECURITY DEFINER helper) ✅
- [x] Update location ✅
- [x] Delete location (soft delete) ✅
- [x] Create box ✅
- [x] Update box ✅
- [x] Delete box ✅
- [ ] Generate QR codes (batch) - Not yet tested

### Low Priority (Already Working)

- [x] Workspace creation ✅
- [x] Workspace update (rename) ✅
- [x] Delete account ✅
- [x] User signup ✅
- [x] Profile operations ✅

---

## 🛠️ Recommended Testing Order

### Week 1: Critical Operations

1. **Day 1**: Multi-user isolation testing (Phase 4.1, 4.2)
   - If fails → **CRITICAL BUG** - halt and fix immediately
2. **Day 2**: Workspace deletion (Phase 1.1)
3. **Day 3**: Member invitation (Phase 2.1)
4. **Day 4**: Member management (Phase 2.2, 2.3)
5. **Day 5**: Role-based permissions (Phase 4.3)

### Week 2: CRUD Operations

1. **Day 1-2**: Location operations (Phase 3.1, 3.2)
2. **Day 3-4**: Box operations (Phase 3.3, 3.4)
3. **Day 5**: QR code generation (Phase 3.5)

---

## 🚨 If Tests Fail: Decision Tree

### Scenario A: 1-2 operations fail

**Action**: Implement SECURITY DEFINER functions for those operations (Option B)

- Create function (e.g., `delete_workspace_for_user()`)
- Update service layer to use RPC
- Test again

### Scenario B: 3+ operations fail

**Action**: Fix auth context globally (Option A)

- Investigate `auth.uid()` context in middleware
- Ensure JWT properly set in Supabase client
- May need to modify `setSession()` implementation

### Scenario C: Multi-user isolation fails (CRITICAL)

**Action**: HALT ALL DEVELOPMENT

1. Do NOT deploy to production
2. Review ALL RLS policies
3. Test with Supabase service role to verify policies are active
4. Fix before proceeding with ANY other features

---

## 📊 Test Results Documentation Template

After each test, document results in `RLS_TESTING_RESULTS_2026_01_XX.md`:

```markdown
## Test: [Operation Name]

**Date**: 2026-01-XX
**Tester**: [Name]
**Status**: ✅ PASS / ❌ FAIL

### Test Steps Executed

1. [Step 1]
2. [Step 2]
   ...

### Results

- Expected: [What should happen]
- Actual: [What actually happened]
- Evidence: [Screenshots, logs, database queries]

### Issues Found

- [Issue 1 with details]
- [Issue 2 with details]

### Fix Applied (if any)

- [Description of fix]
- [Files modified]
- [Commit hash]
```

---

## 🔗 Related Documentation

- [RLS_ANALYSIS.md](./RLS_ANALYSIS.md) - Root cause analysis and initial testing
- [SESSION_FIXES_2026_01_10.md](./SESSION_FIXES_2026_01_10.md) - Previous session fixes
- [db-plan.md](./db-plan.md) - Database schema and RLS policies
- [AUTHENTICATION_ARCHITECTURE.md](./ARCHIVE/review/AUTHENTICATION_ARCHITECTURE.md) - Auth flow details

---

## 📝 Notes

- All tests should be performed in **development environment** first
- Use **separate browser profiles** for multi-user testing (avoid cookie conflicts)
- Check **browser console** for errors during each test
- Monitor **database logs** for RLS policy violations
- Keep **detailed notes** of any unexpected behavior

---

**Next Action**: Start with **Phase 4.1 (Multi-user isolation)** - this is the MOST CRITICAL test to verify RLS is actually working correctly.
