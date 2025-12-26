# API Endpoint Implementation Plan: GET /api/boxes/:id

## 1. Endpoint Overview

The GET /api/boxes/:id endpoint retrieves detailed information for a specific box by its unique identifier. This endpoint returns comprehensive box data including nested location details (if assigned) and associated QR code information (if linked). The endpoint enforces workspace-based access control through PostgreSQL Row Level Security (RLS) policies, ensuring users can only access boxes within workspaces they are members of.

**Purpose**: Fetch a single box resource with all related data for display on box detail pages or when resolving QR code scans.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/boxes/:id`
- **URL Parameters**:
  - `id` (required): UUID of the box to retrieve
- **Query Parameters**: None
- **Request Headers**:
  - `Authorization: Bearer <token>` (required): JWT token from Supabase Auth
- **Request Body**: None

### Example Request

```bash
curl -X GET \
  http://localhost:3000/api/boxes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 3. Utilized Types

### DTOs (from `src/types.ts`)

1. **BoxDto** (lines 150-159):
   - Extends `Tables<"boxes">` with all box fields
   - Includes nested `location?: BoxLocationSummary | null`
   - Includes nested `qr_code?: BoxQrCodeSummary | null`

2. **BoxLocationSummary** (lines 131-135):

   ```typescript
   {
     id?: string;
     name: string;
     path?: string;
   }
   ```

3. **BoxQrCodeSummary** (lines 141-144):

   ```typescript
   {
     id: string; // QR code's UUID
     short_id: string; // Format: QR-XXXXXX
   }
   ```

4. **ErrorResponse** (lines 278-283):
   ```typescript
   {
     error: string;
     details?: unknown;
   }
   ```

### Validation Schema

**GetBoxByIdSchema** (new, to be created in `src/lib/validators/box.validators.ts`):

```typescript
export const GetBoxByIdSchema = z.object({
  id: z.string().uuid("Nieprawidłowy format ID pudełka"),
});
```

### Custom Errors (to be added to `src/lib/services/box.service.ts`)

```typescript
export class BoxNotFoundError extends Error {
  constructor(message = "Pudełko nie zostało znalezione") {
    super(message);
    this.name = "BoxNotFoundError";
  }
}
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "short_id": "X7K9P2mN4q",
  "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
  "location_id": "789e0123-e89b-12d3-a456-426614174000",
  "name": "Winter Clothes",
  "description": "Jackets, scarves, and winter accessories for the whole family",
  "tags": ["winter", "clothes", "seasonal"],
  "image_url": "https://example.com/images/box-photo.jpg",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-11-15T14:30:00Z",
  "location": {
    "id": "789e0123-e89b-12d3-a456-426614174000",
    "name": "Shelf A",
    "path": "root.basement.shelfa"
  },
  "qr_code": {
    "id": "456e7890-e89b-12d3-a456-426614174000",
    "short_id": "QR-A1B2C3"
  }
}
```

### Error Responses

**400 Bad Request** (Invalid UUID format):

```json
{
  "error": "Nieprawidłowy format ID pudełka"
}
```

**401 Unauthorized** (Not authenticated):

```json
{
  "error": "Nieautoryzowany dostęp"
}
```

**404 Not Found** (Box doesn't exist or no access):

```json
{
  "error": "Pudełko nie zostało znalezione"
}
```

**500 Internal Server Error** (Database/server error):

```json
{
  "error": "Wewnętrzny błąd serwera"
}
```

## 5. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Client Request                                               │
│    GET /api/boxes/:id                                          │
│    Authorization: Bearer <token>                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Astro Middleware (src/middleware/index.ts)                  │
│    - Validates JWT token                                       │
│    - Sets context.locals.supabase                             │
│    - Sets context.locals.user                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. API Route Handler (src/pages/api/boxes/[id].ts)            │
│    - Extract 'id' from params                                  │
│    - Verify user authentication                                │
│    - Validate 'id' format with Zod schema                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Service Layer (src/lib/services/box.service.ts)            │
│    Function: getBoxById(supabase, boxId, userId)              │
│    - Build Supabase query with joins                          │
│    - Select box with location and qr_code data                │
│    - Execute query (RLS applies automatically)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Database Layer (Supabase/PostgreSQL)                        │
│    - RLS Policy checks workspace membership                    │
│      WHERE auth.uid() IN (                                     │
│        SELECT user_id FROM workspace_members                   │
│        WHERE workspace_id = boxes.workspace_id                 │
│      )                                                         │
│    - Left join with locations table                           │
│    - Left join with qr_codes table                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Response Transformation                                     │
│    - If no data: throw BoxNotFoundError → 404                 │
│    - Transform database response to BoxDto structure           │
│    - Return 200 OK with BoxDto JSON                           │
└─────────────────────────────────────────────────────────────────┘
```

### Service Layer Query Structure

```typescript
const { data, error } = await supabase
  .from("boxes")
  .select(
    `
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
  `
  )
  .eq("id", boxId)
  .single();
```

## 6. Security Considerations

### Authentication

- **Mechanism**: JWT token validated by Astro middleware
- **Validation**: `await supabase.auth.getUser()` verifies token validity
- **Enforcement**: Return 401 if token is missing, invalid, or expired

### Authorization

- **Mechanism**: PostgreSQL Row Level Security (RLS)
- **Policy**: User must be a member of the workspace that owns the box
- **Helper Function**: `is_workspace_member(workspace_id)` checks membership
- **Enforcement**: Database automatically filters results based on JWT user

### Input Validation

- **UUID Validation**: Zod schema validates `id` parameter format
- **SQL Injection Prevention**: Supabase client uses parameterized queries
- **XSS Prevention**: No user input rendered in response (only database content)

### Data Exposure

- **Principle**: Only return data user has legitimate access to
- **RLS Enforcement**: If box exists but user lacks access, return 404 (not 403)
- **Reasoning**: Prevents information disclosure about box existence

### Error Message Security

- **Generic Messages**: Don't expose internal implementation details
- **Database Errors**: Log detailed errors server-side, return generic message to client
- **Example**: Database connection errors return "Wewnętrzny błąd serwera"

## 7. Error Handling

### Error Scenarios and HTTP Status Codes

| Scenario                       | Status Code               | Response                                       | Logging                         |
| ------------------------------ | ------------------------- | ---------------------------------------------- | ------------------------------- |
| Invalid UUID format            | 400 Bad Request           | `{"error": "Nieprawidłowy format ID pudełka"}` | Not logged (validation error)   |
| Missing auth token             | 401 Unauthorized          | `{"error": "Nieautoryzowany dostęp"}`          | Not logged (expected error)     |
| Invalid/expired token          | 401 Unauthorized          | `{"error": "Nieautoryzowany dostęp"}`          | Not logged (expected error)     |
| Box not found                  | 404 Not Found             | `{"error": "Pudełko nie zostało znalezione"}`  | Log with boxId and userId       |
| Box exists but no access (RLS) | 404 Not Found             | `{"error": "Pudełko nie zostało znalezione"}`  | Log with boxId and userId       |
| Database connection error      | 500 Internal Server Error | `{"error": "Wewnętrzny błąd serwera"}`         | Log full error with stack trace |
| Unexpected service error       | 500 Internal Server Error | `{"error": "Wewnętrzny błąd serwera"}`         | Log full error with stack trace |

### Error Handling Strategy

```typescript
// In service layer (box.service.ts)
export async function getBoxById(supabase: SupabaseClient, boxId: string, userId: string): Promise<BoxDto> {
  try {
    const { data, error } = await supabase.from("boxes").select(/* query */).eq("id", boxId).single();

    if (error) {
      // Handle Supabase errors
      console.error("Error fetching box:", {
        boxId,
        userId,
        error: error.message,
        code: error.code,
      });

      // PGRST116 = no rows returned (404)
      if (error.code === "PGRST116") {
        throw new BoxNotFoundError();
      }

      throw new Error("Nie udało się pobrać pudełka");
    }

    if (!data) {
      console.log("Box not found:", { boxId, userId });
      throw new BoxNotFoundError();
    }

    console.log("Box fetched successfully:", {
      boxId: data.id,
      userId,
      has_location: !!data.location,
      has_qr_code: !!data.qr_code,
    });

    return data as BoxDto;
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof BoxNotFoundError) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in getBoxById:", {
      boxId,
      userId,
      error,
    });

    throw new Error("Nie udało się pobrać pudełka");
  }
}
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **Database Joins**
   - Query joins boxes with locations and qr_codes tables
   - **Mitigation**: Database indexes on foreign keys (location_id, box_id)

2. **RLS Policy Evaluation**
   - Each query executes RLS policy with subquery to check workspace membership
   - **Mitigation**: Database indexes on workspace_members (user_id, workspace_id)

3. **Large Text Fields**
   - Box description can be up to 10,000 characters
   - **Mitigation**: Already optimized - only fetching single row

### Optimization Strategies

1. **Selective Field Fetching**
   - Only request needed fields in Supabase select
   - Avoid `select('*')` pattern

2. **Database Indexing** (already implemented in schema)
   - Primary keys: `boxes.id` (indexed automatically)
   - Foreign keys: `boxes.location_id` (indexed)
   - Foreign keys: `qr_codes.box_id` (indexed, unique)
   - Workspace filtering: `boxes.workspace_id` (indexed)

3. **Caching Considerations**
   - Box data changes infrequently (updated via PATCH endpoint)
   - **Future optimization**: Add HTTP caching headers (Cache-Control, ETag)
   - **Future optimization**: Consider Redis cache for frequently accessed boxes

4. **Response Size**
   - Typical response: ~500-1000 bytes (with location and QR data)
   - Max response: ~10KB (with max description length)
   - **Current**: No compression needed for single resource
   - **Future**: Enable gzip compression at server level if needed

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File**: `src/lib/validators/box.validators.ts`

Add to existing file:

```typescript
/**
 * Validation schema for GET /api/boxes/:id URL parameter.
 * Validates the box ID from URL params.
 */
export const GetBoxByIdSchema = z.object({
  id: z.string().uuid("Nieprawidłowy format ID pudełka"),
});

/**
 * Type inference for box ID validation
 */
export type GetBoxByIdInput = z.infer<typeof GetBoxByIdSchema>;
```

### Step 2: Add Custom Error to Service Layer

**File**: `src/lib/services/box.service.ts`

Add to existing custom errors (after `WorkspaceMismatchError`):

```typescript
/**
 * Custom error for box not found in database.
 * HTTP Status: 404 Not Found
 */
export class BoxNotFoundError extends Error {
  constructor(message = "Pudełko nie zostało znalezione") {
    super(message);
    this.name = "BoxNotFoundError";
  }
}
```

### Step 3: Implement Service Layer Function

**File**: `src/lib/services/box.service.ts`

Add to exports:

```typescript
/**
 * Retrieves a single box by its ID with related location and QR code data.
 *
 * Business logic:
 * 1. Query box by ID with left joins for location and qr_code
 * 2. RLS automatically enforces workspace membership
 * 3. Return BoxDto or throw BoxNotFoundError
 *
 * @param supabase - Supabase client instance
 * @param boxId - UUID of the box to retrieve
 * @param userId - ID of the authenticated user (for logging)
 * @returns BoxDto with nested location and qr_code data
 * @throws BoxNotFoundError if box doesn't exist or user lacks access
 */
export async function getBoxById(supabase: SupabaseClient, boxId: string, userId: string): Promise<BoxDto> {
  try {
    // Query box with joins for location and qr_code
    const { data, error } = await supabase
      .from("boxes")
      .select(
        `
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
      `
      )
      .eq("id", boxId)
      .single();

    // Handle Supabase errors
    if (error) {
      console.error("Error fetching box:", {
        boxId,
        userId,
        error: error.message,
        code: error.code,
      });

      // PGRST116 = no rows returned (either doesn't exist or RLS denied)
      if (error.code === "PGRST116") {
        throw new BoxNotFoundError();
      }

      throw new Error("Nie udało się pobrać pudełka");
    }

    // Additional null check (should not happen with .single())
    if (!data) {
      console.log("Box not found:", { boxId, userId });
      throw new BoxNotFoundError();
    }

    // Log successful retrieval
    console.log("Box fetched successfully:", {
      boxId: data.id,
      userId,
      workspace_id: data.workspace_id,
      has_location: !!data.location,
      has_qr_code: !!data.qr_code,
    });

    return data as BoxDto;
  } catch (error) {
    // Re-throw BoxNotFoundError as-is
    if (error instanceof BoxNotFoundError) {
      throw error;
    }

    // Log unexpected errors
    console.error("Unexpected error in getBoxById:", {
      boxId,
      userId,
      error,
    });

    // Re-throw or wrap errors
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Nie udało się pobrać pudełka");
  }
}
```

### Step 4: Create API Route Handler

**File**: `src/pages/api/boxes/[id].ts` (new file)

```typescript
import type { APIRoute } from "astro";
import { getBoxById, BoxNotFoundError } from "@/lib/services/box.service";
import { GetBoxByIdSchema } from "@/lib/validators/box.validators";
import type { BoxDto, ErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/boxes/:id
 * Retrieves detailed information for a specific box.
 *
 * URL Parameters:
 * - id (required): UUID of the box
 *
 * Returns 200 OK with BoxDto on success.
 */
export const GET: APIRoute = async ({ params, locals }) => {
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

    // 3. Extract and validate box ID from URL params
    const parseResult = GetBoxByIdSchema.safeParse({ id: params.id });

    if (!parseResult.success) {
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

    const { id } = parseResult.data;

    // 4. Call service layer to fetch box
    try {
      const box: BoxDto = await getBoxById(supabase, id, user.id);

      // 5. Return success response (200 OK)
      return new Response(JSON.stringify(box), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle BoxNotFoundError (404)
      if (error instanceof BoxNotFoundError) {
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

      // Handle generic service errors (500)
      console.error("Service error in GET /api/boxes/:id:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Nie udało się pobrać pudełka",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors (500)
    console.error("Unexpected error in GET /api/boxes/:id:", error);
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

### Step 5: Update Type Exports

**File**: `src/lib/services/box.service.ts`

Update exports at the top to include new error:

```typescript
export { BoxNotFoundError };
```

**File**: `src/lib/validators/box.validators.ts`

Update exports to include new schema:

```typescript
export { GetBoxByIdSchema };
export type { GetBoxByIdInput };
```

### Step 6: Testing

Create test script or use curl commands:

**File**: `.ai_docs/test-get-boxes-id.sh` (optional test script)

```bash
#!/bin/bash
# Test script for GET /api/boxes/:id endpoint

# Prerequisites: Dev server running, valid auth token, test box exists
# Usage: bash .ai_docs/test-get-boxes-id.sh

# Configuration
BASE_URL="http://localhost:3000"
TOKEN="your-valid-jwt-token-here"
BOX_ID="valid-box-uuid-here"
INVALID_UUID="not-a-uuid"
NONEXISTENT_UUID="00000000-0000-0000-0000-000000000000"

echo "=== Testing GET /api/boxes/:id endpoint ==="
echo ""

# Test 1: Valid box ID (200 OK)
echo "Test 1: Valid box ID (expect 200 OK)"
curl -s -X GET \
  "$BASE_URL/api/boxes/$BOX_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo -e "\n"

# Test 2: Invalid UUID format (400 Bad Request)
echo "Test 2: Invalid UUID format (expect 400 Bad Request)"
curl -s -X GET \
  "$BASE_URL/api/boxes/$INVALID_UUID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo -e "\n"

# Test 3: Missing auth token (401 Unauthorized)
echo "Test 3: Missing auth token (expect 401 Unauthorized)"
curl -s -X GET \
  "$BASE_URL/api/boxes/$BOX_ID" \
  | python3 -m json.tool
echo -e "\n"

# Test 4: Non-existent box (404 Not Found)
echo "Test 4: Non-existent box ID (expect 404 Not Found)"
curl -s -X GET \
  "$BASE_URL/api/boxes/$NONEXISTENT_UUID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo -e "\n"

echo "=== Tests completed ==="
```

**Manual Testing Checklist**:

1. ✅ Valid box ID returns 200 with complete BoxDto
2. ✅ Invalid UUID format returns 400 with validation error
3. ✅ Missing auth token returns 401
4. ✅ Expired/invalid token returns 401
5. ✅ Non-existent box returns 404
6. ✅ Box in different workspace returns 404 (RLS enforcement)
7. ✅ Box with location shows nested location data
8. ✅ Box without location shows location as null
9. ✅ Box with QR code shows nested qr_code data
10. ✅ Box without QR code shows qr_code as null

### Step 7: Update API Documentation

**File**: `.ai_docs/api-plan.md`

Update the GET /api/boxes/:id section (lines 392-425) to mark as implemented:

```markdown
#### GET /api/boxes/:id

- **Description**: Retrieves detailed information for a specific box.
- **Implementation Status**: ✅ Implemented
- **Implementation Files**:
  - API Route: `src/pages/api/boxes/[id].ts`
  - Service Layer: `src/lib/services/box.service.ts::getBoxById()`
  - Validation Schema: `src/lib/validators/box.validators.ts::GetBoxByIdSchema`
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

[... rest of existing documentation ...]
```

### Step 8: Code Quality Checks

Run linting and formatting:

```bash
npm run lint
npm run format
```

### Step 9: Manual Integration Testing

1. Start development server: `npm run dev`
2. Create test data in Supabase (box with location and QR code)
3. Get valid JWT token from authenticated user
4. Run test scenarios with curl or test script
5. Verify responses match expected status codes and data structure

### Step 10: Documentation Update

Update project status to reflect implemented endpoint:

- Mark GET /api/boxes/:id as ✅ Implemented in `.ai_docs/api-plan.md`
- Document any deviations or additional features
- Update testing documentation if test script created
