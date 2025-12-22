# API Endpoint Implementation Plan: GET /api/boxes

## 1. Endpoint Overview

The GET /api/boxes endpoint retrieves a filterable, searchable, and paginated list of boxes within a specific workspace. It supports multiple query parameters for filtering by location, assignment status, full-text search, and pagination. The endpoint returns box data with nested location and QR code information.

**Purpose:**
- List all boxes in a workspace
- Search boxes by name, description, and tags using full-text search
- Filter boxes by location or assignment status
- Support pagination for large datasets

**Business Context:**
- Core functionality for inventory management
- Enables users to browse and search their stored items
- Supports mobile and desktop interfaces with pagination

## 2. Request Details

### HTTP Method
GET

### URL Structure
```
/api/boxes
```

### Query Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `workspace_id` | UUID | **Yes** | The ID of the workspace | Valid UUID format |
| `q` | string | No | Full-text search query | Min 1 char if provided |
| `location_id` | UUID | No | Filter by specific location | Valid UUID format |
| `is_assigned` | boolean | No | Filter for assigned/unassigned boxes | Boolean value |
| `limit` | integer | No | Maximum results to return | Positive integer, max 100, default 50 |
| `offset` | integer | No | Number of results to skip | Non-negative integer, default 0 |

### Request Headers
```
Authorization: Bearer <jwt_token>
```

### Example Request URLs
```
GET /api/boxes?workspace_id=123e4567-e89b-12d3-a456-426614174000
GET /api/boxes?workspace_id=123e4567-e89b-12d3-a456-426614174000&q=winter
GET /api/boxes?workspace_id=123e4567-e89b-12d3-a456-426614174000&location_id=789e4567-e89b-12d3-a456-426614174000
GET /api/boxes?workspace_id=123e4567-e89b-12d3-a456-426614174000&is_assigned=false
GET /api/boxes?workspace_id=123e4567-e89b-12d3-a456-426614174000&limit=20&offset=40
```

## 3. Types Used

### DTOs and Types
From `src/types.ts`:

```typescript
// Request query type
export interface GetBoxesQuery {
  workspace_id: string;
  q?: string;
  location_id?: string | null;
  is_assigned?: boolean;
  limit?: number;
  offset?: number;
}

// Response type (array of BoxDto)
export interface BoxDto extends Tables<"boxes"> {
  location?: BoxLocationSummary | null;
  qr_code?: BoxQrCodeSummary | null;
}

// Nested types
export interface BoxLocationSummary {
  id?: string;
  name: string;
  path?: string;
}

export interface BoxQrCodeSummary {
  id: string;
  short_id: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  details?: unknown;
}
```

### Validation Schema
New schema to create in `src/lib/validators/box.validators.ts`:

```typescript
export const GetBoxesQuerySchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID obszaru roboczego"),
  q: z.string().min(1, "Zapytanie wyszukiwania nie może być puste").optional(),
  location_id: z.string().uuid("Nieprawidłowy format ID lokalizacji").optional(),
  is_assigned: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional()
    .default("50"),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional()
    .default("0"),
});
```

## 4. Response Details

### Success Response (200 OK)

**Content-Type:** `application/json`

**Response Body:**
```json
[
  {
    "id": "uuid",
    "short_id": "X7K-9P2",
    "workspace_id": "uuid",
    "location_id": "uuid",
    "name": "Winter Clothes",
    "description": "Jackets and scarves",
    "tags": ["winter", "clothes"],
    "image_url": null,
    "search_vector": null,
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-27T10:00:00Z",
    "location": {
      "id": "uuid",
      "name": "Shelf A",
      "path": "root.basement.shelfa"
    },
    "qr_code": {
      "id": "uuid",
      "short_id": "QR-A1B2C3"
    }
  }
]
```

**Notes:**
- Returns an array of BoxDto objects
- `location` field is null if box is unassigned
- `qr_code` field is null if no QR code is linked to the box
- Results are ordered by `created_at DESC` (newest first)

### Error Responses

#### 400 Bad Request
Missing required parameter or invalid format:
```json
{
  "error": "workspace_id jest wymagane"
}
```
```json
{
  "error": "Nieprawidłowy format ID obszaru roboczego"
}
```

#### 401 Unauthorized
User not authenticated:
```json
{
  "error": "Nieautoryzowany dostęp"
}
```

#### 500 Internal Server Error
Database or server error:
```json
{
  "error": "Nie udało się pobrać pudełek"
}
```

## 5. Data Flow

### Flow Diagram
```
1. Client Request
   ↓
2. API Route Handler (src/pages/api/boxes.ts - GET method)
   ↓
3. Authentication Check (Supabase Auth)
   ↓ (if auth fails → 401 Unauthorized)
4. Parse & Validate Query Parameters (Zod schema)
   ↓ (if validation fails → 400 Bad Request)
5. Service Layer (src/lib/services/box.service.ts::getBoxes)
   ↓
6. Build Supabase Query:
   - Base query: SELECT from boxes table
   - Join locations table (left join)
   - Join qr_codes table (left join)
   - Filter by workspace_id (RLS enforces this)
   - Apply optional filters (q, location_id, is_assigned)
   - Apply pagination (limit, offset)
   - Order by created_at DESC
   ↓
7. Execute Query (Supabase with RLS)
   ↓ (if query fails → 500 Internal Server Error)
8. Transform Data (format nested objects)
   ↓
9. Return Response (200 OK with BoxDto[])
```

### Detailed Processing Steps

**Step 1-2: Request Handling**
- Extract URL and query parameters from request
- Initialize Supabase client from `context.locals.supabase`

**Step 3: Authentication**
- Call `supabase.auth.getUser()` to verify JWT token
- If user is null or error occurs, return 401 Unauthorized

**Step 4: Input Validation**
- Parse query parameters from URL
- Validate with `GetBoxesQuerySchema` using Zod
- Return 400 Bad Request with specific error message if validation fails

**Step 5: Service Layer Call**
- Call `getBoxes(supabase, validatedQuery)` function
- Service function encapsulates all business logic

**Step 6: Database Query Construction**
The service builds a Supabase query with:

```typescript
// Pseudo-code for query construction
let query = supabase
  .from("boxes")
  .select(`
    id,
    short_id,
    workspace_id,
    location_id,
    name,
    description,
    tags,
    image_url,
    created_at,
    updated_at,
    location:locations (
      id,
      name,
      path
    ),
    qr_code:qr_codes!qr_codes_box_id_fkey (
      id,
      short_id
    )
  `)
  .eq("workspace_id", workspace_id)
  .order("created_at", { ascending: false });

// Apply optional filters
if (q) {
  query = query.textSearch("search_vector", q);
}

if (location_id) {
  query = query.eq("location_id", location_id);
}

if (is_assigned !== undefined) {
  query = is_assigned
    ? query.not("location_id", "is", null)
    : query.is("location_id", null);
}

// Apply pagination
query = query.range(offset, offset + limit - 1);
```

**Step 7: Execute Query**
- Supabase executes query with RLS policies automatically applied
- RLS ensures user only sees boxes from workspaces they're a member of
- Handle database errors gracefully

**Step 8: Data Transformation**
- Format the response data to match BoxDto type
- Ensure nested objects (location, qr_code) are properly structured
- Handle null values appropriately

**Step 9: Response**
- Return 200 OK with array of BoxDto objects
- Set `Content-Type: application/json` header

## 6. Security Considerations

### Authentication
- **Requirement:** User must be authenticated with valid JWT token
- **Implementation:** Verify token using `supabase.auth.getUser()`
- **Error Handling:** Return 401 Unauthorized if token is missing or invalid
- **Token Location:** `Authorization: Bearer <token>` header

### Authorization
- **Requirement:** User can only access boxes from workspaces they're a member of
- **Implementation:** Rely on PostgreSQL Row Level Security (RLS) policies
- **Policy Logic:** `is_workspace_member(workspace_id)` helper function validates membership
- **Enforcement:** Automatic via Supabase - no additional code needed in API layer

### Input Validation
- **Threat:** SQL Injection, invalid data formats
- **Mitigation:**
  - Use Zod schema to validate all query parameters
  - Supabase query builder uses parameterized queries (no raw SQL)
  - Validate UUIDs to ensure proper format
  - Sanitize search query input

### Data Leakage Prevention
- **Threat:** Users accessing boxes from other workspaces
- **Mitigation:**
  - RLS policies prevent cross-workspace data access
  - Always filter by workspace_id
  - Don't expose sensitive fields in response (e.g., search_vector)

### Rate Limiting
- **Consideration:** Implement rate limiting at infrastructure level (not in API code)
- **Recommendation:** Consider adding rate limiting middleware for production

### Query Performance & DoS Prevention
- **Threat:** Expensive queries causing performance degradation
- **Mitigation:**
  - Enforce maximum limit (100) for pagination
  - Use database indexes (GIN on search_vector, indexes on location_id)
  - Consider query timeout at database level

## 7. Error Handling

### Error Scenarios and Responses

| Scenario | Status Code | Error Message | Cause |
|----------|-------------|---------------|-------|
| Missing workspace_id | 400 | "workspace_id jest wymagane" | Required query parameter not provided |
| Invalid workspace_id format | 400 | "Nieprawidłowy format ID obszaru roboczego" | workspace_id is not a valid UUID |
| Invalid location_id format | 400 | "Nieprawidłowy format ID lokalizacji" | location_id is not a valid UUID |
| Invalid limit value | 400 | "limit must be a positive number" | limit is not a positive integer |
| Invalid offset value | 400 | "offset must be a non-negative number" | offset is negative |
| User not authenticated | 401 | "Nieautoryzowany dostęp" | JWT token missing or invalid |
| Database query failure | 500 | "Nie udało się pobrać pudełek" | Supabase query error |
| Unexpected error | 500 | "Wewnętrzny błąd serwera" | Unknown error during processing |

### Error Handling Strategy

**Input Validation Errors:**
```typescript
const parseResult = GetBoxesQuerySchema.safeParse(queryParams);

if (!parseResult.success) {
  const firstError = parseResult.error.errors[0];
  return new Response(
    JSON.stringify({ error: firstError.message } as ErrorResponse),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

**Authentication Errors:**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: "Nieautoryzowany dostęp" } as ErrorResponse),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**Service Layer Errors:**
```typescript
try {
  const boxes = await getBoxes(supabase, validatedQuery);
  return new Response(JSON.stringify(boxes), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
} catch (error) {
  console.error("Service error in GET /api/boxes:", error);
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Nie udało się pobrać pudełek"
    } as ErrorResponse),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

**Logging Strategy:**
- Log all unexpected errors with context (user ID, query parameters)
- Log successful queries in development mode only
- Do not log sensitive data (tokens, passwords)
- Use structured logging format for easier debugging

## 8. Performance Considerations

### Database Optimization

**Indexes Used:**
- GIN index on `boxes.search_vector` (full-text search)
- B-tree index on `boxes.location_id` (location filtering)
- B-tree index on `boxes.workspace_id` (workspace filtering)
- B-tree index on `boxes.created_at` (sorting)

**Query Performance:**
- Use `.select()` to specify exact fields needed (avoid SELECT *)
- Left joins for location and qr_code data (one query instead of multiple)
- Pagination with `.range()` limits result set size
- Order by indexed column (`created_at`)

### Pagination Strategy
- **Default limit:** 50 boxes per request
- **Maximum limit:** 100 boxes per request
- **Offset-based pagination:** Simple but may have performance issues with large offsets
- **Future improvement:** Consider cursor-based pagination for better performance

### Caching Opportunities
- **Client-side:** Cache results with stale-while-revalidate strategy
- **Server-side:** Consider Redis caching for frequently accessed workspaces
- **Cache invalidation:** Invalidate on box creation, update, or deletion

### Potential Bottlenecks
1. **Full-text search on large datasets:** GIN index mitigates this
2. **Large workspaces with thousands of boxes:** Pagination required
3. **Multiple concurrent requests:** Database connection pooling handles this
4. **Complex location hierarchy joins:** Left join with ltree is efficient

### Monitoring
- Monitor query execution time
- Track slow queries (> 1 second)
- Monitor RLS policy overhead
- Track API response times in production

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File:** `src/lib/validators/box.validators.ts`

**Action:** Add `GetBoxesQuerySchema` to existing file

```typescript
export const GetBoxesQuerySchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID obszaru roboczego"),
  q: z.string().min(1, "Zapytanie wyszukiwania nie może być puste").optional(),
  location_id: z.string().uuid("Nieprawidłowy format ID lokalizacji").optional(),
  is_assigned: z
    .string()
    .transform((val) => val === "true" || val === "false" ? val === "true" : undefined)
    .pipe(z.boolean())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional()
    .default("50"),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional()
    .default("0"),
});
```

**Testing:** Verify schema validates all query parameter combinations correctly

---

### Step 2: Create Service Function
**File:** `src/lib/services/box.service.ts`

**Action:** Add `getBoxes()` function to existing file

```typescript
/**
 * Retrieves a filtered, searchable, paginated list of boxes.
 *
 * Business logic:
 * 1. Build base query with joins for location and qr_code
 * 2. Apply workspace filter (required)
 * 3. Apply optional filters (search, location, assignment status)
 * 4. Apply pagination and ordering
 * 5. Execute query and return results
 *
 * @param supabase - Supabase client instance
 * @param query - Validated query parameters
 * @returns Array of BoxDto objects
 */
export async function getBoxes(
  supabase: SupabaseClient,
  query: GetBoxesQuery
): Promise<BoxDto[]> {
  try {
    // Build base query with joins
    let dbQuery = supabase
      .from("boxes")
      .select(`
        id,
        short_id,
        workspace_id,
        location_id,
        name,
        description,
        tags,
        image_url,
        created_at,
        updated_at,
        location:locations (
          id,
          name,
          path
        ),
        qr_code:qr_codes!qr_codes_box_id_fkey (
          id,
          short_id
        )
      `)
      .eq("workspace_id", query.workspace_id)
      .order("created_at", { ascending: false });

    // Apply full-text search filter
    if (query.q) {
      dbQuery = dbQuery.textSearch("search_vector", query.q);
    }

    // Apply location filter
    if (query.location_id) {
      dbQuery = dbQuery.eq("location_id", query.location_id);
    }

    // Apply assignment status filter
    if (query.is_assigned !== undefined) {
      if (query.is_assigned) {
        dbQuery = dbQuery.not("location_id", "is", null);
      } else {
        dbQuery = dbQuery.is("location_id", null);
      }
    }

    // Apply pagination
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    // Execute query
    const { data, error } = await dbQuery;

    if (error) {
      console.error("Error fetching boxes:", error);
      throw new Error("Nie udało się pobrać pudełek");
    }

    // Log successful query
    console.log("Boxes fetched successfully:", {
      workspace_id: query.workspace_id,
      count: data?.length ?? 0,
      filters_applied: {
        search: !!query.q,
        location: !!query.location_id,
        is_assigned: query.is_assigned,
      },
    });

    return data as BoxDto[];
  } catch (error) {
    console.error("Unexpected error in getBoxes:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Nie udało się pobrać pudełek");
  }
}
```

**Testing:**
- Test with all filter combinations
- Verify pagination works correctly
- Test full-text search functionality
- Verify nested location and qr_code data is returned

---

### Step 3: Implement GET Handler
**File:** `src/pages/api/boxes.ts`

**Action:** Add GET method handler to existing file

```typescript
/**
 * GET /api/boxes
 * Retrieves a filtered, searchable, paginated list of boxes.
 *
 * Query parameters:
 * - workspace_id (required): UUID of the workspace
 * - q (optional): Search query for full-text search
 * - location_id (optional): Filter by location UUID
 * - is_assigned (optional): Filter by assignment status
 * - limit (optional): Max results (default 50, max 100)
 * - offset (optional): Pagination offset (default 0)
 *
 * Returns 200 OK with array of boxes on success.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Nieautoryzowany dostęp",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Parse query parameters from URL
    const url = new URL(request.url);
    const queryParams = {
      workspace_id: url.searchParams.get("workspace_id"),
      q: url.searchParams.get("q"),
      location_id: url.searchParams.get("location_id"),
      is_assigned: url.searchParams.get("is_assigned"),
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    };

    // 4. Validate query parameters with Zod schema
    const parseResult = GetBoxesQuerySchema.safeParse(queryParams);

    if (!parseResult.success) {
      // Extract first error message for user-friendly response
      const firstError = parseResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: firstError.message,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedQuery: GetBoxesQuery = parseResult.data;

    // 5. Call service layer to fetch boxes
    try {
      const boxes: BoxDto[] = await getBoxes(supabase, validatedQuery);

      // 6. Return success response (200 OK)
      return new Response(JSON.stringify(boxes), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle errors from service layer
      console.error("Service error in GET /api/boxes:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Nie udało się pobrać pudełek",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("Unexpected error in GET /api/boxes:", error);
    return new Response(
      JSON.stringify({
        error: "Wewnętrzny błąd serwera",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

**Testing:**
- Test with valid workspace_id
- Test with missing workspace_id (should return 400)
- Test with invalid UUID format (should return 400)
- Test all optional filters individually and in combination
- Test pagination with various limit/offset values
- Test authentication (missing token, invalid token)

---

### Step 4: Manual Testing
**Prerequisite:** Dev server and Supabase running locally

**Test Script:** Create `.ai_docs/test-get-boxes.sh`

```bash
#!/bin/bash

# Test GET /api/boxes endpoint
# Prerequisites: dev server running on http://localhost:3000
# Supabase local instance running

echo "=== Testing GET /api/boxes endpoint ==="

# Setup: Get auth token and workspace ID
# Replace these with actual values from your local setup
TOKEN="your-jwt-token-here"
WORKSPACE_ID="your-workspace-id-here"
LOCATION_ID="your-location-id-here"

echo ""
echo "Test 1: Get all boxes in workspace"
curl -s "http://localhost:3000/api/boxes?workspace_id=$WORKSPACE_ID" \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

echo ""
echo "Test 2: Search boxes with query"
curl -s "http://localhost:3000/api/boxes?workspace_id=$WORKSPACE_ID&q=winter" \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

echo ""
echo "Test 3: Filter by location"
curl -s "http://localhost:3000/api/boxes?workspace_id=$WORKSPACE_ID&location_id=$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

echo ""
echo "Test 4: Filter unassigned boxes"
curl -s "http://localhost:3000/api/boxes?workspace_id=$WORKSPACE_ID&is_assigned=false" \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

echo ""
echo "Test 5: Pagination (limit 10, offset 5)"
curl -s "http://localhost:3000/api/boxes?workspace_id=$WORKSPACE_ID&limit=10&offset=5" \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

echo ""
echo "Test 6: Missing workspace_id (should return 400)"
curl -s "http://localhost:3000/api/boxes" \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

echo ""
echo "Test 7: Invalid workspace_id format (should return 400)"
curl -s "http://localhost:3000/api/boxes?workspace_id=invalid-uuid" \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

echo ""
echo "Test 8: Missing auth token (should return 401)"
curl -s "http://localhost:3000/api/boxes?workspace_id=$WORKSPACE_ID" \
| python3 -m json.tool

echo ""
echo "=== Tests completed ==="
```

**Action:** Make script executable and run tests

---

### Step 5: Code Review
**Action:** Review implementation for:
- Code quality and adherence to project guidelines
- Error handling completeness
- Security considerations
- Performance optimization
- Type safety
- Documentation quality

---

### Step 6: Integration Testing
**Action:** Test the endpoint with actual frontend components
- Verify data displays correctly in UI
- Test pagination controls
- Test search functionality
- Test filters
- Verify error messages display appropriately

---

### Step 7: Documentation Update
**Action:** Update API documentation in `.ai_docs/api-plan.md`
- Mark GET /api/boxes as implemented (✅)
- Add implementation file path
- Add service layer function reference

---

## Summary

This implementation plan provides comprehensive guidance for implementing the GET /api/boxes endpoint following the established patterns in the codebase. The implementation follows clean code practices with:

- **Clear separation of concerns:** API route → Validation → Service layer → Database
- **Type safety:** Full TypeScript type coverage with Zod validation
- **Security:** Authentication, authorization via RLS, input validation
- **Error handling:** Comprehensive error scenarios with appropriate status codes
- **Performance:** Efficient database queries with proper indexing and pagination
- **Maintainability:** Well-documented, testable code following project conventions

The endpoint enables core inventory management functionality with flexible filtering, searching, and pagination capabilities essential for the Storage & Box Organizer application.