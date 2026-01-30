# Multi-User Isolation Test - 2026-01-11

## Test Objective

Verify that RLS (Row Level Security) policies correctly prevent users from accessing data in workspaces they are not members of. This is the **MOST CRITICAL security test** for the application.

---

## Test Setup

### Test Users

| User   | Email              | User ID                                | Workspace ID                           | Workspace Name |
| ------ | ------------------ | -------------------------------------- | -------------------------------------- | -------------- |
| User A | darek2@testy.usera | `5dced942-8b32-41af-9bbc-f1204cdfd8df` | `d67c6cf7-c21d-400d-8193-ee1f31580953` | My Workspace   |
| User B | darek3@testy.usera | `d72e3106-8435-4587-b54e-d5f6b53232eb` | `a95fb5b4-d309-442b-9fdf-802b7be27b20` | My Workspace   |

### Expected Behavior

- ✅ User A can ONLY access data in workspace `d67c6cf7-c21d-400d-8193-ee1f31580953`
- ✅ User B can ONLY access data in workspace `a95fb5b4-d309-442b-9fdf-802b7be27b20`
- ❌ User A CANNOT access User B's data
- ❌ User B CANNOT access User A's data

---

## Test Procedure

### Phase 1: Create Test Data (User A)

**Steps:**

1. Open browser (or incognito window)
2. Navigate to http://localhost:3000/auth
3. Login as `darek2@testy.usera` with password
4. Navigate to dashboard
5. Create a new box:
   - Name: "Test Box User A"
   - Description: "This box belongs to User A's workspace"
   - Add some tags: ["confidential", "user-a-only"]
6. Note the box ID from the URL or browser console
7. Keep this browser/window open for reference

**Expected Result:**

- ✅ Box created successfully
- ✅ Box appears in User A's dashboard

---

### Phase 2: Attempt Cross-Workspace Access (User B)

**Steps:**

1. Open a **different browser** or **incognito window** (to avoid cookie conflicts)
2. Navigate to http://localhost:3000/auth
3. Login as `darek3@testy.usera` with password
4. Navigate to dashboard
5. **CRITICAL TEST**: Try to access User A's box directly:

   **Method 1: Direct URL Access**
   - Copy the box ID from Phase 1
   - Navigate to: `http://localhost:3000/app/boxes/[USER_A_BOX_ID]`
   - **Expected**: Should get 403 Forbidden or 404 Not Found

   **Method 2: API Direct Access**
   - Open browser console
   - Run:
     ```javascript
     fetch("/api/boxes/[USER_A_BOX_ID]", {
       credentials: "include",
     })
       .then((r) => r.json())
       .then(console.log);
     ```
   - **Expected**: Should return `{ error: "..." }` with 403 or 404 status

   **Method 3: Check Boxes List**
   - Stay on User B's dashboard
   - Check if User A's box appears in the boxes list
   - **Expected**: User A's box should NOT appear

6. Open browser DevTools > Network tab
7. Monitor for any data leakage in API responses

**Expected Results:**

- ❌ User B CANNOT see User A's box in dashboard
- ❌ Direct URL access returns 403 Forbidden or 404 Not Found
- ❌ API call returns error (no data exposed)
- ❌ No User A data visible in any API response bodies

**CRITICAL FAILURE Indicators:**

- 🚨 If User B can see User A's box data → **RLS IS BROKEN**
- 🚨 If API returns User A's box details → **SECURITY VULNERABILITY**
- 🚨 If User A's data appears in any network response → **DATA LEAK**

---

### Phase 3: Verify Workspace Isolation Works Both Ways

**Steps:**

1. While still logged in as User B (darek3):
   - Create a box: "Test Box User B"
   - Note the box ID

2. Switch back to User A's browser/window
3. Try to access User B's box:
   - Navigate to: `http://localhost:3000/app/boxes/[USER_B_BOX_ID]`
   - **Expected**: 403 Forbidden or 404 Not Found

4. Check User A's dashboard:
   - **Expected**: User B's box should NOT appear

**Expected Results:**

- ❌ User A CANNOT see User B's box
- ❌ Isolation works bidirectionally

---

### Phase 4: Test API Endpoints

Test all critical API endpoints for cross-workspace access prevention:

#### 4.1 GET /api/boxes (List)

**As User B, try to list boxes:**

```javascript
fetch("/api/boxes?workspace_id=[USER_A_WORKSPACE_ID]", {
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: Should return empty array or error (NOT User A's boxes)

#### 4.2 GET /api/boxes/[id] (Single Box)

**As User B, try to get User A's box:**

```javascript
fetch("/api/boxes/[USER_A_BOX_ID]", {
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: `404 Not Found` or `403 Forbidden`

#### 4.3 PATCH /api/boxes/[id] (Update)

**As User B, try to update User A's box:**

```javascript
fetch("/api/boxes/[USER_A_BOX_ID]", {
  method: "PATCH",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "HACKED BY USER B" }),
})
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: `404 Not Found` or `403 Forbidden` (box should NOT be updated)

#### 4.4 DELETE /api/boxes/[id] (Delete)

**As User B, try to delete User A's box:**

```javascript
fetch("/api/boxes/[USER_A_BOX_ID]", {
  method: "DELETE",
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: `404 Not Found` or `403 Forbidden` (box should NOT be deleted)

#### 4.5 Locations API

**As User B, try to access User A's locations:**

```javascript
fetch("/api/locations?workspace_id=[USER_A_WORKSPACE_ID]", {
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: Empty array or error (NOT User A's locations)

---

## Test Checklist

- [ ] Phase 1: User A creates test box successfully
- [ ] Phase 2.1: User B cannot see User A's box in dashboard
- [ ] Phase 2.2: Direct URL access to User A's box returns 403/404
- [ ] Phase 2.3: API call for User A's box returns error
- [ ] Phase 2.4: No User A data in any network responses
- [ ] Phase 3: User B creates box, User A cannot access it
- [ ] Phase 4.1: GET /api/boxes with wrong workspace_id returns empty/error
- [ ] Phase 4.2: GET /api/boxes/[id] for other user's box returns 404/403
- [ ] Phase 4.3: PATCH /api/boxes/[id] for other user's box fails
- [ ] Phase 4.4: DELETE /api/boxes/[id] for other user's box fails
- [ ] Phase 4.5: Locations API properly isolates data

---

## Database Verification (Optional)

After manual testing, verify at database level:

```sql
-- As User B, verify RLS prevents direct access
SET SESSION "request.jwt.claims.sub" = 'd72e3106-8435-4587-b54e-d5f6b53232eb';

-- This query should return NO rows (User A's box is hidden)
SELECT * FROM boxes WHERE workspace_id = 'd67c6cf7-c21d-400d-8193-ee1f31580953';
```

---

## Test Results Template

### ✅ PASS Criteria

All of the following must be true:

- User B cannot see User A's data through any method
- All API calls return proper 403/404 errors
- No data leakage in network responses
- RLS policies enforce workspace isolation correctly

### ❌ FAIL Criteria (CRITICAL)

Any of the following indicates **RLS IS BROKEN**:

- User B can see User A's box data
- API returns User A's data to User B
- User A's data appears in any response body
- Cross-workspace modification is possible

---

## What to Do If Test Fails

### If RLS is Broken (CRITICAL):

1. **STOP ALL DEVELOPMENT IMMEDIATELY**
2. **DO NOT DEPLOY TO PRODUCTION**
3. Mark application as "SECURITY VULNERABILITY - DO NOT USE"
4. Review ALL RLS policies in database
5. Check `is_workspace_member()` function
6. Verify `auth.uid()` is properly set in middleware
7. Test RLS policies with service role
8. Fix before proceeding with ANY other features

### If Individual Endpoint Fails:

1. Check API endpoint implementation in `src/pages/api/`
2. Verify workspace_id filtering in service layer
3. Review RLS policy for specific table
4. Add additional workspace validation if needed

---

## Notes

- Use **separate browser profiles** to avoid cookie conflicts
- Check **browser console** for errors
- Monitor **Network tab** for all API responses
- Take **screenshots** of any data leakage
- Document **exact error messages** received

---

**Test Status**: 🔴 PENDING MANUAL EXECUTION

**Tester**: [To be filled]

**Date**: 2026-01-11

**Result**: [To be filled - PASS/FAIL]
