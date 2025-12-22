# API Endpoint Implementation Plan: DELETE /api/workspaces/:workspace_id/members/:user_id

## 1. Endpoint Overview

This endpoint removes a member from a workspace. It implements two distinct authorization paths:

1. **Self-removal (Leave workspace)**: Any workspace member can remove themselves from a workspace
2. **Admin removal**: Workspace owners and admins can remove other members (except the owner)

The endpoint enforces business rules to prevent orphaned workspaces by prohibiting removal of the workspace owner. Row Level Security (RLS) policies automatically ensure users can only interact with workspaces they belong to.

## 2. Request Details

### HTTP Method
DELETE

### URL Structure
```
DELETE /api/workspaces/:workspace_id/members/:user_id
```

### URL Parameters
- `workspace_id` (UUID, required): The ID of the workspace containing the member
- `user_id` (UUID, required): The ID of the user to remove from the workspace

### Query Parameters
None

### Request Headers
- `Authorization: Bearer <token>` (required): JWT token for authentication

### Request Body
None

## 3. Response Details

### Success Response (200 OK)
```json
{
  "message": "Członek został pomyślnie usunięty"
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": "Nieprawidłowy format ID workspace lub ID użytkownika"
}
```

#### 401 Unauthorized - Not Authenticated
```json
{
  "error": "Brak autoryzacji"
}
```

#### 403 Forbidden - Insufficient Permissions
```json
{
  "error": "Brak uprawnień do usunięcia tego członka"
}
```

#### 403 Forbidden - Cannot Remove Owner
```json
{
  "error": "Nie można usunąć właściciela workspace'u"
}
```

#### 404 Not Found - Member Not Found
```json
{
  "error": "Członek nie został znaleziony"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Nie udało się usunąć członka"
}
```

## 4. Types Used

### From `src/types.ts`

#### Response Types
```typescript
// Success response
interface SuccessResponse {
  message: string;
}

// Error response
interface ErrorResponse {
  error: string;
  details?: unknown;
}
```

#### Database Types
```typescript
// Workspace member from database
type WorkspaceMemberDto = Tables<"workspace_members">;

// User role enum
type UserRole = Enums<"user_role">; // 'owner' | 'admin' | 'member' | 'read_only'
```

### Custom Error Classes
These should be added to `src/lib/services/workspace.service.ts`:

```typescript
/**
 * Thrown when attempting to remove the workspace owner
 */
export class OwnerRemovalError extends Error {
  constructor(message = "Nie można usunąć właściciela workspace'u") {
    super(message);
    this.name = "OwnerRemovalError";
  }
}
```

Note: `InsufficientPermissionsError` and `NotFoundError` already exist in the service layer.

## 5. Data Flow

```
1. Client sends DELETE request with workspace_id and user_id in URL
   ↓
2. Astro middleware validates JWT token and attaches user to context.locals
   ↓
3. API route handler extracts and validates URL parameters
   ↓
4. Service layer performs authorization checks:
   a. Fetch current user's membership and role
   b. Fetch target user's membership and role
   c. Determine if operation is self-removal or admin removal
   d. Verify permissions based on operation type
   ↓
5. Service layer executes DELETE operation
   ↓
6. Database applies RLS policies and CASCADE rules
   ↓
7. Service layer logs success and returns
   ↓
8. API route returns 200 OK with success message
```

### Database Operations Sequence

1. **Permission Check Query**:
   ```sql
   SELECT role FROM workspace_members
   WHERE workspace_id = $1 AND user_id = $2
   ```

2. **Target User Check Query**:
   ```sql
   SELECT role FROM workspace_members
   WHERE workspace_id = $1 AND user_id = $3
   ```

3. **Delete Operation**:
   ```sql
   DELETE FROM workspace_members
   WHERE workspace_id = $1 AND user_id = $3
   ```

All queries are protected by RLS policies that verify workspace membership.

## 6. Security Considerations

### Authentication
- JWT token validated by Astro middleware
- User identity extracted from `context.locals.user.id`
- Unauthenticated requests blocked at middleware level (401)

### Authorization Logic

The endpoint implements a dual authorization model:

```typescript
// Pseudo-code for authorization logic
if (targetUserId === currentUserId) {
  // Self-removal: Always allowed for any member
  allowOperation = true;
} else {
  // Admin removal: Check permissions
  if (currentUserRole === 'owner' || currentUserRole === 'admin') {
    if (targetUserRole === 'owner') {
      // Cannot remove workspace owner
      throw OwnerRemovalError;
    } else {
      allowOperation = true;
    }
  } else {
    // Regular members cannot remove others
    throw InsufficientPermissionsError;
  }
}
```

### Input Validation
- **UUID Format**: Validate both workspace_id and user_id match UUID pattern
- **SQL Injection Prevention**: Use parameterized queries via Supabase client
- **RLS Enforcement**: Database-level security ensures workspace access control

### Data Leakage Prevention
- Return 404 for both "workspace doesn't exist" and "user not a member" cases
- Prevents attackers from enumerating valid workspace IDs
- Generic error messages for permission failures

### Owner Protection
- Explicit check prevents removal of workspace owner
- Ensures workspace always has an owner
- Returns 403 Forbidden with clear error message

## 7. Error Handling

### Error Hierarchy

```
1. Authentication Errors (401)
   └─ Handled by middleware before reaching route handler

2. Validation Errors (400)
   └─ Invalid UUID format for workspace_id or user_id

3. Authorization Errors (403)
   ├─ InsufficientPermissionsError: User cannot remove others
   └─ OwnerRemovalError: Cannot remove workspace owner

4. Not Found Errors (404)
   └─ NotFoundError: Member not found in workspace

5. Server Errors (500)
   └─ Database operation failures
```

### Error Handling Pattern

```typescript
try {
  // 1. Validate UUID format
  if (!isValidUUID(workspace_id) || !isValidUUID(user_id)) {
    return new Response(
      JSON.stringify({ error: "Nieprawidłowy format ID workspace lub ID użytkownika" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Execute service layer function
  await removeWorkspaceMember(supabase, workspace_id, user_id, currentUserId);

  // 3. Return success
  return new Response(
    JSON.stringify({ message: "Członek został pomyślnie usunięty" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
} catch (error) {
  // 4. Handle specific error types
  if (error instanceof OwnerRemovalError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof InsufficientPermissionsError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Handle unexpected errors
  console.error("Unexpected error in DELETE member:", error);
  return new Response(
    JSON.stringify({ error: "Nie udało się usunąć członka" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Logging Strategy

**Success Logging:**
```typescript
console.info("DELETE /api/workspaces/:workspace_id/members/:user_id - Sukces:", {
  workspaceId: workspace_id,
  removedUserId: user_id,
  currentUserId: currentUserId,
  isSelfRemoval: user_id === currentUserId,
  timestamp: new Date().toISOString(),
});
```

**Error Logging:**
```typescript
console.error("DELETE /api/workspaces/:workspace_id/members/:user_id - Błąd:", {
  workspaceId: workspace_id,
  targetUserId: user_id,
  currentUserId: currentUserId,
  errorType: error.name,
  errorMessage: error.message,
  timestamp: new Date().toISOString(),
});
```

## 8. Performance Considerations

### Query Optimization
- Uses primary key lookup (workspace_id, user_id) for O(1) performance
- RLS policies leverage indexed columns (workspace_id, user_id)
- No JOIN operations required for DELETE
- Permission checks use indexed columns

### Database Indexes
Already in place from schema:
- Primary key index on (workspace_id, user_id)
- Foreign key indexes on workspace_id and user_id

### Caching Considerations
- No caching needed for DELETE operations
- Client should invalidate cached workspace member lists after successful deletion

### Transaction Handling
- Single DELETE operation (no explicit transaction needed)
- Database atomicity guarantees ensure consistency
- No risk of partial updates

## 9. Implementation Steps

### Step 1: Create Custom Error Class
**File**: `src/lib/services/workspace.service.ts`

Add the `OwnerRemovalError` class after existing error classes:

```typescript
/**
 * Custom error for attempting to remove workspace owner.
 */
export class OwnerRemovalError extends Error {
  constructor(message = "Nie można usunąć właściciela workspace'u") {
    super(message);
    this.name = "OwnerRemovalError";
  }
}
```

### Step 2: Implement Service Layer Function
**File**: `src/lib/services/workspace.service.ts`

Add the `removeWorkspaceMember` function at the end of the file:

```typescript
/**
 * Removes a member from a workspace.
 *
 * Authorization rules:
 * - Any member can remove themselves (leave workspace)
 * - Owners and admins can remove other members (except the owner)
 * - Cannot remove the workspace owner
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace
 * @param targetUserId - UUID of the user to remove
 * @param currentUserId - UUID of the authenticated user making the request
 * @returns void on success
 * @throws NotFoundError if member not found in workspace
 * @throws InsufficientPermissionsError if user lacks permission to remove member
 * @throws OwnerRemovalError if attempting to remove workspace owner
 * @throws Error for database errors
 */
export async function removeWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  targetUserId: string,
  currentUserId: string
): Promise<void> {
  try {
    // 1. Check current user's membership and role
    const { data: currentMember, error: currentMemberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", currentUserId)
      .limit(1)
      .single();

    if (currentMemberError || !currentMember) {
      console.error("Current user not found in workspace:", currentMemberError);
      throw new NotFoundError("Workspace nie został znaleziony");
    }

    // 2. Check target user's membership and role
    const { data: targetMember, error: targetMemberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .limit(1)
      .single();

    if (targetMemberError || !targetMember) {
      console.error("Target user not found in workspace:", targetMemberError);
      throw new NotFoundError("Członek nie został znaleziony");
    }

    // 3. Check if attempting to remove workspace owner
    if (targetMember.role === "owner") {
      throw new OwnerRemovalError();
    }

    // 4. Authorization check
    const isSelfRemoval = targetUserId === currentUserId;
    const hasAdminPermission = currentMember.role === "owner" || currentMember.role === "admin";

    if (!isSelfRemoval && !hasAdminPermission) {
      throw new InsufficientPermissionsError("Brak uprawnień do usunięcia tego członka");
    }

    // 5. Delete workspace member
    const { error: deleteError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId);

    if (deleteError) {
      console.error("Error deleting workspace member:", deleteError);
      throw new Error("Nie udało się usunąć członka");
    }

    // 6. Log success
    console.info("DELETE /api/workspaces/:workspace_id/members/:user_id - Sukces:", {
      workspaceId: workspaceId,
      removedUserId: targetUserId,
      currentUserId: currentUserId,
      isSelfRemoval: isSelfRemoval,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof NotFoundError ||
      error instanceof InsufficientPermissionsError ||
      error instanceof OwnerRemovalError
    ) {
      throw error;
    }

    // Log and throw unexpected errors
    console.error("Unexpected error in removeWorkspaceMember:", {
      workspaceId: workspaceId,
      targetUserId: targetUserId,
      currentUserId: currentUserId,
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });
    throw error instanceof Error ? error : new Error("Nie udało się usunąć członka");
  }
}
```

### Step 3: Create API Route File
**File**: `src/pages/api/workspaces/[workspace_id]/members/[user_id].ts`

Create new file with DELETE handler:

```typescript
import type { APIRoute } from "astro";
import {
  removeWorkspaceMember,
  InsufficientPermissionsError,
  OwnerRemovalError,
} from "@/lib/services/workspace.service";
import { NotFoundError } from "@/lib/services/location.service";

export const prerender = false;

/**
 * DELETE /api/workspaces/:workspace_id/members/:user_id
 *
 * Removes a member from a workspace.
 *
 * Authorization:
 * - Any member can remove themselves (leave workspace)
 * - Owners and admins can remove other members
 * - Cannot remove workspace owner
 */
export const DELETE: APIRoute = async (context) => {
  const { workspace_id, user_id } = context.params;
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // 1. Authentication check
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Brak autoryzacji" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Validate URL parameters exist
  if (!workspace_id || !user_id) {
    return new Response(
      JSON.stringify({ error: "Nieprawidłowy format ID workspace lub ID użytkownika" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspace_id) || !uuidRegex.test(user_id)) {
    return new Response(
      JSON.stringify({ error: "Nieprawidłowy format ID workspace lub ID użytkownika" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Execute removal via service layer
  try {
    await removeWorkspaceMember(supabase, workspace_id, user_id, user.id);

    return new Response(
      JSON.stringify({ message: "Członek został pomyślnie usunięty" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Handle specific error types
    if (error instanceof OwnerRemovalError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof InsufficientPermissionsError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Unexpected error in DELETE member endpoint:", error);
    return new Response(
      JSON.stringify({ error: "Nie udało się usunąć członka" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Step 4: Test the Endpoint

Create a test file to verify functionality.

**File**: `.ai_docs/testing/delete-workspace-member-tests.md`

Document test cases:

```markdown
# DELETE /api/workspaces/:workspace_id/members/:user_id - Test Cases

## Setup
1. Create test workspace with owner
2. Add admin member
3. Add regular member
4. Get valid JWT tokens for each user

## Test Cases

### 1. Self-Removal (Leave Workspace)
**Test**: Regular member removes themselves
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{member_user_id}" \
  -H "Authorization: Bearer {member_token}"
```
**Expected**: 200 OK
```json
{
  "message": "Członek został pomyślnie usunięty"
}
```

### 2. Admin Removes Regular Member
**Test**: Admin removes a regular member
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{member_user_id}" \
  -H "Authorization: Bearer {admin_token}"
```
**Expected**: 200 OK
```json
{
  "message": "Członek został pomyślnie usunięty"
}
```

### 3. Owner Removes Admin
**Test**: Owner removes an admin member
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{admin_user_id}" \
  -H "Authorization: Bearer {owner_token}"
```
**Expected**: 200 OK
```json
{
  "message": "Członek został pomyślnie usunięty"
}
```

### 4. Cannot Remove Owner
**Test**: Admin tries to remove workspace owner
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{owner_user_id}" \
  -H "Authorization: Bearer {admin_token}"
```
**Expected**: 403 Forbidden
```json
{
  "error": "Nie można usunąć właściciela workspace'u"
}
```

### 5. Regular Member Cannot Remove Others
**Test**: Regular member tries to remove another member
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{other_member_id}" \
  -H "Authorization: Bearer {member_token}"
```
**Expected**: 403 Forbidden
```json
{
  "error": "Brak uprawnień do usunięcia tego członka"
}
```

### 6. Member Not Found
**Test**: Try to remove non-existent member
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{random_uuid}" \
  -H "Authorization: Bearer {admin_token}"
```
**Expected**: 404 Not Found
```json
{
  "error": "Członek nie został znaleziony"
}
```

### 7. Invalid UUID Format
**Test**: Use invalid UUID in URL
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/invalid-uuid/members/{user_id}" \
  -H "Authorization: Bearer {token}"
```
**Expected**: 400 Bad Request
```json
{
  "error": "Nieprawidłowy format ID workspace lub ID użytkownika"
}
```

### 8. Unauthenticated Request
**Test**: Request without authentication token
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{user_id}"
```
**Expected**: 401 Unauthorized
```json
{
  "error": "Brak autoryzacji"
}
```

### 9. Non-Member Cannot Access
**Test**: User from different workspace tries to remove member
```bash
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{member_id}" \
  -H "Authorization: Bearer {outsider_token}"
```
**Expected**: 404 Not Found
```json
{
  "error": "Workspace nie został znaleziony"
}
```
```

### Step 5: Update Development Guidelines (Optional)

**File**: `.claude/commands/guidelines.md`

Add DELETE testing pattern to the curl testing patterns section if it doesn't exist:

```markdown
## Testing DELETE Endpoints

Use curl to test DELETE operations:

```bash
# Example: Remove workspace member
curl -X DELETE "http://localhost:3000/api/workspaces/{workspace_id}/members/{user_id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```
```

### Step 6: Run Linter and Fix Issues

```bash
npm run lint:fix
```

### Step 7: Manual Testing

1. Start development server: `npm run dev`
2. Execute test cases from Step 4
3. Verify responses match expected status codes and payloads
4. Check console logs for proper logging

### Step 8: Verify RLS Policies

Ensure database RLS policies are correctly configured:

```sql
-- Verify workspace_members DELETE policy exists
SELECT * FROM pg_policies
WHERE tablename = 'workspace_members'
  AND cmd = 'DELETE';
```

If missing, create RLS policy for DELETE operations on workspace_members table.

## 10. Testing Checklist

- [ ] Service function created with proper error handling
- [ ] Custom `OwnerRemovalError` class added
- [ ] API route file created with DELETE handler
- [ ] UUID validation implemented
- [ ] Self-removal works (any member can leave)
- [ ] Admin can remove regular members
- [ ] Owner can remove admins and members
- [ ] Cannot remove workspace owner (403)
- [ ] Regular member cannot remove others (403)
- [ ] Non-existent member returns 404
- [ ] Invalid UUID returns 400
- [ ] Unauthenticated request returns 401
- [ ] RLS prevents cross-workspace access
- [ ] Success logging includes all relevant data
- [ ] Error logging includes error context
- [ ] Lint passes without errors
- [ ] Code follows project guidelines

## 11. Rollback Plan

If issues arise during implementation:

1. **Remove API route file**: Delete `src/pages/api/workspaces/[workspace_id]/members/[user_id].ts`
2. **Revert service changes**: Remove `removeWorkspaceMember` function and `OwnerRemovalError` from `workspace.service.ts`
3. **Clear any test data**: Remove test members created during testing
4. **Verify system stability**: Ensure existing endpoints still function correctly

## 12. Future Enhancements

Potential improvements for future iterations:

1. **Audit Trail**: Log member removals to a separate audit table
2. **Email Notifications**: Notify removed members via email
3. **Bulk Removal**: Support removing multiple members in single request
4. **Soft Delete**: Mark members as inactive instead of hard delete
5. **Owner Transfer**: Implement endpoint to transfer ownership before removal
6. **Rate Limiting**: Prevent abuse of member removal endpoint
7. **Webhooks**: Trigger webhooks on member removal for integrations
