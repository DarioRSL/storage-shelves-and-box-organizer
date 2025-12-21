# API Endpoint Implementation Plan: GET /api/workspaces/:workspace_id/members

## 1. Endpoint Overview

This endpoint retrieves all members of a specific workspace along with their profile information (email, full name, avatar). It enforces workspace membership validation through Row Level Security (RLS) and explicit service layer checks to ensure that only workspace members can view the member list.

**Business Purpose:**
- Display workspace member list in the UI
- Show user roles for team management
- Enable workspace admins to manage team membership

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/workspaces/:workspace_id/members`
- **URL Parameters:**
  - `workspace_id` (UUID, required): The ID of the workspace whose members to retrieve
- **Query Parameters:** None
- **Request Headers:**
  - `Authorization: Bearer <token>` (required) - JWT token from Supabase Auth
- **Request Body:** None

## 3. Response Details

### Success Response (200 OK)

**Response Type:** `WorkspaceMemberWithProfileDto[]`

**Structure:**
```json
[
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "workspace_id": "660e8400-e29b-41d4-a716-446655440001",
    "role": "owner",
    "joined_at": "2023-10-27T10:00:00Z",
    "profile": {
      "email": "user@example.com",
      "full_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  },
  {
    "user_id": "770e8400-e29b-41d4-a716-446655440002",
    "workspace_id": "660e8400-e29b-41d4-a716-446655440001",
    "role": "admin",
    "joined_at": "2023-10-28T11:00:00Z",
    "profile": {
      "email": "admin@example.com",
      "full_name": "Jane Admin",
      "avatar_url": null
    }
  }
]
```

### Error Responses

| Status Code | Error Message (Polish) | Description |
|-------------|------------------------|-------------|
| 400 Bad Request | `{ "error": "Nieprawidłowy format ID workspace" }` | The workspace_id parameter is not a valid UUID |
| 401 Unauthorized | `{ "error": "Brak autoryzacji" }` | User is not authenticated or token is invalid/expired |
| 404 Not Found | `{ "error": "Workspace nie został znaleziony" }` | Workspace doesn't exist OR user is not a member (security: don't reveal which) |
| 500 Internal Server Error | `{ "error": "Nie udało się pobrać członków workspace" }` | Database query failed or unexpected error occurred |

## 4. Types Used

### Required DTOs (from src/types.ts)

**Already Defined:**
```typescript
// Line 36-37: Basic workspace member data
export type WorkspaceMemberDto = Tables<"workspace_members">;

// Line 49-55: Extended member info with profile (MAIN RESPONSE TYPE)
export interface WorkspaceMemberWithProfileDto extends WorkspaceMemberDto {
  profile: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Line 43: User role enum
export type UserRole = Enums<"user_role">; // 'owner' | 'admin' | 'member' | 'read_only'

// Line 279-283: Error response structure
export interface ErrorResponse {
  error: string;
  details?: unknown;
}
```

**Type Mapping:**
- API Response: `WorkspaceMemberWithProfileDto[]`
- Error Response: `ErrorResponse`

## 5. Data Flow

```
1. Client Request
   ↓ (GET /api/workspaces/:workspace_id/members with Bearer token)
2. Astro API Route Handler
   ↓ (Extract workspace_id, validate UUID format with Zod)
3. Middleware (automatic)
   ↓ (Inject Supabase client into locals)
4. Authentication Check
   ↓ (Verify JWT token via supabase.auth.getUser())
5. Service Layer: getWorkspaceMembers()
   ↓ (Query workspace_members joined with profiles)
6. Database (PostgreSQL + RLS)
   ├─ Verify workspace exists
   ├─ Enforce RLS: is_workspace_member(workspace_id)
   └─ Join workspace_members with profiles table
7. Service Layer
   ↓ (Transform data to WorkspaceMemberWithProfileDto[])
8. API Route Handler
   ↓ (Return JSON response with 200 status)
9. Client receives member list
```

### Database Query Pattern

The service will execute a Supabase query similar to:

```typescript
const { data, error } = await supabase
  .from("workspace_members")
  .select(`
    user_id,
    workspace_id,
    role,
    joined_at,
    profile:profiles!user_id (
      email,
      full_name,
      avatar_url
    )
  `)
  .eq("workspace_id", workspaceId);
```

**RLS Enforcement:**
- Automatic through `is_workspace_member(workspace_id)` policy on `workspace_members` table
- If user not a member, query returns empty result (handled as 404)

## 6. Security Considerations

### Authentication & Authorization

**Authentication Flow:**
1. Middleware injects Supabase client into `locals.supabase`
2. API route calls `supabase.auth.getUser()` to verify JWT token
3. If invalid/expired token → 401 "Brak autoryzacji"
4. User ID extracted from validated token

**Authorization Checks:**
1. **URL Parameter Validation:** UUID format check prevents injection attacks
2. **Workspace Membership:** RLS policies enforce `is_workspace_member(workspace_id)` at database level
3. **Explicit Service Check:** Service layer verifies workspace exists and user has access
4. **Deny by Default:** Any RLS violation returns empty result → 404 response

### Security Threats & Mitigations

| Threat | Attack Vector | Mitigation |
|--------|---------------|------------|
| **IDOR (Insecure Direct Object Reference)** | User manipulates workspace_id to view other workspaces | RLS policy + service layer membership check |
| **Information Disclosure** | Exposing email addresses of users in other workspaces | Only return data if requester is workspace member |
| **SQL Injection** | Malicious workspace_id parameter | Zod UUID validation + Supabase parameterized queries |
| **JWT Token Replay/Tampering** | Stolen or modified authentication tokens | Supabase Auth validates JWT signature and expiration |
| **Enumeration Attack** | Attacker guesses workspace UUIDs to map organizations | Return 404 for both "doesn't exist" and "no access" (don't reveal which) |

### RLS Policy Logic

The `workspace_members` table has RLS enabled with policy:

```sql
-- Simplified representation
CREATE POLICY workspace_members_select ON workspace_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = workspace_members.workspace_id
    )
  );
```

This ensures users can ONLY query workspace_members rows for workspaces they belong to.

## 7. Error Handling

### Error Scenarios & Handling

**1. Invalid UUID Format (400 Bad Request)**
```typescript
// Zod validation fails
workspace_id: z.string().uuid("Nieprawidłowy format ID workspace")
→ Return 400 with Polish error message: "Nieprawidłowy format ID workspace"
```

**2. Unauthenticated User (401 Unauthorized)**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  → Return 401 with Polish error message: "Brak autoryzacji"
}
```

**3. Workspace Not Found / No Access (404 Not Found)**
```typescript
// Service layer receives empty result from database
// Could be because:
// - Workspace doesn't exist
// - User is not a member (RLS blocked query)
→ Return 404 with Polish error message: "Workspace nie został znaleziony"
```

**4. Database Query Error (500 Internal Server Error)**
```typescript
// Supabase query returns error object
if (error) {
  console.error("Database error:", error);
  → Return 500 with Polish error message: "Nie udało się pobrać członków workspace"
}
```

### Error Logging Strategy

**Log to Console:**
- All 500 errors with full error details
- Workspace ID and user ID for audit trail
- Database error messages for debugging

**Example Log Format:**
```typescript
console.error("GET /api/workspaces/:workspace_id/members - Błąd:", {
  workspaceId: workspace_id,
  userId: user.id,
  error: error instanceof Error ? error.message : "Nieznany błąd",
  timestamp: new Date().toISOString(),
});
```

**Do NOT Log:**
- Returned member email addresses (sensitive data)
- Full JWT tokens
- User passwords or credentials

## 8. Performance Considerations

### Database Query Optimization

**1. Indexed Columns:**
- `workspace_members.workspace_id` - Primary key component, indexed
- `workspace_members.user_id` - Primary key component, indexed
- `profiles.id` - Primary key, indexed

**2. Query Efficiency:**
- Single JOIN operation between workspace_members and profiles
- RLS policies use indexed columns (workspace_id, user_id)
- No full table scans required

**3. Expected Load:**
- Typical workspace: 1-50 members
- Large workspace: up to 200 members
- Query execution: < 50ms for typical workspace

### Potential Bottlenecks

**Issue:** Large workspaces (100+ members) may cause slow response times

**Mitigation (Future Enhancement):**
- Implement pagination with limit/offset query parameters
- Add caching layer for frequently accessed workspaces
- Consider materialized view for workspaces with 500+ members

**Current Implementation:**
- No pagination (retrieve all members)
- Acceptable for MVP with expected workspace sizes

## 9. Implementation Steps

### Step 1: Create Service Function

**File:** `src/lib/services/workspace.service.ts`

**Add Function:**
```typescript
/**
 * Retrieves all members of a workspace with their profile information.
 *
 * RLS policies automatically enforce that only workspace members can
 * view the member list. If user is not a member, query returns empty.
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace
 * @returns Array of workspace members with profiles
 * @throws NotFoundError if workspace doesn't exist or user lacks access
 * @throws Error for database errors
 */
export async function getWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceMemberWithProfileDto[]>
```

**Implementation Requirements:**
1. Query `workspace_members` table with JOIN to `profiles`
2. Filter by `workspace_id`
3. Select: `user_id`, `workspace_id`, `role`, `joined_at`, and nested `profile` data
4. Handle RLS enforcement (empty result → throw NotFoundError with Polish message)
5. Transform Supabase response to `WorkspaceMemberWithProfileDto[]`
6. Sort by `joined_at` ascending (owner first, then chronological)

**Error Cases:**
- Supabase query error → throw Error with Polish message: "Nie udało się pobrać członków workspace"
- Empty result (workspace not found or no access) → throw NotFoundError with Polish message: "Workspace nie został znaleziony"
- Invalid data format → throw Error

### Step 2: Create Validation Schema

**File:** `src/pages/api/workspaces/[workspace_id]/members.ts` (new file)

**Zod Schema:**
```typescript
import { z } from "zod";

/**
 * Validates workspace_id URL parameter
 */
const paramsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID workspace"),
});
```

### Step 3: Create API Route Handler

**File:** `src/pages/api/workspaces/[workspace_id]/members.ts`

**Structure:**
```typescript
import type { APIRoute } from "astro";
import { z, ZodError } from "zod";
import { getWorkspaceMembers, NotFoundError } from "@/lib/services/workspace.service";
import type { ErrorResponse, WorkspaceMemberWithProfileDto } from "@/types";

export const prerender = false;

// Validation schema (from Step 2)

/**
 * GET /api/workspaces/:workspace_id/members
 * Retrieves all members of a workspace with profile information.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Validate path parameters
    // 2. Get Supabase client from locals
    // 3. Verify authentication
    // 4. Call service layer
    // 5. Return success response
  } catch (error) {
    // Handle specific error types:
    // - NotFoundError → 404
    // - ZodError → 400
    // - Generic Error → 500
  }
};
```

**Implementation Flow:**
1. Extract `params.workspace_id`
2. Validate with Zod schema (return 400 with Polish message if invalid)
3. Get `locals.supabase` client
4. Call `await supabase.auth.getUser()` (return 401 with Polish message if fails)
5. Call `await getWorkspaceMembers(supabase, workspace_id)`
6. Return JSON response with 200 status
7. Catch errors and map to appropriate status codes with Polish messages

### Step 4: Implement Error Handling

**Error Mapping (with Polish error messages):**
```typescript
catch (error) {
  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({ error: "Workspace nie został znaleziony" } as ErrorResponse),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        error: "Błąd walidacji",
        details: error.format()
      } as ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  console.error("GET /api/workspaces/:workspace_id/members - Błąd:", {
    workspaceId: params.workspace_id,
    error: error instanceof Error ? error.message : "Nieznany błąd",
  });

  return new Response(
    JSON.stringify({ error: "Nie udało się pobrać członków workspace" } as ErrorResponse),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Step 5: Add Custom Error Class (if needed)

**File:** `src/lib/services/workspace.service.ts`

**Check if NotFoundError exists:**
- If already defined in `location.service.ts`, import and reuse
- If not, define in workspace.service.ts:

```typescript
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
```

### Step 6: Test Implementation

**Manual Testing Scenarios:**

1. **Happy Path:** Authenticated user requests members of workspace they belong to
   - Expected: 200 OK with array of members

2. **Invalid UUID:** Request with malformed workspace_id
   - Expected: 400 Bad Request with Polish message: "Nieprawidłowy format ID workspace"

3. **Unauthenticated:** Request without Bearer token
   - Expected: 401 Unauthorized with Polish message: "Brak autoryzacji"

4. **Workspace Not Found:** Request with valid UUID that doesn't exist
   - Expected: 404 Not Found with Polish message: "Workspace nie został znaleziony"

5. **No Access:** Authenticated user requests members of workspace they don't belong to
   - Expected: 404 Not Found with Polish message: "Workspace nie został znaleziony"

6. **Empty Workspace:** Workspace with only owner (single member)
   - Expected: 200 OK with single-element array

**Testing Tools:**
- Postman or curl for API testing
- Supabase dashboard for database inspection
- Browser DevTools for network inspection

### Step 7: Documentation

**Update API Documentation:**
- Confirm implementation matches `.ai_docs/api-plan.md` specification
- Add any implementation notes or edge cases discovered

**Code Comments:**
- Document service function with JSDoc
- Add inline comments for complex RLS logic
- Explain security considerations in comments

## 10. Acceptance Criteria

✅ **Functional Requirements:**
- [ ] Endpoint returns all workspace members for authenticated user
- [ ] Response includes profile data (email, full_name, avatar_url)
- [ ] Members sorted by joined_at ascending (owner first)
- [ ] RLS policies enforce workspace membership
- [ ] Invalid UUID format returns 400 error with Polish message

✅ **Security Requirements:**
- [ ] Unauthenticated requests return 401 error with Polish message
- [ ] Users cannot view members of workspaces they don't belong to
- [ ] Workspace existence is not revealed to non-members (404 for both cases)
- [ ] SQL injection protected via Zod validation and parameterized queries

✅ **Code Quality:**
- [ ] Service function has error handling for all failure cases with Polish messages
- [ ] API route follows project patterns (uppercase GET, prerender: false)
- [ ] Error responses use ErrorResponse type from src/types.ts
- [ ] Console logging for 500 errors with audit trail
- [ ] No sensitive data (passwords, full tokens) logged

✅ **Performance:**
- [ ] Single database query with JOIN (no N+1 queries)
- [ ] Response time < 100ms for typical workspaces (< 50 members)
- [ ] Indexed columns used for filtering and joining

## 11. Files to Create/Modify

### New Files

1. **`src/pages/api/workspaces/[workspace_id]/members.ts`**
   - API route handler with GET method
   - Validation and error handling with Polish error messages

### Modified Files

1. **`src/lib/services/workspace.service.ts`**
   - Add `getWorkspaceMembers()` function
   - Add `NotFoundError` class (if not already present)
   - Use Polish error messages in thrown errors

### Reference Files (No Changes)

- `src/types.ts` - Types already defined
- `.ai_docs/api-plan.md` - Specification reference
- `.ai_docs/db-plan.md` - Database schema reference

## 12. Polish Error Messages Reference

**Complete list of error messages to use:**

| Scenario | HTTP Status | Polish Error Message |
|----------|-------------|---------------------|
| Invalid workspace_id format | 400 | `"Nieprawidłowy format ID workspace"` |
| Validation error (generic) | 400 | `"Błąd walidacji"` |
| Unauthenticated user | 401 | `"Brak autoryzacji"` |
| Workspace not found / No access | 404 | `"Workspace nie został znaleziony"` |
| Database error | 500 | `"Nie udało się pobrać członków workspace"` |

**Console log messages (can be mixed Polish/English):**
- `"GET /api/workspaces/:workspace_id/members - Błąd:"`
- Error details: `"Nieznany błąd"` for unknown errors

## 13. Future Enhancements

**Not in Scope for Initial Implementation:**

1. **Pagination:** Add `limit` and `offset` query parameters
2. **Filtering:** Add `role` filter to show only owners/admins
3. **Sorting:** Add `sort_by` parameter (joined_at, email, full_name)
4. **Caching:** Redis cache for frequently accessed workspaces
5. **Search:** Full-text search across member names and emails
6. **Response Optimization:** Field selection (only return needed fields)

**These can be added later based on user feedback and performance metrics.**
