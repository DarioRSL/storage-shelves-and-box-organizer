# API Endpoint Implementation Plan: PATCH /api/workspaces/:workspace_id/members/:user_id

## 1. Endpoint Overview

This endpoint updates a workspace member's role. It enables workspace owners and administrators to manage permissions by changing member roles (owner, admin, member, read_only). The operation requires elevated permissions and includes safeguards to prevent orphaning workspaces without owners.

**Key Business Rules**:
- Only workspace owners and admins can update member roles
- Cannot remove the last owner from a workspace
- Role changes are audited with full context logging
- Row Level Security (RLS) automatically enforces workspace membership access

## 2. Request Details

- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/workspaces/:workspace_id/members/:user_id`
- **Content-Type**: `application/json`
- **Authentication**: Required (JWT Bearer token via Supabase Auth)

### Parameters

**Path Parameters** (Required):
- `workspace_id` (UUID): The workspace containing the member
- `user_id` (UUID): The target member whose role will be updated

**Request Body** (Required):
```json
{
  "role": "admin"
}
```

**Body Schema**:
- `role` (required, enum): One of `'owner' | 'admin' | 'member' | 'read_only'`

**Example Request**:
```bash
PATCH /api/workspaces/550e8400-e29b-41d4-a716-446655440000/members/7c4a4e9f-2b1c-4d8e-9e3f-1a2b3c4d5e6f
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "role": "admin"
}
```

## 3. Utilized Types

All required types already exist in `src/types.ts`:

### DTOs and Enums
- `UpdateWorkspaceMemberRequest`: Request body type
  ```typescript
  interface UpdateWorkspaceMemberRequest {
    role: UserRole;
  }
  ```

- `WorkspaceMemberDto`: Response type
  ```typescript
  type WorkspaceMemberDto = {
    user_id: string;
    workspace_id: string;
    role: UserRole;
    joined_at: string | null;
  }
  ```

- `UserRole`: Enum for valid roles
  ```typescript
  type UserRole = 'owner' | 'admin' | 'member' | 'read_only'
  ```

- `ErrorResponse`: Error response structure
  ```typescript
  interface ErrorResponse {
    error: string;
    details?: unknown;
  }
  ```

### Custom Error Classes
Will use existing error classes from `workspace.service.ts` and create one new error:

- `InsufficientPermissionsError`: Current user lacks permission
- `NotFoundError`: Member or workspace not found
- `InvalidOperationError` (new): Attempting invalid operations (e.g., removing last owner)

## 4. Response Details

### Success Response (200 OK)

Returns the updated workspace member record:

```json
{
  "user_id": "7c4a4e9f-2b1c-4d8e-9e3f-1a2b3c4d5e6f",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin",
  "joined_at": "2023-10-27T10:00:00Z"
}
```

**Response Headers**:
```
Content-Type: application/json
```

### Error Responses

**400 Bad Request** - Invalid input data:
```json
{
  "error": "Błąd walidacji",
  "details": {
    "workspace_id": "Nieprawidłowy format ID workspace",
    "role": "Nieprawidłowa rola"
  }
}
```

**401 Unauthorized** - User not authenticated:
```json
{
  "error": "Brak autoryzacji"
}
```

**403 Forbidden** - Insufficient permissions:
```json
{
  "error": "Brak uprawnień do zmiany roli członka"
}
```

**404 Not Found** - Member or workspace not found:
```json
{
  "error": "Członek nie został znaleziony w tym workspace"
}
```

**409 Conflict** - Invalid operation (e.g., removing last owner):
```json
{
  "error": "Nie można zmienić roli ostatniego właściciela workspace"
}
```

**500 Internal Server Error** - Server-side error:
```json
{
  "error": "Nie udało się zaktualizować roli członka"
}
```

## 5. Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ PATCH /api/workspaces/:workspace_id/members/:user_id
       │ Body: { role: "admin" }
       │ Headers: Authorization: Bearer <jwt>
       ▼
┌──────────────────────────────────────────────────────┐
│  API Route Handler                                    │
│  src/pages/api/workspaces/[workspace_id]/            │
│           members/[user_id].ts                        │
├──────────────────────────────────────────────────────┤
│  1. Validate path params (workspace_id, user_id)     │
│  2. Validate request body (role)                     │
│  3. Extract Supabase client from locals              │
│  4. Verify JWT authentication                        │
│  5. Call service layer                               │
│  6. Return response with appropriate status code     │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Service Layer                                        │
│  src/lib/services/workspace.service.ts               │
│  Function: updateWorkspaceMemberRole()               │
├──────────────────────────────────────────────────────┤
│  1. Verify current user is owner/admin               │
│  2. Verify target member exists in workspace         │
│  3. Get current role (for logging)                   │
│  4. Check if changing last owner role                │
│  5. Update member role in database                   │
│  6. Return updated member record                     │
│  7. Log audit trail                                  │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Supabase PostgreSQL Database                        │
│  Table: workspace_members                            │
├──────────────────────────────────────────────────────┤
│  - Row Level Security (RLS) enforces access          │
│  - UPDATE operation on workspace_members             │
│  - Returns updated row                               │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Client    │
│  (Response) │
└─────────────┘
```

### Detailed Flow Steps

1. **Request Validation**:
   - Validate `workspace_id` and `user_id` as UUIDs using Zod
   - Validate `role` as valid UserRole enum value
   - Return 400 if validation fails

2. **Authentication**:
   - Extract JWT from Authorization header
   - Verify token via `supabase.auth.getUser()`
   - Return 401 if authentication fails

3. **Service Layer Processing**:
   - Check current user's permissions (must be owner or admin)
   - Verify target member exists in workspace
   - Validate business rules (e.g., last owner protection)
   - Execute database UPDATE via Supabase client
   - RLS policies automatically filter results to workspace members

4. **Response**:
   - Return 200 with updated `WorkspaceMemberDto` on success
   - Return appropriate error code (403, 404, 409, 500) on failure

## 6. Security Considerations

### Authentication & Authorization

1. **JWT Validation**:
   - Every request must include valid `Authorization: Bearer <token>` header
   - Middleware (`src/middleware/index.ts`) validates token and attaches user context
   - API route verifies user via `supabase.auth.getUser()`

2. **Role-Based Access Control (RBAC)**:
   - Only `owner` and `admin` roles can update member roles
   - Enforced in service layer before database operations
   - Returns 403 Forbidden if current user lacks permissions

3. **Row Level Security (RLS)**:
   - PostgreSQL RLS policies automatically filter queries
   - Users can only access workspaces they're members of
   - `is_workspace_member(workspace_id)` helper validates access
   - RLS acts as defense-in-depth layer

### Input Validation

1. **Path Parameters**:
   - Validate UUID format for `workspace_id` and `user_id`
   - Prevents SQL injection and invalid database queries
   - Zod schema ensures strict type checking

2. **Request Body**:
   - Validate `role` against UserRole enum
   - Prevents unauthorized role escalation
   - Only allows valid database enum values

### Business Logic Security

1. **Owner Protection**:
   - Cannot change role of last owner in workspace
   - Prevents orphaning workspaces without administrators
   - Checked before UPDATE operation

2. **Self-Modification Prevention** (Optional):
   - Consider preventing users from changing their own roles
   - Reduces risk of accidental permission downgrade
   - Can be implemented as business rule

### Audit Logging

1. **Success Logging**:
   ```typescript
   console.info("PATCH members/:user_id - Success", {
     workspaceId,
     targetUserId,
     oldRole,
     newRole,
     changedByUserId,
     timestamp
   });
   ```

2. **Error Logging**:
   ```typescript
   console.error("PATCH members/:user_id - Error", {
     workspaceId,
     targetUserId,
     currentUserId,
     error,
     timestamp
   });
   ```

### Security Headers

- `Content-Type: application/json` prevents MIME-type confusion
- CORS handled by Astro middleware configuration

## 7. Error Handling

### Error Categories and Responses

| Error Type | HTTP Status | Trigger Condition | Response Message (Polish) |
|------------|-------------|-------------------|---------------------------|
| **Validation Error** | 400 | Invalid UUID format, invalid role enum | "Błąd walidacji" + details object |
| **Authentication Error** | 401 | Missing/invalid JWT token | "Brak autoryzacji" |
| **Permission Error** | 403 | Current user not owner/admin | "Brak uprawnień do zmiany roli członka" |
| **Not Found Error** | 404 | Member or workspace doesn't exist | "Członek nie został znaleziony w tym workspace" |
| **Invalid Operation Error** | 409 | Changing last owner's role | "Nie można zmienić roli ostatniego właściciela workspace" |
| **Database Error** | 500 | Unexpected Supabase error | "Nie udało się zaktualizować roli członka" |

### Error Handling Strategy

1. **Early Returns Pattern**:
   - Handle errors at the beginning of functions
   - Use guard clauses for preconditions
   - Place happy path last for readability

2. **Custom Error Classes**:
   - `InsufficientPermissionsError`: Thrown when user lacks permissions (403)
   - `NotFoundError`: Thrown when member/workspace not found (404)
   - `InvalidOperationError`: Thrown when business rule violated (409)
   - Zod errors mapped to 400 Bad Request

3. **Error Propagation**:
   - Service layer throws typed errors
   - API route handler catches and maps to HTTP responses
   - Structured logging for all error cases

### Error Handling Flow

```typescript
try {
  // 1. Validate input
  const params = paramsSchema.parse({ workspace_id, user_id });
  const body = bodySchema.parse(requestBody);

  // 2. Authenticate
  const user = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 3. Call service
  const updated = await updateWorkspaceMemberRole(...);

  // 4. Return success
  return Response.json(updated, { status: 200 });

} catch (error) {
  // Map errors to HTTP responses
  if (error instanceof ZodError) return 400;
  if (error instanceof InsufficientPermissionsError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof InvalidOperationError) return 409;
  return 500; // Unexpected errors
}
```

### Specific Error Scenarios

**Scenario 1: Invalid Workspace ID Format**
```
Input: workspace_id = "not-a-uuid"
Error: ZodError
Response: 400 Bad Request
{
  "error": "Błąd walidacji",
  "details": { "workspace_id": "Nieprawidłowy format ID workspace" }
}
```

**Scenario 2: User Not Authenticated**
```
Input: Missing or invalid JWT token
Error: AuthError
Response: 401 Unauthorized
{ "error": "Brak autoryzacji" }
```

**Scenario 3: Insufficient Permissions**
```
Input: Current user has "member" role (not owner/admin)
Error: InsufficientPermissionsError
Response: 403 Forbidden
{ "error": "Brak uprawnień do zmiany roli członka" }
```

**Scenario 4: Target Member Not Found**
```
Input: user_id not in workspace_members table
Error: NotFoundError
Response: 404 Not Found
{ "error": "Członek nie został znaleziony w tym workspace" }
```

**Scenario 5: Changing Last Owner Role**
```
Input: Attempting to change role of last owner to non-owner
Error: InvalidOperationError
Response: 409 Conflict
{ "error": "Nie można zmienić roli ostatniego właściciela workspace" }
```

**Scenario 6: Database Connection Failure**
```
Input: Supabase unavailable
Error: Unexpected error
Response: 500 Internal Server Error
{ "error": "Nie udało się zaktualizować roli członka" }
```

## 8. Performance Considerations

### Database Queries

1. **Optimized Query Pattern**:
   - Use indexed columns (user_id, workspace_id) for filtering
   - workspace_members table has composite primary key (workspace_id, user_id)
   - RLS policies use `is_workspace_member()` function with efficient joins

2. **Query Count**:
   - Permission check: 1 SELECT query
   - Owner count check (if applicable): 1 SELECT query with COUNT
   - Update operation: 1 UPDATE query
   - **Total: 2-3 queries** per request

3. **Indexes**:
   - Primary key index on (workspace_id, user_id)
   - Foreign key indexes on user_id and workspace_id
   - No additional indexes needed for this operation

### Potential Bottlenecks

1. **Sequential Database Calls**:
   - Permission check must complete before update
   - Cannot parallelize due to business logic dependencies
   - **Mitigation**: Keep queries simple and indexed

2. **RLS Policy Overhead**:
   - RLS policies add WHERE clause to every query
   - `is_workspace_member()` function performs JOIN
   - **Mitigation**: Function is optimized with proper indexes

3. **JWT Validation**:
   - `supabase.auth.getUser()` validates token on every request
   - No caching by default
   - **Mitigation**: Consider implementing JWT caching in middleware (future optimization)

### Optimization Strategies

1. **Minimize Round Trips**:
   - Combine permission check and member existence check if possible
   - Use single query with JOIN where appropriate

2. **Connection Pooling**:
   - Supabase handles connection pooling automatically
   - No custom pooling configuration needed

3. **Response Size**:
   - Returns minimal WorkspaceMemberDto (4 fields)
   - No nested objects or joins in response
   - Lightweight JSON payload

### Expected Performance

- **Response Time**: < 200ms (95th percentile)
- **Database Load**: Low (2-3 indexed queries)
- **Scalability**: Horizontally scalable via Supabase infrastructure
- **Concurrency**: No locking issues (UPDATE uses row-level locks)

### Monitoring Recommendations

1. **Metrics to Track**:
   - Request latency (p50, p95, p99)
   - Error rate by status code
   - Database query execution time
   - Authentication failures

2. **Logging**:
   - Success logs include timing information
   - Error logs include full context for debugging
   - Structured JSON logging for easy parsing

## 9. Implementation Steps

### Step 1: Create Service Layer Function

**File**: `src/lib/services/workspace.service.ts`

1.1. Create new custom error class:
```typescript
export class InvalidOperationError extends Error {
  constructor(message = "Nieprawidłowa operacja") {
    super(message);
    this.name = "InvalidOperationError";
  }
}
```

1.2. Implement `updateWorkspaceMemberRole` function:

```typescript
/**
 * Updates a workspace member's role.
 *
 * Validates permissions, checks business rules (e.g., last owner protection),
 * and updates the member's role in the database.
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace
 * @param targetUserId - UUID of the member whose role will be updated
 * @param currentUserId - UUID of the user making the change
 * @param newRole - New role to assign
 * @returns Updated workspace member record
 * @throws InsufficientPermissionsError if current user is not owner/admin
 * @throws NotFoundError if target member not found in workspace
 * @throws InvalidOperationError if attempting to change last owner's role
 * @throws Error for database errors
 */
export async function updateWorkspaceMemberRole(
  supabase: SupabaseClient,
  workspaceId: string,
  targetUserId: string,
  currentUserId: string,
  newRole: UserRole
): Promise<WorkspaceMemberDto> {
  try {
    // 1. Check current user's permissions (must be owner or admin)
    const { data: currentMember, error: roleError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", currentUserId)
      .limit(1)
      .single();

    if (roleError || !currentMember) {
      console.error("Error checking user permissions:", roleError);
      throw new InsufficientPermissionsError("Brak uprawnień do zmiany roli członka");
    }

    if (currentMember.role !== "owner" && currentMember.role !== "admin") {
      throw new InsufficientPermissionsError("Brak uprawnień do zmiany roli członka");
    }

    // 2. Verify target member exists and get current role
    const { data: targetMember, error: targetError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .limit(1)
      .single();

    if (targetError || !targetMember) {
      console.error("Target member not found:", targetError);
      throw new NotFoundError("Członek nie został znaleziony w tym workspace");
    }

    const oldRole = targetMember.role;

    // 3. Check if changing last owner's role (if current role is owner)
    if (oldRole === "owner" && newRole !== "owner") {
      // Count total owners in workspace
      const { data: ownerCount, error: countError } = await supabase
        .from("workspace_members")
        .select("user_id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("role", "owner");

      if (countError) {
        console.error("Error counting owners:", countError);
        throw new Error("Nie udało się zaktualizować roli członka");
      }

      // If only 1 owner exists, prevent role change
      if (ownerCount && ownerCount === 1) {
        throw new InvalidOperationError(
          "Nie można zmienić roli ostatniego właściciela workspace"
        );
      }
    }

    // 4. Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating member role:", updateError);
      throw new Error("Nie udało się zaktualizować roli członka");
    }

    if (!updatedMember) {
      throw new Error("Nie udało się zaktualizować roli członka");
    }

    // 5. Log success
    console.info("PATCH /api/workspaces/:workspace_id/members/:user_id - Sukces:", {
      workspaceId: workspaceId,
      targetUserId: targetUserId,
      oldRole: oldRole,
      newRole: newRole,
      changedByUserId: currentUserId,
      timestamp: new Date().toISOString(),
    });

    // 6. Return updated member
    return updatedMember;
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof InsufficientPermissionsError ||
      error instanceof NotFoundError ||
      error instanceof InvalidOperationError
    ) {
      throw error;
    }

    // Log and throw unexpected errors
    console.error("Unexpected error in updateWorkspaceMemberRole:", {
      workspaceId: workspaceId,
      targetUserId: targetUserId,
      currentUserId: currentUserId,
      newRole: newRole,
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });
    throw error instanceof Error ? error : new Error("Nie udało się zaktualizować roli członka");
  }
}
```

### Step 2: Create API Route Handler

**File**: `src/pages/api/workspaces/[workspace_id]/members/[user_id].ts`

2.1. Create new file with PATCH handler:

```typescript
import type { APIRoute } from "astro";
import { z, ZodError } from "zod";
import {
  InsufficientPermissionsError,
  NotFoundError,
  InvalidOperationError,
  updateWorkspaceMemberRole,
} from "@/lib/services/workspace.service";
import type { ErrorResponse } from "@/types";

export const prerender = false;

/**
 * Validates workspace_id and user_id URL parameters
 */
const paramsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID workspace"),
  user_id: z.string().uuid("Nieprawidłowy format ID użytkownika"),
});

/**
 * Validates PATCH request body for updating member role
 */
const bodySchema = z.object({
  role: z.enum(["owner", "admin", "member", "read_only"], {
    errorMap: () => ({ message: "Nieprawidłowa rola" }),
  }),
});

/**
 * PATCH /api/workspaces/:workspace_id/members/:user_id
 * Updates a member's role in the workspace.
 *
 * @returns 200 OK with updated member data, or appropriate error response
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Validate path parameters
    const validatedParams = paramsSchema.parse(params);
    const { workspace_id, user_id } = validatedParams;

    // 2. Get Supabase client from locals
    const supabase = locals.supabase;

    // 3. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Brak autoryzacji",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validatedBody = bodySchema.parse(body);
    const { role } = validatedBody;

    // 5. Call service layer to update member role
    const updatedMember = await updateWorkspaceMemberRole(
      supabase,
      workspace_id,
      user_id,
      user.id,
      role
    );

    // 6. Return 200 OK with updated member data
    return new Response(JSON.stringify(updatedMember), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const formattedErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        formattedErrors[path] = err.message;
      });

      return new Response(
        JSON.stringify({
          error: "Błąd walidacji",
          details: formattedErrors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle insufficient permissions error (403)
    if (error instanceof InsufficientPermissionsError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle NotFoundError (404)
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        } as ErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle invalid operation error (409)
    if (error instanceof InvalidOperationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        } as ErrorResponse),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    console.error("PATCH /api/workspaces/:workspace_id/members/:user_id - Błąd:", {
      workspaceId: params.workspace_id,
      targetUserId: params.user_id,
      currentUserId: locals.supabase ? "authenticated" : "unknown",
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Nie udało się zaktualizować roli członka",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Step 3: Update Service Exports

**File**: `src/lib/services/workspace.service.ts`

3.1. Add export for new error class at top of file:
```typescript
export class InvalidOperationError extends Error {
  constructor(message = "Nieprawidłowa operacja") {
    super(message);
    this.name = "InvalidOperationError";
  }
}
```

3.2. Add export for new function (already included in function definition with `export`)

### Step 4: Testing Preparation

4.1. **Manual Testing Checklist**:
- [ ] Test with valid owner updating member role (200)
- [ ] Test with valid admin updating member role (200)
- [ ] Test with member role attempting update (403)
- [ ] Test with invalid workspace_id format (400)
- [ ] Test with invalid user_id format (400)
- [ ] Test with invalid role value (400)
- [ ] Test with non-existent member (404)
- [ ] Test without authentication (401)
- [ ] Test changing last owner role (409)
- [ ] Test all role transitions (owner→admin, admin→member, etc.)

4.2. **Test Data Requirements**:
- Valid workspace with multiple members
- Workspace with single owner (for last owner test)
- Test users with different roles (owner, admin, member, read_only)
- Valid JWT tokens for authentication

### Step 5: Code Quality Checks

5.1. Run linter:
```bash
npm run lint
```

5.2. Run linter with auto-fix:
```bash
npm run lint:fix
```

5.3. Format code:
```bash
npm run format
```

### Step 6: Integration Testing

6.1. Start development server:
```bash
npm run dev
```

6.2. Test endpoint with curl or API client:
```bash
# Success case
curl -X PATCH http://localhost:3000/api/workspaces/{workspace_id}/members/{user_id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'

# Expected: 200 OK with updated member data
```

6.3. Verify database state using Supabase dashboard

6.4. Check application logs for audit trail

### Step 7: Documentation Updates

7.1. Verify API specification alignment:
- Confirm response structure matches `.ai_docs/api-plan.md`
- Verify error codes match specification
- Ensure all business rules documented

7.2. Add inline code comments where complex logic exists

7.3. Update this implementation plan with any deviations or learnings

### Step 8: Deployment Preparation

8.1. Verify environment variables configured in production

8.2. Ensure database migrations applied (no new migrations needed)

8.3. Test with production-like Supabase instance (staging)

8.4. Review RLS policies for workspace_members table

### Implementation Checklist Summary

- [ ] Step 1: Create `InvalidOperationError` class in workspace.service.ts
- [ ] Step 1: Implement `updateWorkspaceMemberRole()` function
- [ ] Step 2: Create API route file `[user_id].ts`
- [ ] Step 2: Implement PATCH handler with validation
- [ ] Step 3: Export new error class and function
- [ ] Step 4: Perform manual testing with all scenarios
- [ ] Step 5: Run linter and formatter
- [ ] Step 6: Integration testing with dev server
- [ ] Step 7: Verify documentation alignment
- [ ] Step 8: Prepare for deployment

### Notes

- All error messages use Polish language per project convention
- Follows existing patterns from POST /workspaces/:workspace_id/members
- Uses structured logging for audit trail
- Implements early returns pattern for error handling
- RLS policies provide defense-in-depth security layer
