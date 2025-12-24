# API Endpoint Implementation Plan: DELETE /api/boxes/:id

## 1. Endpoint Overview

The DELETE /api/boxes/:id endpoint permanently removes a box from the system. When a box is deleted, a database trigger automatically resets the associated QR code by setting its `box_id` to NULL and `status` to 'generated', making the QR code available for reuse with a new box. This is a hard delete operation (not soft delete) that permanently removes the box record from the database.

**Key Characteristics:**
- Hard delete (permanent removal from database)
- Automatic QR code cleanup via database trigger
- Row Level Security (RLS) enforces workspace access control
- Returns simple success message on completion

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/boxes/:id`
- **Parameters**:
  - **Required URL Parameters**:
    - `id` (UUID): The unique identifier of the box to delete
  - **Required Headers**:
    - `Authorization: Bearer <token>`: JWT token for authentication
  - **Optional Parameters**: None
- **Request Body**: None (DELETE requests do not have a body)

### Example Request

```bash
curl -X DELETE \
  http://localhost:3000/api/boxes/b1b48d97-501c-4709-bd7b-d96519721367 \
  -H "Authorization: Bearer eyJhbGc..."
```

## 3. Types Used

### Input Validation Schema (Zod)

A new Zod schema needs to be created for URL parameter validation:

```typescript
import { z } from 'zod';

/**
 * Schema for validating box ID from URL parameters.
 * Ensures the ID is a valid UUID format.
 */
export const DeleteBoxSchema = z.object({
  id: z.string().uuid({
    message: "Nieprawidłowy format identyfikatora pudełka"
  })
});

export type DeleteBoxParams = z.infer<typeof DeleteBoxSchema>;
```

### Response Types

From `src/types.ts`:

- **Success Response** (200 OK):
  ```typescript
  SuccessResponse {
    message: string;
  }
  ```

- **Error Response** (4xx, 5xx):
  ```typescript
  ErrorResponse {
    error: string;
    details?: unknown;
  }
  ```

### Service Layer Types

The service function will use:
- `SupabaseClient` type from `src/db/supabase.client.ts`
- Box ID as `string` (validated UUID)
- User ID as `string` (from authenticated session)

## 4. Response Details

### Success Response (200 OK)

```json
{
  "message": "Box deleted successfully."
}
```

### Error Responses

#### 400 Bad Request
Invalid UUID format in URL parameter.

```json
{
  "error": "Nieprawidłowy format identyfikatora pudełka"
}
```

#### 401 Unauthorized
User not authenticated or invalid JWT token.

```json
{
  "error": "Unauthorized"
}
```

#### 404 Not Found
Box does not exist OR user does not have access (RLS enforcement).

```json
{
  "error": "Pudełko nie znalezione"
}
```

#### 500 Internal Server Error
Unexpected database or server error.

```json
{
  "error": "Nie udało się usunąć pudełka"
}
```

## 5. Data Flow

### Request Flow

1. **Client Request** → DELETE /api/boxes/:id with Authorization header
2. **Astro Middleware** (`src/middleware/index.ts`)
   - Validates JWT token
   - Extracts user session
   - Attaches `supabase` client and `user` to `context.locals`
   - Rejects with 401 if unauthenticated
3. **API Route Handler** (`src/pages/api/boxes/[id].ts`)
   - Extracts `id` from URL params
   - Validates `id` format using Zod schema
   - Calls service layer function
   - Returns appropriate response
4. **Service Layer** (`src/lib/services/box.service.ts::deleteBox()`)
   - Executes DELETE query on `boxes` table
   - RLS policies automatically verify workspace membership
   - Returns success or throws custom error
5. **Database Operations**
   - PostgreSQL RLS checks if user is workspace member
   - If authorized: DELETE box record
   - Database BEFORE DELETE trigger fires:
     - Finds associated QR code
     - Sets `box_id = NULL`
     - Sets `status = 'generated'`
   - Transaction completes
6. **Response** → Returns success message or error to client

### Database Trigger Flow

From `db-plan.md` (lines 122, 142):

```
DELETE FROM boxes WHERE id = 'box-uuid'
  ↓
BEFORE DELETE trigger on boxes
  ↓
UPDATE qr_codes
  SET box_id = NULL,
      status = 'generated'
  WHERE box_id = 'box-uuid'
  ↓
DELETE box record
  ↓
Success
```

### Error Flow

```
Invalid UUID → 400 Bad Request
Missing Auth → 401 Unauthorized (via middleware)
Box not found OR no access → 404 Not Found (RLS returns 0 rows)
Database error → 500 Internal Server Error
```

## 6. Security Considerations

### Authentication & Authorization

1. **JWT Authentication**
   - Handled by Astro middleware (`src/middleware/index.ts`)
   - Validates JWT token from `Authorization: Bearer <token>` header
   - Extracts user session and attaches to `context.locals.user`
   - Returns 401 if token missing or invalid

2. **Row Level Security (RLS)**
   - Database-level authorization via PostgreSQL RLS policies
   - Policy checks: `is_workspace_member(workspace_id)` helper function
   - Automatically enforced on all queries to `boxes` table
   - If user is not a workspace member, DELETE returns 0 rows (404 response)
   - No additional authorization code needed in application layer

3. **Input Validation**
   - Zod schema validates UUID format in URL parameter
   - Prevents malformed input and potential SQL injection vectors
   - Rejects non-UUID strings with 400 error

### Data Integrity

1. **Cascade Cleanup**
   - Database trigger handles QR code cleanup automatically
   - Ensures no orphaned QR codes remain linked to deleted boxes
   - QR codes become available for reuse (status: 'generated')

2. **Foreign Key Constraints**
   - `location_id` has `ON DELETE SET NULL` constraint
   - Deleting a box does not delete its location
   - No orphaned references remain in database

### Audit & Logging

1. **Error Logging**
   - Log all delete operations with context: user_id, box_id, timestamp
   - Log successful deletions for audit trail
   - Log failed attempts with error details
   - Include request metadata for debugging

2. **Security Events**
   - Log 401 attempts (authentication failures)
   - Log 404 attempts (potential unauthorized access via RLS)
   - Monitor for suspicious patterns (repeated failures)

## 7. Error Handling

### Error Scenarios & Handling Strategy

| Scenario | Detection | HTTP Status | Error Message | Logging |
|----------|-----------|-------------|---------------|---------|
| Invalid UUID format | Zod validation fails | 400 | "Nieprawidłowy format identyfikatora pudełka" | Warn with request details |
| Missing auth token | Middleware check | 401 | "Unauthorized" | Info with IP address |
| Invalid JWT token | Middleware check | 401 | "Unauthorized" | Warn with token details |
| Box not found | DELETE returns 0 rows | 404 | "Pudełko nie znalezione" | Info with user_id, box_id |
| No workspace access | RLS blocks DELETE (0 rows) | 404 | "Pudełko nie znalezione" | Warn with user_id, box_id, workspace attempt |
| Database connection error | Supabase client throws | 500 | "Nie udało się usunąć pudełka" | Error with stack trace |
| Database constraint violation | PostgreSQL error | 500 | "Nie udało się usunąć pudełka" | Error with constraint details |
| Trigger execution failure | PostgreSQL error | 500 | "Nie udało się usunąć pudełka" | Error with trigger details |
| Unexpected error | Catch-all | 500 | "Nie udało się usunąć pudełka" | Error with full context |

### Custom Error Classes

Create a custom error class for box-specific errors:

```typescript
/**
 * Custom error thrown when a box is not found or user lacks access.
 * Results in 404 Not Found response.
 */
export class BoxNotFoundError extends Error {
  constructor(boxId: string) {
    super(`Box with ID ${boxId} not found or access denied`);
    this.name = 'BoxNotFoundError';
  }
}
```

### Error Logging Pattern

```typescript
// Success logging
console.log('[DELETE /api/boxes/:id] Box deleted successfully', {
  user_id: userId,
  box_id: boxId,
  timestamp: new Date().toISOString()
});

// Error logging
console.error('[DELETE /api/boxes/:id] Failed to delete box', {
  user_id: userId,
  box_id: boxId,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

### Early Return Pattern

Follow guidelines from `CLAUDE.md` and `.claude/commands/guidelines.md`:

```typescript
// 1. Validate input first
if (!validationResult.success) {
  return new Response(JSON.stringify({ error: "..." }), { status: 400 });
}

// 2. Check authentication (handled by middleware, but verify)
if (!user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

// 3. Attempt delete operation
try {
  await deleteBox(...);
} catch (error) {
  // Handle specific errors
  if (error instanceof BoxNotFoundError) {
    return new Response(JSON.stringify({ error: "..." }), { status: 404 });
  }
  // Generic server error
  return new Response(JSON.stringify({ error: "..." }), { status: 500 });
}

// 4. Happy path - return success
return new Response(JSON.stringify({ message: "..." }), { status: 200 });
```

## 8. Performance Considerations

### Database Optimization

1. **Indexed Queries**
   - Primary key (UUID) index on `boxes.id` ensures fast DELETE lookups
   - Foreign key index on `qr_codes.box_id` ensures fast trigger execution
   - Expected query time: < 10ms for box deletion
   - Expected trigger time: < 5ms for QR code reset

2. **Transaction Atomicity**
   - DELETE and trigger execute in single transaction
   - Ensures data consistency (both operations succeed or both fail)
   - No intermediate state where box is deleted but QR code remains linked

3. **RLS Policy Performance**
   - `is_workspace_member(workspace_id)` function cached within transaction
   - Uses indexed lookup on `workspace_members` table
   - Expected overhead: < 2ms per query

### Potential Bottlenecks

1. **Database Trigger Execution**
   - Risk: If many QR codes linked to one box (should be 1:1)
   - Mitigation: Database constraint ensures 1:1 relationship
   - Expected: Single UPDATE per DELETE

2. **Network Latency**
   - Risk: Round-trip time to Supabase
   - Mitigation: Use connection pooling, optimize query structure
   - Expected: < 50ms total request time

3. **Concurrent Deletes**
   - Risk: Multiple users deleting boxes simultaneously
   - Mitigation: PostgreSQL handles concurrent transactions
   - No application-level locking needed

### Optimization Strategies

1. **Response Streaming**
   - Not applicable for DELETE (small response payload)
   - Return response immediately after successful deletion

2. **Error Response Caching**
   - Cache validation error responses (400) for identical malformed requests
   - Not critical for DELETE operations (typically not repeated)

3. **Monitoring**
   - Track DELETE endpoint latency metrics
   - Alert if average response time > 100ms
   - Monitor RLS policy execution time

## 9. Implementation Steps

### Step 1: Create Input Validation Schema

**File**: `src/lib/validations/box.validation.ts` (create if doesn't exist)

**Actions**:
1. Create or locate validation schemas file for boxes
2. Define `DeleteBoxSchema` using Zod:
   ```typescript
   import { z } from 'zod';

   export const DeleteBoxSchema = z.object({
     id: z.string().uuid({
       message: "Nieprawidłowy format identyfikatora pudełka"
     })
   });

   export type DeleteBoxParams = z.infer<typeof DeleteBoxSchema>;
   ```
3. Export schema for use in API route

### Step 2: Create Custom Error Class

**File**: `src/lib/services/box.service.ts`

**Actions**:
1. Locate or create box service file
2. Add custom error class at the top of the file:
   ```typescript
   /**
    * Custom error thrown when a box is not found or user lacks access.
    */
   export class BoxNotFoundError extends Error {
     constructor(boxId: string) {
       super(`Box with ID ${boxId} not found or access denied`);
       this.name = 'BoxNotFoundError';
     }
   }
   ```

### Step 3: Implement Service Layer Function

**File**: `src/lib/services/box.service.ts`

**Actions**:
1. Create `deleteBox` function with signature:
   ```typescript
   async function deleteBox(
     supabase: SupabaseClient<Database>,
     boxId: string,
     userId: string
   ): Promise<void>
   ```

2. Implementation logic:
   ```typescript
   export async function deleteBox(
     supabase: SupabaseClient<Database>,
     boxId: string,
     userId: string
   ): Promise<void> {
     console.log('[box.service] Deleting box', {
       user_id: userId,
       box_id: boxId
     });

     // Execute DELETE query
     // RLS automatically verifies workspace membership
     const { error, count } = await supabase
       .from('boxes')
       .delete({ count: 'exact' })
       .eq('id', boxId);

     // Check for errors
     if (error) {
       console.error('[box.service] Database error deleting box', {
         user_id: userId,
         box_id: boxId,
         error: error.message,
         code: error.code
       });
       throw new Error('Database error occurred while deleting box');
     }

     // Check if box was actually deleted (RLS might have blocked it)
     if (count === 0) {
       console.warn('[box.service] Box not found or access denied', {
         user_id: userId,
         box_id: boxId
       });
       throw new BoxNotFoundError(boxId);
     }

     console.log('[box.service] Box deleted successfully', {
       user_id: userId,
       box_id: boxId
     });
   }
   ```

3. Export function for use in API route

### Step 4: Create API Route Handler

**File**: `src/pages/api/boxes/[id].ts`

**Actions**:
1. Create new file with DELETE handler:
   ```typescript
   import type { APIRoute } from 'astro';
   import { deleteBox, BoxNotFoundError } from '../../../lib/services/box.service';
   import { DeleteBoxSchema } from '../../../lib/validations/box.validation';

   export const prerender = false;

   export const DELETE: APIRoute = async (context) => {
     // Extract box ID from URL params
     const { id } = context.params;

     // Validate UUID format
     const validationResult = DeleteBoxSchema.safeParse({ id });
     if (!validationResult.success) {
       return new Response(
         JSON.stringify({
           error: "Nieprawidłowy format identyfikatora pudełka"
         }),
         {
           status: 400,
           headers: { 'Content-Type': 'application/json' }
         }
       );
     }

     // Get authenticated user and Supabase client from middleware
     const supabase = context.locals.supabase;
     const user = context.locals.user;

     if (!user) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         {
           status: 401,
           headers: { 'Content-Type': 'application/json' }
         }
       );
     }

     // Attempt to delete box
     try {
       await deleteBox(supabase, validationResult.data.id, user.id);

       return new Response(
         JSON.stringify({
           message: "Box deleted successfully."
         }),
         {
           status: 200,
           headers: { 'Content-Type': 'application/json' }
         }
       );
     } catch (error) {
       // Handle specific error types
       if (error instanceof BoxNotFoundError) {
         return new Response(
           JSON.stringify({ error: "Pudełko nie znalezione" }),
           {
             status: 404,
             headers: { 'Content-Type': 'application/json' }
           }
         );
       }

       // Generic server error
       console.error('[DELETE /api/boxes/:id] Unexpected error', {
         user_id: user.id,
         box_id: id,
         error: error instanceof Error ? error.message : 'Unknown error',
         stack: error instanceof Error ? error.stack : undefined
       });

       return new Response(
         JSON.stringify({ error: "Nie udało się usunąć pudełka" }),
         {
           status: 500,
           headers: { 'Content-Type': 'application/json' }
         }
       );
     }
   };
   ```

### Step 5: Verify Database Trigger

**Actions**:
1. Check that BEFORE DELETE trigger exists on `boxes` table
2. Verify trigger resets QR code correctly:
   - Sets `box_id = NULL`
   - Sets `status = 'generated'`
3. If trigger doesn't exist, create migration (refer to `db-plan.md` lines 122, 142)

### Step 6: Update API Documentation

**File**: `.ai_docs/api-plan.md`

**Actions**:
1. Locate DELETE /api/boxes/:id section (lines 494-509)
2. Add implementation status marker:
   ```markdown
   #### DELETE /api/boxes/:id

   - **Implementation Status**: ✅ Implemented
   - **Implementation File**: `src/pages/api/boxes/[id].ts`
   - **Service Layer**: `src/lib/services/box.service.ts::deleteBox()`
   ```
3. Optionally add enhanced error documentation similar to other implemented endpoints

### Step 7: Manual Testing

**Actions**:
1. Start dev server: `npm run dev`
2. Ensure Supabase is running locally
3. Create test script: `.ai_docs/test-delete-boxes-id.sh`
4. Test script should include:
   ```bash
   #!/bin/bash
   # Test DELETE /api/boxes/:id endpoint

   # Setup test data
   TOKEN="<valid-jwt-token>"
   BOX_ID="<existing-box-uuid>"

   # Test 1: Successful deletion
   curl -X DELETE \
     http://localhost:3000/api/boxes/$BOX_ID \
     -H "Authorization: Bearer $TOKEN" \
     | python3 -m json.tool

   # Expected: {"message": "Box deleted successfully."}

   # Test 2: Delete non-existent box (404)
   curl -X DELETE \
     http://localhost:3000/api/boxes/00000000-0000-0000-0000-000000000000 \
     -H "Authorization: Bearer $TOKEN" \
     | python3 -m json.tool

   # Expected: {"error": "Pudełko nie znalezione"}

   # Test 3: Invalid UUID format (400)
   curl -X DELETE \
     http://localhost:3000/api/boxes/invalid-uuid \
     -H "Authorization: Bearer $TOKEN" \
     | python3 -m json.tool

   # Expected: {"error": "Nieprawidłowy format identyfikatora pudełka"}

   # Test 4: Missing authentication (401)
   curl -X DELETE \
     http://localhost:3000/api/boxes/$BOX_ID \
     | python3 -m json.tool

   # Expected: {"error": "Unauthorized"}

   # Verify QR code was reset
   # Check database: box_id should be NULL, status should be 'generated'
   ```

### Step 8: Verify QR Code Cleanup

**Actions**:
1. Before deletion, query QR code linked to box:
   ```sql
   SELECT id, short_id, box_id, status
   FROM qr_codes
   WHERE box_id = '<box-uuid>';
   ```
2. Execute DELETE request
3. After deletion, verify QR code was reset:
   ```sql
   SELECT id, short_id, box_id, status
   FROM qr_codes
   WHERE id = '<qr-code-uuid>';
   ```
4. Confirm: `box_id = NULL` and `status = 'generated'`

### Step 9: Integration Testing

**Actions**:
1. Test full user flow:
   - User creates box with QR code
   - User deletes box
   - User creates new box with same QR code (should work)
2. Test workspace isolation:
   - User A creates box in Workspace 1
   - User B (member of Workspace 2) attempts to delete
   - Verify 404 response (RLS blocks access)
3. Test edge cases:
   - Delete box without QR code (should succeed)
   - Delete box with location (should succeed, location remains)
   - Delete box as different workspace member (should succeed if member)

### Step 10: Code Quality & Cleanup

**Actions**:
1. Run linter: `npm run lint`
2. Fix any linting issues: `npm run lint:fix`
3. Verify TypeScript compilation: `npx tsc --noEmit`
4. Review code for:
   - Consistent error messages (Polish language)
   - Proper logging at all stages
   - No console.log statements (use console.error/warn/info)
   - Proper TypeScript types (no `any`)
5. Ensure code follows project guidelines from `CLAUDE.md`

### Step 11: Documentation Updates

**Actions**:
1. Update `.ai_docs/api-plan.md` with implementation status
2. Add inline code comments explaining RLS behavior
3. Document QR code cleanup mechanism in service layer
4. Update types.ts if new types were added
5. Create/update test script documentation

### Step 12: Final Verification Checklist

**Before marking as complete, verify**:

- [ ] Input validation works (Zod schema validates UUID)
- [ ] Authentication works (401 without token)
- [ ] Authorization works (404 for boxes in other workspaces)
- [ ] Delete operation works (box removed from database)
- [ ] QR code cleanup works (trigger resets box_id and status)
- [ ] Error responses are correct (400, 401, 404, 500)
- [ ] Success response is correct (200 with message)
- [ ] Logging works (all operations logged with context)
- [ ] RLS policies enforced (workspace isolation)
- [ ] TypeScript compilation succeeds
- [ ] Linter passes
- [ ] Code follows project guidelines
- [ ] Documentation updated
- [ ] Test script created and working

## 10. Related Files & References

### Files to Create/Modify

1. **Create**: `src/lib/validations/box.validation.ts`
   - Zod schema for URL parameter validation

2. **Modify**: `src/lib/services/box.service.ts`
   - Add `BoxNotFoundError` class
   - Add `deleteBox()` function

3. **Create**: `src/pages/api/boxes/[id].ts`
   - DELETE handler implementation

4. **Create**: `.ai_docs/testing/test-delete-boxes-id.sh`
   - Manual testing script

5. **Modify**: `.ai_docs/api-plan.md`
   - Update implementation status if needed

### Database Resources

- **Table**: `public.boxes` (db-plan.md lines 98-122)
- **Table**: `public.qr_codes` (db-plan.md lines 124-142)
- **Trigger**: BEFORE DELETE on boxes (resets QR code)
- **RLS Policies**: Enforced on boxes table
- **Helper Function**: `is_workspace_member(workspace_id)`

### Similar Implementations for Reference

- **DELETE /api/locations/:id**: Similar pattern with soft delete
  - File: `src/pages/api/locations/[id].ts`
  - Service: `src/lib/services/location.service.ts`

- **GET /api/boxes/:id**: Similar validation pattern
  - File: `src/pages/api/boxes/[id].ts` (GET handler)
  - Service: `src/lib/services/box.service.ts::getBoxById()`

### External Dependencies

- `zod`: Input validation
- `@supabase/supabase-js`: Database client
- Astro: API route framework
- TypeScript: Type safety