# API Endpoint Implementation Plan: DELETE /api/auth/delete-account

## 1. Overview

The DELETE /api/auth/delete-account endpoint permanently deletes a user's account and all associated data from the system. This is an irreversible operation that removes the user profile, all owned workspaces, workspace memberships, and associated data (locations, boxes, QR codes).

**Priority:** Post-MVP (Optional feature)
**Complexity:** High (involves cascade deletion and transaction management)
**Security Impact:** Critical (permanent data deletion, authentication revocation)

---

## 2. Request Details

### HTTP Method

`DELETE`

### URL

```
DELETE /api/auth/delete-account
```

### Authorization

- **Required:** Yes (JWT token in `Authorization: Bearer <token>` header)
- **Validation:** Middleware extracts user from JWT; endpoint verifies user exists
- **Scope:** User can only delete their own account (no parameter-based user ID)

### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body

None (DELETE endpoint with no body parameters)

### Query Parameters

None

---

## 3. Response Details

### Success Response (200 OK)

```json
{
  "message": "Account successfully deleted"
}
```

**Response Type:**

```typescript
interface DeleteAccountResponse {
  message: string;
}
```

### Error Responses

| HTTP Status | Error Type            | Message                                    | Details                                      |
| ----------- | --------------------- | ------------------------------------------ | -------------------------------------------- |
| **400**     | Bad Request           | "Nieprawidłowy format żądania"             | Malformed JSON or invalid Content-Type       |
| **401**     | Unauthorized          | "Brakujący lub nieprawidłowy token JWT"    | No token provided or token invalid/expired   |
| **404**     | Not Found             | "Konto użytkownika nie zostało znalezione" | Authenticated user doesn't exist in database |
| **409**     | Conflict              | "Usuwanie konta w toku"                    | Concurrent deletion request detected         |
| **500**     | Internal Server Error | "Nie udało się usunąć konta"               | Database error during deletion               |
| **500**     | Internal Server Error | "Nie udało się odwołać uwierzytelnienia"   | Supabase Auth revocation failed              |

---

## 4. Utilized Types

### New Types to Add to `src/types.ts`

```typescript
/**
 * Response when deleting a user account via DELETE /api/auth/delete-account.
 * Returns confirmation message with no sensitive user data.
 */
export interface DeleteAccountResponse {
  message: string;
}
```

### Existing Types Used

- `ErrorResponse` - From `src/types.ts`, used for error responses
- `SupabaseClient` - From `src/db/supabase.client.ts`, for database operations

### Custom Error Classes (New)

```typescript
/**
 * Custom error for user account not found.
 */
export class UserAccountNotFoundError extends Error {
  constructor(message = "Konto użytkownika nie zostało znalezione") {
    super(message);
    this.name = "UserAccountNotFoundError";
  }
}

/**
 * Custom error for account deletion failures.
 */
export class AccountDeletionError extends Error {
  constructor(message = "Nie udało się usunąć konta") {
    super(message);
    this.name = "AccountDeletionError";
  }
}

/**
 * Custom error for Supabase Auth revocation failures.
 */
export class AuthRevocationError extends Error {
  constructor(message = "Nie udało się odwołać uwierzytelnienia") {
    super(message);
    this.name = "AuthRevocationError";
  }
}
```

---

## 5. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DELETE /api/auth/delete-account Request                     │
│    - Client sends DELETE with JWT token                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. API Route Handler (src/pages/api/auth/delete-account.ts)    │
│    - Extract Supabase client from context.locals               │
│    - Verify authentication (JWT token valid)                   │
│    - Extract user ID from authenticated session                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Service Layer (deleteUserAccount function)                  │
│    - Step 3a: Verify user profile exists                       │
│    - Step 3b: Delete all data in cascade order:               │
│        - Delete boxes (triggers QR code reset)                │
│        - Reset QR codes to 'generated' status                 │
│        - Delete locations                                     │
│        - Delete workspace_members                             │
│        - Delete workspaces                                    │
│        - Delete user profile                                  │
│    - Step 3c: Revoke Supabase Auth user account               │
│    - Step 3d: Handle rollback on any failure                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Database Operations (Supabase)                              │
│    - PostgreSQL cascade deletes via foreign keys              │
│    - Database triggers for QR code resets                     │
│    - Transaction atomicity (all-or-nothing)                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Supabase Auth Admin API                                     │
│    - Revoke/delete user from auth.users table                 │
│    - Invalidate all active sessions                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Response to Client                                          │
│    - Success: 200 OK with deletion confirmation               │
│    - Error: Appropriate HTTP status with error message        │
└─────────────────────────────────────────────────────────────────┘
```

### Database Cascade Order

The deletion must follow this specific order to maintain referential integrity:

1. **Boxes** → Delete all boxes in user's workspaces
   - Trigger: Database trigger resets associated QR codes to 'generated'
   - ForeignKey: `workspace_id` references `workspaces`

2. **QR Codes** → Explicitly reset 'assigned' QR codes
   - Set `status = 'generated'` and `box_id = NULL`
   - Ensures no orphaned references

3. **Locations** → Delete all location hierarchies
   - ForeignKey: `workspace_id` references `workspaces`
   - No dependencies remain after boxes are deleted

4. **Workspace Members** → Delete all membership records
   - ForeignKey: `workspace_id` and `user_id` have CASCADE

5. **Workspaces** → Delete all workspaces owned by user
   - ForeignKey: `owner_id` references `profiles`

6. **Profile** → Delete user profile
   - ForeignKey: `id` references `auth.users` with ON DELETE CASCADE

7. **Auth User** → Revoke Supabase Auth account
   - API call to Supabase Admin API
   - Invalidates all sessions

---

## 6. Security Considerations

### Authentication & Authorization

- **JWT Validation:** Middleware validates token and extracts user context
- **User Identity:** Extract user ID from `context.locals.user` (set by middleware)
- **Self-Only Deletion:** User can only delete their own account (no user_id parameter)
- **Session Invalidation:** After deletion, all user sessions become invalid (auth user removed)

### Data Protection

- **No Sensitive Data in Logs:** Never log user email, passwords, or personal data
- **Audit Trail:** Log deletion event with timestamp and anonymized user_id
- **Immutable Records:** Consider using soft-delete (is_deleted flag) instead of hard delete
- **Grace Period:** Optionally implement 30-day grace period before permanent deletion

### Referential Integrity

- **Cascade Delete:** Leverage PostgreSQL foreign key CASCADE rules
- **Atomic Operations:** All deletions must succeed together or all rollback
- **Orphaned Data:** Prevent orphaned records (locations, QR codes, etc.)
- **Consistency Checks:** Verify no data remains after deletion

### API Security

- **Rate Limiting:** Consider rate limiting to prevent abuse
- **HTTPS Only:** Enforce HTTPS for all authentication endpoints
- **CORS:** Validate CORS headers if applicable
- **Input Sanitization:** Validate JWT token format before use

---

## 7. Error Handling

### Error Handling Strategy

```typescript
// 1. Authentication Errors (401)
if (!user) {
  return new Response({ error: "Nie jesteś uwierzytelniony" }, { status: 401 });
}

// 2. Validation Errors (400)
if (!isValidRequest()) {
  return new Response({ error: "Nieprawidłowy format żądania" }, { status: 400 });
}

// 3. Not Found Errors (404)
if (!userProfile) {
  return new Response({ error: "Konto użytkownika nie zostało znalezione" }, { status: 404 });
}

// 4. Service Errors (500)
try {
  await deleteUserAccount(supabase, userId);
} catch (error) {
  if (error instanceof UserAccountNotFoundError) {
    return new Response({ error: error.message }, { status: 404 });
  }
  if (error instanceof AccountDeletionError) {
    return new Response({ error: error.message }, { status: 500 });
  }
  if (error instanceof AuthRevocationError) {
    return new Response({ error: error.message }, { status: 500 });
  }
  return new Response({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
}
```

### Specific Error Scenarios

1. **User Not Found**
   - Cause: Authenticated JWT exists but profile doesn't exist in `profiles` table
   - Action: Return 404 with "Konto użytkownika nie zostało znalezione"
   - Log: Security event (orphaned auth user)

2. **Profile Deletion Fails**
   - Cause: Database constraint violation or connection error
   - Action: Rollback all operations, return 500
   - Log: Include error details for debugging

3. **Workspace Cascade Fails**
   - Cause: Foreign key constraint violation or data integrity issue
   - Action: Return 500, attempt rollback
   - Log: Include workspace count and error details

4. **QR Code Reset Fails**
   - Cause: Database error during update
   - Action: Return 500, attempt rollback
   - Log: Include QR code count and error details

5. **Auth Revocation Fails**
   - Cause: Supabase Admin API error or permission issue
   - Action: Return 500 with "Nie udało się odwołać uwierzytelnienia"
   - Log: Include Supabase error details

6. **Partial Failure (Transaction Incomplete)**
   - Cause: One deletion succeeds but another fails
   - Action: Attempt full rollback if possible
   - Log: Critical error with full transaction details

---

## 8. Performance Considerations

### Potential Bottlenecks

1. **Large Dataset Deletion**
   - Issue: User with many workspaces/boxes
   - Solution: Consider pagination or background job for async deletion
   - Mitigation: Delete cascade should be efficient with proper indexing

2. **Database Locks**
   - Issue: Long-running deletion could lock tables
   - Solution: Use indexed foreign keys for fast lookups
   - Mitigation: Monitor transaction duration

3. **Supabase Auth API Latency**
   - Issue: External API call could delay response
   - Solution: Consider async revocation after successful deletion
   - Mitigation: Set reasonable timeout (5-30 seconds)

### Optimization Strategies

- **Indexed Lookups:** Use workspace_id and user_id indexes for fast filtering
- **Batch Operations:** Group DELETE statements where possible
- **Connection Pooling:** Ensure Supabase client uses connection pooling
- **Query Optimization:** Use USING clause for efficient joins in DELETE

### Database Indexes to Verify

```sql
-- Verify these indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_boxes_workspace_id ON boxes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_locations_workspace_id ON locations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_workspace_id ON qr_codes(workspace_id);
```

---

## 9. Implementation Steps

### Step 1: Add Type Definitions

**File:** `src/types.ts`

1. Add `DeleteAccountResponse` interface
2. Add custom error classes to new file `src/lib/services/errors.ts` or inline
3. Update type exports if needed

### Step 2: Create Auth Service

**File:** `src/lib/services/auth.service.ts` (NEW)

1. Create `deleteUserAccount()` function with signature:

   ```typescript
   export async function deleteUserAccount(supabase: SupabaseClient, userId: string): Promise<{ user_id: string }>;
   ```

2. Implement cascade deletion logic:
   - Query user profile to verify existence
   - Get all workspaces owned by user
   - Delete boxes in all workspaces
   - Reset QR codes to 'generated' status
   - Delete locations in all workspaces
   - Delete workspace_members records
   - Delete workspaces
   - Delete user profile
   - Call Supabase Admin API to revoke auth user

3. Implement error handling:
   - Throw `UserAccountNotFoundError` if profile doesn't exist
   - Throw `AccountDeletionError` on database failures
   - Throw `AuthRevocationError` on auth API failures
   - Log all operations for audit trail

### Step 3: Create API Route

**File:** `src/pages/api/auth/delete-account.ts` (NEW)

1. Create DELETE endpoint handler
2. Implement error handling following existing patterns:
   - 401: Unauthorized (missing JWT)
   - 400: Bad request (invalid format)
   - 404: Not found (user doesn't exist)
   - 500: Internal error (database/auth failures)

3. Return proper response format:

   ```json
   {
     "message": "Account successfully deleted"
   }
   ```

4. Log all operations (success and failures)

### Step 4: Add Error Classes

**File:** `src/lib/services/errors.ts` (NEW) or add to existing service file

1. Define custom error classes:
   - `UserAccountNotFoundError`
   - `AccountDeletionError`
   - `AuthRevocationError`

2. Export from service module

### Step 5: Add Frontend Support (Optional)

**File:** `src/components/DeleteAccountModal.tsx` (if needed)

1. Create confirmation dialog:
   - Warning about irreversible action
   - Require user to type "DELETE ACCOUNT"
   - Show loading state during deletion

2. Call API endpoint:

   ```typescript
   const response = await fetch("/api/auth/delete-account", {
     method: "DELETE",
     headers: {
       Authorization: `Bearer ${token}`,
     },
   });
   ```

3. Handle response:
   - On success: Logout and redirect to login
   - On error: Show error message

### Step 6: Update Supabase Permissions (if needed)

**Database:**

1. Verify RLS policies allow deletion:
   - Check `profiles` RLS policy for DELETE
   - Verify `workspaces` RLS for DELETE (owned by user)
   - Verify cascade delete triggers exist

2. Verify foreign key constraints:
   ```sql
   -- Check that CASCADE delete is enabled
   SELECT constraint_name, update_rule, delete_rule
   FROM information_schema.referential_constraints
   WHERE table_name IN ('workspaces', 'boxes', 'locations', 'qr_codes');
   ```

### Step 7: Testing

**Manual Testing:**

1. Create test user with multiple workspaces and data
2. Call DELETE endpoint with valid JWT
3. Verify response is 200 OK
4. Verify all data is deleted:
   - Check `profiles` (deleted)
   - Check `workspaces` (deleted)
   - Check `workspace_members` (deleted)
   - Check `boxes` (deleted)
   - Check `locations` (deleted)
   - Check `qr_codes` (reset to 'generated')
   - Check `auth.users` (deleted/revoked)

**Error Testing:**

1. Test missing JWT → 401
2. Test invalid JWT → 401
3. Test non-existent user → 404
4. Test database error (simulate with invalid connection)
5. Test concurrent deletion requests

**Security Testing:**

1. Verify user cannot delete other user accounts
2. Verify user cannot bypass authentication
3. Verify sensitive data not logged
4. Verify sessions invalidated after deletion

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Code formatted: `npm run format`
- [ ] Error handling complete for all scenarios
- [ ] Logging configured for audit trail
- [ ] Security review completed
- [ ] Database indexes verified
- [ ] RLS policies verified
- [ ] Soft-delete option considered (optional)

### Deployment

- [ ] Deploy auth.service.ts
- [ ] Deploy API route
- [ ] Deploy type definitions
- [ ] Verify endpoint accessible
- [ ] Test with production-like data
- [ ] Monitor logs for errors
- [ ] Have rollback plan ready

### Post-Deployment

- [ ] Monitor error rates in logs
- [ ] Verify no orphaned data
- [ ] Check deletion performance
- [ ] Collect user feedback
- [ ] Document for support team
- [ ] Add to API documentation

---

## 11. Considerations for Future Enhancements

### Soft Delete (Recommended)

Instead of hard delete, consider:

```sql
-- Add soft-delete column
ALTER TABLE profiles ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP NULL;

-- Update RLS policy to exclude deleted users
CREATE POLICY "exclude_deleted_profiles"
  ON profiles
  FOR SELECT
  USING (NOT is_deleted);
```

Benefits:

- Allow account recovery within grace period
- Preserve data for compliance/audits
- Safer operation (easier to undo mistakes)
- Support GDPR "right to be forgotten" with timeline

### Async Deletion

For large datasets, consider background job:

```typescript
// Delete data immediately, revoke auth asynchronously
await deleteUserDataImmediately(supabase, userId);
await queueAuthRevocationJob(userId); // Background job
return { message: "Deletion konta rozpoczęta" };
```

### Grace Period

Implement 30-day grace period before final deletion:

```sql
-- User can still login during grace period
-- Data gradually anonymized
-- After 30 days, automatic permanent deletion
```

### Audit Logging

Add dedicated audit table for sensitive operations:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR,
  details JSONB,
  timestamp TIMESTAMP,
  ip_address INET
);
```

---

## 12. API Documentation

### cURL Example

```bash
# Delete user account
curl -X DELETE http://localhost:3000/api/auth/delete-account \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"

# Expected response (200 OK)
# {
#   "message": "Account successfully deleted"
# }
```

### JavaScript/TypeScript Example

```typescript
async function deleteUserAccount(token: string) {
  try {
    const response = await fetch("/api/auth/delete-account", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Nie udało się usunąć konta");
    }

    const data: DeleteAccountResponse = await response.json();
    console.log(data.message);

    // Logout and redirect
    window.location.href = "/login";
  } catch (error) {
    console.error("Usuwanie konta nie powiodło się:", error);
    throw error;
  }
}
```

---

## Summary

This implementation plan provides a comprehensive guide for implementing the DELETE /api/auth/delete-account endpoint. Key highlights:

- **Security First:** Strong authentication, authorization, and error handling
- **Data Integrity:** Proper cascade deletion and transaction management
- **User Safety:** Irreversible operation with clear confirmation requirements
- **Audit Trail:** Comprehensive logging for compliance and debugging
- **Future-Ready:** Soft-delete and grace period recommendations included

The implementation follows established patterns from existing endpoints (workspace deletion) and maintains consistency with the project's architecture and conventions.
