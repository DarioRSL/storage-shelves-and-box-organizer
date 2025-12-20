# API Endpoint Implementation Plan: GET /api/locations

## 1. Endpoint Overview

The GET /api/locations endpoint retrieves all storage locations within a specified workspace, with optional hierarchical filtering. This endpoint supports lazy loading of the location tree structure by allowing clients to request only direct children of a specific parent location.

**Purpose**: Enable users to browse their hierarchical storage structure (up to 5 levels deep) efficiently, supporting both full tree retrieval and incremental loading for better performance with large location hierarchies.

**Key Features**:
- Multi-tenant workspace isolation
- Hierarchical filtering via parent_id
- Automatic RLS-based authorization
- ltree path conversion for client consumption

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
`/api/locations`

### Query Parameters

#### Required Parameters
- **workspace_id** (UUID, required)
  - Description: The ID of the workspace to query locations from
  - Validation: Must be a valid UUID format
  - Example: `?workspace_id=550e8400-e29b-41d4-a716-446655440000`

#### Optional Parameters
- **parent_id** (UUID, optional)
  - Description: Filter locations to only return direct children of this parent
  - Validation: Must be a valid UUID format or null
  - When null/omitted: Returns root-level locations (locations with no parent)
  - When provided: Returns only locations that are direct children of the specified parent
  - Example: `?workspace_id=550e8400-e29b-41d4-a716-446655440000&parent_id=7c9e6679-7425-40de-944b-e07fc1f90ae7`

### Request Headers
- **Authorization**: `Bearer <jwt_token>` (required)
  - Supabase JWT token for authentication
  - Set automatically by Astro middleware via `context.locals.supabase`

### Request Body
None (GET request)

## 3. Utilized Types

### Response DTO
```typescript
// From src/types.ts
export interface LocationDto extends Omit<Tables<"locations">, "path"> {
  path: string; // ltree converted to string (e.g., "root.basement.shelf_a")
  parent_id?: string | null; // Derived from hierarchy
}
```

**LocationDto Fields**:
- `id`: UUID - Unique location identifier
- `workspace_id`: UUID - Workspace this location belongs to
- `parent_id`: UUID | null - Parent location ID (derived, not stored directly)
- `name`: string - Location name (e.g., "Basement", "Shelf A")
- `description`: string | null - Optional description
- `path`: string - Full hierarchical path (ltree as string)
- `is_deleted`: boolean - Soft delete flag
- `created_at`: timestamp - Creation timestamp
- `updated_at`: timestamp - Last update timestamp

### Query Parameters Type
```typescript
// From src/types.ts
export interface GetLocationsQuery {
  workspace_id: string;
  parent_id?: string | null;
}
```

### Validation Schema (Zod)
```typescript
import { z } from 'zod';

const GetLocationsQuerySchema = z.object({
  workspace_id: z.string().uuid({ message: 'workspace_id must be a valid UUID' }),
  parent_id: z.string().uuid({ message: 'parent_id must be a valid UUID' }).optional().nullable(),
});
```

## 4. Response Details

### Success Response (200 OK)

**Content-Type**: `application/json`

**Body Structure**: Array of LocationDto objects

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_id": null,
    "name": "Basement",
    "description": "Main storage area",
    "path": "root.basement",
    "is_deleted": false,
    "created_at": "2024-12-15T10:00:00Z",
    "updated_at": "2024-12-15T10:00:00Z"
  },
  {
    "id": "8d0f7780-8536-51ef-b827-557766551111",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_id": null,
    "name": "Garage",
    "description": "Vehicle storage and tools",
    "path": "root.garage",
    "is_deleted": false,
    "created_at": "2024-12-15T11:00:00Z",
    "updated_at": "2024-12-15T11:00:00Z"
  }
]
```

### Error Responses

#### 400 Bad Request
**Scenario**: Missing required workspace_id or invalid UUID format

```json
{
  "error": "Missing required parameter: workspace_id"
}
```

```json
{
  "error": "Invalid UUID format for workspace_id"
}
```

#### 401 Unauthorized
**Scenario**: User is not authenticated or session is invalid

```json
{
  "error": "Unauthorized: Authentication required"
}
```

#### 403 Forbidden
**Scenario**: User is not a member of the requested workspace (if not handled by RLS)

```json
{
  "error": "Forbidden: You do not have access to this workspace"
}
```

#### 500 Internal Server Error
**Scenario**: Database query failure or unexpected server error

```json
{
  "error": "Internal server error",
  "details": "Failed to retrieve locations"
}
```

## 5. Data Flow

### Request Flow
1. **Client Request** → Astro API route handler (`src/pages/api/locations.ts`)
2. **Middleware Processing** → Astro middleware validates session, attaches `supabase` client to `context.locals`
3. **Authentication Check** → Verify user is authenticated via `context.locals.supabase.auth.getUser()`
4. **Input Validation** → Validate query parameters using Zod schema
5. **Service Layer** → Call `LocationService.getLocations(workspace_id, parent_id, user_id)`
6. **Database Query** → Supabase query to `locations` table with filters
7. **RLS Enforcement** → PostgreSQL RLS policies validate workspace membership automatically
8. **Data Transformation** → Convert ltree path to string, derive parent_id from path
9. **Response Formation** → Return JSON array of LocationDto objects

### Database Query Logic

```typescript
// Pseudo-code for service layer
async getLocations(workspaceId: string, parentId?: string | null, userId: string) {
  let query = supabase
    .from('locations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (parentId === undefined || parentId === null) {
    // Get root-level locations (path depth = 2, e.g., "root.basement")
    query = query.filter('path', 'nlevel', 'eq', 2);
  } else {
    // Get children of specific parent
    // Use ltree operators to find direct children only
    const parentPath = await getLocationPath(parentId);
    query = query.like('path', `${parentPath}.*{1}`); // Direct children only
  }

  const { data, error } = await query;

  if (error) throw error;

  // Transform data: convert ltree to string, derive parent_id
  return data.map(location => ({
    ...location,
    path: location.path.toString(),
    parent_id: deriveParentId(location.path),
  }));
}
```

### Hierarchy Path Derivation
- **ltree format**: `root.basement.shelf_a.section_1`
- **parent_id derivation**: Extract the second-to-last segment from path
  - Example: `root.basement.shelf_a` → parent_id is ID of location with path `root.basement`

## 6. Security Considerations

### Authentication
- **Mechanism**: Supabase Auth with JWT tokens
- **Implementation**: Astro middleware extracts and validates JWT from `Authorization: Bearer <token>` header
- **Session Validation**: Use `context.locals.supabase.auth.getUser()` to verify active session
- **Error Handling**: Return 401 if session is invalid or missing

### Authorization
- **Multi-Tenant Isolation**: Workspace-based data segregation
- **RLS Policies**: PostgreSQL Row Level Security enforces access control
- **Helper Function**: `is_workspace_member(workspace_id)` validates user membership
- **Policy Logic**:
  ```sql
  -- Locations table RLS policy for SELECT
  CREATE POLICY "Users can view locations in their workspaces"
  ON locations FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
  ```

### Input Validation
- **UUID Validation**: Use Zod to ensure workspace_id and parent_id are valid UUIDs
- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **Type Safety**: TypeScript types enforce correct data structures

### Data Sanitization
- **Output Sanitization**: Ensure ltree paths are properly converted to strings
- **XSS Prevention**: Encode special characters in location names and descriptions (handled by JSON serialization)

## 7. Error Handling

### Validation Errors (400)
**Triggers**:
- Missing `workspace_id` query parameter
- Invalid UUID format for `workspace_id` or `parent_id`
- Malformed query parameters

**Handling**:
```typescript
const validationResult = GetLocationsQuerySchema.safeParse({
  workspace_id: url.searchParams.get('workspace_id'),
  parent_id: url.searchParams.get('parent_id') || null,
});

if (!validationResult.success) {
  return new Response(
    JSON.stringify({ error: validationResult.error.errors[0].message }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Authentication Errors (401)
**Triggers**:
- Missing Authorization header
- Invalid or expired JWT token
- User session not found

**Handling**:
```typescript
const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized: Authentication required' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Authorization Errors (403)
**Triggers**:
- User is not a member of the requested workspace
- RLS policy blocks access (returns empty array, not explicit 403)

**Note**: With proper RLS implementation, Supabase will automatically filter results, so explicit 403 may not be needed. The endpoint will return an empty array if the user has no access.

### Database Errors (500)
**Triggers**:
- Supabase query failure
- Network issues with database
- Unexpected database constraints

**Handling**:
```typescript
try {
  const locations = await LocationService.getLocations(workspace_id, parent_id, user.id);
  return new Response(JSON.stringify(locations), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  console.error('Error fetching locations:', error);
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      details: 'Failed to retrieve locations'
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Edge Cases
1. **Empty Results**: Return `[]` when no locations match criteria (valid success case)
2. **Deleted Locations**: Filter out soft-deleted locations (`is_deleted = true`)
3. **Invalid parent_id**: If parent_id doesn't exist, return empty array (valid query, no matches)
4. **Deep Hierarchy**: Ensure path depth validation doesn't break queries

## 8. Performance Considerations

### Query Optimization
- **Indexing**: Ensure GIST index exists on `path` column for efficient ltree queries
- **Filtering**: Apply `is_deleted = false` filter to reduce result set
- **Ordering**: Use database-level ordering (`ORDER BY name ASC`) for consistency

### Database Indexes
```sql
-- From db-plan.md, ensure these exist:
CREATE INDEX idx_locations_path ON locations USING GIST (path);
CREATE INDEX idx_locations_workspace_id ON locations (workspace_id);
CREATE UNIQUE INDEX idx_locations_workspace_path ON locations (workspace_id, path);
```

### Caching Strategy
- **Client-Side**: Implement cache headers for browser caching
  ```typescript
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=60', // Cache for 60 seconds
  }
  ```
- **Server-Side**: Consider implementing a simple in-memory cache for frequently accessed workspaces (future optimization)

### Lazy Loading Support
- **Parent-based filtering**: Allows clients to load tree incrementally
- **Reduces initial payload**: Only fetch root nodes first, then expand as needed
- **UI Performance**: Prevents rendering large tree structures upfront

### Potential Bottlenecks
1. **Large Workspace**: Workspaces with 1000+ locations may need pagination
2. **Deep Hierarchy**: 5-level deep trees with many nodes per level
3. **Concurrent Requests**: Multiple users querying same workspace simultaneously

### Optimization Strategies
- **Pagination**: Add `limit` and `offset` parameters for large result sets (future enhancement)
- **Field Selection**: Only select necessary fields to reduce payload size
- **Connection Pooling**: Ensure Supabase connection pool is properly configured

## 9. Implementation Steps

### Step 1: Create API Route File
**File**: `src/pages/api/locations.ts`

**Actions**:
1. Create new file in `src/pages/api/` directory
2. Disable prerendering: `export const prerender = false`
3. Set up TypeScript imports for types, Zod, and utilities

**Code Structure**:
```typescript
import type { APIContext } from 'astro';
import { z } from 'zod';
import type { LocationDto, GetLocationsQuery } from '../../types';

export const prerender = false;

export async function GET(context: APIContext) {
  // Implementation follows in subsequent steps
}
```

### Step 2: Implement Input Validation
**Actions**:
1. Define Zod schema for query parameters
2. Extract and validate `workspace_id` and `parent_id` from URL search params
3. Return 400 error for validation failures

**Implementation**:
```typescript
const GetLocationsQuerySchema = z.object({
  workspace_id: z.string().uuid({ message: 'workspace_id must be a valid UUID' }),
  parent_id: z.string().uuid({ message: 'parent_id must be a valid UUID' }).optional().nullable(),
});

const url = new URL(context.request.url);
const validationResult = GetLocationsQuerySchema.safeParse({
  workspace_id: url.searchParams.get('workspace_id'),
  parent_id: url.searchParams.get('parent_id') || null,
});

if (!validationResult.success) {
  return new Response(
    JSON.stringify({ error: validationResult.error.errors[0].message }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

const { workspace_id, parent_id } = validationResult.data;
```

### Step 3: Implement Authentication Check
**Actions**:
1. Extract authenticated user from `context.locals.supabase`
2. Verify user session is valid
3. Return 401 error if authentication fails

**Implementation**:
```typescript
const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized: Authentication required' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Step 4: Create Location Service
**File**: `src/lib/services/locationService.ts`

**Actions**:
1. Create new service file if it doesn't exist
2. Implement `getLocations` method with Supabase query logic
3. Handle ltree path conversion and parent_id derivation
4. Implement proper error handling and logging

**Service Interface**:
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { LocationDto } from '../../types';

export class LocationService {
  constructor(private supabase: SupabaseClient) {}

  async getLocations(
    workspaceId: string,
    parentId?: string | null
  ): Promise<LocationDto[]> {
    // Query implementation (see Step 5)
  }

  private deriveParentId(path: string): string | null {
    // Extract parent from ltree path
    const segments = path.split('.');
    if (segments.length <= 2) return null; // Root level
    // Return ID of parent location based on parent path
    // This requires a secondary query or pre-fetching parent IDs
  }
}
```

### Step 5: Implement Database Query Logic
**Actions**:
1. Build Supabase query with workspace_id filter
2. Add parent_id filtering logic (root vs. children)
3. Filter out soft-deleted locations
4. Order results by name
5. Transform ltree paths to strings

**Query Implementation**:
```typescript
async getLocations(
  workspaceId: string,
  parentId?: string | null
): Promise<LocationDto[]> {
  let query = this.supabase
    .from('locations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (parentId === undefined || parentId === null) {
    // Get root-level locations (path depth = 2: "root.location_name")
    // Using raw SQL via rpc or filter on path length
    // Note: Supabase may not support nlevel directly, use text_pattern_ops
    query = query.ilike('path', 'root.%').not('path', 'ilike', 'root.%.%');
  } else {
    // Get direct children of parent
    const { data: parent, error: parentError } = await this.supabase
      .from('locations')
      .select('path')
      .eq('id', parentId)
      .single();

    if (parentError || !parent) {
      throw new Error('Parent location not found');
    }

    // Filter for direct children: parent_path.* but not parent_path.*.*
    const parentPath = parent.path;
    query = query
      .ilike('path', `${parentPath}.%`)
      .not('path', 'ilike', `${parentPath}.%.%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Database error fetching locations:', error);
    throw new Error('Failed to fetch locations');
  }

  // Transform data: convert path to string, derive parent_id
  return data.map((location) => this.transformLocation(location));
}

private transformLocation(location: any): LocationDto {
  const pathSegments = location.path.split('.');
  let parent_id: string | null = null;

  if (pathSegments.length > 2) {
    // Has a parent - need to derive parent_id from parent path
    // This requires either:
    // 1. A join query to fetch parent IDs
    // 2. Storing parent_id in the database (recommended)
    // 3. A secondary lookup
    // For now, set to null and implement parent_id fetching separately
    parent_id = null; // TODO: Implement parent_id derivation
  }

  return {
    ...location,
    path: location.path,
    parent_id,
  };
}
```

**Note on parent_id Derivation**:
The current database schema stores only the ltree `path`, not an explicit `parent_id`. To efficiently return `parent_id` in the response, consider:
1. **Option A**: Add a computed column or modify query to join with parent locations
2. **Option B**: Store `parent_id` as a regular column (requires migration)
3. **Option C**: Client-side derivation from path (simplest for MVP)

**Recommended Approach**: Use a Supabase RPC function or modify the select to include a lateral join:
```sql
SELECT
  l.*,
  (SELECT id FROM locations p WHERE p.path = subpath(l.path, 0, nlevel(l.path) - 1) LIMIT 1) as parent_id
FROM locations l
WHERE workspace_id = $1 AND is_deleted = false;
```

### Step 6: Integrate Service in API Route
**Actions**:
1. Instantiate LocationService with Supabase client
2. Call `getLocations` method with validated parameters
3. Return successful response with location data
4. Implement error handling with appropriate status codes

**Integration Code**:
```typescript
import { LocationService } from '../../lib/services/locationService';

export async function GET(context: APIContext) {
  // ... validation and auth steps from above ...

  try {
    const locationService = new LocationService(context.locals.supabase);
    const locations = await locationService.getLocations(workspace_id, parent_id);

    return new Response(JSON.stringify(locations), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: 'Failed to retrieve locations'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Step 7: Add TypeScript Type Safety
**Actions**:
1. Ensure all types are imported from `src/types.ts`
2. Add proper return type annotations to service methods
3. Use SupabaseClient type from `src/db/supabase.client.ts`
4. Validate response structure matches LocationDto

**Type Imports**:
```typescript
import type { SupabaseClient } from '../../db/supabase.client';
import type { LocationDto, GetLocationsQuery } from '../../types';
```

### Step 8: Test Error Scenarios
**Actions**:
1. Test with missing workspace_id → Expect 400
2. Test with invalid UUID format → Expect 400
3. Test without authentication → Expect 401
4. Test with workspace user doesn't belong to → Expect empty array (RLS)
5. Test with invalid parent_id → Expect empty array
6. Test with valid parameters → Expect 200 with location array

**Manual Testing Checklist**:
- [ ] Missing workspace_id returns 400
- [ ] Invalid workspace_id UUID returns 400
- [ ] Invalid parent_id UUID returns 400
- [ ] Unauthenticated request returns 401
- [ ] Valid request returns 200 with locations array
- [ ] Request with parent_id returns only children
- [ ] Request without parent_id returns only root locations
- [ ] Deleted locations are not returned
- [ ] Locations are ordered by name

### Step 9: Implement Logging and Monitoring
**Actions**:
1. Add structured logging for errors
2. Log query parameters for debugging (sanitize sensitive data)
3. Log performance metrics (query duration)
4. Consider adding request ID for tracing

**Logging Example**:
```typescript
console.error('Error fetching locations:', {
  error: error.message,
  workspace_id,
  parent_id,
  user_id: user.id,
  timestamp: new Date().toISOString(),
});
```

### Step 10: Documentation and Code Review
**Actions**:
1. Add JSDoc comments to service methods
2. Document query parameter behavior
3. Add inline comments for complex ltree logic
4. Update API documentation if needed
5. Request code review from team

**JSDoc Example**:
```typescript
/**
 * Retrieves locations for a specific workspace with optional parent filtering.
 *
 * @param workspaceId - The UUID of the workspace to query
 * @param parentId - Optional parent location ID to filter children (null for root locations)
 * @returns Promise resolving to array of LocationDto objects
 * @throws Error if database query fails or parent location not found
 */
async getLocations(
  workspaceId: string,
  parentId?: string | null
): Promise<LocationDto[]>
```

### Step 11: Final Integration Testing
**Actions**:
1. Test full request flow from client to database
2. Verify RLS policies work correctly
3. Test with multiple workspaces and users
4. Verify performance with large datasets
5. Test lazy loading behavior (parent_id filtering)

### Step 12: Deploy and Monitor
**Actions**:
1. Merge implementation to main branch
2. Deploy to staging environment
3. Run smoke tests on staging
4. Monitor error rates and performance
5. Deploy to production
6. Monitor production metrics and user feedback

---

## Implementation Checklist

- [ ] Step 1: Create API route file (`src/pages/api/locations.ts`)
- [ ] Step 2: Implement input validation with Zod
- [ ] Step 3: Implement authentication check
- [ ] Step 4: Create LocationService class
- [ ] Step 5: Implement database query logic with ltree handling
- [ ] Step 6: Integrate service in API route
- [ ] Step 7: Add TypeScript type safety
- [ ] Step 8: Test all error scenarios
- [ ] Step 9: Implement logging and monitoring
- [ ] Step 10: Add documentation and request code review
- [ ] Step 11: Perform integration testing
- [ ] Step 12: Deploy and monitor

## Additional Notes

### ltree and parent_id Handling
The current database schema uses ltree for hierarchical storage but doesn't store an explicit `parent_id` column. For the initial implementation, we have three options:

1. **Client-side derivation**: Return path only, let client derive parent relationships
2. **Database function**: Create a Postgres function to compute parent_id on-the-fly
3. **Schema migration**: Add `parent_id` column and maintain it via triggers (recommended for production)

**Recommended**: Implement Option 2 for MVP, plan Option 3 for v2 to improve performance.

### Future Enhancements
- Add pagination support (`limit`, `offset` parameters)
- Implement search/filter by location name
- Add `include_deleted` parameter for admin users
- Consider GraphQL for more flexible queries
- Implement WebSocket updates for real-time location changes
