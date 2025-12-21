# API Endpoint Implementation Plan: DELETE /api/locations/:id

## 1. Endpoint Overview

This endpoint performs a soft delete operation on a location within the hierarchical storage structure. When a location is deleted, all boxes assigned to that location are automatically unassigned (their `location_id` is set to NULL), and the location is marked as deleted (`is_deleted = true`) rather than being physically removed from the database. This preserves data integrity and allows for potential recovery or audit trails.

**Business Logic:**
- Soft delete (not permanent deletion)
- Automatically unassigns all boxes in the location
- Maintains data integrity through transactional operations
- Respects workspace boundaries via Row Level Security

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Pattern**: `/api/locations/:id`
- **Route File Location**: `src/pages/api/locations/[id].ts`

### URL Parameters
- **Required:**
  - `id` (string): UUID of the location to delete
    - Format: Valid UUID v4
    - Example: `123e4567-e89b-12d3-a456-426614174000`

### Query Parameters
- None

### Request Headers
- `Authorization: Bearer <token>` (handled by middleware, injected via `context.locals.user`)

### Request Body
- None

## 3. Utilized Types

All types are imported from `src/types.ts`:

### Response Types
```typescript
import type { SuccessResponse, ErrorResponse } from "@/types";

// Used for successful deletion
SuccessResponse {
  message: string;
}

// Used for error responses
ErrorResponse {
  error: string;
  details?: unknown;
}
```

### Validation Schema (Zod)
```typescript
import { z } from "zod";

const deleteLocationParamsSchema = z.object({
  id: z.string().uuid({ message: "Nieprawidłowy format ID lokalizacji" }),
});

type DeleteLocationParams = z.infer<typeof deleteLocationParamsSchema>;
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "message": "Lokalizacja została usunięta, a powiązane pudełka odłączone"
}
```

### Error Responses

#### 400 Bad Request - Invalid UUID Format
```json
{
  "error": "Nieprawidłowy format ID lokalizacji"
}
```

#### 401 Unauthorized - Not Authenticated
```json
{
  "error": "Brak autoryzacji"
}
```

#### 404 Not Found - Location Doesn't Exist
```json
{
  "error": "Lokalizacja nie została znaleziona"
}
```

#### 500 Internal Server Error - Database/RPC Failure
```json
{
  "error": "Nie udało się usunąć lokalizacji",
  "details": "Error message details"
}
```

## 5. Data Flow

```
1. Client Request
   ↓
2. Astro Middleware (validates authentication, injects user & supabase)
   ↓
3. DELETE Handler in src/pages/api/locations/[id].ts
   ↓
4. Extract & Validate URL parameter (id)
   ↓
5. Call deleteLocation service (src/lib/services/location.service.ts)
   ↓
6. Service Layer:
   a. Query location by ID (RLS automatically checks workspace access)
   b. If not found → throw 404 error
   c. Execute soft delete transaction:
      - Update all boxes: SET location_id = NULL WHERE location_id = :id
      - Update location: SET is_deleted = true WHERE id = :id
   d. Return success
   ↓
7. API Route Handler
   ↓
8. Return Success Response (200)
```

### Database Interactions

**Tables Involved:**
- `locations` - Mark as deleted
- `boxes` - Unassign from location

**Transaction Steps:**
```sql
-- Step 1: Unassign all boxes from this location
UPDATE boxes
SET location_id = NULL, updated_at = NOW()
WHERE location_id = :location_id;

-- Step 2: Soft delete the location
UPDATE locations
SET is_deleted = true, updated_at = NOW()
WHERE id = :location_id;
```

**RLS Enforcement:**
- Both UPDATE operations are protected by RLS policies
- User must be a member of the workspace that owns the location
- Helper function `is_workspace_member(workspace_id)` validates access

## 6. Security Considerations

### Authentication
- **Mechanism**: JWT token validated by Astro middleware
- **Injection Point**: `context.locals.user` and `context.locals.supabase`
- **Validation**: Middleware ensures user is authenticated before reaching handler
- **Failure Mode**: 401 Unauthorized if token is invalid/missing

### Authorization
- **Mechanism**: PostgreSQL Row Level Security (RLS)
- **Policy**: User must be a workspace member to access/modify locations
- **Helper Function**: `is_workspace_member(workspace_id)`
- **Enforcement**: Database-level, cannot be bypassed
- **Failure Mode**: 404 Not Found (RLS filters out inaccessible records)

### Input Validation
- **UUID Validation**: Zod schema validates UUID format before database query
- **SQL Injection**: Not applicable - using Supabase client with parameterized queries
- **XSS**: Not applicable - no user content in response

### Data Integrity
- **Soft Delete**: Preserves data for audit trails and potential recovery
- **Transactional Operations**: Both box unlinking and location deletion must succeed together
- **Foreign Key Handling**: Boxes are unassigned (set to NULL) rather than deleted
- **Cascade Effects**: No child locations are deleted (only the specified location is marked deleted)

### Additional Security Notes
- Never expose internal error details to client in production
- Log sensitive operations (deletion) for audit purposes
- Rate limiting should be implemented at infrastructure level

## 7. Error Handling

### Validation Errors (400 Bad Request)

**Scenario:** Invalid UUID format in URL parameter

**Detection:**
```typescript
const validationResult = deleteLocationParamsSchema.safeParse({ id });
if (!validationResult.success) {
  // Handle validation error
}
```

**Response:**
```json
{
  "error": "Nieprawidłowy format ID lokalizacji"
}
```

**Logging:**
```typescript
console.error("DELETE /api/locations/:id - Błąd walidacji:", validationResult.error);
```

### Authentication Errors (401 Unauthorized)

**Scenario:** User not authenticated or invalid token

**Detection:** Handled by middleware; `context.locals.user` will be null/undefined

**Response:**
```json
{
  "error": "Brak autoryzacji"
}
```

**Logging:**
```typescript
console.error("DELETE /api/locations/:id - Próba nieautoryzowanego dostępu");
```

### Not Found Errors (404 Not Found)

**Scenario 1:** Location doesn't exist
**Scenario 2:** Location exists but user doesn't have access (RLS filters it out)

**Detection:**
```typescript
const { data, error } = await supabase
  .from("locations")
  .select("id, workspace_id, is_deleted")
  .eq("id", locationId)
  .single();

if (!data) {
  // Location not found or no access
}
```

**Response:**
```json
{
  "error": "Lokalizacja nie została znaleziona"
}
```

**Logging:**
```typescript
console.error(`DELETE /api/locations/:id - Lokalizacja nie znaleziona: ${locationId}`);
```

**Security Note:** Don't distinguish between "doesn't exist" and "no access" - both return 404 to prevent information leakage

### Server Errors (500 Internal Server Error)

**Scenario 1:** Database connection failure
**Scenario 2:** Transaction rollback
**Scenario 3:** Unexpected errors during soft delete operation

**Detection:**
```typescript
try {
  // Database operations
} catch (error) {
  console.error("DELETE /api/locations/:id - Błąd serwera:", error);
  return new Response(
    JSON.stringify({
      error: "Nie udało się usunąć lokalizacji",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    }),
    { status: 500 }
  );
}
```

**Response:**
```json
{
  "error": "Nie udało się usunąć lokalizacji"
}
```

**Logging:**
```typescript
console.error("DELETE /api/locations/:id - Błąd bazy danych:", {
  locationId,
  userId: user.id,
  error: error.message,
  stack: error.stack
});
```

**Production Note:** Never expose error.message or stack traces in production responses

## 8. Performance Considerations

### Query Optimization
- **Index Usage**:
  - Primary key index on `locations.id` for fast lookup
  - Foreign key index on `boxes.location_id` for efficient box unlinking
  - GiST index on `locations.path` (not used in this operation but maintained)

### Transaction Efficiency
- Use single transaction for both operations (box unlinking + location soft delete)
- Minimize transaction scope to reduce lock time
- Expected operation time: < 100ms for typical use cases

### Potential Bottlenecks
- **Large Number of Boxes**: If location contains thousands of boxes, the UPDATE operation may take longer
- **Mitigation**: Add index on `boxes.location_id` (should already exist per schema)
- **Monitoring**: Log execution time for operations exceeding threshold (e.g., > 1 second)

### Database Load
- **Read Operations**: 1 SELECT query to verify location exists
- **Write Operations**: 2 UPDATE queries (boxes + location) within transaction
- **Network Roundtrips**: Minimal - single transaction to Supabase

### Caching Considerations
- No caching implemented for DELETE operations
- Client-side cache invalidation required after successful deletion
- Consider invalidating related queries (location lists, box lists)

### Scalability Notes
- Operation scales linearly with number of boxes in location
- RLS policies add minimal overhead (indexed workspace membership checks)
- Soft delete approach prevents cascade deletion overhead

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File:** `src/pages/api/locations/[id].ts`

```typescript
import { z } from "zod";

const deleteLocationParamsSchema = z.object({
  id: z.string().uuid({ message: "Nieprawidłowy format ID lokalizacji" }),
});

type DeleteLocationParams = z.infer<typeof deleteLocationParamsSchema>;
```

**Purpose:** Validate URL parameter format before processing

---

### Step 2: Implement Service Function
**File:** `src/lib/services/location.service.ts`

```typescript
/**
 * Soft deletes a location and unassigns all boxes from it.
 *
 * @param supabase - Authenticated Supabase client
 * @param locationId - UUID of the location to delete
 * @param userId - ID of the authenticated user (for logging/audit)
 * @returns Promise resolving to success or throwing error
 * @throws {Error} If location not found or database operation fails
 */
export async function deleteLocation(
  supabase: SupabaseClient,
  locationId: string,
  userId: string
): Promise<void> {
  // Implementation steps:
  // 1. Verify location exists and user has access (RLS enforced)
  // 2. Execute transaction:
  //    a. Unassign all boxes from location
  //    b. Mark location as deleted
  // 3. Handle errors appropriately
}
```

**Business Logic:**
1. Query location by ID (single SELECT with RLS enforcement)
2. If not found → throw error (will be caught and converted to 404)
3. Execute soft delete transaction (2 UPDATE operations)
4. Return success

**Error Handling:**
- Throw descriptive errors for different failure scenarios
- Let API route handler convert errors to appropriate HTTP responses

---

### Step 3: Implement DELETE Handler
**File:** `src/pages/api/locations/[id].ts`

```typescript
import type { APIContext } from "astro";
import { deleteLocationParamsSchema } from "./validation"; // or inline
import { deleteLocation } from "@/lib/services/location.service";
import type { SuccessResponse, ErrorResponse } from "@/types";

export const prerender = false;

export async function DELETE(context: APIContext): Promise<Response> {
  // Implementation steps:
  // 1. Extract dependencies from context
  // 2. Validate authentication
  // 3. Extract and validate URL parameter
  // 4. Call service layer
  // 5. Handle errors and return appropriate responses
}
```

**Implementation Flow:**
1. Extract `context.locals.user` and `context.locals.supabase`
2. Guard clause: Check user authentication (401 if not authenticated)
3. Extract `context.params.id`
4. Validate ID with Zod schema (400 if invalid)
5. Call `deleteLocation(supabase, id, user.id)`
6. Return success response (200)
7. Catch and handle errors with appropriate status codes

**Error Mapping:**
- Validation errors → 400 Bad Request ("Nieprawidłowy format ID lokalizacji")
- Authentication missing → 401 Unauthorized ("Brak autoryzacji")
- Location not found → 404 Not Found ("Lokalizacja nie została znaleziona")
- Database errors → 500 Internal Server Error ("Nie udało się usunąć lokalizacji")

---

### Step 4: Add Error Logging
**Location:** Throughout service function and API handler

```typescript
// In service function
console.error("Location service - Usuwanie nie powiodło się:", {
  locationId,
  userId,
  error: error.message
});

// In API handler
console.error("DELETE /api/locations/:id - Błąd:", {
  locationId: context.params.id,
  userId: context.locals.user?.id,
  errorType: error.name,
  message: error.message
});
```

**Logging Strategy:**
- Log all errors with context (user ID, location ID, error details)
- Use structured logging for easier parsing
- Never log sensitive data (tokens, passwords)
- Include timestamps (console.error adds automatically)

---

### Step 5: Write Unit Tests
**File:** `src/lib/services/location.service.test.ts`

**Test Cases:**
1. **Success case**: Location deleted and boxes unassigned
2. **Not found**: Location doesn't exist
3. **No access**: User not in workspace (RLS blocks)
4. **Database error**: Transaction failure
5. **Invalid UUID**: Malformed location ID

**Test Implementation Notes:**
- Mock Supabase client responses
- Verify correct SQL queries are executed
- Verify transaction behavior
- Test error handling paths

---

### Step 6: Write Integration Tests
**File:** `tests/api/locations/delete.test.ts`

**Test Scenarios:**
1. **Successful deletion**: Verify location marked deleted, boxes unassigned
2. **Authentication required**: 401 when not authenticated
3. **Invalid UUID format**: 400 Bad Request
4. **Location not found**: 404 response
5. **Cross-workspace access**: Cannot delete location from different workspace
6. **Boxes unassigned correctly**: Verify boxes have `location_id = NULL` after deletion

**Setup Requirements:**
- Test database with sample data
- Authenticated test user
- Multiple workspaces for cross-workspace testing
- Sample locations with boxes

---

### Step 7: Update API Documentation
**File:** `.ai_docs/api-plan.md`

**Actions:**
- Verify DELETE /api/locations/:id documentation matches implementation
- Add any implementation-specific notes
- Update error response examples if needed
- Document any performance characteristics discovered during testing

---

### Step 8: Manual Testing Checklist

**Pre-deployment verification:**
- [ ] Delete location with no boxes
- [ ] Delete location with multiple boxes
- [ ] Verify boxes are unassigned after deletion
- [ ] Verify location is soft-deleted (is_deleted = true)
- [ ] Test with invalid UUID format
- [ ] Test with non-existent location ID
- [ ] Test without authentication token
- [ ] Test cross-workspace access (should fail)
- [ ] Verify RLS policies work correctly
- [ ] Check error messages are user-friendly
- [ ] Verify no sensitive data in error responses
- [ ] Test with location at different hierarchy levels

**Database Verification:**
- [ ] Check `is_deleted` flag is set correctly
- [ ] Verify boxes have `location_id = NULL`
- [ ] Confirm `updated_at` timestamps updated
- [ ] Ensure no cascade deletion occurred
- [ ] Verify transaction atomicity (both operations succeed or both fail)

---

### Step 9: Code Review Checklist

**Security Review:**
- [ ] Authentication properly enforced
- [ ] Authorization via RLS working correctly
- [ ] No SQL injection vulnerabilities
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't expose sensitive data

**Code Quality:**
- [ ] Follows project coding guidelines (CLAUDE.md)
- [ ] TypeScript types properly defined
- [ ] Error handling comprehensive
- [ ] Code is well-commented where necessary
- [ ] Follows clean code practices (early returns, guard clauses)

**Performance:**
- [ ] Queries are optimized
- [ ] Indexes utilized properly
- [ ] Transaction scope minimized
- [ ] No N+1 query problems

---

### Step 10: Deployment

**Pre-deployment:**
1. Ensure all tests pass (unit + integration)
2. Run linting: `npm run lint`
3. Build project: `npm run build`
4. Preview build: `npm run preview`

**Deployment Steps:**
1. Create feature branch: `git checkout -b feature/delete-location-endpoint`
2. Commit changes: `git commit -m "Add DELETE /api/locations/:id endpoint"`
3. Push to remote: `git push origin feature/delete-location-endpoint`
4. Create pull request
5. Wait for CI/CD checks
6. Request code review
7. Merge to main after approval
8. Monitor production logs for errors

**Post-deployment:**
- Monitor error logs for first 24 hours
- Verify endpoint performance metrics
- Check for any unexpected behavior
- Gather user feedback

---

## Implementation Checklist Summary

- [ ] Create Zod validation schema
- [ ] Implement `deleteLocation` service function
- [ ] Implement DELETE handler in API route
- [ ] Add comprehensive error logging
- [ ] Write unit tests for service function
- [ ] Write integration tests for endpoint
- [ ] Update API documentation
- [ ] Complete manual testing
- [ ] Pass code review
- [ ] Deploy to production
- [ ] Monitor post-deployment

---

## References

- **API Specification**: `.ai_docs/api-plan.md` - Section 2.2 Locations
- **Database Schema**: `.ai_docs/db-plan.md` - Section 2.5 Locations
- **Type Definitions**: `src/types.ts` - LocationDto, SuccessResponse, ErrorResponse
- **Coding Guidelines**: `CLAUDE.md` and `.claude/commands/guidelines.md`
- **Similar Implementation**: `src/pages/api/locations/[id].ts` (PATCH handler) for reference

---

## Notes

- This is a **soft delete** operation - data is preserved with `is_deleted = true`
- Boxes are **unassigned**, not deleted - they remain in the database with `location_id = NULL`
- Transaction ensures **atomicity** - both box unlinking and location marking succeed together
- RLS policies provide **workspace-level isolation** - users cannot delete locations from other workspaces
- The implementation prioritizes **data safety** and **audit trails** over immediate data removal
