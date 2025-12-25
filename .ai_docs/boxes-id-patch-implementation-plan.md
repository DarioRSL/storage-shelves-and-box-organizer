# API Endpoint Implementation Plan: PATCH /api/boxes/:id

## 1. Endpoint Overview

The PATCH /api/boxes/:id endpoint updates an existing box's details, including its name, description, tags, and location assignment. This is a partial update endpoint that allows clients to modify only the fields they need to change. The endpoint supports moving boxes between locations or unassigning them from locations entirely by setting `location_id` to null.

**Key Features:**
- Partial updates (only specified fields are modified)
- Location reassignment with workspace validation
- Automatic search vector update (via database trigger)
- Row Level Security enforcement for workspace-based access control

## 2. Request Details

### HTTP Method
PATCH

### URL Structure
```
PATCH /api/boxes/:id
```

### URL Parameters
- **id** (required): UUID of the box to update
  - Format: Valid UUID v4
  - Example: `b1b48d97-501c-4709-bd7b-d96519721367`

### Request Headers
- `Authorization: Bearer <JWT_TOKEN>` (required)
- `Content-Type: application/json` (required)

### Request Body
All fields are optional, but at least one field must be provided.

```json
{
  "name": "Updated Box Name",
  "description": "Updated description text",
  "tags": ["tag1", "tag2", "tag3"],
  "location_id": "73316c0a-8a91-4488-bac2-4d8defdd7206"
}
```

**Field Specifications:**
- `name` (string, optional): Updated box name
  - Constraints: Non-empty string after trimming, min length 1
  - Example: `"Winter Clothes 2024"`

- `description` (string, optional): Updated box description
  - Constraints: Max 10,000 characters
  - Can be set to null or empty string to clear
  - Example: `"Contains jackets, scarves, and winter accessories"`

- `tags` (string[], optional): Updated tags array
  - Constraints: Array of strings
  - Can be set to null or empty array to clear
  - Example: `["winter", "clothes", "seasonal"]`

- `location_id` (string | null, optional): New location UUID
  - Constraints: Valid UUID or null
  - Setting to null unassigns the box from its location
  - Example: `"73316c0a-8a91-4488-bac2-4d8defdd7206"` or `null`

### Request Body Validation Rules
1. At least one field must be present in the request body
2. If `name` is provided, it must be a non-empty string after trimming
3. If `description` is provided, it must not exceed 10,000 characters
4. If `tags` is provided, it must be an array of strings
5. If `location_id` is provided, it must be a valid UUID or null

## 3. Types Used

### DTOs and Request/Response Types

**Request Type** (already defined in `src/types.ts`):
```typescript
export type UpdateBoxRequest = Partial<Pick<Tables<"boxes">, "name" | "description" | "tags" | "location_id">>;
```

**Response Type** (already defined in `src/types.ts`):
```typescript
export interface UpdateBoxResponse {
  id: string;
  name: string;
  updated_at: string | null;
}
```

**Error Response Type** (already defined in `src/types.ts`):
```typescript
export interface ErrorResponse {
  error: string;
  details?: unknown;
}
```

### Validation Schemas (to be created)

**File**: `src/lib/validators/box.validators.ts`

**UpdateBoxParamsSchema** - Validates URL parameter:
```typescript
export const UpdateBoxParamsSchema = z.object({
  id: z.string().uuid("Nieprawidłowy format ID pudełka"),
});
```

**UpdateBoxSchema** - Validates request body:
```typescript
export const UpdateBoxSchema = z.object({
  name: z.string().min(1, "Nazwa pudełka nie może być pusta").trim().optional(),
  description: z
    .string()
    .max(
      ValidationRules.boxes.MAX_DESCRIPTION_LENGTH,
      `Opis nie może przekraczać ${ValidationRules.boxes.MAX_DESCRIPTION_LENGTH} znaków`
    )
    .nullable()
    .optional(),
  tags: z
    .array(z.string(), {
      invalid_type_error: "Tagi muszą być tablicą ciągów znaków",
    })
    .nullable()
    .optional(),
  location_id: z.string().uuid("Nieprawidłowy format ID lokalizacji").nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Przynajmniej jedno pole musi zostać zaktualizowane",
});
```

### Custom Error Classes (already exist in `src/lib/services/box.service.ts`)

- `BoxNotFoundError` - Box doesn't exist or user lacks access (404)
- `LocationNotFoundError` - Location doesn't exist (404)
- `WorkspaceMismatchError` - Location belongs to different workspace (403)

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "b1b48d97-501c-4709-bd7b-d96519721367",
  "name": "Updated Box Name",
  "updated_at": "2023-11-15T14:30:00Z"
}
```

**Response Headers:**
- `Content-Type: application/json`

### Error Responses

#### 400 Bad Request - Invalid Input
```json
{
  "error": "Nieprawidłowy format ID pudełka"
}
```

**Scenarios:**
- Invalid UUID format in URL parameter
- Empty request body (no fields to update)
- Invalid field values (empty name, description too long, invalid tags format, invalid location_id)

#### 401 Unauthorized - Not Authenticated
```json
{
  "error": "Nieautoryzowany dostęp"
}
```

**Scenarios:**
- Missing Authorization header
- Invalid or expired JWT token
- Token doesn't correspond to a valid user

#### 403 Forbidden - Workspace Mismatch
```json
{
  "error": "Lokalizacja należy do innego obszaru roboczego"
}
```

**Scenarios:**
- Provided location_id belongs to a different workspace than the box

#### 404 Not Found - Resource Not Found
```json
{
  "error": "Pudełko nie zostało znalezione"
}
```

**Scenarios:**
- Box with specified ID doesn't exist
- User doesn't have access to the box (RLS enforcement)
- Location with specified location_id doesn't exist

#### 500 Internal Server Error - Server Error
```json
{
  "error": "Nie udało się zaktualizować pudełka"
}
```

**Scenarios:**
- Database connection failure
- Unexpected database error
- Unhandled exception in service layer

## 5. Data Flow

### Request Flow Diagram

```
Client Request
    ↓
[1] Astro API Route Handler (PATCH method)
    ↓
[2] Extract Supabase client from context.locals
    ↓
[3] Authenticate user via supabase.auth.getUser()
    ↓ (if auth fails)
    └→ Return 401 Unauthorized
    ↓ (if auth succeeds)
[4] Validate URL parameter (id) with UpdateBoxParamsSchema
    ↓ (if validation fails)
    └→ Return 400 Bad Request
    ↓ (if validation succeeds)
[5] Validate request body with UpdateBoxSchema
    ↓ (if validation fails)
    └→ Return 400 Bad Request
    ↓ (if validation succeeds)
[6] Call updateBox() service function
    ↓
Service Layer (box.service.ts)
    ↓
[7] If location_id provided and not null:
    ├→ Query locations table to verify location exists
    ├→ Check location belongs to same workspace as box
    └→ Throw LocationNotFoundError or WorkspaceMismatchError if invalid
    ↓
[8] Execute UPDATE query on boxes table
    ├→ RLS policy automatically verifies workspace membership
    ├→ Database trigger automatically updates updated_at timestamp
    └→ Database trigger automatically updates search_vector
    ↓ (if no rows updated)
    └→ Throw BoxNotFoundError
    ↓ (if update succeeds)
[9] Return UpdateBoxResponse { id, name, updated_at }
    ↓
API Route Handler
    ↓
[10] Return 200 OK with response JSON
```

### Database Interactions

**Query 1: Location Validation** (conditional - only if location_id provided and not null)
```sql
SELECT id, workspace_id, is_deleted
FROM locations
WHERE id = $location_id
LIMIT 1
```

**Query 2: Box Update**
```sql
UPDATE boxes
SET
  name = COALESCE($name, name),
  description = COALESCE($description, description),
  tags = COALESCE($tags, tags),
  location_id = COALESCE($location_id, location_id)
WHERE id = $box_id
RETURNING id, name, updated_at
```

**RLS Policy Applied:**
- The UPDATE query is automatically filtered by RLS to ensure user is a workspace member
- RLS policy: `auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = boxes.workspace_id)`

**Database Triggers Executed:**
- `moddatetime` trigger: Automatically updates `updated_at` to current timestamp
- `update_box_search_vector` trigger: Regenerates `search_vector` from name, description, and tags

## 6. Security Considerations

### Authentication
- **Method**: Supabase Auth (JWT Bearer token)
- **Verification**: `supabase.auth.getUser()` validates token and retrieves user
- **Failure Handling**: Return 401 if token is missing, invalid, or expired

### Authorization
- **Workspace Access**: Row Level Security (RLS) policies enforce workspace membership
- **Policy Check**: User must be a member of the workspace that owns the box
- **Automatic Enforcement**: PostgreSQL RLS automatically filters queries based on `auth.uid()`
- **No Manual Checks**: Authorization is handled entirely by database layer

### Input Validation
- **URL Parameter**: Validate `id` is a valid UUID using Zod schema
- **Request Body**: Validate all fields against Zod schema
- **String Trimming**: `name` field is automatically trimmed
- **Length Limits**: `description` limited to 10,000 characters
- **Type Safety**: TypeScript + Zod ensure type correctness

### Data Integrity
- **Location Validation**: If location_id provided, verify:
  1. Location exists in database
  2. Location belongs to same workspace as box
  3. Location is not soft-deleted (is_deleted = false)
- **Workspace Isolation**: Cannot assign box to location in different workspace
- **Null Safety**: location_id can be null (unassigned box)

### Potential Security Threats and Mitigations

| Threat | Mitigation |
|--------|------------|
| **SQL Injection** | Supabase client uses parameterized queries; input validated with Zod |
| **IDOR (Insecure Direct Object Reference)** | RLS policies prevent cross-workspace access; user can only update boxes in their workspaces |
| **XSS (Cross-Site Scripting)** | Not applicable (API endpoint, no HTML rendering) |
| **Mass Assignment** | TypeScript type system restricts updateable fields to name, description, tags, location_id only |
| **DoS via Large Payloads** | Description limited to 10,000 characters; tags validated as array |
| **Privilege Escalation** | RLS enforces workspace membership; cannot update boxes outside user's workspaces |
| **Data Leakage** | Response only includes id, name, updated_at (minimal data exposure) |
| **Location Hijacking** | Location workspace validation prevents assigning box to location in different workspace |

## 7. Error Handling

### Error Handling Strategy

**Principle**: Handle errors early, use early returns, place happy path last.

### Error Categories and Responses

#### 1. Authentication Errors (401 Unauthorized)
**Trigger**: `supabase.auth.getUser()` fails or returns no user

**Handling**:
```typescript
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: "Nieautoryzowany dostęp" } as ErrorResponse),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 2. URL Parameter Validation Errors (400 Bad Request)
**Trigger**: Invalid UUID format in `id` parameter

**Handling**:
```typescript
const parseResult = UpdateBoxParamsSchema.safeParse({ id: params.id });
if (!parseResult.success) {
  const firstError = parseResult.error.errors[0];
  return new Response(
    JSON.stringify({ error: firstError.message } as ErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 3. Request Body Validation Errors (400 Bad Request)
**Trigger**: Invalid request body (empty object, invalid field values)

**Handling**:
```typescript
const bodyParseResult = UpdateBoxSchema.safeParse(requestBody);
if (!bodyParseResult.success) {
  const firstError = bodyParseResult.error.errors[0];
  return new Response(
    JSON.stringify({ error: firstError.message } as ErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 4. Box Not Found Errors (404 Not Found)
**Trigger**: Box doesn't exist or user lacks access (RLS)

**Handling** (in route):
```typescript
if (error instanceof BoxNotFoundError) {
  return new Response(
    JSON.stringify({ error: "Pudełko nie zostało znalezione" } as ErrorResponse),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

**Handling** (in service):
```typescript
// After UPDATE query with count check
if (count === 0) {
  console.warn("[box.service] Box not found or access denied", {
    user_id: userId,
    box_id: boxId,
  });
  throw new BoxNotFoundError();
}
```

#### 5. Location Not Found Errors (404 Not Found)
**Trigger**: location_id provided doesn't exist in database

**Handling** (in service):
```typescript
if (locationError || !location) {
  console.error("[box.service] Location not found", {
    user_id: userId,
    location_id: updates.location_id,
  });
  throw new LocationNotFoundError();
}
```

#### 6. Workspace Mismatch Errors (403 Forbidden)
**Trigger**: Location belongs to different workspace than box

**Handling** (in service):
```typescript
// After querying box and location
if (box.workspace_id !== location.workspace_id) {
  console.error("[box.service] Workspace mismatch", {
    user_id: userId,
    box_workspace: box.workspace_id,
    location_workspace: location.workspace_id,
  });
  throw new WorkspaceMismatchError("location");
}
```

**Handling** (in route):
```typescript
if (error instanceof WorkspaceMismatchError) {
  return new Response(
    JSON.stringify({ error: error.message } as ErrorResponse),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
```

#### 7. Database Errors (500 Internal Server Error)
**Trigger**: Database connection failure, query error

**Handling**:
```typescript
if (updateError) {
  console.error("[box.service] Database error updating box", {
    user_id: userId,
    box_id: boxId,
    error: updateError.message,
    code: updateError.code,
  });
  throw new Error("Nie udało się zaktualizować pudełka");
}
```

#### 8. Unexpected Errors (500 Internal Server Error)
**Trigger**: Unhandled exceptions, unknown errors

**Handling** (outer catch block):
```typescript
catch (error) {
  console.error("Unexpected error in PATCH /api/boxes/:id:", error);
  return new Response(
    JSON.stringify({ error: "Wewnętrzny błąd serwera" } as ErrorResponse),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Logging Strategy

**Success Logging**:
```typescript
console.log("[box.service] Box updated successfully", {
  user_id: userId,
  box_id: boxId,
  fields_updated: Object.keys(updates),
  location_changed: !!updates.location_id,
});
```

**Error Logging**:
```typescript
console.error("[box.service] Error context", {
  user_id: userId,
  box_id: boxId,
  updates_attempted: updates,
  error: error.message,
  code: error.code,
});
```

## 8. Performance Considerations

### Query Efficiency
- **Single UPDATE Query**: Box update performed in one database round-trip
- **Conditional Location Query**: Location validation only executed if location_id provided and not null
- **No N+1 Queries**: No iterative queries or nested loops
- **RLS Overhead**: Minimal - RLS policy check is a simple EXISTS subquery on workspace_members

### Database Optimizations
- **Indexed Columns**:
  - `boxes.id` is primary key (indexed)
  - `boxes.workspace_id` has foreign key index
  - `locations.id` is primary key (indexed)
- **Automatic Triggers**:
  - `moddatetime` trigger efficiently updates `updated_at`
  - `search_vector` trigger uses PostgreSQL's built-in tsvector generation
- **Minimal Data Transfer**: Response only returns id, name, updated_at (3 fields)

### Potential Bottlenecks
1. **Location Validation Query**: Additional SELECT if location_id provided
   - **Mitigation**: Only executed conditionally; indexed lookup on primary key

2. **Search Vector Regeneration**: Trigger recalculates tsvector on every update
   - **Mitigation**: PostgreSQL's tsvector generation is highly optimized; GIN indexed

3. **RLS Policy Check**: EXISTS subquery on workspace_members
   - **Mitigation**: workspace_members has composite primary key index; cached in session

### Optimization Strategies
- **Partial Updates Only**: Only modified fields are included in UPDATE SET clause
- **Early Validation**: Input validation happens before database queries
- **Error Handling**: Early returns prevent unnecessary processing
- **Logging**: Structured logging with context for debugging performance issues

### Expected Performance
- **Average Response Time**: 50-150ms (includes auth, validation, 1-2 DB queries)
- **P95 Response Time**: 200-300ms
- **Database Load**: 1-2 queries per request, all indexed lookups

## 9. Implementation Steps

### Step 1: Create Validation Schemas
**File**: `src/lib/validators/box.validators.ts`

**Actions**:
1. Add `UpdateBoxParamsSchema` for URL parameter validation
2. Add `UpdateBoxSchema` for request body validation with refinement to ensure at least one field present
3. Export TypeScript type inference: `UpdateBoxParamsInput`, `UpdateBoxInput`

**Acceptance Criteria**:
- URL parameter validation rejects invalid UUIDs
- Request body validation rejects empty objects
- Name validation rejects empty strings after trimming
- Description validation enforces 10,000 character limit
- Tags validation accepts array of strings or null
- Location_id validation accepts UUID or null

### Step 2: Implement Service Layer Function
**File**: `src/lib/services/box.service.ts`

**Actions**:
1. Create `updateBox()` function with signature:
   ```typescript
   async function updateBox(
     supabase: SupabaseClient,
     boxId: string,
     userId: string,
     updates: UpdateBoxRequest
   ): Promise<UpdateBoxResponse>
   ```
2. Implement location validation logic (if location_id provided):
   - Query location by ID
   - Verify location exists
   - Query box to get workspace_id
   - Verify location.workspace_id matches box.workspace_id
   - Verify location.is_deleted is false
   - Throw appropriate errors if validation fails
3. Execute UPDATE query on boxes table with provided updates
4. Check if any rows were updated (count > 0)
5. Throw `BoxNotFoundError` if count is 0
6. Return `UpdateBoxResponse` with id, name, updated_at
7. Add comprehensive error logging with user and box context
8. Add success logging with updated fields summary

**Acceptance Criteria**:
- Function throws `BoxNotFoundError` if box doesn't exist or user lacks access
- Function throws `LocationNotFoundError` if location_id doesn't exist
- Function throws `WorkspaceMismatchError` if location belongs to different workspace
- Function correctly handles null location_id (unassign box)
- Function logs all operations with appropriate context
- Function returns correct UpdateBoxResponse structure

### Step 3: Implement API Route Handler
**File**: `src/pages/api/boxes/[id].ts`

**Actions**:
1. Add PATCH export with APIRoute type
2. Set `export const prerender = false`
3. Implement authentication check using `supabase.auth.getUser()`
4. Validate URL parameter using `UpdateBoxParamsSchema`
5. Parse request body from `await request.json()`
6. Validate request body using `UpdateBoxSchema`
7. Call `updateBox()` service function with validated data
8. Handle all error types with appropriate status codes:
   - `BoxNotFoundError` → 404
   - `LocationNotFoundError` → 404
   - `WorkspaceMismatchError` → 403
   - Generic errors → 500
9. Return 200 OK with UpdateBoxResponse on success
10. Add JSDoc comments documenting the endpoint

**Acceptance Criteria**:
- Route returns 401 for unauthenticated requests
- Route returns 400 for invalid URL parameters
- Route returns 400 for invalid request bodies
- Route returns 404 for non-existent boxes
- Route returns 403 for workspace mismatches
- Route returns 200 with correct response structure on success
- All errors include appropriate error messages in Polish
- All responses have correct Content-Type header

### Step 4: Manual Testing
**Create Test Script**: `.ai_docs/test-patch-boxes-id.sh`

**Test Scenarios**:
1. **Happy Path - Update Name**
   - PATCH valid box with new name
   - Verify 200 response with updated name

2. **Happy Path - Update Description**
   - PATCH valid box with new description
   - Verify 200 response

3. **Happy Path - Update Tags**
   - PATCH valid box with new tags array
   - Verify 200 response

4. **Happy Path - Move Box to Location**
   - PATCH valid box with valid location_id
   - Verify 200 response
   - Verify box location changed in database

5. **Happy Path - Unassign Box from Location**
   - PATCH valid box with location_id = null
   - Verify 200 response
   - Verify box.location_id is null in database

6. **Happy Path - Update Multiple Fields**
   - PATCH valid box with name, description, tags, location_id
   - Verify 200 response

7. **Error Case - Invalid Box ID**
   - PATCH with invalid UUID format
   - Verify 400 response

8. **Error Case - Box Not Found**
   - PATCH non-existent box UUID
   - Verify 404 response

9. **Error Case - Empty Request Body**
   - PATCH with empty JSON object {}
   - Verify 400 response with "at least one field" message

10. **Error Case - Invalid Location ID**
    - PATCH with non-existent location_id
    - Verify 404 response

11. **Error Case - Workspace Mismatch**
    - PATCH box with location_id from different workspace
    - Verify 403 response

12. **Error Case - Unauthorized**
    - PATCH without Authorization header
    - Verify 401 response

13. **Error Case - Description Too Long**
    - PATCH with description > 10,000 characters
    - Verify 400 response

**Acceptance Criteria**:
- All test scenarios pass with expected status codes and response structures
- Test script uses heredoc pattern for curl commands (following guidelines)
- Test script outputs formatted JSON using `python3 -m json.tool`

### Step 5: Integration Testing
**Actions**:
1. Test with local Supabase instance
2. Verify RLS policies work correctly
3. Test database triggers (updated_at, search_vector)
4. Verify audit logging output
5. Test edge cases (null values, special characters in strings)
6. Verify search_vector updates when name/description/tags change

**Acceptance Criteria**:
- RLS prevents cross-workspace updates
- Database triggers execute correctly
- Logs contain all expected context
- Search functionality works with updated data

### Step 6: Documentation
**Actions**:
1. Update API specification in `.ai_docs/api-plan.md`:
   - Change implementation status to "✅ Implemented"
   - Add implementation file reference
   - Add service layer reference
   - Add testing reference
2. Add inline code comments explaining business logic
3. Document any deviations from the plan

**Acceptance Criteria**:
- API plan reflects implementation status
- Code is well-commented and self-documenting
- Implementation aligns with specification

### Step 7: Code Review Checklist
**Before Completion**:
- [ ] All TypeScript types are correctly defined
- [ ] Zod schemas validate all inputs correctly
- [ ] Service function handles all error cases
- [ ] API route follows existing patterns in codebase
- [ ] Error messages are in Polish (per project convention)
- [ ] Logging includes user_id and box_id context
- [ ] No security vulnerabilities introduced
- [ ] Code follows clean code practices (early returns, guard clauses)
- [ ] RLS policies are not bypassed
- [ ] Test script covers all scenarios
- [ ] Documentation is updated

---

## Summary

This implementation plan provides a comprehensive guide for implementing the PATCH /api/boxes/:id endpoint. The implementation follows existing patterns from the DELETE and GET handlers, leverages Row Level Security for authorization, and includes thorough validation and error handling. The service layer encapsulates business logic, making the code maintainable and testable.

**Key Design Decisions**:
1. **Partial Updates**: Only fields provided in request body are updated
2. **Location Validation**: Explicit workspace check prevents cross-workspace assignments
3. **RLS Enforcement**: Authorization handled by PostgreSQL policies
4. **Error First**: Early validation and error handling with clear status codes
5. **Minimal Response**: Only essential fields returned to reduce data transfer
6. **Comprehensive Logging**: All operations logged with context for debugging

**Estimated Complexity**: Medium

**Estimated Implementation Time**: 2-3 hours (including testing)
