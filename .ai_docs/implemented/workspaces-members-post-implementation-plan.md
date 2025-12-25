# API Endpoint Implementation Plan: POST /api/workspaces/:workspace_id/members

## 1. Endpoint Overview

The POST /api/workspaces/:workspace_id/members endpoint enables workspace owners and admins to invite new members to their workspace. The endpoint validates the inviter's permissions, checks email validity, verifies the user exists in the system, and prevents duplicate memberships. Upon success, a new workspace membership record is created and returned with complete profile information.

This endpoint is critical for multi-tenant collaboration, allowing authorized users to grow their workspace teams while maintaining security through role-based access control.

---

## 2. Request Details

**HTTP Method:** POST

**URL Pattern:** `/api/workspaces/:workspace_id/members`

**URL Parameters:**

- `workspace_id` (UUID, required): The ID of the workspace to add a member to. Must be a valid UUID format.

**Request Headers:**

- `Authorization: Bearer <JWT_TOKEN>` (required): Valid Supabase JWT token for authenticated user
- `Content-Type: application/json` (required)

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

**Parameters:**

- **Required:**
  - `email` (string): Email address of the user to invite. Must be a valid email format. User with this email must already exist in the system (profiles table).
  - `role` (UserRole enum): The role to assign to the new member. Valid values: `'owner'`, `'admin'`, `'member'`, `'read_only'`

- **Optional:** None

---

## 3. Types and DTOs

### Existing Types (already defined in src/types.ts)

```typescript
// Request payload type (already exists)
interface InviteWorkspaceMemberRequest {
  email: string;
  role: UserRole;
}

// Response type (reuse existing)
interface WorkspaceMemberDto extends Tables<"workspace_members"> {
  // Base type from database
  workspace_id: UUID;
  user_id: UUID;
  role: UserRole;
  joined_at: TIMESTAMPTZ;
}

// Extended response with profile (already exists)
interface WorkspaceMemberWithProfileDto extends WorkspaceMemberDto {
  profile: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}
```

### Zod Validation Schemas (to create)

Create validation schemas for:

1. **URL Parameter Validation:** workspace_id must be valid UUID
2. **Request Body Validation:** email format and role enum values
3. Use existing enum values from UserRole type

---

## 4. Response Details

### Success Response (201 Created)

```json
{
  "user_id": "uuid",
  "workspace_id": "uuid",
  "role": "member",
  "joined_at": "2023-10-27T11:00:00Z"
}
```

**Status Code:** 201 Created

**Response Properties:**

- `user_id` (UUID): ID of the invited user
- `workspace_id` (UUID): ID of the workspace
- `role` (UserRole): The assigned role
- `joined_at` (ISO8601 timestamp): When the membership was created

### Error Responses

| Status | Error Type            | Scenario                                             | Polish Error Message                               |
| ------ | --------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| 400    | Bad Request           | Invalid email format, missing fields, invalid role   | `"Błąd walidacji"` with `details` object           |
| 401    | Unauthorized          | No valid JWT token or user not authenticated         | `"Brak autoryzacji"`                               |
| 403    | Forbidden             | Current user is not owner/admin in workspace         | `"Brak uprawnień do zaproszenia członka"`          |
| 404    | Not Found             | Workspace doesn't exist OR user with email not found | `"Użytkownik nie został znaleziony"`               |
| 409    | Conflict              | User already a member of this workspace              | `"Użytkownik jest już członkiem tego workspace'u"` |
| 500    | Internal Server Error | Database operation failed                            | `"Nie udało się dodać członka do workspace"`       |

---

## 5. Data Flow

```
Client Request (POST /api/workspaces/:workspace_id/members)
    ↓
1. Validate JWT token & extract user
    ↓
2. Validate URL parameters (workspace_id UUID format)
    ↓
3. Validate request body (email format, role enum)
    ↓
4. Query: Check current user's role in workspace (SELECT role FROM workspace_members)
    ↓
5. Verify: Current user has 'owner' or 'admin' role (401/403 error if not)
    ↓
6. Query: Check if user with email exists (SELECT id FROM profiles WHERE email = ?)
    ↓
7. Verify: User exists (404 error if not)
    ↓
8. Query: Check if user already member of workspace
    ↓
9. Verify: Not already member (409 error if duplicate)
    ↓
10. Insert: Create workspace_members record with (workspace_id, user_id, role, joined_at=NOW())
    ↓
11. Query: Fetch created record with joined profile data
    ↓
12. Return: 201 Created with WorkspaceMemberWithProfileDto
    ↓
13. Log: Success/failure for audit trail
```

---

## 6. Security Considerations

### Authentication

- **Requirement:** Valid JWT token in Authorization header
- **Enforcement:** Middleware validates and attaches user to context.locals
- **Error Response:** 401 Unauthorized with Polish message "Brak autoryzacji"

### Authorization (Role-Based Access Control)

- **Rule:** Only workspace owners and admins can invite new members
- **Enforcement:** Query workspace_members to verify current user's role
- **Error Response:** 403 Forbidden with Polish message "Brak uprawnień do zaproszenia członka"
- **Query:** `SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ? LIMIT 1`

### Row Level Security (RLS)

- **Policy:** workspace_members table has RLS enabled
- **Effect:** Query results automatically filtered by workspace membership
- **Benefit:** Double-layer security (application + database)

### Data Validation

- **Email Format:** Use email regex validation (Zod email type)
- **Role Validation:** Enum check against user_role type values
- **UUID Format:** Validate workspace_id is valid UUID

### Data Integrity

- **Foreign Key Constraints:** Database enforces profiles.id exists
- **Unique Constraint:** workspace_members (workspace_id, user_id) is primary key - prevents duplicates
- **No Self-Assignment:** No explicit check needed, database constraints handle it

### Audit Logging

- **What to log:** User ID, workspace ID, invitee email, role assigned, timestamp, outcome
- **When to log:** Both success and error cases
- **Format:** Structured logging with consistent field names
- **Purpose:** Audit trail for compliance and security investigations

---

## 7. Error Handling & Validation

### Input Validation (Zod Schemas)

#### URL Parameters Schema

```typescript
const paramsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID workspace"),
});
```

#### Request Body Schema

```typescript
const bodySchema = z.object({
  email: z.string().email("Nieprawidłowy format email"),
  role: z.enum(["owner", "admin", "member", "read_only"], {
    errorMap: () => ({ message: "Nieprawidłowa rola" }),
  }),
});
```

### Business Logic Validation

1. **Authentication Check** (401)
   - Verify JWT token via context.locals.supabase.auth.getUser()
   - Return 401 with Polish message: "Brak autoryzacji"

2. **Workspace Access & Permission Check** (403)
   - Query: `SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?`
   - Verify role is 'owner' or 'admin'
   - Return 403 if user lacks permission with Polish message: "Brak uprawnień do zaproszenia członka"

3. **User Existence Check** (404)
   - Query: `SELECT id FROM profiles WHERE email = ?`
   - Verify at least one record found
   - Return 404 if user not found with Polish message: "Użytkownik nie został znaleziony"

4. **Duplicate Membership Check** (409)
   - Insert attempt will trigger unique constraint error
   - Catch constraint error and return 409 with Polish message: "Użytkownik jest już członkiem tego workspace'u"

5. **Workspace Existence Check** (404)
   - Implicit: RLS policies and foreign key constraints handle this
   - If workspace doesn't exist or user lacks access, operation fails

### Error Logging

```typescript
// Log format for all error cases
console.error("POST /api/workspaces/:workspace_id/members - Błąd:", {
  workspaceId: workspace_id,
  inviteeEmail: email,
  currentUserId: user.id,
  errorType: "Insufficient permissions|Duplicate member|User not found|...",
  error: error.message,
  timestamp: new Date().toISOString(),
});

// Log format for success
console.info("POST /api/workspaces/:workspace_id/members - Sukces:", {
  workspaceId: workspace_id,
  invitedUserId: new_member.user_id,
  role: role,
  invitedByUserId: user.id,
  timestamp: new Date().toISOString(),
});
```

---

## 8. Performance Considerations

### Database Queries Optimization

1. **Query 1: Get Current User's Role** (required for authorization)
   - Index: Primary key on (workspace_id, user_id)
   - Expected: Single row return, very fast
   - Optimization: Use LIMIT 1 for early termination

2. **Query 2: Find User by Email** (required for user lookup)
   - Index: Primary key on profiles.id (email lookup via sequential scan if no index)
   - Optimization: Add index on profiles.email if not exists
   - Expected: Single row, but email lookups can be slow without index

3. **Query 3: Check Duplicate Membership** (required for conflict check)
   - Index: Primary key on (workspace_id, user_id)
   - Expected: 0 or 1 rows, will fail with unique constraint if duplicate
   - Optimization: Let database constraint handle this, no need for pre-check

4. **Query 4: Get Created Member with Profile** (required for response)
   - Join: workspace_members ← profiles
   - Index: Foreign key on user_id, primary key on profiles.id
   - Expected: Single row return
   - Optimization: Use select() with specific columns to reduce payload

### Potential Bottlenecks

1. **Email Lookup Performance:** If profiles table grows large, sequential email scans can slow down
   - Mitigation: Ensure database index on profiles.email column

2. **Multiple Round Trips:** 4+ database queries in sequence
   - Current design is acceptable for permission-critical operation
   - Security (verifying authorization first) outweighs performance optimization

### Optimization Opportunities (Future)

1. Combine role-check and permission verification into single query
2. Use Supabase RPC function to execute all checks in transaction
3. Cache workspace member roles if read-heavy workloads identified

---

## 9. Implementation Steps

### Step 1: Extend Service Layer (workspace.service.ts)

Create new service function `inviteWorkspaceMember()` with signature:

```typescript
export async function inviteWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  currentUserId: string,
  email: string,
  role: UserRole
): Promise<WorkspaceMemberWithProfileDto>;
```

**Implementation details:**

- Accept Supabase client, workspace ID, current user ID, email, and role
- Check current user's role in workspace (throw error with 403 status if not owner/admin)
- Look up user by email in profiles table (throw error with 404 status if not found)
- Insert new workspace_members record with (workspace_id, user_id, role)
- Fetch and return created member with joined profile data
- Throw appropriate errors for duplicate, permission denied, not found scenarios
- Log all operations (success and errors) with Polish messages

**Reuse patterns from:**

- getWorkspaceMembers() for role verification pattern
- createWorkspace() for insert and error handling pattern

### Step 2: Create Zod Validation Schemas

In the API route file, create schemas:

- `paramsSchema` for URL parameters (workspace_id)
- `bodySchema` for request body (email, role)

**Validation rules:**

- email: Zod email type (built-in validation) with Polish error message
- role: Zod enum with valid user_role values and Polish error message
- workspace_id: Zod uuid string with Polish error message

### Step 3: Implement POST Handler

In src/pages/api/workspaces/[workspace_id]/members.ts, add POST method:

```typescript
export const POST: APIRoute = async ({ params, request, locals }) => {
  // 1. Validate path parameters (Polish error messages)
  // 2. Verify authentication (401 with "Brak autoryzacji")
  // 3. Parse and validate request body (400 with "Błąd walidacji")
  // 4. Call service layer inviteWorkspaceMember()
  // 5. Return 201 Created with member data
  // 6. Handle errors with appropriate status codes and Polish messages
};
```

**Error handling:**

- ZodError → 400 Bad Request with "Błąd walidacji" and validation details
- Permission error → 403 Forbidden with "Brak uprawnień do zaproszenia członka"
- User not found → 404 Not Found with "Użytkownik nie został znaleziony"
- Duplicate member → 409 Conflict with "Użytkownik jest już członkiem tego workspace'u"
- Unexpected errors → 500 Internal Server Error with "Nie udało się dodać członka do workspace"

### Step 4: Add Unit/Integration Tests (Optional)

Consider testing:

- Valid invitation with owner role
- Valid invitation with admin role
- Invalid email format (400)
- Non-existent user (404)
- Non-existent workspace (404)
- Insufficient permissions (403)
- Duplicate membership (409)
- Unauthenticated request (401)

### Step 5: Lint and Format

Run code quality tools:

- `npm run lint` to check for issues
- `npm run lint:fix` to auto-fix issues
- `npm run format` to format code with Prettier

### Step 6: Testing & Verification

Manual testing checklist:

- [ ] Happy path: invite existing user with valid email and role
- [ ] Verify response contains user_id, workspace_id, role, joined_at
- [ ] Verify response status is 201 Created
- [ ] Test all error scenarios with appropriate status codes and Polish error messages
- [ ] Verify audit logging captures all events
- [ ] Test with different roles (owner, admin, member, read_only)

---

## 10. Implementation Order Summary

1. **Create inviteWorkspaceMember() service function** → workspace.service.ts
2. **Add POST handler** → src/pages/api/workspaces/[workspace_id]/members.ts
3. **Define Zod schemas** → Within POST handler file
4. **Test implementation** → Manual testing of all scenarios
5. **Lint and format code** → npm run lint:fix && npm run format
6. **Commit changes** → Include both service and API changes

---

## 11. Key Implementation Considerations

### Database Transactions

- Current implementation uses individual queries (no explicit transaction)
- Acceptable because unique constraint handles duplicate prevention
- If duplicate occurs, Supabase will return constraint error (handled as 409 Conflict)

### Error Messages

- Keep messages user-friendly in Polish (consistent with existing API)
- Include error details in server logs, not in response body
- For validation errors, include details object with field names
- Match error message style from existing endpoints (especially GET /members)

### User Invitation Logic

- Current implementation requires user to already exist in system
- Future enhancement: Send email invitation if user doesn't exist
- For now, return 404 with message: "Użytkownik nie został znaleziony"

### Role Assignment

- All four roles (owner, admin, member, read_only) are allowed
- No business logic prevents assigning owner role to new members
- If restriction needed, add validation in service layer

---

## 12. Related Code References

- **Existing GET Handler:** src/pages/api/workspaces/[workspace_id]/members.ts (lines 22-56)
- **Existing Service Functions:** src/lib/services/workspace.service.ts (lines 120-184)
- **Type Definitions:** src/types.ts (lines 36-71)
- **Error Handling Pattern:** src/pages/api/locations/[id].ts
- **Service Pattern:** src/lib/services/workspace.service.ts
- **Polish Error Messages:** Reference existing GET handler for consistency
