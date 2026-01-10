# Session & Workspace Fixes - January 10, 2026

**Summary**: Fixed three critical issues with user signup and workspace management.

## Issues Fixed

### 1. ✅ Duplicate Workspace Creation on Signup

**Problem:**

- When a new user signed up, TWO workspaces were created:
  1. "My Workspace" (from database trigger `handle_new_user()`)
  2. "Mój Workspace" (from frontend RPC call `create_workspace_for_user()`)

**Root Cause:**

- Frontend signup flow (`useAuthForm.ts`) was calling `create_workspace_for_user()` RPC function
- Database trigger was ALSO creating a workspace automatically
- Result: duplicate workspaces for every new user

**Solution:**

- Removed RPC workspace creation call from `useAuthForm.ts`
- Now relies solely on `handle_new_user()` database trigger
- Frontend fetches the auto-created workspace instead of creating one

**Files Modified:**

- `src/components/hooks/useAuthForm.ts:193-212`

**Code Change:**

```typescript
// BEFORE - Created workspace via RPC
const { data: workspaceId, error: workspaceError } = await supabase.rpc("create_workspace_for_user", {
  p_user_id: authData.user.id,
  p_workspace_name: "Mój Workspace",
});

// AFTER - Fetch workspace created by trigger
const { data: workspaceData, error: workspaceError } = await supabase
  .from("workspace_members")
  .select("workspaces!inner(*)")
  .eq("user_id", authData.user.id)
  .limit(1)
  .single();

const workspace = workspaceData.workspaces as unknown as WorkspaceDto;
```

---

### 2. ✅ Dashboard 403 Errors After Fresh Login

**Problem:**

- User A logs in, workspace ID stored in localStorage
- User A logs out
- User B signs up/logs in
- Dashboard tries to load User A's workspace ID
- Result: 403 Forbidden (User B not member of User A's workspace)

**Root Cause:**

- `currentWorkspaceId` nano store persists to localStorage
- When switching users, old workspace ID remained in localStorage
- `useWorkspaces` hook didn't validate that stored ID exists in user's workspaces
- Dashboard made API calls with invalid workspace ID

**Solution (Two-Part Fix):**

#### Part 1: Clear localStorage on Authentication

Clear workspace ID immediately on successful login/signup

**File Modified:**

- `src/components/AuthLayout.tsx:36-42`

**Code Change:**

```typescript
const handleAuthSuccess = useCallback((data: AuthSuccessResponse) => {
  log.info("AuthLayout auth success", { tokenLength: data.token?.length });

  if (typeof window !== "undefined") {
    log.info("AuthLayout sending token to session endpoint");

    // Clear any old workspace ID from localStorage before redirecting
    // This ensures the new user starts with a clean slate
    try {
      localStorage.removeItem("currentWorkspaceId");
    } catch {
      // Ignore localStorage errors
    }

    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: data.token }),
    })
      .then(async (res) => {
        if (res.ok) {
          window.location.href = "/app";
        }
      });
  }
}, []);
```

#### Part 2: Validate Workspace Existence

Validate that stored workspace ID exists in user's workspaces list

**File Modified:**

- `src/components/hooks/useWorkspaces.ts:24-30`

**Code Change:**

```typescript
// BEFORE - Only checked if workspace ID exists
if (data.length > 0 && !currentWorkspaceId.get()) {
  currentWorkspaceId.set(data[0].id);
}

// AFTER - Validate workspace exists for user
const storedWorkspaceId = currentWorkspaceId.get();
const workspaceExists = storedWorkspaceId && data.some((ws) => ws.id === storedWorkspaceId);

if (data.length > 0 && !workspaceExists) {
  currentWorkspaceId.set(data[0].id);
}
```

---

## Testing Performed

### Signup Flow

1. ✅ Created new user `darek2@testy.usera`
2. ✅ Verified only ONE workspace created ("My Workspace")
3. ✅ Dashboard loaded successfully
4. ✅ No 403 errors on initial load

### User Switching

1. ✅ Logged out from User A
2. ✅ Signed up as User B
3. ✅ Verified localStorage cleared
4. ✅ Dashboard loaded with User B's workspace
5. ✅ No 403 errors

### Workspace Validation

1. ✅ Manually set invalid workspace ID in localStorage
2. ✅ Refreshed dashboard
3. ✅ Workspace automatically switched to first valid workspace
4. ✅ No 403 errors

---

## Impact

### Before Fixes

- ❌ Two workspaces per user (confusing UX)
- ❌ 403 errors when switching users
- ❌ Dashboard failed to load after fresh signup

### After Fixes

- ✅ One workspace per user (clean UX)
- ✅ No 403 errors when switching users
- ✅ Dashboard loads successfully on first login
- ✅ Automatic recovery from invalid workspace IDs

---

## Related Documentation

- **Technical Details**: `.ai_docs/RLS_ANALYSIS.md` (Test Results section)
- **Architecture Guide**: `CLAUDE.md` (Session Hygiene section)
- **Code References**:
  - [useAuthForm.ts:193-212](../src/components/hooks/useAuthForm.ts#L193-L212)
  - [AuthLayout.tsx:36-42](../src/components/AuthLayout.tsx#L36-L42)
  - [useWorkspaces.ts:24-30](../src/components/hooks/useWorkspaces.ts#L24-L30)

---

## Notes for Future Development

### Pattern: localStorage Clearing on Auth

When implementing new persisted state (localStorage, sessionStorage), always clear it on authentication:

```typescript
// Clear persisted state on successful auth
localStorage.removeItem("yourStateKey");
```

### Pattern: State Validation

When reading persisted state, always validate it exists for the current user:

```typescript
const storedValue = localStorage.getItem("key");
const isValid = storedValue && userHasAccessTo(storedValue);

if (!isValid) {
  // Reset to default value
  localStorage.setItem("key", defaultValue);
}
```

### Database Trigger vs Frontend Creation

Prefer database triggers for critical setup operations:

- **Trigger**: Atomic, consistent, can't be bypassed
- **Frontend**: Can fail, be skipped, or called incorrectly

For workspace creation on signup, the trigger approach ensures:

1. Every user ALWAYS has a workspace
2. No duplicate workspaces
3. No race conditions
4. Consistent workspace name
