# API Endpoint Implementation Plan: POST /api/locations

## 1. Endpoint Overview

Creates a new location node in the hierarchical storage structure. Locations use PostgreSQL's `ltree` extension to maintain a tree structure with a maximum depth of 5 levels. Each location belongs to a workspace and can optionally have a parent location. The endpoint validates workspace membership, hierarchy depth constraints, and sibling name uniqueness before creating the location record.

**Purpose:** Enable users to build their storage organization hierarchy by creating rooms, shelves, sections, and other nested storage units.

**Key Business Rules:**
- Maximum hierarchy depth: 5 levels
- Sibling locations cannot have the same name (case-insensitive)
- Location names are normalized for path generation (lowercase, special characters replaced with underscores)
- Only workspace members can create locations in that workspace

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/locations`
- **Content-Type:** `application/json`
- **Authentication:** Required (JWT Bearer token)

### Parameters

**Request Body:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `workspace_id` | UUID | Yes | The workspace where the location will be created | Must be valid UUID, workspace must exist, user must be member |
| `name` | string | Yes | The location name | Non-empty string, max 255 chars, will be normalized for path |
| `description` | string | No | Optional description of the location | Max 1000 chars |
| `parent_id` | UUID | No | Parent location ID for nested locations | Must be valid UUID if provided, parent must exist in same workspace |

**Request Body Example:**
```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Shelf A",
  "description": "Metal shelf on left wall",
  "parent_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

## 3. Utilized Types

### Input Type
```typescript
// From src/types.ts (already defined)
CreateLocationRequest {
  workspace_id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
}
```

### Output Type
```typescript
// From src/types.ts (already defined)
LocationDto {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  path: string; // ltree converted to string (e.g., "root.basement.shelfa")
  parent_id?: string | null;
  is_deleted: boolean;
  created_at: string | null;
  updated_at: string | null;
}
```

### Validation Schema (Zod)
```typescript
const CreateLocationSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID przestrzeni roboczej"),
  name: z.string()
    .min(1, "Nazwa lokalizacji jest wymagana")
    .max(255, "Nazwa lokalizacji może mieć maksymalnie 255 znaków")
    .trim(),
  description: z.string()
    .max(1000, "Opis może mieć maksymalnie 1000 znaków")
    .nullable()
    .optional(),
  parent_id: z.string()
    .uuid("Nieprawidłowy format ID lokalizacji nadrzędnej")
    .nullable()
    .optional(),
});
```

## 4. Response Details

### Success Response (201 Created)

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Shelf A",
  "description": "Metal shelf on left wall",
  "path": "root.basement.shelfa",
  "created_at": "2024-12-16T10:05:00Z"
}
```

### Error Responses

**400 Bad Request** - Invalid input data
```json
{
  "error": "Walidacja nie powiodła się",
  "details": {
    "name": "Nazwa lokalizacji jest wymagana"
  }
}
```

Or:
```json
{
  "error": "Przekroczono maksymalną głębokość hierarchii. Lokalizacje mogą być zagnieżdżone maksymalnie na 5 poziomach."
}
```

**401 Unauthorized** - Missing or invalid authentication
```json
{
  "error": "Nieautoryzowany dostęp"
}
```

**403 Forbidden** - User not a member of workspace
```json
{
  "error": "Nie masz uprawnień do tworzenia lokalizacji w tej przestrzeni roboczej"
}
```

**404 Not Found** - Parent location doesn't exist
```json
{
  "error": "Nie znaleziono lokalizacji nadrzędnej"
}
```

**409 Conflict** - Sibling with same name exists
```json
{
  "error": "Lokalizacja o tej nazwie już istnieje na tym poziomie"
}
```

**500 Internal Server Error** - Database or server error
```json
{
  "error": "Nie udało się utworzyć lokalizacji"
}
```

## 5. Data Flow

### High-Level Flow
1. **Request Reception** → API route receives POST request with location data
2. **Authentication Check** → Middleware validates JWT token and extracts user ID
3. **Input Validation** → Zod schema validates request body structure and types
4. **Service Layer Call** → Business logic service validates and processes request
5. **Database Operations** → Insert location record via Supabase client
6. **Response Formation** → Return created location with 201 status

### Detailed Service Layer Flow

**LocationService.createLocation() steps:**

1. **Workspace Membership Validation**
   - Query `workspace_members` table to verify user belongs to workspace
   - Return 403 if not a member

2. **Parent Location Validation** (if parent_id provided)
   - Fetch parent location from database
   - Verify parent exists and belongs to same workspace (404 if not found)
   - Verify parent is not soft-deleted
   - Extract parent path for hierarchy depth check

3. **Hierarchy Depth Validation**
   - Calculate target depth: `nlevel(parent_path) + 1` or 1 if root
   - Return 400 if depth > 5

4. **Name Normalization**
   - Convert name to lowercase
   - Replace spaces and special characters with underscores
   - Ensure normalized name is valid for ltree (alphanumeric + underscore)

5. **Path Construction**
   - Root location: `root.{normalized_name}`
   - Child location: `{parent_path}.{normalized_name}`

6. **Sibling Uniqueness Check**
   - Query locations table for same workspace and parent_id
   - Check if any sibling has the same path
   - Return 409 if conflict exists

7. **Location Creation**
   - Insert record into `locations` table
   - RLS policies automatically enforce workspace access
   - Database generates `id`, `created_at`, `updated_at`

8. **Response Preparation**
   - Convert ltree path to string representation
   - Derive `parent_id` from path if needed
   - Return LocationDto

### Database Interactions

```sql
-- 1. Check workspace membership (handled by RLS, but explicit check for better error messages)
SELECT user_id
FROM workspace_members
WHERE workspace_id = $1 AND user_id = $2;

-- 2. Fetch parent location (if parent_id provided)
SELECT id, workspace_id, path, is_deleted
FROM locations
WHERE id = $1;

-- 3. Check for sibling name conflicts
SELECT id
FROM locations
WHERE workspace_id = $1
  AND path = $2
  AND is_deleted = false;

-- 4. Insert new location
INSERT INTO locations (workspace_id, path, name, description)
VALUES ($1, $2, $3, $4)
RETURNING *;
```

## 6. Security Considerations

### Authentication
- **Mechanism:** Supabase Auth (GoTrue) with JWT tokens
- **Validation:** Middleware extracts and validates `Authorization: Bearer <token>` header
- **User Context:** User ID attached to `context.locals.user` for service layer

### Authorization
- **Workspace Access:** RLS policies enforce that user must be member of workspace
- **Explicit Checks:** Service layer explicitly validates workspace membership for clear error messages
- **Parent Validation:** Ensure parent location belongs to same workspace to prevent cross-workspace injection

### Input Sanitization
- **Path Injection Prevention:** Normalize location names to prevent malicious ltree path manipulation
- **Character Whitelist:** Only allow alphanumeric characters and underscores in normalized paths
- **SQL Injection:** Use parameterized queries via Supabase client (prevents SQL injection)

### RLS Policies
PostgreSQL RLS policies on `locations` table automatically enforce:
```sql
-- Users can only insert locations in workspaces they belong to
CREATE POLICY "Users can insert locations in their workspaces"
ON locations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id
    FROM workspace_members
    WHERE workspace_id = locations.workspace_id
  )
);
```

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Unauthorized location creation | JWT validation + RLS policies + explicit workspace membership check |
| Path injection attacks | Input sanitization, character whitelisting, path normalization |
| Hierarchy depth attacks | Enforce max depth of 5 levels |
| Cross-workspace injection | Validate parent belongs to same workspace |
| Name collision attacks | Check sibling uniqueness before insert |

## 7. Error Handling

### Error Handling Strategy
- Handle errors at the beginning of functions (early returns)
- Provide user-friendly error messages in Polish
- Log detailed errors server-side for debugging
- Return appropriate HTTP status codes

### Error Scenarios

| Scenario | Status Code | Error Message | Handling |
|----------|-------------|---------------|----------|
| Missing auth token | 401 | "Nieautoryzowany dostęp" | Middleware catches, returns 401 |
| Invalid JWT token | 401 | "Nieautoryzowany dostęp" | Middleware catches, returns 401 |
| User not workspace member | 403 | "Nie masz uprawnień do tworzenia lokalizacji w tej przestrzeni roboczej" | Service validates, returns 403 |
| Missing workspace_id | 400 | Zod validation error | Zod catches, returns 400 with details |
| Missing name | 400 | "Nazwa lokalizacji jest wymagana" | Zod catches, returns 400 with details |
| Invalid UUID format | 400 | "Nieprawidłowy format ID" | Zod catches, returns 400 with details |
| Parent location not found | 404 | "Nie znaleziono lokalizacji nadrzędnej" | Service checks parent existence, returns 404 |
| Parent in different workspace | 404 | "Nie znaleziono lokalizacji nadrzędnej" | Service validates parent workspace, returns 404 (don't leak workspace info) |
| Max depth exceeded | 400 | "Przekroczono maksymalną głębokość hierarchii. Lokalizacje mogą być zagnieżdżone maksymalnie na 5 poziomach." | Service calculates depth, returns 400 |
| Sibling name conflict | 409 | "Lokalizacja o tej nazwie już istnieje na tym poziomie" | Service checks uniqueness, returns 409 |
| Database constraint violation | 500 | "Nie udało się utworzyć lokalizacji" | Catch database errors, log details, return 500 |
| Unexpected errors | 500 | "Wewnętrzny błąd serwera" | Catch-all handler, log error, return 500 |

### Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  details?: unknown; // Optional validation details from Zod
}
```

## 8. Performance Considerations

### Potential Bottlenecks
1. **Multiple Database Queries:** Workspace check, parent validation, sibling check, insert
2. **Path Uniqueness Checks:** Query to check sibling conflicts could be slow with many locations
3. **RLS Policy Evaluation:** Additional query overhead from RLS policies

### Optimization Strategies

1. **Reduce Query Count**
   - Combine workspace membership and parent validation into single query where possible
   - Let RLS policies handle primary authorization (explicit checks only for better UX)

2. **Database Indexing** (already in schema)
   - GIST index on `path` column for efficient hierarchy queries
   - Unique constraint on `path` within `workspace_id` provides index for conflict checks
   - Index on `workspace_id` for RLS policy performance

3. **Caching Considerations**
   - Parent location data could be cached if frequently accessed
   - Workspace membership could be cached with short TTL
   - Not critical for POST endpoint (write operations), but useful for future reads

4. **Query Optimization**
   - Use Supabase `.select()` with specific columns instead of `SELECT *`
   - Use `.single()` for single-row queries to avoid array allocation
   - Use `.maybeSingle()` when record might not exist (null instead of error)

### Expected Performance
- **Target Response Time:** < 200ms for typical request
- **Database Queries:** 2-4 queries (membership check, parent fetch, conflict check, insert)
- **Network Latency:** Depends on Supabase region, typically 10-50ms

## 9. Implementation Steps

### Step 1: Create Location Service
**File:** `src/lib/services/location.service.ts`

1. Define `LocationService` class or module with `createLocation` method
2. Implement helper function `normalizeLocationName(name: string): string`
   - Convert to lowercase
   - Replace spaces with underscores
   - Remove or replace special characters
   - Validate result matches ltree label requirements
3. Implement helper function `buildLocationPath(parentPath: string | null, normalizedName: string): string`
   - If no parent: return `root.${normalizedName}`
   - If parent: return `${parentPath}.${normalizedName}`
4. Implement helper function `getPathDepth(path: string): number`
   - Split path by dots and count segments
5. Implement main `createLocation` logic:
   - Accept `SupabaseClient`, `userId`, and `CreateLocationRequest`
   - Validate workspace membership
   - Validate parent location if provided
   - Check hierarchy depth
   - Normalize name and build path
   - Check sibling uniqueness
   - Insert location record
   - Return `LocationDto`

### Step 2: Create Zod Validation Schema
**File:** `src/lib/validators/location.validators.ts` (or inline in API route)

1. Import Zod: `import { z } from 'zod'`
2. Define `CreateLocationSchema` with validation rules (Polish error messages)
3. Export schema for use in API route

### Step 3: Create API Route Handler
**File:** `src/pages/api/locations/index.ts`

1. Import dependencies:
   - `import type { APIContext } from 'astro'`
   - `import { z } from 'zod'`
   - `import { LocationService } from '@/lib/services/location.service'`
   - `import { CreateLocationSchema } from '@/lib/validators/location.validators'`
2. Add `export const prerender = false`
3. Implement `POST` function:
   - Extract `supabase` and `user` from `context.locals`
   - Check authentication (return 401 if no user)
   - Parse request body as JSON
   - Validate with Zod schema (catch ZodError, return 400)
   - Call `LocationService.createLocation()`
   - Handle service errors and return appropriate status codes
   - Return 201 with created location on success

### Step 4: Error Handling
**In API Route:**

1. Wrap main logic in try-catch block
2. Handle specific error types:
   - `ZodError` → 400 with validation details
   - Service errors (custom error classes) → appropriate status codes
   - Generic errors → 500
3. Log errors with sufficient context for debugging
4. Return user-friendly error messages in Polish (don't leak sensitive info)

**In Service:**

1. Create custom error classes if needed:
   - `WorkspaceMembershipError` → 403
   - `ParentNotFoundError` → 404
   - `MaxDepthExceededError` → 400
   - `SiblingConflictError` → 409
2. Throw appropriate errors at validation points
3. Let API route handler catch and convert to HTTP responses

### Step 5: Testing & Validation

1. **Manual Testing:**
   - Test with valid data (root location and nested location)
   - Test with missing required fields
   - Test with invalid UUIDs
   - Test with non-existent workspace
   - Test with non-member user
   - Test with non-existent parent
   - Test with parent in different workspace
   - Test max depth exceeded (create 5 levels, try 6th)
   - Test sibling name conflict
   - Test special characters in name

2. **Integration Testing:**
   - Verify RLS policies work correctly
   - Verify ltree paths are generated correctly
   - Verify database constraints are enforced
   - Verify created_at and updated_at are set

3. **Security Testing:**
   - Test without auth token
   - Test with invalid/expired token
   - Test cross-workspace access attempts
   - Test path injection attempts

### Step 6: Documentation & Code Review

1. Add JSDoc comments to service methods
2. Add inline comments for complex logic (path normalization, depth calculation)
3. Ensure code follows project guidelines (CLAUDE.md, guidelines.md)
4. Run linter: `npm run lint`
5. Format code: `npm run format`
6. Submit for code review

### Step 7: Deployment Preparation

1. Verify environment variables are set (Supabase URL, keys)
2. Run build: `npm run build`
3. Test production build locally: `npm run preview`
4. Verify endpoint works in preview mode
5. Deploy to production environment
6. Monitor logs for errors after deployment
7. Test endpoint in production with real data

## 10. Additional Notes

### Name Normalization Details
PostgreSQL ltree labels must match: `[A-Za-z0-9_]` and be 1-256 characters.

**Normalization algorithm:**
```typescript
function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_') // Replace non-alphanumeric (except _) with _
    .replace(/_+/g, '_')          // Collapse multiple underscores
    .replace(/^_|_$/g, '');       // Remove leading/trailing underscores
}
```

**Examples:**
- "Shelf A" → "shelf_a"
- "Top-Left Corner!" → "top_left_corner"
- "Box #123" → "box_123"

### Future Enhancements
1. **Batch Location Creation:** Support creating multiple locations in one request
2. **Location Templates:** Pre-defined location structures (e.g., "Standard Garage Setup")
3. **Location Move:** Allow changing parent_id (rebuild paths for all descendants)
4. **Location Archive:** Soft delete with ability to restore
5. **Location Metadata:** Add custom fields (color coding, icons, dimensions)
6. **Audit Trail:** Track who created/modified locations and when

### Dependencies
- Supabase client (from `src/db/supabase.client.ts`)
- Zod for validation
- Existing types from `src/types.ts`
- Middleware for auth (from `src/middleware/index.ts`)

### Files to Create/Modify
- **Create:** `src/lib/services/location.service.ts`
- **Create:** `src/lib/validators/location.validators.ts` (optional, can inline in route)
- **Create:** `src/pages/api/locations/index.ts` (add POST handler)
- **Modify:** None (all new code)