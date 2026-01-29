# API Endpoint Implementation Plan: PATCH /api/workspaces/:workspace_id

## 1. Endpoint Overview

The `PATCH /api/workspaces/:workspace_id` endpoint allows workspace owners to update workspace properties such as name and description. This is a critical endpoint for the Settings view (WorkspaceEditModal) and enables users to modify their workspace configuration after creation.

**Key Responsibilities:**

- Verify user authentication and ownership of the workspace
- Validate incoming request data (name, description)
- Update workspace in PostgreSQL via Supabase
- Return updated workspace with fresh `updated_at` timestamp
- Handle all error scenarios with appropriate HTTP status codes and messages

**Used By:**

- Settings view (WorkspaceEditModal)
- Future workspace management features

---

## 2. Request Details

### HTTP Method & URL Pattern

```
PATCH /api/workspaces/{workspace_id}
```

### URL Parameters

| Parameter    | Type | Required | Description                         |
| ------------ | ---- | -------- | ----------------------------------- |
| workspace_id | UUID | Yes      | The UUID of the workspace to update |

### Headers

| Header        | Value              | Description                                |
| ------------- | ------------------ | ------------------------------------------ |
| Authorization | Bearer <JWT_TOKEN> | Required JWT token from authenticated user |
| Content-Type  | application/json   | Required for request body                  |

### Request Body Schema

```typescript
interface PatchWorkspaceRequest {
  name?: string; // Optional, max 255 chars, will be trimmed
  description?: string; // Optional (reserved for future use)
}
```

### Validation Rules

**name field (optional):**

- Type: string
- Minimum length: 1 character
- Maximum length: 255 characters
- Must be trimmed (leading/trailing whitespace removed)
- Can be null/undefined
- Business rule: At least one field (name or description) must be provided

**description field (optional):**

- Type: string or null
- Reserved for future use
- Currently not stored in database (not in workspaces table)
- Can be provided but will not be persisted

**Global Validation:**

- At least one field must be provided (cannot send empty object)
- Invalid JSON in body returns 400
- Extraneous fields in body are ignored

---

## 3. Response Details

### Success Response (200 OK)

**HTTP Status:** 200 OK

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_id": "user-uuid-here",
  "name": "Updated Workspace Name",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2025-12-28T14:30:00Z"
}
```

**Type Definition:**

```typescript
interface PatchWorkspaceResponse extends WorkspaceDto {
  // Inherits all WorkspaceDto fields from database.types.ts
  // Key fields returned:
  // - id: UUID
  // - owner_id: UUID
  // - name: string (updated value)
  // - created_at: ISO 8601 timestamp (unchanged)
  // - updated_at: ISO 8601 timestamp (automatically updated by database trigger)
}
```

### Error Responses

| HTTP Status | Condition              | Error Message                                         | Details                                      |
| ----------- | ---------------------- | ----------------------------------------------------- | -------------------------------------------- |
| **400**     | Invalid JSON format    | "Nieprawidłowy format JSON"                           | Body is not valid JSON                       |
| **400**     | Missing/empty name     | "Nazwa workspace'a nie może być pusta"                | Name field empty when provided               |
| **400**     | Name exceeds 255 chars | "Nazwa workspace'a nie może przekraczać 255 znaków"   | Validation error                             |
| **400**     | No fields provided     | "Proszę podać co najmniej jedno pole do aktualizacji" | Neither name nor description provided        |
| **401**     | Missing/invalid JWT    | "Nie jesteś uwierzytelniony"                          | User not authenticated or invalid token      |
| **403**     | User is not owner      | "Tylko właściciel workspace'u może go aktualizować"   | User in workspace but not as owner           |
| **404**     | Workspace not found    | "Workspace nie został znaleziony"                     | workspace_id doesn't exist or not accessible |
| **500**     | Database error         | "Nie udało się zaktualizować workspace'u"             | Server-side error during update              |

---

## 4. Data Flow

### Request Processing Flow

```
1. CLIENT SENDS REQUEST
   └─ PATCH /api/workspaces/550e8400-e29b-41d4-a716-446655440000
   └─ Headers: Authorization: Bearer eyJhbGc...
   └─ Body: { "name": "New Workspace Name" }

2. API ROUTE HANDLER (src/pages/api/workspaces/[workspace_id].ts)
   ├─ Extract workspace_id from URL params
   ├─ Verify authentication (supabase.auth.getUser())
   ├─ Parse request body (await request.json())
   ├─ Validate using PatchWorkspaceSchema (Zod)
   └─ Call service function

3. WORKSPACE SERVICE LAYER (src/lib/services/workspace.service.ts)
   ├─ Check user is workspace owner
   │  └─ Query: workspace_members WHERE workspace_id AND user_id AND role = 'owner'
   │  └─ If not owner → throw WorkspaceOwnershipError (403)
   ├─ Prepare update data (trim name, handle null fields)
   ├─ Execute database update via Supabase
   │  └─ UPDATE workspaces SET name = ?, updated_at = NOW() WHERE id = ?
   │  └─ Database trigger moddatetime auto-updates updated_at
   └─ Return updated workspace record

4. ERROR HANDLING
   ├─ WorkspaceOwnershipError → 403 Forbidden
   ├─ WorkspaceNotFoundError → 404 Not Found
   ├─ Validation errors → 400 Bad Request
   ├─ Database errors → 500 Internal Server Error
   └─ All errors logged with context

5. RESPONSE
   └─ Return JSON response with status code
```

### Database Interaction

**Permission Check Query:**

```sql
SELECT role FROM workspace_members
WHERE workspace_id = $1 AND user_id = $2
LIMIT 1;
-- Must return role = 'owner', otherwise throw 403
```

**Update Query (executed via Supabase):**

```sql
UPDATE workspaces
SET name = $1, updated_at = NOW()
WHERE id = $2
RETURNING *;
-- Returns complete updated workspace record
-- Database trigger moddatetime on updated_at automatically handled
```

**RLS Policy Enforcement:**

- Supabase Row Level Security validates owner_id = auth.uid()
- Cannot update workspace if not owner (RLS blocks at database level)
- Provides defense-in-depth security

### Data Transformations

**Input Transformations:**

- Request body `name` → trimmed and validated
- Null/undefined fields → omitted from update
- Extra fields in body → ignored by Zod schema

**Output Transformations:**

- Database record → JSON serialization
- Timestamp fields → ISO 8601 format (handled by Supabase)
- All fields from WorkspaceDto → returned as-is

---

## 5. Security Considerations

### Authentication & Authorization

**Authentication:**

- User JWT token validated via Supabase middleware (context.locals.supabase)
- Implemented via: `const user = await supabase.auth.getUser()`
- Returns 401 if token missing, expired, or invalid

**Authorization:**

- Two-layer permission check:
  1. Service layer: Query workspace_members to verify role = 'owner'
  2. RLS policy: Database enforces owner_id = auth.uid()
- Prevents non-owners from updating workspaces
- Workspace isolation maintained across users

### Input Validation & Data Safety

**Client-Side Validation (optional, secondary):**

- Zod schema validates all inputs before service layer call
- Min/max length constraints enforced
- Type checking ensures string types

**Server-Side Validation (mandatory):**

- Zod schema revalidated on API route handler
- Prevents invalid data from reaching service layer
- Custom error messages in user's language (Polish)

**SQL Injection Prevention:**

- Supabase uses parameterized queries ($1, $2, etc.)
- No string concatenation in SQL
- Input values passed as parameters, not interpolated

**XSS Prevention:**

- User input not directly rendered in HTML responses
- JSON encoding handles special characters safely
- No unescaped user content in responses

### Attack Surface Mitigation

**Denial of Service (DoS):**

- Rate limiting should be implemented at API gateway level (not in this endpoint)
- Database constraints prevent duplicate workspaces
- No unbounded queries or operations

**Privilege Escalation:**

- User cannot change workspace owner_id (not in update)
- User cannot change their own role (separate endpoint)
- RLS policies enforce tenant isolation

**Timing Attacks:**

- Constant-time operations used for permission checks
- No early returns that leak information about missing resources

**CSRF:**

- JWT token-based auth inherently CSRF-safe
- Token must be in Authorization header (not cookies)
- SameSite attribute not applicable

---

## 6. Error Handling Strategy

### Error Classification & Response

**Validation Errors (400 Bad Request)**

```typescript
// Invalid JSON format
{
  "error": "Nieprawidłowy format JSON",
  "details": "Body is not valid JSON"
}

// Schema validation failure
{
  "error": "Nieprawidłowe dane wejściowe",
  "details": {
    "name": ["Nazwa workspace'a nie może być pusta"]
  }
}

// No fields provided
{
  "error": "Proszę podać co najmniej jedno pole do aktualizacji",
  "details": "Wymagane jest co najmniej jedno z pól: name"
}
```

**Authentication Errors (401 Unauthorized)**

```typescript
{
  "error": "Nie jesteś uwierzytelniony",
  "details": "Użytkownik nie jest zalogowany"
}
```

**Authorization Errors (403 Forbidden)**

```typescript
{
  "error": "Tylko właściciel workspace'u może go aktualizować",
  "details": "Brak uprawnień do aktualizacji tego workspace'u"
}
```

**Not Found Errors (404 Not Found)**

```typescript
{
  "error": "Workspace nie został znaleziony",
  "details": "workspace_id nie istnieje lub brak dostępu"
}
```

**Server Errors (500 Internal Server Error)**

```typescript
{
  "error": "Nie udało się zaktualizować workspace'u",
  "details": "Błąd bazy danych - spróbuj ponownie"
}
```

### Error Logging Strategy

**Success Logging:**

```typescript
console.info("PATCH /api/workspaces/:workspace_id - Sukces:", {
  workspaceId: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-uuid-here",
  fields_updated: ["name"],
  timestamp: new Date().toISOString(),
});
```

**Error Logging:**

```typescript
console.error("PATCH /api/workspaces/:workspace_id - Błąd:", {
  workspaceId: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-uuid-here",
  error_type: "WorkspaceOwnershipError",
  error_message: "User is not workspace owner",
  timestamp: new Date().toISOString(),
});
```

**Unexpected Error Logging:**

```typescript
console.error("Unexpected error in PATCH /api/workspaces/:workspace_id:", {
  workspaceId: "...",
  userId: "...",
  error: "...",
  stack: "...",
});
```

---

## 7. Performance Considerations

### Database Query Optimization

**Current Query Performance:**

- Permission check: `workspace_members` query with indexed columns (workspace_id, user_id)
- Update query: `workspaces` table with UUID primary key
- Both queries are O(log n) due to B-tree indexes

**No N+1 Query Issues:**

- Single permission check query
- Single update query
- No additional queries needed

**Index Strategy:**

- workspace_members: index on (workspace_id, user_id) for permission check
- workspaces: PRIMARY KEY on id for update
- Existing indexes in schema support efficient lookups

**Caching Considerations:**

- User shouldn't cache workspace data longer than a few seconds
- updated_at timestamp allows clients to detect changes
- Frontend should invalidate cache after successful PATCH

### Request/Response Size

**Request Size:**

- Max size: ~300 bytes (workspace_id + "name" field with 255 chars)
- Typical size: ~100 bytes
- Well within HTTP limits

**Response Size:**

- Typical: ~200-300 bytes
- All workspace fields + updated timestamp
- No nested objects or large payloads

**Bottlenecks:**

- Database round-trip is bottleneck, not data transfer
- Network latency > processing time
- Solution: Batch updates if multiple fields need changing

---

## 8. Implementation Steps

### Phase 1: Type Definitions & Validation

1. **Add Zod schemas** to new file: `src/lib/validators/workspace.validators.ts`
   - `PatchWorkspaceParamsSchema` for URL parameter validation
   - `PatchWorkspaceSchema` for request body validation
   - Both schemas enforce business rules

2. **Add type definitions** to `src/types.ts`
   - `PatchWorkspaceRequest` interface
   - `PatchWorkspaceResponse` type (extends WorkspaceDto)
   - Export for use in API route and components

### Phase 2: Custom Error Classes

3. **Add custom error classes** to `src/lib/services/workspace.service.ts`
   - `WorkspaceNotFoundError` - when workspace doesn't exist
   - `WorkspaceOwnershipError` - when user is not owner
   - Pattern follows existing errors in location.service.ts and box.service.ts

### Phase 3: Service Layer Function

4. **Implement service function** `updateWorkspace()` in `src/lib/services/workspace.service.ts`
   - Accept: supabase, workspaceId, userId, updateData
   - Return: updated WorkspaceDto
   - Throws: WorkspaceOwnershipError, WorkspaceNotFoundError
   - Steps:
     - Verify user is workspace owner
     - Validate at least one field provided
     - Execute database update
     - Return updated workspace

5. **Export function** from workspace.service.ts for use in API route

### Phase 4: API Route Handler

6. **Create API route** `src/pages/api/workspaces/[workspace_id].ts`
   - Already exists with GET and POST handlers
   - Add PATCH handler function
   - Follows existing pattern from boxes/[id].ts PATCH handler
   - Steps:
     - Get Supabase client from context.locals
     - Verify authentication
     - Extract and validate workspace_id parameter
     - Parse and validate request body
     - Call service layer
     - Handle errors and return appropriate responses

### Phase 5: Testing & Validation

7. **Write manual test cases**
   - Valid update with name change
   - Update by non-owner (should fail with 403)
   - Invalid workspace_id (should fail with 404)
   - Invalid JSON body (should fail with 400)
   - Missing authentication (should fail with 401)

8. **Test error scenarios**
   - Name too long (>255 chars)
   - Name is empty string
   - Empty request body (no fields)
   - Workspace that doesn't exist

---

## 9. File Structure & Dependencies

### New/Modified Files

**Files to Create:**

1. `src/lib/validators/workspace.validators.ts` - Zod schemas for workspace validation

**Files to Modify:**

1. `src/types.ts` - Add PatchWorkspaceRequest and PatchWorkspaceResponse types
2. `src/lib/services/workspace.service.ts` - Add updateWorkspace() function and custom error classes
3. `src/pages/api/workspaces/[workspace_id].ts` - Add PATCH handler (file already exists with GET)

### Dependency Chain

```
API Route Handler (pages/api/workspaces/[workspace_id].ts)
  ↓ imports
Workspace Validators (lib/validators/workspace.validators.ts)
Workspace Service (lib/services/workspace.service.ts)
  ↓ imports
Types (types.ts)
  ↓ imports
Supabase Client (db/supabase.client.ts)
```

---

## 10. Implementation Checklist

### Backend Implementation

- [ ] Create `src/lib/validators/workspace.validators.ts`
  - [ ] PatchWorkspaceParamsSchema (workspace_id validation)
  - [ ] PatchWorkspaceSchema (request body validation)

- [ ] Add types to `src/types.ts`
  - [ ] PatchWorkspaceRequest interface
  - [ ] PatchWorkspaceResponse type

- [ ] Add to `src/lib/services/workspace.service.ts`
  - [ ] WorkspaceNotFoundError class
  - [ ] WorkspaceOwnershipError class
  - [ ] updateWorkspace() function
    - [ ] Permission check
    - [ ] Database update
    - [ ] Error handling
    - [ ] Logging

- [ ] Add PATCH handler to `src/pages/api/workspaces/[workspace_id].ts`
  - [ ] Authentication verification
  - [ ] Parameter validation
  - [ ] Body validation
  - [ ] Service layer call
  - [ ] Error handling (all 5 error types)
  - [ ] Success response (200 OK)

### Testing & Quality

- [ ] Test owner can update workspace name
- [ ] Test non-owner cannot update (403)
- [ ] Test invalid workspace_id (404)
- [ ] Test invalid JSON body (400)
- [ ] Test missing authentication (401)
- [ ] Test name validation (min 1, max 255 chars)
- [ ] Test at least one field required
- [ ] Test response includes updated_at
- [ ] Test response includes all WorkspaceDto fields
- [ ] Run linter (npm run lint)
- [ ] Run linter fix (npm run lint:fix)
- [ ] Manual test with curl/Postman

### Documentation

- [ ] Add JSDoc comments to service function
- [ ] Add JSDoc comments to API route handler
- [ ] Document error scenarios in comments
- [ ] Update project documentation if needed

---

## 11. Code Patterns Reference

### Zod Validation Pattern (from existing code)

```typescript
const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nazwa workspace'a nie może być pusta")
    .max(255, "Nazwa workspace'a nie może przekraczać 255 znaków"),
});

const parseResult = CreateWorkspaceSchema.safeParse(body);
if (!parseResult.success) {
  return new Response(
    JSON.stringify({
      error: "Nieprawidłowe dane wejściowe",
      details: parseResult.error.flatten().fieldErrors,
    }),
    { status: 400 }
  );
}
```

### Service Layer Pattern (from existing code)

```typescript
export async function updateWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  data: PatchWorkspaceRequest
): Promise<WorkspaceDto> {
  // 1. Check permissions
  // 2. Validate data
  // 3. Execute database operation
  // 4. Return result or throw error
}
```

### API Route Handler Pattern (from existing code)

```typescript
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(..., { status: 401 });

    // 2. Validate params
    const paramsResult = ParamsSchema.safeParse({ id: params.id });
    if (!paramsResult.success) return new Response(..., { status: 400 });

    // 3. Validate body
    const bodyResult = BodySchema.safeParse(await request.json());
    if (!bodyResult.success) return new Response(..., { status: 400 });

    // 4. Call service
    try {
      const result = await serviceFunction(...);
      return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
      // Handle specific error types with appropriate status codes
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(..., { status: 500 });
  }
};
```

---

## 12. Deployment & Rollback Plan

### Pre-Deployment Checklist

- [ ] All code changes complete and tested locally
- [ ] Linting passes (npm run lint)
- [ ] No TypeScript errors (npx tsc)
- [ ] Manual testing in development environment
- [ ] Code review completed
- [ ] No breaking changes to existing endpoints
- [ ] RLS policies properly configured
- [ ] Error handling covers all scenarios

### Deployment Steps

1. Deploy to staging environment
2. Run smoke tests against staging
3. Monitor logs for errors
4. Deploy to production
5. Monitor production logs for 24 hours
6. Verify workspace updates work in Settings view

### Rollback Plan

If critical issues discovered post-deployment:

1. **Option 1: Quick Fix**
   - Fix issue in code
   - Deploy updated version
   - Recommended for minor bugs

2. **Option 2: Temporary Disable**
   - Wrap PATCH handler in a feature flag
   - Return error: "Workspace updates temporarily unavailable"
   - Disable UI button in frontend
   - Investigate and fix offline
   - Re-enable when fixed

3. **Option 3: Full Rollback**
   - Remove PATCH handler code
   - Revert service layer changes
   - Revert database migrations (if any)
   - Restore to previous working version

---

## 13. Summary Table

| Aspect                    | Details                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| **Endpoint**              | PATCH /api/workspaces/:workspace_id                                   |
| **Purpose**               | Update workspace properties (name, description)                       |
| **Files Changed**         | 3 files (types.ts, workspace.service.ts, workspace/[workspace_id].ts) |
| **Files Created**         | 1 file (workspace.validators.ts)                                      |
| **Est. Dev Time**         | 4-6 hours (includes testing)                                          |
| **RLS Policy**            | Verify owner_id = auth.uid()                                          |
| **Permission Model**      | User must be workspace owner                                          |
| **Success Status**        | 200 OK                                                                |
| **Error Statuses**        | 400, 401, 403, 404, 500                                               |
| **Database Queries**      | 2 queries (permission check + update)                                 |
| **Blocking Dependencies** | None - can implement independently                                    |

---

**Document Version:** 1.0
**Created:** 2025-12-28
**Target Implementation Date:** Before Phase 3 (Dashboard Modals)
**Status:** Ready for Implementation
