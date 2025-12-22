# API Endpoint Implementation Plan: POST /api/boxes

## 1. Endpoint Overview

Creates a new box item in the inventory system. Boxes are the main inventory entities that can contain items and be linked to QR codes for easy scanning. Upon creation, the box receives an auto-generated unique `short_id` (10 character alphanumeric) and an optional QR code assignment. Boxes can be created as unassigned (no location) or linked to a specific storage location within the workspace.

**Key Behaviors:**
- Auto-generates unique `short_id` via database trigger
- Auto-generates `search_vector` for full-text search from name, description, and tags
- Optionally links to an existing QR code (changes QR status from 'generated' to 'assigned')
- Enforces workspace isolation via Row Level Security (RLS)
- Supports unassigned boxes (location_id can be null)

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/boxes`
- **Authentication**: Required - JWT token via `Authorization: Bearer <token>` header
- **Content-Type**: `application/json`

### Parameters

**Required:**
- `workspace_id` (string, UUID): The workspace tenant identifier
- `name` (string): Box name (non-empty)

**Optional:**
- `description` (string | null): Detailed description of box contents (max 10,000 characters)
- `tags` (string[] | null): Array of tag strings for categorization and search
- `location_id` (string | null, UUID): Storage location reference (null = unassigned)
- `qr_code_id` (string | null, UUID): QR code to link immediately upon creation

### Request Body Example

```json
{
  "workspace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Winter Clothes Box",
  "description": "Heavy winter jackets, scarves, gloves for the family",
  "tags": ["winter", "clothes", "seasonal"],
  "location_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "qr_code_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

## 3. Used Types

### DTOs (from `src/types.ts`)

```typescript
// Request payload
export interface CreateBoxRequest {
  workspace_id: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  location_id?: string | null;
  qr_code_id?: string | null;
}

// Response payload
export interface CreateBoxResponse {
  id: string;
  short_id: string;
  name: string;
  workspace_id: string;
  created_at: string | null;
}

// Validation constants
export const ValidationRules = {
  boxes: {
    MAX_DESCRIPTION_LENGTH: 10000,
  },
} as const;
```

### Zod Validation Schema (to be created)

```typescript
import { z } from 'zod';
import { ValidationRules } from '@/types';

export const createBoxSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Nieprawidłowy format ID obszaru roboczego' }),
  name: z.string().min(1, { message: 'Nazwa pudełka jest wymagana' }).trim(),
  description: z
    .string()
    .max(ValidationRules.boxes.MAX_DESCRIPTION_LENGTH, {
      message: `Opis nie może przekraczać ${ValidationRules.boxes.MAX_DESCRIPTION_LENGTH} znaków`,
    })
    .nullable()
    .optional(),
  tags: z.array(z.string()).nullable().optional(),
  location_id: z
    .string()
    .uuid({ message: 'Nieprawidłowy format ID lokalizacji' })
    .nullable()
    .optional(),
  qr_code_id: z
    .string()
    .uuid({ message: 'Nieprawidłowy format ID kodu QR' })
    .nullable()
    .optional(),
});
```

## 4. Response Details

### Success Response (201 Created)

```json
{
  "id": "d4e5f6a7-b8c9-0123-def4-56789abcdef0",
  "short_id": "X7K9P2mN4q",
  "name": "Winter Clothes Box",
  "workspace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "created_at": "2023-10-27T14:30:00.000Z"
}
```

### Error Responses

**400 Bad Request** - Invalid input data
```json
{
  "error": "Brak wymaganego pola: name"
}
```
```json
{
  "error": "Opis nie może przekraczać 10000 znaków"
}
```
```json
{
  "error": "Nieprawidłowy format ID obszaru roboczego"
}
```

**401 Unauthorized** - Authentication failure
```json
{
  "error": "Nieautoryzowany dostęp"
}
```

**403 Forbidden** - RLS policy violation (not workspace member, or resources from different workspace)
```json
{
  "error": "Brak dostępu: nie jesteś członkiem tego obszaru roboczego"
}
```
```json
{
  "error": "Kod QR należy do innego obszaru roboczego"
}
```

**404 Not Found** - Referenced resources don't exist
```json
{
  "error": "Kod QR nie został znaleziony"
}
```
```json
{
  "error": "Lokalizacja nie została znaleziona"
}
```

**409 Conflict** - QR code already assigned
```json
{
  "error": "Kod QR jest już przypisany do innego pudełka"
}
```

**500 Internal Server Error** - Unexpected database or server error
```json
{
  "error": "Nie udało się utworzyć pudełka"
}
```

## 5. Data Flow

### Request Flow

1. **API Route Handler** (`src/pages/api/boxes.ts`)
   - Extract request body
   - Validate with Zod schema
   - Get authenticated user from `context.locals.user`
   - Get Supabase client from `context.locals.supabase`

2. **Service Layer** (`src/lib/services/box.service.ts::createBox()`)
   - Verify workspace membership (via RLS or explicit check)
   - If `qr_code_id` provided:
     - Verify QR code exists and belongs to same workspace
     - Check QR code is not already assigned (box_id is null)
   - If `location_id` provided:
     - Verify location exists and belongs to same workspace
   - Create box record (database trigger auto-generates short_id and search_vector)
   - If `qr_code_id` provided:
     - Update qr_codes table: set box_id and status='assigned'
   - Return created box data

3. **Database Operations**
   - INSERT into `boxes` table
   - Trigger: `generate_box_short_id()` creates unique short_id
   - Trigger: `moddatetime` sets updated_at
   - Generated column: `search_vector` from name, description, tags
   - RLS Policy: Validates `is_workspace_member(workspace_id)`
   - If QR code provided: UPDATE `qr_codes` set box_id and status

4. **Response**
   - Return 201 Created with partial box data (CreateBoxResponse)
   - Or return appropriate error status with error message

### Database Tables Affected

- **boxes** (INSERT): Main operation
- **qr_codes** (UPDATE): If qr_code_id provided

### RLS Enforcement Points

- User must be member of workspace for INSERT on boxes (automatic via RLS)
- QR code and location must belong to same workspace (enforced by service logic + RLS on reads)

## 6. Security Considerations

### Authentication
- **Requirement**: Valid JWT token in Authorization header
- **Enforcement**: Astro middleware validates session and sets `context.locals.user`
- **Failure**: Return 401 Unauthorized

### Authorization (Row Level Security)
- **Workspace Membership**: RLS policy `is_workspace_member(workspace_id)` enforces that user can only create boxes in workspaces they belong to
- **Cross-workspace Protection**:
  - QR codes: Verify `qr_code.workspace_id === box.workspace_id`
  - Locations: Verify `location.workspace_id === box.workspace_id`
- **Failure**: Return 403 Forbidden

### Input Validation
- **SQL Injection**: Protected by Supabase parameterized queries
- **XSS Prevention**: While box data is not rendered as HTML, sanitize inputs as best practice
- **Type Safety**: Zod schema validates all field types and formats
- **Length Limits**: Enforce 10,000 character max for description
- **UUID Format**: Validate all ID fields are proper UUIDs

### Data Integrity
- **QR Code Uniqueness**: Verify QR code box_id is null before assignment (prevent double assignment)
- **Foreign Key Constraints**: Database enforces valid references for workspace_id, location_id
- **Atomic Operations**: If QR code assignment fails, entire operation should roll back (use transaction)

### Audit Trail
- **Success Logging**: Log box creation with user_id, workspace_id, box_id
- **Error Logging**: Log failed attempts with reason, user_id, request details
- **Context**: Include enough information for debugging without exposing sensitive data

## 7. Error Handling

### Validation Errors (400)

| Scenario | Check | Error Message |
|----------|-------|---------------|
| Missing workspace_id | Zod validation | "Pole workspace_id jest wymagane" |
| Invalid workspace_id format | Zod UUID validation | "Nieprawidłowy format ID obszaru roboczego" |
| Missing name | Zod validation | "Nazwa pudełka jest wymagana" |
| Empty name | Zod min(1) | "Nazwa pudełka jest wymagana" |
| Description too long | Zod max(10000) | "Opis nie może przekraczać 10000 znaków" |
| Invalid location_id format | Zod UUID validation | "Nieprawidłowy format ID lokalizacji" |
| Invalid qr_code_id format | Zod UUID validation | "Nieprawidłowy format ID kodu QR" |
| Tags not array | Zod array validation | "Tagi muszą być tablicą ciągów znaków" |

### Authentication Errors (401)

| Scenario | Check | Error Message |
|----------|-------|---------------|
| No token | Middleware check | "Nieautoryzowany dostęp" |
| Invalid token | Middleware check | "Nieautoryzowany dostęp" |
| Expired token | Middleware check | "Nieautoryzowany dostęp" |

### Authorization Errors (403)

| Scenario | Check | Error Message |
|----------|-------|---------------|
| Not workspace member | RLS policy | "Brak dostępu: nie jesteś członkiem tego obszaru roboczego" |
| QR code from different workspace | Service layer | "Kod QR należy do innego obszaru roboczego" |
| Location from different workspace | Service layer | "Lokalizacja należy do innego obszaru roboczego" |

### Resource Not Found (404)

| Scenario | Check | Error Message |
|----------|-------|---------------|
| QR code doesn't exist | Service layer query | "Kod QR nie został znaleziony" |
| Location doesn't exist | Service layer query | "Lokalizacja nie została znaleziona" |

### Conflict Errors (409)

| Scenario | Check | Error Message |
|----------|-------|---------------|
| QR code already assigned | Service layer check box_id | "Kod QR jest już przypisany do innego pudełka" |

### Server Errors (500)

| Scenario | Check | Error Message |
|----------|-------|---------------|
| Database operation fails | Try-catch in service | "Nie udało się utworzyć pudełka" |
| Transaction rollback | Try-catch in service | "Nie udało się utworzyć pudełka" |
| Unexpected errors | Global error handler | "Wewnętrzny błąd serwera" |

### Error Handling Pattern

```typescript
try {
  // Parse and validate input
  const body = await request.json();
  const validatedData = createBoxSchema.parse(body);

  // Call service layer
  const box = await createBox(supabase, validatedData);

  // Return success
  return new Response(JSON.stringify(box), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: error.errors[0].message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle custom errors from service layer
  if (error instanceof CustomError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Log and return generic error
  console.error('Failed to create box:', error);
  return new Response(
    JSON.stringify({ error: 'Nie udało się utworzyć pudełka' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## 8. Performance Considerations

### Database Optimization
- **Indexes**:
  - `boxes.workspace_id` (for RLS filtering)
  - `boxes.short_id` (unique, for lookups)
  - `boxes.search_vector` (GIN index for full-text search)
  - `qr_codes.box_id` (for QR assignment queries)
- **Trigger Performance**: short_id generation is lightweight (single query for uniqueness check)
- **Generated Columns**: search_vector is auto-maintained but adds overhead to INSERT

### Query Optimization
- **Selective Queries**: Only query QR code and location if IDs are provided
- **Single Transaction**: If QR assignment needed, wrap box INSERT + qr_code UPDATE in transaction
- **Avoid N+1**: Don't query separately for workspace membership (RLS handles it)

### Potential Bottlenecks
- **QR Code Collision**: Rare, but uniqueness check on short_id generation could retry multiple times
- **Large Tags Arrays**: Storing many tags impacts search_vector generation time
- **Concurrent Creation**: High-volume box creation might strain short_id generation (collision checks)

### Optimization Strategies
- **Connection Pooling**: Supabase handles this automatically
- **Lazy Loading**: Don't join location/QR code data in response (only return IDs)
- **Caching**: Consider caching workspace membership checks (though RLS is fast)
- **Rate Limiting**: Consider implementing rate limits to prevent abuse

## 9. Implementation Steps

### Step 1: Create Service Layer Function
**File**: `src/lib/services/box.service.ts`

1. Create or update `box.service.ts`
2. Define custom error classes for specific error scenarios:
   - `QrCodeAlreadyAssignedError` (409)
   - `QrCodeNotFoundError` (404)
   - `LocationNotFoundError` (404)
   - `WorkspaceMismatchError` (403)
3. Implement `createBox(supabase: SupabaseClient, request: CreateBoxRequest): Promise<CreateBoxResponse>`
   - If `qr_code_id` provided:
     - Query qr_codes table to verify existence and get workspace_id and box_id
     - Throw `QrCodeNotFoundError` if not found
     - Throw `WorkspaceMismatchError` if workspace_id doesn't match
     - Throw `QrCodeAlreadyAssignedError` if box_id is not null
   - If `location_id` provided:
     - Query locations table to verify existence and get workspace_id
     - Throw `LocationNotFoundError` if not found
     - Throw `WorkspaceMismatchError` if workspace_id doesn't match
   - Start transaction (if QR code assignment needed)
   - Insert box record (RLS will enforce workspace membership)
   - If `qr_code_id` provided:
     - Update qr_codes: SET box_id = new_box.id, status = 'assigned'
   - Commit transaction
   - Return CreateBoxResponse data

### Step 2: Create Zod Validation Schema
**File**: `src/lib/schemas/box.schema.ts` or inline in API route

1. Import Zod and ValidationRules
2. Define `createBoxSchema` with all field validations
3. Export schema for use in API route

### Step 3: Implement API Route Handler
**File**: `src/pages/api/boxes.ts`

1. Create `boxes.ts` in `src/pages/api/`
2. Add `export const prerender = false`
3. Implement POST handler:
   ```typescript
   export async function POST(context: APIContext): Promise<Response>
   ```
4. Extract user and supabase from context.locals
5. Check authentication (return 401 if no user)
6. Parse and validate request body with Zod
7. Call `createBox()` service function
8. Handle errors with appropriate status codes and messages
9. Return 201 Created with CreateBoxResponse on success

### Step 4: Add Error Logging
**Location**: Service layer and API route

1. Log successful box creation with context:
   - user_id, workspace_id, box_id, short_id
2. Log validation failures with context:
   - user_id, request_body, validation_errors
3. Log service errors with context:
   - user_id, workspace_id, error_type, error_message
4. Use structured logging (JSON format preferred)
5. Include timestamp and request ID if available

### Step 5: Write Integration Tests
**File**: `.ai_docs/test-post-boxes.sh`

1. Create bash test script with curl commands
2. Test scenarios:
   - Successful box creation (minimal fields)
   - Successful box creation (all fields)
   - Successful box creation with QR code assignment
   - Error: Missing required fields
   - Error: Invalid UUID formats
   - Error: Description too long
   - Error: QR code already assigned
   - Error: QR code not found
   - Error: Location not found
   - Error: Unauthorized (no token)
   - Error: Forbidden (not workspace member)
3. Use heredoc pattern for complex curl commands (per guidelines)
4. Validate responses with `python3 -m json.tool`
5. Check status codes and error messages

### Step 6: Manual Testing Checklist

- [ ] Create box with only required fields (workspace_id, name)
- [ ] Create box with all optional fields populated
- [ ] Create box with QR code assignment (verify qr_codes table updated)
- [ ] Create box without location (location_id = null)
- [ ] Verify short_id is auto-generated and unique
- [ ] Verify search_vector is auto-generated
- [ ] Test with invalid workspace_id format
- [ ] Test with missing name field
- [ ] Test with description > 10,000 characters
- [ ] Test with already assigned QR code (should fail 409)
- [ ] Test with non-existent QR code (should fail 404)
- [ ] Test with non-existent location (should fail 404)
- [ ] Test with QR code from different workspace (should fail 403)
- [ ] Test with location from different workspace (should fail 403)
- [ ] Test without authentication token (should fail 401)
- [ ] Test as non-member of workspace (should fail 403)
- [ ] Verify audit logs contain proper context

### Step 7: Documentation
**Files**: Update API documentation and types

1. Verify `src/types.ts` has correct CreateBoxRequest and CreateBoxResponse types
2. Update `.ai_docs/api-plan.md` to mark POST /api/boxes as implemented
3. Add implementation notes with file references
4. Document any deviations from original spec
5. Add curl examples in API documentation

### Step 8: Code Review Checklist

- [ ] All error scenarios handled with appropriate status codes
- [ ] Input validation comprehensive (Zod schema)
- [ ] Service layer properly separated from API route
- [ ] RLS enforces workspace isolation
- [ ] QR code assignment is atomic (transaction)
- [ ] Custom error classes properly defined
- [ ] Logging includes sufficient context
- [ ] No sensitive data in error messages or logs
- [ ] Code follows project guidelines (CLAUDE.md)
- [ ] TypeScript types properly used
- [ ] No SQL injection vulnerabilities
- [ ] Response matches API specification exactly

### Step 9: Performance Verification

- [ ] Test with large description (near 10,000 chars)
- [ ] Test with many tags (e.g., 50+ tags)
- [ ] Measure response time for box creation
- [ ] Verify database indexes are utilized (EXPLAIN ANALYZE)
- [ ] Check for N+1 query issues
- [ ] Test concurrent box creation (multiple requests)
- [ ] Monitor database connection usage

### Step 10: Final Integration

- [ ] Run linter: `npm run lint`
- [ ] Run formatter: `npm run format`
- [ ] Test with dev server: `npm run dev`
- [ ] Verify no TypeScript errors: `npx tsc`
- [ ] Run integration test script: `bash .ai_docs/test-post-boxes.sh`
- [ ] Verify all tests pass
- [ ] Update implementation status in api-plan.md
- [ ] Create git commit with implementation
