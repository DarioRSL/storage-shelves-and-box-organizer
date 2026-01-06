# API Endpoint Implementation Plan: GET /workspaces

## 1. Endpoint Overview

The `GET /workspaces` endpoint retrieves all workspaces that the authenticated user belongs to. This is a fundamental endpoint for the multi-tenant architecture, allowing users to see and switch between their available workspaces. The endpoint leverages PostgreSQL Row Level Security (RLS) and the `workspace_members` junction table to ensure users only see workspaces they have access to.

**Purpose**: List all workspaces associated with the currently authenticated user.

**Access Control**: Only authenticated users can access this endpoint. RLS policies automatically filter results to workspaces where the user is a member.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/workspaces`
- **Authentication**: Required (JWT Bearer token via Supabase Auth)
- **Headers**:
  - `Authorization: Bearer <jwt_token>` (handled by middleware)
- **Query Parameters**: None
- **Path Parameters**: None
- **Request Body**: None

## 3. Utilized Types

### Response Type

```typescript
// From src/types.ts:23
WorkspaceDto[]

// WorkspaceDto structure (from src/types.ts, mapped from Tables<"workspaces">):
{
  id: string;              // UUID
  owner_id: string;        // UUID of workspace owner
  name: string;            // Workspace name
  created_at: string | null;  // ISO timestamp
  updated_at: string | null;  // ISO timestamp
}
```

### Internal Types

```typescript
// From src/db/supabase.client.ts (DO NOT import from @supabase/supabase-js)
SupabaseClient;

// Context type (from Astro)
APIContext;
```

### Database Query Response Type

```typescript
// Query will select from workspaces joined with workspace_members
// Using Supabase client select with type inference
```

## 4. Response Details

### Success Response (200 OK)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "owner_id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "My Home Storage",
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-27T10:00:00Z"
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "owner_id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "Office Organization",
    "created_at": "2023-11-15T14:30:00Z",
    "updated_at": "2023-11-15T14:30:00Z"
  }
]
```

**Note**: An empty array `[]` is a valid success response if the user is not a member of any workspace.

### Error Responses

#### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "details": "User is not authenticated"
}
```

**Triggers**:

- No JWT token in Authorization header
- Invalid or expired JWT token
- User not found in `context.locals.user`

#### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "details": "Failed to retrieve workspaces"
}
```

**Triggers**:

- Database connection failure
- Unexpected Supabase client error
- Unhandled exception in service layer

## 5. Data Flow

### High-Level Flow

```
1. Client Request (with JWT token)
   ↓
2. Astro Middleware (validates session, attaches user to context.locals)
   ↓
3. GET Handler in /src/pages/api/workspaces/index.ts
   ↓
4. Authentication Check (context.locals.user exists?)
   ↓
5. Extract user_id from context.locals.user
   ↓
6. Call workspaceService.getUserWorkspaces(user_id, supabase)
   ↓
7. Service Layer: Query Database
   ↓
8. Supabase Query:
   SELECT workspaces.*
   FROM workspaces
   INNER JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
   WHERE workspace_members.user_id = <authenticated_user_id>
   ORDER BY workspaces.created_at DESC
   ↓
9. RLS Policies Applied (automatic via Supabase)
   ↓
10. Transform data to WorkspaceDto[] format
   ↓
11. Return Response (200 with data)
```

### Database Interaction

**Tables Involved**:

- `public.workspaces` (primary data source)
- `public.workspace_members` (junction table for filtering)

**Query Pattern**:

```typescript
const { data, error } = await supabase
  .from("workspaces")
  .select("*")
  .eq("workspace_members.user_id", userId)
  .order("created_at", { ascending: false });
```

**Alternative Query Pattern** (more explicit):

```typescript
const { data, error } = await supabase
  .from("workspace_members")
  .select(
    `
    workspace:workspaces(*)
  `
  )
  .eq("user_id", userId);
```

**RLS Policy Enforcement**:

- Supabase automatically applies RLS policies based on JWT user context
- Only workspaces where user is a member will be returned
- No additional authorization checks needed in application code

## 6. Security Considerations

### Authentication

- **JWT Validation**: Handled by Astro middleware (`src/middleware/index.ts`)
- **User Context**: Middleware sets `context.locals.user` and `context.locals.supabase`
- **Token Source**: `Authorization: Bearer <token>` header

### Authorization

- **RLS Policies**: PostgreSQL Row Level Security enforces workspace membership
- **Helper Function**: `is_workspace_member(workspace_id)` validates access
- **Automatic Filtering**: Users can only see workspaces they belong to

### Data Exposure Prevention

- Only return workspace metadata (id, name, owner_id, timestamps)
- No sensitive user data in workspace objects
- Owner email/profile not included (available via separate endpoints if needed)

### SQL Injection Protection

- Using Supabase client parameterized queries
- No raw SQL construction
- Type-safe query builders

### Input Validation

- No user input to validate (no query params or body)
- User ID extracted from authenticated context (trusted source)

### Rate Limiting

- Consider implementing rate limiting at API gateway level
- Not critical for read-only endpoint with minimal data

## 7. Error Handling

### Error Scenarios and Handling

| Scenario                  | Status Code | Response                                       | Handler Logic                                              |
| ------------------------- | ----------- | ---------------------------------------------- | ---------------------------------------------------------- |
| User not authenticated    | 401         | `{ "error": "Unauthorized" }`                  | Check `context.locals.user` at handler start, early return |
| Invalid/expired token     | 401         | `{ "error": "Unauthorized" }`                  | Middleware validation failure, caught before handler       |
| Database connection error | 500         | `{ "error": "Internal Server Error" }`         | Catch Supabase error, log details, return generic message  |
| User has no workspaces    | 200         | `[]` (empty array)                             | Valid success case, no error handling needed               |
| Supabase query error      | 500         | `{ "error": "Failed to retrieve workspaces" }` | Catch in service layer, log error, re-throw with context   |

### Error Handling Pattern

```typescript
// In API route handler
try {
  // 1. Early authentication check
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized", details: "User is not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Call service layer (wrapped in try-catch)
  const workspaces = await workspaceService.getUserWorkspaces(context.locals.user.id, context.locals.supabase);

  // 3. Success response
  return new Response(JSON.stringify(workspaces), { status: 200, headers: { "Content-Type": "application/json" } });
} catch (error) {
  // 4. Log error for debugging
  console.error("Error fetching workspaces:", error);

  // 5. Return generic error to client
  return new Response(
    JSON.stringify({
      error: "Internal Server Error",
      details: "Failed to retrieve workspaces",
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Logging Strategy

- Log authentication failures (with user ID if available)
- Log database errors with full error object
- Log unexpected exceptions with stack trace
- Do not log sensitive data (tokens, passwords)

## 8. Performance Considerations

### Query Optimization

- **Indexed Columns**: Foreign keys (`workspace_id`, `user_id`) are automatically indexed
- **Join Performance**: Simple join on indexed columns is efficient
- **Result Set Size**: Typically small (users belong to 1-10 workspaces)
- **No Pagination Needed**: Small dataset doesn't require pagination

### Caching Strategy

- **Consider caching**: Workspace membership changes infrequently
- **Cache Key**: `user:{user_id}:workspaces`
- **TTL**: 5-15 minutes
- **Invalidation**: On workspace creation, member add/remove
- **Implementation**: Optional, can be added later if needed

### Database Connection Pooling

- Handled by Supabase client
- Connection reuse across requests
- No manual connection management needed

### Response Size

- Minimal data per workspace (~200 bytes)
- Typical response: <2KB for most users
- No compression needed

### Monitoring Metrics

- Track endpoint latency (should be <100ms)
- Monitor error rates (should be <1%)
- Track empty result frequency (indicates onboarding issues)

## 9. Implementation Steps

### Step 1: Create Workspace Service

**File**: `src/lib/services/workspaceService.ts`

**Tasks**:

1. Create new service file if it doesn't exist
2. Import `SupabaseClient` type from `src/db/supabase.client.ts`
3. Import `WorkspaceDto` type from `src/types.ts`
4. Implement `getUserWorkspaces` function:
   ```typescript
   export async function getUserWorkspaces(userId: string, supabase: SupabaseClient): Promise<WorkspaceDto[]>;
   ```
5. Query workspaces joined with workspace_members
6. Filter by user_id
7. Order by created_at DESC
8. Handle errors and throw with context
9. Return typed array of WorkspaceDto

**Acceptance Criteria**:

- Function signature matches types
- Returns properly typed WorkspaceDto[]
- Throws errors with descriptive messages
- Query uses proper join syntax

### Step 2: Create API Route Handler

**File**: `src/pages/api/workspaces/index.ts`

**Tasks**:

1. Create file with Astro API route structure
2. Add `export const prerender = false` to disable static rendering
3. Implement `export async function GET(context: APIContext)`
4. Extract user from `context.locals.user`
5. Early return 401 if user not authenticated
6. Extract Supabase client from `context.locals.supabase`
7. Call `workspaceService.getUserWorkspaces(userId, supabase)`
8. Wrap in try-catch for error handling
9. Return success response with workspaces array
10. Handle errors with appropriate status codes

**Acceptance Criteria**:

- Uses uppercase GET handler
- Disables prerendering
- Returns proper Response objects
- Sets Content-Type headers
- Implements error handling

### Step 3: Verify Middleware Configuration

**File**: `src/middleware/index.ts`

**Tasks**:

1. Verify middleware exists and is properly configured
2. Confirm it validates Supabase session
3. Confirm it sets `context.locals.user`
4. Confirm it sets `context.locals.supabase` with user context
5. Verify it runs before API routes

**Acceptance Criteria**:

- Middleware properly attached to context
- User and Supabase client available in routes
- JWT token validation working

### Step 4: Add TypeScript Types (if needed)

**File**: `src/types.ts`

**Tasks**:

1. Verify `WorkspaceDto` type exists (line 23)
2. Verify it extends `Tables<"workspaces">`
3. No changes needed if types already exist

**Acceptance Criteria**:

- WorkspaceDto properly typed
- Matches database schema

### Step 5: Test Database Query

**Environment**: Local Supabase instance or development database

**Tasks**:

1. Test query in Supabase SQL Editor:
   ```sql
   SELECT w.*
   FROM workspaces w
   INNER JOIN workspace_members wm ON w.id = wm.workspace_id
   WHERE wm.user_id = '<test-user-uuid>'
   ORDER BY w.created_at DESC;
   ```
2. Verify results match expected workspaces
3. Verify RLS policies don't block query
4. Test with user who has no workspaces (should return empty)
5. Test with user who has multiple workspaces

**Acceptance Criteria**:

- Query returns correct workspaces
- RLS policies properly applied
- Performance acceptable (<50ms)

### Step 6: Manual API Testing

**Tools**: curl, Postman, or similar

**Test Cases**:

1. **Authenticated User with Workspaces**:

   ```bash
   curl -X GET http://localhost:3000/api/workspaces \
     -H "Authorization: Bearer <valid-jwt-token>"
   ```

   - Expected: 200 with array of workspaces

2. **Authenticated User with No Workspaces**:

   ```bash
   curl -X GET http://localhost:3000/api/workspaces \
     -H "Authorization: Bearer <valid-jwt-token-no-workspaces>"
   ```

   - Expected: 200 with empty array `[]`

3. **Unauthenticated Request**:

   ```bash
   curl -X GET http://localhost:3000/api/workspaces
   ```

   - Expected: 401 Unauthorized

4. **Invalid Token**:

   ```bash
   curl -X GET http://localhost:3000/api/workspaces \
     -H "Authorization: Bearer invalid-token"
   ```

   - Expected: 401 Unauthorized

**Acceptance Criteria**:

- All test cases return expected status codes
- Response bodies match expected format
- Error messages are user-friendly

### Step 7: Code Quality Checks

**Tasks**:

1. Run `npm run lint` to check for linting issues
2. Run `npm run format` to format code with Prettier
3. Review code for compliance with guidelines:
   - Early returns for error cases
   - Happy path last
   - Proper error handling
   - Type safety
   - No hardcoded values
4. Add inline comments for complex logic (if any)
5. Ensure no console.log statements in production code

**Acceptance Criteria**:

- No linting errors
- Code formatted consistently
- Follows project guidelines
- Code is readable and maintainable

### Step 8: Documentation

**Tasks**:

1. Add JSDoc comments to service functions
2. Document expected behavior in comments
3. Note any assumptions or limitations
4. Update this implementation plan with any deviations

**Acceptance Criteria**:

- Service functions have JSDoc comments
- Complex logic is explained
- Edge cases documented

### Step 9: Integration Testing

**Tasks**:

1. Test endpoint in full application flow
2. Verify middleware integration
3. Test from frontend (if available)
4. Verify workspace switching works
5. Test with different user roles
6. Verify RLS policies work correctly

**Acceptance Criteria**:

- Endpoint works in full app context
- No integration issues
- User experience is smooth

### Step 10: Performance Testing

**Tasks**:

1. Test with users having many workspaces (10+)
2. Measure response times
3. Verify database query performance
4. Check for N+1 query issues
5. Monitor memory usage

**Acceptance Criteria**:

- Response time <100ms for typical case
- No performance degradation with more workspaces
- No memory leaks

## 10. Verification Checklist

Before marking this endpoint as complete, verify:

- [x] Service layer implemented in `src/lib/services/workspace.service.ts`
- [x] API route handler created in `src/pages/api/workspaces.ts` (GET handler added)
- [x] Middleware configuration verified
- [x] Types properly imported and used
- [x] Authentication check implemented
- [x] Error handling implemented with proper status codes
- [x] Database query returns correct results
- [x] RLS policies enforced correctly
- [x] All manual test cases pass (Test Cases 1-5)
- [x] Linting and formatting passes (0 errors, 7 warnings for console.error which is acceptable)
- [x] Code follows project guidelines
- [x] Documentation complete (JSDoc comments added)
- [x] Integration tests pass (middleware integration verified)
- [x] Performance acceptable (quick response times observed in testing)

## Implementation Notes

### Deviations from Original Plan

1. **File Location**: Instead of creating a separate `src/pages/api/workspaces/index.ts`, the GET handler was added to the existing `src/pages/api/workspaces.ts` file alongside the POST handler. This follows RESTful conventions where multiple HTTP methods for the same resource are in one file.

2. **Sorting Implementation**: The original plan suggested using Supabase's `.order()` with `referencedTable` parameter. However, this didn't work reliably with nested relations, so sorting was implemented in JavaScript using `.sort()` after data transformation. This ensures correct descending order (newest first).

3. **Default Workspace**: During testing, it was discovered that a database trigger automatically creates a default workspace "My Workspace" when a new user signs up. This is expected behavior from the `add_owner_to_workspace_members()` trigger.

### Key Implementation Details

- **Authentication**: Uses `supabase.auth.getUser()` to verify JWT token
- **Data Fetching**: Joins `workspace_members` with `workspaces` using Supabase's nested select syntax
- **Sorting**: Client-side sorting by `created_at` DESC (newest first)
- **Error Handling**: Returns 401 for unauthenticated users, 500 for server errors
- **Empty Results**: Returns empty array `[]` for users with no workspaces (valid 200 response)

### Test Results Summary

All test cases passed successfully:

- ✅ Test Case 1: Authenticated user with workspaces (200, WorkspaceDto[])
- ✅ Test Case 2: Authenticated user with no workspaces (200, [])
- ✅ Test Case 3: Unauthenticated request (401, ErrorResponse)
- ✅ Test Case 4: Invalid JWT token (401, ErrorResponse)
- ✅ Test Case 5: Response headers verification (Content-Type: application/json)

**Implementation Date**: December 15, 2025
**Status**: ✅ COMPLETE

## 11. Future Enhancements

Consider these enhancements for future iterations:

1. **Caching**: Implement Redis/in-memory cache for workspace lists
2. **Pagination**: Add pagination if users can belong to many workspaces
3. **Filtering**: Add query params to filter by workspace name
4. **Sorting**: Add query params for custom sorting options
5. **Rich Response**: Include member count, box count per workspace
6. **WebSocket**: Real-time updates when workspace membership changes
7. **Rate Limiting**: Add rate limiting for API protection
8. **Monitoring**: Add detailed logging and monitoring
