# API Endpoint Implementation Plan: PATCH /api/locations/:id

## 1. Endpoint Overview

The `PATCH /api/locations/:id` endpoint updates the name and/or description of an existing location in the hierarchical storage structure. This endpoint supports partial updates, allowing clients to modify only the fields they need to change. When the location name is updated, the underlying `path` (ltree) must be regenerated to maintain the hierarchical integrity of the location tree.

**Key Characteristics:**
- Supports partial updates (name, description, or both)
- Requires at least one field to be updated
- Regenerates hierarchical path (ltree) when name changes
- Enforces sibling name uniqueness within the same parent
- Protected by Row Level Security (RLS) policies
- Implements soft-delete awareness (cannot update deleted locations)

## 2. Request Details

### HTTP Method
`PATCH`

### URL Structure
```
PATCH /api/locations/:id
```

### Path Parameters
- **id** (UUID, required): The unique identifier of the location to update

### Request Headers
- `Authorization: Bearer <token>` (required): JWT token for authentication
- `Content-Type: application/json` (required)

### Request Body
JSON object with optional fields (at least one must be provided):

```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Field Specifications:**
- **name** (string, optional): New name for the location
  - Must not be empty
  - Must be unique among sibling locations (same parent)
  - Used to regenerate the ltree path if changed
- **description** (string | null, optional): New description for the location
  - Can be null to clear the description
  - No length restrictions in API spec (database supports TEXT type)

### Validation Rules
1. At least one field (name or description) must be present in the request body
2. If `name` is provided, it must not be an empty string
3. If `name` is provided, it must not conflict with existing sibling locations
4. The `id` parameter must be a valid UUID format

## 3. Utilized Types

### Request Type
**Source**: [types.ts:105](src/types.ts#L105)

```typescript
export type UpdateLocationRequest = Partial<Pick<Tables<"locations">, "name" | "description">>;
```

### Response Type
**Source**: [types.ts:111-116](src/types.ts#L111-L116)

```typescript
export interface UpdateLocationResponse {
  id: string;
  name: string;
  description: string | null;
  updated_at: string | null;
}
```

### Database Row Type
**Source**: [types.ts:78-87](src/types.ts#L78-L87)

```typescript
export interface LocationDto extends Omit<Tables<"locations">, "path"> {
  path: string;
  parent_id?: string | null;
}
```

### Zod Validation Schema (to be created)
```typescript
// In API route file
const updateLocationSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  description: z.string().nullable().optional(),
}).refine(data => data.name !== undefined || data.description !== undefined, {
  message: "At least one field (name or description) must be provided"
});

const paramsSchema = z.object({
  id: z.string().uuid("Invalid location ID format")
});
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "description": "Updated description",
  "updated_at": "2023-10-27T10:15:00Z"
}
```

**Headers**:
- `Content-Type: application/json`

### Error Responses

#### 400 Bad Request
**Scenario**: Invalid input data
```json
{
  "error": "Validation error",
  "details": {
    "issues": [
      {
        "path": ["name"],
        "message": "Name cannot be empty"
      }
    ]
  }
}
```

**Common Causes**:
- Empty request body
- Invalid UUID format for `id`
- Empty string for `name`
- Invalid data types
- Name conflicts with sibling location

#### 401 Unauthorized
**Scenario**: Missing or invalid authentication
```json
{
  "error": "Unauthorized"
}
```

**Common Causes**:
- Missing Authorization header
- Invalid or expired JWT token
- User not authenticated

#### 403 Forbidden
**Scenario**: User lacks permission
```json
{
  "error": "Forbidden: You do not have access to this location"
}
```

**Common Causes**:
- User is not a member of the workspace that owns the location
- RLS policy blocks access

#### 404 Not Found
**Scenario**: Location doesn't exist or is deleted
```json
{
  "error": "Location not found"
}
```

**Common Causes**:
- No location exists with the given ID
- Location is soft-deleted (is_deleted = true)
- Location belongs to different workspace

#### 409 Conflict
**Scenario**: Name conflicts with sibling location
```json
{
  "error": "A location with this name already exists at this level"
}
```

**Common Causes**:
- Attempting to rename a location to a name that already exists among its siblings

#### 500 Internal Server Error
**Scenario**: Unexpected server error
```json
{
  "error": "Internal server error",
  "details": "Error message for debugging"
}
```

**Common Causes**:
- Database connection failure
- Path regeneration logic failure
- Unexpected exceptions

## 5. Data Flow

### High-Level Flow
1. **Request Reception**: API route receives PATCH request with location ID and update data
2. **Authentication**: Middleware validates JWT token and extracts user identity
3. **Input Validation**: Validate path parameter (UUID) and request body (Zod schema)
4. **Service Invocation**: Call `updateLocation()` service with validated data
5. **Authorization Check**: Service verifies user has workspace access (via RLS)
6. **Existence Check**: Verify location exists and is not soft-deleted
7. **Name Conflict Check**: If name is being updated, check for sibling name conflicts
8. **Path Regeneration**: If name changes, regenerate the ltree path for this location and all descendants
9. **Database Update**: Execute UPDATE query with new data
10. **Response Formation**: Return updated location data with 200 status

### Detailed Service Layer Flow

```typescript
async function updateLocation(
  supabase: SupabaseClient,
  locationId: string,
  userId: string,
  data: UpdateLocationRequest
): Promise<UpdateLocationResponse>
```

**Steps**:

1. **Fetch Current Location**:
   ```typescript
   const { data: location, error } = await supabase
     .from('locations')
     .select('id, workspace_id, name, description, path, is_deleted, parent_id')
     .eq('id', locationId)
     .single();
   ```
   - If error or no data: throw 404 error
   - If `is_deleted = true`: throw 404 error

2. **Authorization** (handled by RLS):
   - RLS policy automatically checks `is_workspace_member(location.workspace_id)`
   - If user lacks access, Supabase returns empty result or error

3. **Name Conflict Check** (if name is being updated):
   ```typescript
   if (data.name && data.name !== location.name) {
     // Get parent path for sibling check
     const parentPath = getParentPath(location.path);

     // Check for siblings with same name
     const { data: siblings } = await supabase
       .from('locations')
       .select('id')
       .eq('workspace_id', location.workspace_id)
       .eq('is_deleted', false)
       .ilike('path', `${parentPath}.${slugify(data.name)}`)
       .neq('id', locationId);

     if (siblings && siblings.length > 0) {
       throw new ConflictError('A location with this name already exists at this level');
     }
   }
   ```

4. **Path Regeneration** (if name changes):
   ```typescript
   if (data.name && data.name !== location.name) {
     // Generate new path segment
     const newPathSegment = slugify(data.name);
     const parentPath = getParentPath(location.path);
     const newPath = `${parentPath}.${newPathSegment}`;

     // Update this location's path
     updateData.path = newPath;

     // Update all descendant paths using ltree operators
     // This should be done in a transaction to ensure atomicity
   }
   ```

5. **Execute Update**:
   ```typescript
   const { data: updated, error: updateError } = await supabase
     .from('locations')
     .update({
       name: data.name ?? location.name,
       description: data.description ?? location.description,
       ...(newPath && { path: newPath })
     })
     .eq('id', locationId)
     .select('id, name, description, updated_at')
     .single();
   ```

6. **Return Response**:
   ```typescript
   return {
     id: updated.id,
     name: updated.name,
     description: updated.description,
     updated_at: updated.updated_at
   };
   ```

### Database Interaction

**Primary Table**: `public.locations`

**Update Query**:
```sql
UPDATE locations
SET
  name = $1,
  description = $2,
  path = $3  -- Only if name changed
WHERE id = $4
  AND is_deleted = false
RETURNING id, name, description, updated_at;
```

**RLS Policy Applied**:
```sql
-- Policy: workspace members can update locations
is_workspace_member(workspace_id)
```

**Trigger Executed**:
- `moddatetime` trigger automatically updates `updated_at` timestamp

## 6. Security Considerations

### Authentication
- **Mechanism**: JWT token validation via Supabase Auth
- **Implementation**: Handled by Astro middleware in `src/middleware/index.ts`
- **Token Location**: `Authorization: Bearer <token>` header
- **User Context**: Available in `context.locals.user`

### Authorization
- **Mechanism**: PostgreSQL Row Level Security (RLS)
- **Policy**: Users can only update locations in workspaces they are members of
- **Helper Function**: `is_workspace_member(workspace_id)`
- **Implementation**: Automatic enforcement by Supabase client

### Input Validation
1. **Path Parameter Validation**:
   - UUID format validation using Zod
   - Prevents SQL injection via invalid IDs

2. **Request Body Validation**:
   - Zod schema validation for type safety
   - Empty string prevention for name
   - At least one field requirement

3. **SQL Injection Prevention**:
   - Use Supabase client parameterized queries
   - Never concatenate user input into SQL strings

### Business Logic Security
1. **Soft Delete Awareness**:
   - Prevent updates to deleted locations
   - Check `is_deleted = false` in queries

2. **Name Uniqueness Enforcement**:
   - Verify no sibling conflicts before update
   - Prevent duplicate paths in hierarchy

3. **Path Integrity**:
   - Validate ltree depth constraints (max 5 levels)
   - Ensure proper path regeneration for descendants

### Error Message Security
- **Avoid Information Disclosure**: Don't reveal internal system details
- **Generic Error Messages**: Use "Location not found" instead of "Location exists but you don't have access"
- **Logging**: Log detailed errors server-side for debugging

## 7. Error Handling

### Error Handling Strategy

**Principle**: Handle errors at the beginning of functions, use early returns, place happy path last.

### API Route Level Error Handling

```typescript
export async function PATCH(context: APIContext) {
  try {
    // 1. Extract and validate path parameters
    const { id } = context.params;
    const paramValidation = paramsSchema.safeParse({ id });

    if (!paramValidation.success) {
      return new Response(JSON.stringify({
        error: "Invalid location ID format",
        details: paramValidation.error.format()
      }), { status: 400 });
    }

    // 2. Check authentication
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), { status: 401 });
    }

    // 3. Parse and validate request body
    const body = await context.request.json();
    const validation = updateLocationSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({
        error: "Validation error",
        details: validation.error.format()
      }), { status: 400 });
    }

    // 4. Call service layer
    const supabase = context.locals.supabase;
    const result = await updateLocation(supabase, id, user.id, validation.data);

    // 5. Return success response
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (error) {
    // Handle specific error types
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({
        error: error.message
      }), { status: 404 });
    }

    if (error instanceof ConflictError) {
      return new Response(JSON.stringify({
        error: error.message
      }), { status: 409 });
    }

    if (error instanceof ForbiddenError) {
      return new Response(JSON.stringify({
        error: error.message
      }), { status: 403 });
    }

    // Log unexpected errors
    console.error("Error updating location:", error);

    // Return generic error to client
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), { status: 500 });
  }
}
```

### Service Layer Error Handling

```typescript
export async function updateLocation(
  supabase: SupabaseClient,
  locationId: string,
  userId: string,
  data: UpdateLocationRequest
): Promise<UpdateLocationResponse> {
  // 1. Fetch location
  const { data: location, error: fetchError } = await supabase
    .from('locations')
    .select('id, workspace_id, name, description, path, is_deleted')
    .eq('id', locationId)
    .single();

  // Handle fetch errors
  if (fetchError || !location) {
    throw new NotFoundError("Location not found");
  }

  // Check soft delete
  if (location.is_deleted) {
    throw new NotFoundError("Location not found");
  }

  // 2. Check for name conflicts (if name is changing)
  if (data.name && data.name !== location.name) {
    const conflictExists = await checkSiblingNameConflict(
      supabase,
      location.workspace_id,
      location.path,
      data.name,
      locationId
    );

    if (conflictExists) {
      throw new ConflictError("A location with this name already exists at this level");
    }
  }

  // 3. Prepare update data
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  // 4. Handle path regeneration if name changes
  if (data.name && data.name !== location.name) {
    const newPath = regeneratePath(location.path, data.name);
    updateData.path = newPath;
  }

  // 5. Execute update
  const { data: updated, error: updateError } = await supabase
    .from('locations')
    .update(updateData)
    .eq('id', locationId)
    .select('id, name, description, updated_at')
    .single();

  // Handle update errors
  if (updateError) {
    // RLS might block access - return 404 to avoid info disclosure
    if (updateError.code === 'PGRST116') {
      throw new NotFoundError("Location not found");
    }

    console.error("Database error updating location:", updateError);
    throw new Error("Failed to update location");
  }

  // 6. Return formatted response
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    updated_at: updated.updated_at
  };
}
```

### Custom Error Classes

```typescript
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Path Regeneration**:
   - **Issue**: When renaming a location with many descendants, all child paths must be updated
   - **Impact**: O(n) where n = number of descendants
   - **Mitigation**: Use PostgreSQL ltree operators for efficient bulk updates

2. **Sibling Name Conflict Check**:
   - **Issue**: Pattern matching on paths to find siblings
   - **Impact**: Potentially slow with large location trees
   - **Mitigation**: Use GiST index on path column (already defined in schema)

3. **RLS Policy Evaluation**:
   - **Issue**: `is_workspace_member()` function called on every query
   - **Impact**: Additional query overhead
   - **Mitigation**: Ensure `workspace_members` table is indexed on `user_id` and `workspace_id`

### Optimization Strategies

1. **Database Indexes**:
   - Ensure GiST index exists on `locations.path` (defined in schema)
   - Index on `workspace_id` for faster workspace filtering
   - Index on `is_deleted` for soft-delete filtering

2. **Query Optimization**:
   - Use `.single()` instead of `.limit(1)` for better error handling
   - Select only required fields in queries
   - Use database-level constraints instead of application-level checks where possible

3. **Path Update Optimization**:
   ```sql
   -- Instead of updating descendants one-by-one, use ltree operators:
   UPDATE locations
   SET path = new_parent_path || subpath(path, nlevel(old_parent_path))
   WHERE path <@ old_parent_path
     AND id != parent_location_id;
   ```

4. **Caching Considerations**:
   - Location hierarchy rarely changes
   - Consider caching location tree on frontend
   - Use optimistic UI updates for instant feedback

5. **Transaction Usage**:
   - Wrap path updates in a transaction to ensure atomicity
   - Prevents partial updates if descendant path regeneration fails

### Performance Monitoring

**Key Metrics**:
- Average response time for location updates
- 95th percentile latency
- Database query execution time
- Number of descendant locations affected by path updates

**Logging**:
```typescript
console.log(`Location ${locationId} updated in ${Date.now() - startTime}ms`);
if (descendantsUpdated > 0) {
  console.log(`Updated ${descendantsUpdated} descendant paths`);
}
```

## 9. Implementation Steps

### Step 1: Create Service Layer
**File**: `src/lib/services/locations.service.ts`

**Tasks**:
1. Create file structure and imports
2. Define custom error classes (NotFoundError, ConflictError, ForbiddenError)
3. Implement `updateLocation()` function:
   - Add function signature with proper types
   - Implement location fetch and validation
   - Implement soft-delete check
   - Implement name conflict check helper
   - Implement path regeneration logic
   - Implement database update
   - Add error handling with custom error types
4. Implement helper functions:
   - `getParentPath(path: string): string` - Extract parent path from ltree
   - `slugify(name: string): string` - Convert name to path segment
   - `regeneratePath(oldPath: string, newName: string): string` - Generate new path
   - `checkSiblingNameConflict()` - Check for duplicate sibling names
5. Export all functions

**Expected Outcome**: Reusable service layer with clean separation of concerns

---

### Step 2: Create API Route
**File**: `src/pages/api/locations/[id].ts`

**Tasks**:
1. Create file and add required imports:
   - Zod for validation
   - Service functions from `src/lib/services/locations.service.ts`
   - Types from `src/types.ts`
2. Disable prerendering: `export const prerender = false`
3. Define Zod validation schemas:
   - `paramsSchema` for UUID validation
   - `updateLocationSchema` for request body validation
4. Implement `PATCH` handler:
   - Extract and validate path parameters
   - Check user authentication
   - Parse and validate request body
   - Call service layer
   - Format and return response
5. Implement comprehensive error handling:
   - Handle custom error types (404, 409, 403)
   - Handle validation errors (400)
   - Handle unexpected errors (500)
   - Add appropriate logging
6. Add JSDoc comments for documentation

**Expected Outcome**: Fully functional API endpoint with proper validation and error handling

---

### Step 3: Add Tests (Optional but Recommended)
**File**: `src/lib/services/__tests__/locations.service.test.ts`

**Tasks**:
1. Set up test environment with Supabase client mocks
2. Write unit tests for service functions:
   - Test successful update (name only)
   - Test successful update (description only)
   - Test successful update (both fields)
   - Test location not found error
   - Test soft-deleted location error
   - Test name conflict error
   - Test path regeneration
3. Write integration tests for API endpoint:
   - Test 200 OK response
   - Test 400 Bad Request (invalid input)
   - Test 401 Unauthorized (no auth)
   - Test 403 Forbidden (wrong workspace)
   - Test 404 Not Found
   - Test 409 Conflict (duplicate name)

**Expected Outcome**: Comprehensive test coverage ensuring reliability

---

### Step 4: Update Path Regeneration Logic
**File**: `src/lib/services/locations.service.ts` (enhancement)

**Tasks**:
1. Create database function or service method for bulk path updates
2. Implement transaction wrapper for atomic updates
3. Add descendant path update logic:
   ```typescript
   async function updateDescendantPaths(
     supabase: SupabaseClient,
     locationId: string,
     oldPath: string,
     newPath: string
   ): Promise<number>
   ```
4. Test path regeneration with nested locations
5. Add logging for descendant updates

**Expected Outcome**: Robust path regeneration that maintains hierarchy integrity

---

### Step 5: Documentation and Code Review
**Files**: Various

**Tasks**:
1. Add JSDoc comments to all exported functions
2. Document service layer usage in `.ai_docs/` if needed
3. Update API documentation with examples
4. Review code against coding guidelines:
   - Check error handling follows early-return pattern
   - Verify no unnecessary else statements
   - Ensure proper TypeScript types
   - Validate Zod schemas are comprehensive
5. Run linter: `npm run lint:fix`
6. Manual code review for security and performance

**Expected Outcome**: Well-documented, maintainable code

---

### Step 6: Manual Testing
**Tools**: Postman, Thunder Client, or curl

**Test Cases**:
1. **Happy Path**:
   - Update location name successfully
   - Update location description successfully
   - Update both fields successfully

2. **Error Cases**:
   - Try updating with empty name (400)
   - Try updating with duplicate sibling name (409)
   - Try updating non-existent location (404)
   - Try updating deleted location (404)
   - Try updating without auth token (401)
   - Try updating location in different workspace (404/403)

3. **Edge Cases**:
   - Update with same name (no-op)
   - Update description to null
   - Update location with special characters in name
   - Update location with many descendants (performance test)

**Expected Outcome**: All test cases pass with expected status codes and responses

---

### Step 7: Integration and Deployment Preparation
**Files**: Various

**Tasks**:
1. Ensure database migrations are applied (locations table should exist)
2. Verify RLS policies are in place
3. Test with realistic workspace data
4. Check logs for any unexpected errors
5. Verify `updated_at` timestamp updates correctly
6. Test optimistic UI updates on frontend (if applicable)
7. Prepare rollback plan if issues arise
8. Document any breaking changes or migration steps

**Expected Outcome**: Endpoint ready for production deployment

---

## 10. Additional Notes

### Database Migration Requirements

No new migrations required for this endpoint. The following should already exist:
- `locations` table with `path` (ltree), `name`, `description`, `is_deleted` columns
- GiST index on `path`
- RLS policies for workspace member access
- `moddatetime` trigger on `updated_at`

### Frontend Integration Considerations

**Optimistic Updates**:
```typescript
// Frontend can optimistically update UI before server response
const optimisticUpdate = {
  id: locationId,
  name: newName,
  description: newDescription,
  updated_at: new Date().toISOString()
};

// Revert if request fails
try {
  await patchLocation(locationId, data);
} catch (error) {
  // Revert optimistic update
}
```

**Cache Invalidation**:
- Invalidate location tree cache on successful update
- Re-fetch location hierarchy if name changed (path affects tree structure)

### Future Enhancements

1. **Bulk Update Support**:
   - Allow updating multiple locations in a single request
   - Useful for reorganizing location trees

2. **Move Location Support**:
   - Add `parent_id` to update request
   - Allow moving locations to different parents
   - Validate depth constraints on move

3. **Audit Trail**:
   - Log all location updates to audit table
   - Track who changed what and when

4. **Webhooks**:
   - Trigger webhook on location update
   - Allow integrations to react to changes

5. **Versioning**:
   - Track location history
   - Allow reverting to previous versions

### Related Endpoints

This endpoint is part of the locations API family:
- `GET /api/locations` - List locations ([implementation exists](src/pages/api/locations/index.ts))
- `POST /api/locations` - Create location (to be implemented)
- `PATCH /api/locations/:id` - Update location (this endpoint)
- `DELETE /api/locations/:id` - Delete location (to be implemented)
