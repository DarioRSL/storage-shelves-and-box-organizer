# API Endpoint Implementation Plan: DELETE /api/workspaces/:workspace_id

> **Status**: ✅ **COMPLETED** - All 8 tests passed (100% success rate)
>
> **Test Results**: See [delete-workspace-test-results.md](./delete-workspace-test-results.md) for detailed test execution results and verification.

## 1. Endpoint Overview

**Purpose:**
Delete a workspace and all associated data in a cascading manner. This is an irreversible operation that removes the entire workspace along with all locations, boxes, QR codes, and workspace memberships.

**Scope:**

- Permanently removes workspace from the system
- Cascades deletions to child entities (locations, boxes, qr_codes, workspace_members)
- Resets associated QR code statuses back to 'generated' for reuse
- Returns confirmation message with deleted workspace ID

**Critical Safety Notes:**

- **No Recovery:** Deletion is permanent and non-reversible
- **Transaction Required:** All deletions must succeed together or rollback
- **Permission Strict:** Only workspace owner can delete
- **Cascade Scope:** Affects all workspace data indiscriminately

---

## 2. Request Details

### HTTP Method & Route

- **Method:** `DELETE`
- **Path:** `/api/workspaces/:workspace_id`
- **Full URL Example:** `DELETE http://localhost:3000/api/workspaces/550e8400-e29b-41d4-a716-446655440000`

### Authentication

- **Required:** Yes
- **Type:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer <JWT_TOKEN>`
- **Token Source:** Supabase Auth

### Request Structure

```http
DELETE /api/workspaces/{workspace_id}
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Parameters

**Path Parameters:**
| Name | Type | Required | Format | Description |
|------|------|----------|--------|-------------|
| workspace_id | string | Yes | UUID | The ID of the workspace to delete |

**Query Parameters:** None

**Request Body:** None

### Example Request (curl)

```bash
curl -X DELETE \
  http://localhost:3000/api/workspaces/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 3. Response Details

### Success Response (200 OK)

**Status Code:** 200

**Response Body:**

```json
{
  "message": "Workspace deleted successfully",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Headers:**

```
Content-Type: application/json
```

**Type Definition:**

```typescript
interface DeleteWorkspaceResponse {
  message: string;
  workspace_id: string;
}
```

### Error Responses

#### 400 Bad Request

**Condition:** Invalid workspace_id format (non-UUID)

```json
{
  "error": "Bad Request",
  "details": "Nieprawidłowy format identyfikatora przestrzeni roboczej"
}
```

#### 401 Unauthorized

**Condition:** Missing or invalid JWT token

```json
{
  "error": "Unauthorized",
  "details": "Brakujący lub nieprawidłowy token JWT"
}
```

#### 403 Forbidden

**Condition:** User is not the workspace owner

```json
{
  "error": "Forbidden",
  "details": "Tylko właściciel przestrzeni roboczej może usunąć"
}
```

#### 404 Not Found

**Condition:** Workspace does not exist or user has no access

```json
{
  "error": "Not Found",
  "details": "Przestrzeń robocza nie istnieje"
}
```

#### 500 Internal Server Error

**Condition:** Database transaction failed or other server error

```json
{
  "error": "Internal Server Error",
  "details": "Nie udało się usunąć przestrzeni roboczej"
}
```

---

## 4. Data Flow

### Sequence Diagram

```
Client                          API Route                    Database
  |                                |                            |
  |--- DELETE request ------------->|                            |
  |                                |                            |
  |                                |--- Verify JWT Token ------->|
  |                                |<--- Token Valid -----------|
  |                                |                            |
  |                                |--- Get Auth User ID ------->|
  |                                |<--- User ID  --------------|
  |                                |                            |
  |                                |--- Check Ownership -------->|
  |                                |<--- Is Owner? Yes ---------|
  |                                |                            |
  |                                |--- BEGIN TRANSACTION ------>|
  |                                |                            |
  |                                |--- DELETE boxes ------------->|
  |                                |<--- Done ------------------|
  |                                |                            |
  |                                |--- RESET qr_codes --------->|
  |                                |<--- Done ------------------|
  |                                |                            |
  |                                |--- DELETE locations ------->|
  |                                |<--- Done ------------------|
  |                                |                            |
  |                                |--- DELETE workspace_members->|
  |                                |<--- Done ------------------|
  |                                |                            |
  |                                |--- DELETE workspace ------->|
  |                                |<--- Done ------------------|
  |                                |                            |
  |                                |--- COMMIT TRANSACTION ----->|
  |                                |<--- Success --------------|
  |                                |                            |
  |<--- 200 OK Response -----------|
  | { message, workspace_id }      |
  |                                |
```

### Data Deletion Order

The endpoint must execute deletions in this specific order to maintain referential integrity:

1. **Delete boxes** from the workspace
   - This automatically triggers the box deletion trigger
   - The trigger resets associated QR codes (`box_id = NULL`, `status = 'generated'`)
   - No explicit QR code update needed if using trigger, but can be explicit for clarity

2. **Update QR codes** (if not handled by box deletion trigger)
   - Set `status = 'generated'`
   - Set `box_id = NULL`
   - Filter: only those marked as 'assigned' and in this workspace

3. **Delete locations** from the workspace
   - These have no dependent rows (boxes already deleted)

4. **Delete workspace members** from workspace_members table
   - Remove all user associations with this workspace

5. **Delete the workspace** from workspaces table
   - Final deletion once all children are removed

### SQL Transaction Pattern

```sql
BEGIN TRANSACTION;

-- Step 1: Delete all boxes (this may trigger QR code resets via trigger)
DELETE FROM boxes
WHERE workspace_id = $1;

-- Step 2: Explicitly reset QR codes to 'generated' if not handled by trigger
UPDATE qr_codes
SET status = 'generated', box_id = NULL
WHERE workspace_id = $1 AND status = 'assigned';

-- Step 3: Delete all locations
DELETE FROM locations
WHERE workspace_id = $1;

-- Step 4: Delete all workspace members
DELETE FROM workspace_members
WHERE workspace_id = $1;

-- Step 5: Delete the workspace
DELETE FROM workspaces
WHERE id = $1
RETURNING id, name;

COMMIT;
```

---

## 5. Security Considerations

### Authentication & Authorization

**Authentication Verification:**

- JWT token extracted from `Authorization: Bearer <token>` header
- Token validated via Supabase Auth
- User ID extracted from `auth.uid()` in Supabase context
- Invalid tokens result in 401 Unauthorized

**Authorization Check:**

- **Primary:** Verify via RLS policy on workspaces table
- **Secondary:** Explicit query to confirm user is owner
  ```sql
  SELECT COUNT(*) FROM workspace_members
  WHERE workspace_id = $1
    AND user_id = auth.uid()
    AND role = 'owner'
  ```
- Non-owners result in 403 Forbidden

### Data Integrity

**Transaction Isolation:**

- Use explicit transaction to ensure atomic deletion
- If any step fails, entire operation rolls back
- No partial deletions left in database
- All-or-nothing guarantee

**Cascade Safety:**

- Database constraints configured with `ON DELETE CASCADE`
- Foreign keys ensure related rows automatically deleted
- Explicit deletion steps for clarity and redundancy

**Referential Integrity:**

- Boxes depend on workspace → deleted when workspace deleted
- Locations depend on workspace → deleted when workspace deleted
- workspace_members depend on workspace → deleted when workspace deleted
- QR codes depend on workspace → deleted/reset when workspace deleted

### Input Validation

**Workspace ID:**

- Must be valid UUID format (v4)
- Validated against database (404 if not found)
- No special characters or injection vectors
- Length: 36 characters (UUID with hyphens)

**No Request Body:**

- No untrusted user input to validate
- Reduces attack surface

### Sensitive Data Handling

**What NOT to Log:**

- JWT tokens or authentication headers
- User passwords or private information
- Workspace names or contents (may be sensitive)
- Full error details that expose database schema

**What to Log:**

- Workspace ID (UUID - non-sensitive)
- User ID (UUID - non-sensitive)
- Operation status (success/failure)
- Error category (not detailed error message)

**On Success:**

- Workspace is completely removed from system
- Cannot be recovered (no soft delete or audit trail)

---

## 6. Error Handling Strategy

### Validation Layer (Frontend)

**Before calling endpoint:**

- Confirm workspace_id is valid UUID format
- Warn user about irreversible deletion
- Require confirmation dialog

### API Route Layer (Backend)

**Request Validation:**

```typescript
// 1. Validate JWT token
if (!context.locals.user) {
  return new Response(JSON.stringify({ error: "Unauthorized", details: "Brakujący lub nieprawidłowy token JWT" }), {
    status: 401,
  });
}

// 2. Validate workspace_id format
const { workspace_id } = Astro.params;
if (!isValidUUID(workspace_id)) {
  return new Response(
    JSON.stringify({ error: "Bad Request", details: "Nieprawidłowy format identyfikatora przestrzeni roboczej" }),
    { status: 400 }
  );
}

// 3. Check ownership
const isOwner = await verifyWorkspaceOwnership(workspace_id, context.locals.user.id);
if (!isOwner) {
  return new Response(
    JSON.stringify({ error: "Forbidden", details: "Tylko właściciel przestrzeni roboczej może usunąć" }),
    { status: 403 }
  );
}
```

### Database Layer

**Transaction Handling:**

```typescript
try {
  const result = await supabase.rpc("delete_workspace", {
    workspace_id: workspace_id,
    user_id: context.locals.user.id,
  });

  if (!result.data) {
    throw new Error("Workspace not found");
  }
} catch (error) {
  if (error.message.includes("not found")) {
    return new Response(JSON.stringify({ error: "Not Found", details: "Przestrzeń robocza nie istnieje" }), {
      status: 404,
    });
  }

  throw error; // Re-throw for 500 handling
}
```

### Error Response Format

**Structure:**

```typescript
interface ErrorResponse {
  error: string; // HTTP status text
  details?: string; // User-friendly message (Polish)
}
```

**Examples:**

| Status | Error                   | Details                                                    |
| ------ | ----------------------- | ---------------------------------------------------------- |
| 400    | "Bad Request"           | "Nieprawidłowy format identyfikatora przestrzeni roboczej" |
| 401    | "Unauthorized"          | "Brakujący lub nieprawidłowy token JWT"                    |
| 403    | "Forbidden"             | "Tylko właściciel przestrzeni roboczej może usunąć"        |
| 404    | "Not Found"             | "Przestrzeń robocza nie istnieje"                          |
| 500    | "Internal Server Error" | "Nie udało się usunąć przestrzeni roboczej"                |

### Rollback Scenarios

**When transaction rolls back:**

1. Database constraint violation (shouldn't happen with proper schema)
2. Network failure during transaction
3. Timeout during operation
4. Explicit rollback on validation error

**User Experience:**

- User sees 500 error
- Workspace remains intact in database
- User can retry operation
- Error logged for debugging

---

## 7. Performance Considerations

### Potential Bottlenecks

**1. Large Workspace Deletion**

- **Issue:** Workspaces with thousands of boxes/locations
- **Solution:** Database indexes on foreign keys enable fast cascade deletes
- **Monitoring:** Track deletion time in logs

**2. QR Code Reset**

- **Issue:** Updating many QR code records to 'generated' status
- **Solution:** Batch update with indexed where clause
- **Expected Time:** < 100ms for typical workspace

**3. Transaction Lock Contention**

- **Issue:** Long transaction locks workspace rows
- **Solution:** Keep transaction scope minimal (no network calls during transaction)
- **Expected Time:** < 1 second for complete deletion

### Optimization Strategies

**Database Indexes (Already Required):**

```sql
-- These should already exist
CREATE INDEX ON boxes(workspace_id);
CREATE INDEX ON locations(workspace_id);
CREATE INDEX ON workspace_members(workspace_id);
CREATE INDEX ON qr_codes(workspace_id, status);
```

**Query Optimization:**

- Use single transaction instead of multiple API calls
- Leverage database-level cascade deletes
- No N+1 queries (all deletions in single transaction)

**Transaction Scope:**

- Do NOT fetch workspace data before deletion
- Do NOT log full workspace contents
- Keep transaction as minimal as possible

### Performance Targets

| Metric                            | Target  | Notes                          |
| --------------------------------- | ------- | ------------------------------ |
| Small workspace (< 100 boxes)     | < 500ms | Typical case                   |
| Medium workspace (100-1000 boxes) | < 2s    | With nested locations          |
| Large workspace (> 1000 boxes)    | < 5s    | Acceptable for batch operation |
| API response time                 | < 100ms | After DB completes             |

---

## 8. Implementation Steps

### Phase 1: Type Definitions & Validation

**Step 1.1: Update Type Definitions**

- **File:** `src/types.ts`
- **Action:** Add `DeleteWorkspaceResponse` interface if not exists
- **Code:**
  ```typescript
  /**
   * Response when deleting a workspace.
   */
  export interface DeleteWorkspaceResponse {
    message: string;
    workspace_id: string;
  }
  ```

**Step 1.2: Add Zod Validation Schema** (Optional but recommended)

- **File:** `src/lib/validation/workspaceSchema.ts` (create if needed)
- **Action:** Create schema for UUID validation
- **Code:**

  ```typescript
  import { z } from "zod";

  export const workspaceIdSchema = z.string().uuid("Nieprawidłowy format identyfikatora przestrzeni roboczej");
  ```

### Phase 2: Service Layer Implementation

**Step 2.1: Create or Update Workspace Service**

- **File:** `src/lib/services/workspaceService.ts`
- **Action:** Add `deleteWorkspace()` function with transaction logic
- **Function Signature:**
  ```typescript
  export async function deleteWorkspace(
    supabase: SupabaseClient,
    workspaceId: string,
    userId: string
  ): Promise<{ workspace_id: string }>;
  ```
- **Implementation Details:**
  - Verify user is workspace owner before deletion
  - Execute transaction to delete workspace and cascade
  - Handle errors and provide clear error messages
  - Return workspace_id for confirmation

**Step 2.2: Implement Ownership Verification**

- **Location:** In service function
- **Query:**

  ```typescript
  const { data: owner, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error || owner?.role !== "owner") {
    throw new Error("User is not workspace owner");
  }
  ```

**Step 2.3: Implement Transaction Deletion**

- **Approach:** Use Supabase RPC function or raw SQL with `supabase.rpc()`
- **Steps:**
  1. Create database function `delete_workspace_cascade()`
  2. Call from service layer
  3. Handle transaction atomicity

**Alternative (if RPC not available):**

- Use multiple delete calls in sequence
- Verify each succeeds before proceeding
- Implement rollback if any fails

### Phase 3: API Route Implementation

**Step 3.1: Create API Route File**

- **File:** `src/pages/api/workspaces/[workspace_id].ts`
- **Action:** Implement DELETE handler (add to existing file if PATCH/POST exists)
- **Structure:**

  ```typescript
  export const prerender = false;

  export async function DELETE(context: AstroContext) {
    // Implementation here
  }
  ```

**Step 3.2: Implement DELETE Handler**

- **Authentication Check:**

  ```typescript
  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized", details: "Brakujący lub nieprawidłowy token JWT" }), {
      status: 401,
    });
  }
  ```

- **Parameter Extraction & Validation:**

  ```typescript
  const { workspace_id } = context.params;

  // Validate UUID format
  try {
    workspaceIdSchema.parse(workspace_id);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Bad Request", details: "Nieprawidłowy format identyfikatora przestrzeni roboczej" }),
      { status: 400 }
    );
  }
  ```

- **Call Service Layer:**

  ```typescript
  try {
    const result = await deleteWorkspace(context.locals.supabase, workspace_id, user.id);

    return new Response(
      JSON.stringify({
        message: "Workspace deleted successfully",
        workspace_id: result.workspace_id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Error handling (see Step 3.3)
  }
  ```

- **Error Handling:**

  ```typescript
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('not owner')) {
        return new Response(
          JSON.stringify({ error: "Forbidden", details: "Tylko właściciel przestrzeni roboczej może usunąć" }),
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return new Response(
          JSON.stringify({ error: "Not Found", details: "Przestrzeń robocza nie istnieje" }),
          { status: 404 }
        );
      }
    }

    // Generic server error
    console.error('[DELETE /api/workspaces/:id]', error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: "Nie udało się usunąć przestrzeni roboczej" }),
      { status: 500 }
    );
  }
  ```

### Phase 4: Database Support (if needed)

**Step 4.1: Create RPC Function (Optional)**

- **File:** `supabase/migrations/YYYYMMDDHHMMSS_create_delete_workspace_function.sql`
- **Action:** Create stored procedure for atomic deletion
- **SQL:**

  ```sql
  CREATE OR REPLACE FUNCTION delete_workspace_cascade(
    p_workspace_id UUID,
    p_user_id UUID
  ) RETURNS TABLE(workspace_id UUID) AS $$
  DECLARE
    v_owner_role TEXT;
  BEGIN
    -- Verify ownership
    SELECT role INTO v_owner_role
    FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id;

    IF v_owner_role IS NULL OR v_owner_role != 'owner' THEN
      RAISE EXCEPTION 'User is not workspace owner';
    END IF;

    -- Begin transaction
    BEGIN
      DELETE FROM boxes WHERE workspace_id = p_workspace_id;
      UPDATE qr_codes
      SET status = 'generated', box_id = NULL
      WHERE workspace_id = p_workspace_id AND status = 'assigned';
      DELETE FROM locations WHERE workspace_id = p_workspace_id;
      DELETE FROM workspace_members WHERE workspace_id = p_workspace_id;
      DELETE FROM workspaces WHERE id = p_workspace_id RETURNING p_workspace_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete workspace: %', SQLERRM;
    END;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

**Step 4.2: Verify RLS Policies**

- **File:** Check existing migrations for RLS on workspaces table
- **Required Policy:**
  ```sql
  CREATE POLICY "Users can delete own workspaces"
    ON workspaces FOR DELETE
    USING (owner_id = auth.uid());
  ```

### Phase 5: Frontend Integration

**Step 5.1: Update API Client (if using client-side deletion)**

- **File:** `src/lib/api/client.ts` or similar
- **Action:** Add delete method or use standard DELETE HTTP method
- **Usage:**

  ```typescript
  const deleteWorkspace = async (workspaceId: string) => {
    const response = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete workspace");
    }

    return response.json() as Promise<DeleteWorkspaceResponse>;
  };
  ```

**Step 5.2: Update Settings Component**

- **File:** Settings view component (likely in `src/components/`)
- **Action:** Wire delete button to API call
- **Behavior:**
  - Show confirmation dialog
  - Require typed confirmation ("DELETE WORKSPACE")
  - Show loading state
  - Display error messages
  - Redirect on success

### Phase 6: Testing

**Step 6.1: Unit Tests - Service Layer**

- **Test:** Ownership verification

  ```typescript
  test("deleteWorkspace should throw if user is not owner", async () => {
    const workspace = await createWorkspace(owner.id);
    const member = await createUser();

    await expect(deleteWorkspace(supabase, workspace.id, member.id)).rejects.toThrow("not owner");
  });
  ```

**Step 6.2: Integration Tests - API Route**

- **Test:** DELETE request with valid token

  ```typescript
  test("DELETE /api/workspaces/:id should delete if owner", async () => {
    const response = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toContain("deleted");
  });
  ```

- **Test:** 403 Forbidden for non-owner

  ```typescript
  test("DELETE /api/workspaces/:id should return 403 if not owner", async () => {
    const response = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(response.status).toBe(403);
  });
  ```

- **Test:** Cascade deletion verification
  ```typescript
  test("Cascade deletion should delete all related data", async () => {
    // Create workspace with locations, boxes, etc.
    // Delete workspace
    // Verify all children deleted
  });
  ```

**Step 6.3: Manual Testing**

- Test with curl/Postman
- Test unauthorized (no token)
- Test forbidden (not owner)
- Test not found (invalid workspace)
- Verify cascade (check DB after deletion)

---

## 9. Implementation Checklist

### Backend Development

- [ ] Add `DeleteWorkspaceResponse` type to `src/types.ts`
- [ ] Create/update `src/lib/services/workspaceService.ts` with `deleteWorkspace()`
- [ ] Add UUID validation schema to validation utilities
- [ ] Implement DELETE handler in `src/pages/api/workspaces/[workspace_id].ts`
- [ ] Add comprehensive error handling (401, 403, 404, 500)
- [ ] Create database migration for RPC function (if using stored procedure)
- [ ] Verify RLS policies are in place for DELETE operations
- [ ] Add ownership verification logic
- [ ] Implement transaction pattern for cascade deletion
- [ ] Test endpoint with curl/Postman locally

### Testing

- [ ] Unit test: Ownership verification fails for non-owner
- [ ] Integration test: Owner can delete workspace
- [ ] Integration test: Non-owner gets 403
- [ ] Integration test: Invalid workspace returns 404
- [ ] Integration test: Missing auth returns 401
- [ ] Cascade test: Verify all related data deleted
- [ ] Transaction test: Rollback on error leaves data intact
- [ ] Performance test: Measure deletion time for various workspace sizes

### Documentation

- [ ] Update API documentation with DELETE endpoint
- [ ] Add example curl commands
- [ ] Document error responses
- [ ] Update implementation checklist in main spec

### Deployment

- [ ] Apply database migrations in production
- [ ] Verify RLS policies enabled
- [ ] Monitor first few deletions in production
- [ ] Set up error alerting for failures
- [ ] Document rollback procedure

---

## 10. Related Implementation Notes

### Dependencies

**Files This Depends On:**

- `src/lib/services/workspaceService.ts` - Must implement deleteWorkspace()
- `src/types.ts` - Must include DeleteWorkspaceResponse type
- `src/pages/api/workspaces/[workspace_id].ts` - Must add DELETE handler
- Database migrations - Must verify RLS and constraints

**Files That Depend On This:**

- Frontend Settings component - Calls this endpoint
- Frontend workspace list - Updates after deletion
- Frontend routing - Redirects after deletion

### Existing Patterns to Follow

**API Route Pattern:**

- See existing POST `/api/workspaces` for structure
- Use same error response format
- Follow same authentication pattern

**Service Layer Pattern:**

- Extract to `src/lib/services/`
- Use Supabase client passed as parameter
- Throw descriptive errors
- No side effects (no logging/state updates)

**Type Definition Pattern:**

- Define in `src/types.ts`
- Export for use in API routes and components
- Include JSDoc comments

---

## 11. Troubleshooting Guide

### Common Issues & Solutions

**Issue: Transaction Timeout**

- **Cause:** Workspace too large, deletion taking too long
- **Solution:** Optimize indexes, consider async background job
- **Monitoring:** Log deletion duration

**Issue: RLS Policy Blocks Deletion**

- **Cause:** RLS policy too restrictive
- **Solution:** Verify policy allows owner deletion
- **Check:**
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'workspaces';
  ```

**Issue: Foreign Key Constraint Violation**

- **Cause:** Related data not cascading properly
- **Solution:** Verify ON DELETE CASCADE on all foreign keys
- **Check:**
  ```sql
  SELECT constraint_name, table_name
  FROM information_schema.referential_constraints
  WHERE table_name IN ('boxes', 'locations', 'workspace_members');
  ```

**Issue: QR Codes Not Reset**

- **Cause:** Deletion trigger not firing
- **Solution:** Verify box deletion trigger exists and executes
- **Check:**
  ```sql
  SELECT * FROM pg_trigger WHERE tgname LIKE '%box%';
  ```

**Issue: Users Get 500 Error**

- **Cause:** Database error not caught properly
- **Solution:** Check error logs, verify database connection
- **Debug:** Add detailed logging to service layer

---

## 12. Security Checklist

- [ ] JWT token validated before processing
- [ ] User ownership verified via RLS AND explicit check
- [ ] No sensitive data logged (tokens, contents, passwords)
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention (JSON response, no HTML)
- [ ] CSRF prevention (POST form should use CSRF tokens if applicable)
- [ ] Rate limiting considered (optional: add per user)
- [ ] Audit trail considered (optional: log deletion event)
- [ ] Encrypted data in transit (HTTPS enforced)
- [ ] No hardcoded secrets in code

---

## 13. Success Criteria

**Implementation is complete when:**

1. ✅ DELETE `/api/workspaces/:workspace_id` endpoint exists and responds
2. ✅ Authentication required and validated
3. ✅ Authorization check enforces owner-only deletion
4. ✅ Returns 200 with correct response format on success
5. ✅ Returns appropriate 4xx/5xx status for all error cases
6. ✅ All related data cascaded deleted (boxes, locations, members, qr_codes)
7. ✅ Transaction ensures atomicity (all-or-nothing)
8. ✅ Error responses are consistent and helpful
9. ✅ Performance acceptable (< 5s for large workspaces)
10. ✅ All tests passing (unit, integration, manual)
11. ✅ No sensitive data leaked in errors or logs
12. ✅ RLS policies correctly configured
13. ✅ Database migrations applied and working
14. ✅ Frontend properly integrated and tested

---

## 14. References & Related Docs

- **API Specification:** `.ai_docs/review/MISSING_API_ENDPOINTS.md` (lines 133-258)
- **Database Schema:** `.ai_docs/db-plan.md`
- **Type Definitions:** `src/types.ts`
- **Tech Stack:** `.ai_docs/tech-stack.md`
- **Implementation Guidelines:** `CLAUDE.md`
- **Code Quality Standards:** `.claude/commands/guidelines.md`

---

**Document Version:** 1.0
**Created:** 2025-12-28
**Status:** Ready for Implementation
**Next Step:** Begin Phase 1 - Type Definitions & Validation
