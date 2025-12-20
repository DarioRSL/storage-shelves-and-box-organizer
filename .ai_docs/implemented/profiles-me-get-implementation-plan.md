# API Endpoint Implementation Plan: GET /profiles/me

## 1. Endpoint Overview

The GET /profiles/me endpoint retrieves the profile information of the currently authenticated user. This is a fundamental endpoint for user identity and profile management, typically used to display user information in the UI or verify the current user's session.

**Purpose:** Provide authenticated users access to their own profile data including email, display name, avatar, and account timestamps.

**Authentication Required:** Yes - JWT token via Authorization header

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/profiles/me`
- **Parameters:**
  - **Required:** None
  - **Optional:** None
- **Request Body:** None
- **Headers:**
  - `Authorization: Bearer <jwt_token>` (required, validated by middleware)

## 3. Used Types

### Response Type
- **ProfileDto** (from `src/types.ts`)
  ```typescript
  type ProfileDto = Tables<"profiles">
  ```

  Fields:
  - `id`: UUID (user's unique identifier)
  - `email`: string (user's email address)
  - `full_name`: string | null (user's display name)
  - `avatar_url`: string | null (URL to user's avatar image)
  - `created_at`: string (ISO timestamp)
  - `updated_at`: string (ISO timestamp)

### Service Types
No additional DTOs or command models required - this is a straightforward read operation.

## 4. Response Details

### Success Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-10-27T10:00:00Z"
}
```

### Error Responses

**401 Unauthorized** - User not authenticated or invalid token
```json
{
  "error": "Unauthorized",
  "details": "Authentication required"
}
```

**404 Not Found** - Profile not found (edge case)
```json
{
  "error": "Not Found",
  "details": "User profile not found"
}
```

**500 Internal Server Error** - Database or server error
```json
{
  "error": "Internal Server Error",
  "details": "Failed to retrieve profile"
}
```

## 5. Data Flow

1. **Request arrives** at `/api/profiles/me`
2. **Middleware validation:**
   - Astro middleware (`src/middleware/index.ts`) validates JWT token
   - Extracts user session and attaches to `context.locals.user`
   - Injects Supabase client to `context.locals.supabase`
3. **Route handler** (GET function in `/api/profiles/me.ts`):
   - Checks if `context.locals.user` exists (authentication guard)
   - Extracts `user.id` from context
   - Calls `ProfileService.getAuthenticatedUserProfile(userId)`
4. **Service layer** (`src/lib/services/profile.service.ts`):
   - Queries `profiles` table via Supabase client
   - Applies RLS policies (user can only access own profile)
   - Returns profile data or throws error
5. **Response formatting:**
   - Success: Returns ProfileDto with 200 status
   - Error: Returns appropriate error response with status code

### Database Interaction
- **Table:** `public.profiles`
- **Query:** `SELECT * FROM profiles WHERE id = $1`
- **RLS Policy:** Enforced by Supabase (user can only read own profile)
- **No joins needed** - all data is in the profiles table

## 6. Security Considerations

### Authentication & Authorization
- **JWT Validation:** Handled by Astro middleware before reaching route handler
- **User Identity:** User ID extracted from validated JWT claims
- **RLS Enforcement:** PostgreSQL Row Level Security ensures users can only access their own profile
- **No parameter injection risk:** No user-supplied parameters in query

### Data Protection
- **No sensitive data exposure:** Profile data is intended to be accessible to the authenticated user
- **HTTPS required:** All API calls should be over HTTPS (enforced at infrastructure level)

### Attack Vectors & Mitigations
- **Token theft:** Mitigated by HTTPS, short token expiry, secure storage
- **CSRF:** Not applicable (read-only GET request with bearer token)
- **SQL Injection:** Not applicable (Supabase parameterized queries + RLS)

## 7. Error Handling

### Error Scenarios & Responses

| Scenario | Status Code | Error Message | Action |
|----------|-------------|---------------|--------|
| No authentication token | 401 | "Unauthorized" | Middleware blocks request |
| Invalid/expired token | 401 | "Unauthorized" | Middleware blocks request |
| User session not found in context | 401 | "Authentication required" | Route handler early return |
| Profile not found in database | 404 | "User profile not found" | Log warning, return 404 |
| Database connection error | 500 | "Failed to retrieve profile" | Log error, return 500 |
| Supabase query error | 500 | "Failed to retrieve profile" | Log error details, return 500 |

### Error Logging Strategy
- **401 errors:** Log at INFO level (expected authentication failures)
- **404 errors:** Log at WARN level (data inconsistency - authenticated user without profile)
- **500 errors:** Log at ERROR level with full stack trace and context

### Error Response Format
All errors follow consistent structure:
```typescript
{
  error: string;      // User-friendly error category
  details?: string;   // Additional context (avoid leaking sensitive info)
}
```

## 8. Performance Considerations

### Optimization Strategies
- **Single query:** Only one database roundtrip required
- **Indexed lookup:** Primary key lookup on `id` (fastest possible query)
- **No joins:** No complex queries or table joins
- **RLS overhead:** Minimal - simple policy check on single row

### Caching Opportunities
- **Response caching:** Could cache profile data in client-side storage
- **Cache invalidation:** Invalidate on profile updates
- **Server-side caching:** Not recommended (profile data changes infrequently but must be current)

### Expected Performance
- **Database query:** < 5ms (primary key lookup)
- **Total response time:** < 50ms (including network overhead)
- **Bottlenecks:** None expected for this simple endpoint

## 9. Implementation Steps

### Step 1: Create Service Layer
**File:** `src/lib/services/profile.service.ts`

1. Create ProfileService class or module
2. Implement `getAuthenticatedUserProfile(supabase: SupabaseClient, userId: string)` method
3. Query profiles table: `supabase.from('profiles').select('*').eq('id', userId).single()`
4. Handle errors: throw specific errors for not found vs database errors
5. Return ProfileDto on success

**Acceptance Criteria:**
- Service method properly typed with SupabaseClient from `src/db/supabase.client.ts`
- Handles both success and error cases
- Returns strongly-typed ProfileDto

### Step 2: Create API Route Handler
**File:** `src/pages/api/profiles/me.ts`

1. Export `prerender = false` to enable SSR
2. Implement `GET` function with APIContext parameter
3. Extract user from `context.locals.user`
4. Return 401 if user not authenticated (early return pattern)
5. Call ProfileService with `context.locals.supabase` and `user.id`
6. Return JSON response with ProfileDto and 200 status
7. Catch errors and return appropriate error responses

**Acceptance Criteria:**
- Route handler follows Astro SSR patterns
- Proper error handling with early returns
- Uses service layer for business logic
- Returns correctly formatted JSON responses

### Step 3: Add Input Validation
**File:** `src/pages/api/profiles/me.ts`

1. Validate `context.locals.user` exists
2. Validate `user.id` is a valid UUID format (optional, should be guaranteed by auth)
3. No request body or query parameter validation needed

**Acceptance Criteria:**
- Authentication check in place
- Helpful error messages for validation failures

### Step 4: Implement Error Handling
**File:** `src/pages/api/profiles/me.ts`

1. Wrap service call in try-catch block
2. Handle specific error types:
   - Not found error → 404 response
   - Database errors → 500 response
3. Log errors appropriately (console.error for now, can be enhanced later)
4. Return user-friendly error messages (avoid exposing internal details)

**Acceptance Criteria:**
- All error scenarios handled
- Appropriate HTTP status codes returned
- Errors logged for debugging
- No sensitive information leaked in error responses

### Step 5: Add TypeScript Types
**File:** Verify in `src/types.ts`

1. Confirm ProfileDto is correctly exported
2. Ensure Database types are up-to-date from `src/db/database.types.ts`
3. No new types needed for this endpoint

**Acceptance Criteria:**
- All types properly imported and used
- No TypeScript errors
- IDE autocomplete works correctly

### Step 6: Test the Endpoint
**Testing Checklist:**

1. **Authentication Tests:**
   - ✓ Request with valid token returns 200 and profile data
   - ✓ Request without token returns 401
   - ✓ Request with expired token returns 401
   - ✓ Request with invalid token returns 401

2. **Data Tests:**
   - ✓ Response matches ProfileDto structure
   - ✓ All fields present and correctly typed
   - ✓ Timestamps in ISO 8601 format

3. **Error Tests:**
   - ✓ Profile not found returns 404 (simulate by deleting profile)
   - ✓ Database error returns 500 (simulate connection issue)

4. **Security Tests:**
   - ✓ User can only access their own profile
   - ✓ No sensitive data leaked in errors
   - ✓ RLS policies enforced

### Step 7: Code Quality & Documentation
1. Run `npm run lint` and fix any issues
2. Run `npm run format` to format code
3. Add JSDoc comments to service method
4. Add inline comments for complex logic (if any)
5. Verify adherence to project guidelines (CLAUDE.md)

**Acceptance Criteria:**
- No linting errors
- Code properly formatted
- Comments added where helpful
- Follows project conventions

### Step 8: Integration Verification
1. Test endpoint with real Supabase instance
2. Verify middleware integration works correctly
3. Test with actual JWT tokens from Supabase Auth
4. Verify RLS policies work as expected
5. Check response times are acceptable

**Acceptance Criteria:**
- Endpoint works end-to-end in development environment
- No console errors or warnings
- Performance meets expectations (< 100ms response time)

## 10. Definition of Done

The implementation is complete when:

- [ ] ProfileService created with getAuthenticatedUserProfile method
- [ ] API route handler implemented at `/api/profiles/me.ts`
- [ ] All error scenarios handled with appropriate status codes
- [ ] Authentication guard in place
- [ ] Response format matches ProfileDto specification
- [ ] Code passes linting and formatting checks
- [ ] Endpoint tested with valid and invalid authentication
- [ ] Error responses tested and verified
- [ ] Integration with Supabase verified
- [ ] Code follows project guidelines (CLAUDE.md)
- [ ] No TypeScript errors
- [ ] Performance acceptable (< 100ms)

## 11. Future Enhancements

Potential improvements for future iterations:

1. **Caching:** Implement client-side caching for profile data
2. **Profile Updates:** Add PATCH /profiles/me endpoint for updating profile
3. **Avatar Upload:** Add endpoint for uploading/updating avatar images
4. **Rate Limiting:** Add rate limiting to prevent abuse
5. **Metrics:** Track endpoint usage and performance metrics
6. **Expanded Profile:** Add additional profile fields (bio, preferences, etc.)