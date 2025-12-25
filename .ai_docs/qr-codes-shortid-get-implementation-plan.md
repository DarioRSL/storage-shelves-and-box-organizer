# API Endpoint Implementation Plan: GET /api/qr-codes/:short_id

## 1. Endpoint Overview

The `GET /api/qr-codes/:short_id` endpoint resolves a scanned QR code to its current status and associated box information. This endpoint is critical for the mobile scanning workflow, enabling the application to determine whether to display the "Create New Box" form (for unassigned QR codes) or redirect to the box details page (for assigned QR codes).

**Primary Use Case:** When a user scans a QR code label with their mobile device, the application calls this endpoint to retrieve the QR code's current state and decide the next UI action.

**Business Logic:**
- Accepts a QR code short ID (format: QR-XXXXXX) from the URL parameter
- Returns complete QR code metadata including assignment status and workspace information
- Enforces workspace-based access control via PostgreSQL Row Level Security (RLS)
- Enables conditional routing based on box_id presence

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
GET /api/qr-codes/:short_id
```

**Example:**
```
GET /api/qr-codes/QR-A1B2C3
```

### URL Parameters

| Parameter | Type   | Required | Format             | Description                                    |
|-----------|--------|----------|--------------------|------------------------------------------------|
| short_id  | string | Yes      | `QR-[A-Z0-9]{6}`  | The QR code's unique short identifier          |

**Valid Examples:**
- `QR-A1B2C3`
- `QR-X7K9P2`
- `QR-000000`
- `QR-ZZZZZZ`

**Invalid Examples:**
- `QR-abc123` (lowercase letters not allowed)
- `QR-12345` (only 5 characters)
- `QR-1234567` (7 characters)
- `A1B2C3` (missing QR- prefix)
- `qr-A1B2C3` (lowercase prefix)

### Request Headers

| Header        | Required | Value                  | Description                    |
|---------------|----------|------------------------|--------------------------------|
| Authorization | Yes      | `Bearer <JWT_TOKEN>`   | Supabase JWT authentication token |

### Query Parameters
None

### Request Body
None (GET request)

## 3. Types Used

### QrCodeDetailDto (Response Type)

Defined in `src/types.ts` (lines 260-266):

```typescript
export interface QrCodeDetailDto {
  id: string;              // UUID of the QR code record
  short_id: string;        // Scannable short ID (format: QR-XXXXXX)
  box_id: string | null;   // UUID of linked box (null if unassigned)
  status: QrStatus;        // 'generated' | 'printed' | 'assigned'
  workspace_id: string;    // UUID of workspace that owns this QR code
}
```

### QrStatus Enum

Defined in `src/types.ts` (line 232):

```typescript
export type QrStatus = Enums<"qr_status">;
// Possible values: 'generated' | 'printed' | 'assigned'
```

**Status Lifecycle:**
- `generated`: QR code created but not yet printed
- `printed`: QR code has been printed on a physical label
- `assigned`: QR code is linked to a box

### ErrorResponse

Defined in `src/types.ts` (lines 278-281):

```typescript
export interface ErrorResponse {
  error: string;
  details?: unknown;
}
```

### Validation Schema

To be created in `src/lib/validators/qr-code.validators.ts`:

```typescript
import { z } from "zod";

/**
 * Validation schema for GET /api/qr-codes/:short_id URL parameter.
 * Validates the QR code short_id format.
 */
export const GetQrCodeByShortIdSchema = z.object({
  short_id: z
    .string()
    .regex(
      /^QR-[A-Z0-9]{6}$/,
      "Nieprawidłowy format ID kodu QR. Oczekiwany format: QR-XXXXXX"
    ),
});

export type GetQrCodeByShortIdInput = z.infer<typeof GetQrCodeByShortIdSchema>;
```

## 4. Response Details

### Success Response (200 OK)

**Headers:**
```
Content-Type: application/json
```

**Body Structure:**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174000",
  "short_id": "QR-A1B2C3",
  "box_id": "b1b48d97-501c-4709-bd7b-d96519721367",
  "status": "assigned",
  "workspace_id": "4d5a1187-e805-4a53-845d-f118945b0dd0"
}
```

**Response for Unassigned QR Code:**
```json
{
  "id": "789e4560-e89b-12d3-a456-426614174001",
  "short_id": "QR-D4E5F6",
  "box_id": null,
  "status": "generated",
  "workspace_id": "4d5a1187-e805-4a53-845d-f118945b0dd0"
}
```

**Frontend Routing Logic:**
- If `box_id` is `null` and `status` is `"generated"` or `"printed"`: Show "Create New Box" form
- If `box_id` is present: Redirect to `/boxes/{box_id}` (Box Details page)

### Error Responses

#### 400 Bad Request - Invalid short_id Format

```json
{
  "error": "Nieprawidłowy format ID kodu QR. Oczekiwany format: QR-XXXXXX"
}
```

**Trigger Conditions:**
- short_id doesn't match regex pattern `/^QR-[A-Z0-9]{6}$/`
- Examples: `QR-abc` (too short), `qr-A1B2C3` (lowercase), `A1B2C3` (no prefix)

#### 401 Unauthorized - Authentication Failure

```json
{
  "error": "Nieautoryzowany dostęp"
}
```

**Trigger Conditions:**
- No `Authorization` header provided
- Invalid JWT token
- Expired JWT token
- User session not found

#### 404 Not Found - QR Code Not Found

```json
{
  "error": "Kod QR nie został znaleziony"
}
```

**Trigger Conditions:**
- No QR code with this short_id exists in database
- QR code exists but user is not a member of its workspace (RLS denial)

#### 500 Internal Server Error - Server Failure

```json
{
  "error": "Nie udało się pobrać kodu QR"
}
```

**Trigger Conditions:**
- Database connection failure
- Unexpected service layer errors
- Supabase client errors

## 5. Data Flow

### Request Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Scanner)  │
└──────┬──────┘
       │ 1. GET /api/qr-codes/QR-A1B2C3
       │    Header: Authorization: Bearer <token>
       ▼
┌─────────────────────────────────────┐
│  API Route Handler                  │
│  src/pages/api/qr-codes/[short_id].ts│
└──────┬──────────────────────────────┘
       │ 2. Extract short_id from URL params
       │ 3. Validate with GetQrCodeByShortIdSchema
       ▼
┌─────────────────────────────────────┐
│  Authentication Layer               │
│  supabase.auth.getUser()            │
└──────┬──────────────────────────────┘
       │ 4. Verify JWT token
       │ 5. Get user.id for logging
       ▼
┌─────────────────────────────────────┐
│  Service Layer                      │
│  src/lib/services/qr-code.service.ts│
│  getQrCodeByShortId()               │
└──────┬──────────────────────────────┘
       │ 6. Query qr_codes table
       │    SELECT id, short_id, box_id, status, workspace_id
       │    WHERE short_id = 'QR-A1B2C3'
       ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database                │
│  RLS Policy Enforcement             │
└──────┬──────────────────────────────┘
       │ 7. RLS checks workspace membership
       │    auth.uid() IN (SELECT user_id
       │                   FROM workspace_members
       │                   WHERE workspace_id = qr_codes.workspace_id)
       │ 8. Return single row or empty result
       ▼
┌─────────────────────────────────────┐
│  Service Layer (Response)           │
└──────┬──────────────────────────────┘
       │ 9. Return QrCodeDetailDto or throw QrCodeNotFoundError
       ▼
┌─────────────────────────────────────┐
│  API Route Handler (Response)       │
└──────┬──────────────────────────────┘
       │ 10. Return 200 OK with JSON
       │     or appropriate error status
       ▼
┌─────────────┐
│   Client    │
│  (Scanner)  │
└─────────────┘
```

### Database Query

**Table:** `public.qr_codes`

**Query Structure:**
```sql
SELECT
  id,
  short_id,
  box_id,
  status,
  workspace_id
FROM qr_codes
WHERE short_id = 'QR-A1B2C3';
```

**Indexes Used:**
- Unique index on `short_id` (fast lookup, O(log n) complexity)

**RLS Policy Applied:**
```sql
-- Policy name: workspace_members_qr_codes_select
-- Automatically enforced by PostgreSQL
auth.uid() IN (
  SELECT user_id
  FROM workspace_members
  WHERE workspace_id = qr_codes.workspace_id
)
```

## 6. Security Considerations

### Authentication
- **Method:** Supabase Auth (JWT tokens)
- **Token Location:** `Authorization: Bearer <token>` header
- **Validation:** `supabase.auth.getUser()` verifies token signature and expiration
- **Failure Handling:** Return 401 Unauthorized if authentication fails

### Authorization
- **Mechanism:** PostgreSQL Row Level Security (RLS)
- **Policy:** User must be a member of the workspace that owns the QR code
- **Enforcement:** Automatic via database policies (no explicit code needed)
- **Failure Handling:** RLS denial returns empty result, interpreted as 404 Not Found

### Input Validation
- **short_id Parameter:**
  - Must match regex: `/^QR-[A-Z0-9]{6}$/`
  - Prevents SQL injection (parameterized queries)
  - Prevents path traversal attacks
  - Rejects malformed input early (400 Bad Request)

### Potential Security Risks

| Risk                | Mitigation                                      | Severity |
|---------------------|-------------------------------------------------|----------|
| SQL Injection       | Supabase client uses parameterized queries      | Low      |
| Unauthorized Access | RLS policies enforce workspace membership       | Low      |
| Token Theft         | HTTPS required, short token expiration          | Medium   |
| Enumeration Attack  | Rate limiting should be added (future)          | Medium   |
| CORS Issues         | Configured in middleware                        | Low      |

### Data Privacy
- QR codes are scoped to workspaces (multi-tenant isolation)
- User can only access QR codes from workspaces they belong to
- No sensitive data exposed in QR code short_id (random alphanumeric)
- Audit trail: All queries logged with user_id and short_id

## 7. Error Handling

### Error Handling Strategy

The endpoint follows the **early return pattern** for error conditions:
1. Handle authentication errors first
2. Validate input parameters
3. Call service layer with try-catch
4. Handle specific service errors (QrCodeNotFoundError)
5. Catch unexpected errors as 500 Internal Server Error

### Error Classes

#### Custom Service Error

Create in `src/lib/services/qr-code.service.ts`:

```typescript
/**
 * Custom error for QR code not found in database.
 * HTTP Status: 404 Not Found
 */
export class QrCodeNotFoundError extends Error {
  constructor(message = "Kod QR nie został znaleziony") {
    super(message);
    this.name = "QrCodeNotFoundError";
  }
}
```

### Error Scenarios and Handling

| Scenario                          | Detection Method                     | HTTP Status | Response                                      | Logging                              |
|-----------------------------------|--------------------------------------|-------------|-----------------------------------------------|--------------------------------------|
| Missing Authorization header      | `authError` or `!user`              | 401         | `{ "error": "Nieautoryzowany dostęp" }`       | None (expected behavior)             |
| Invalid JWT token                 | `authError` from getUser()          | 401         | `{ "error": "Nieautoryzowany dostęp" }`       | None (expected behavior)             |
| Invalid short_id format           | Zod validation fails                | 400         | `{ "error": "Nieprawidłowy format..." }`      | None (invalid input)                 |
| QR code doesn't exist             | Supabase returns empty result       | 404         | `{ "error": "Kod QR nie został znaleziony" }` | Log with user_id and short_id        |
| RLS policy denial                 | Supabase returns empty result       | 404         | `{ "error": "Kod QR nie został znaleziony" }` | Log with user_id and short_id        |
| Database connection error         | Supabase error with code            | 500         | `{ "error": "Nie udało się pobrać kodu QR" }` | console.error() with full error      |
| Unexpected service error          | Unhandled exception in service      | 500         | `{ "error": "Nie udało się pobrać kodu QR" }` | console.error() with stack trace     |
| Unexpected route handler error    | Outer try-catch in route handler    | 500         | `{ "error": "Wewnętrzny błąd serwera" }`      | console.error() with context         |

### Logging Examples

**Successful Query:**
```javascript
console.log("QR code fetched successfully:", {
  qr_code_id: data.id,
  short_id: data.short_id,
  user_id: userId,
  workspace_id: data.workspace_id,
  is_assigned: !!data.box_id,
});
```

**QR Code Not Found:**
```javascript
console.warn("QR code not found or access denied:", {
  short_id: shortId,
  user_id: userId,
});
```

**Database Error:**
```javascript
console.error("Error fetching QR code:", {
  short_id: shortId,
  user_id: userId,
  error: error.message,
  code: error.code,
});
```

## 8. Performance Considerations

### Expected Performance Metrics

| Metric                  | Target Value | Measurement Method                          |
|-------------------------|--------------|---------------------------------------------|
| Response Time (p50)     | < 50ms       | Database query + JSON serialization         |
| Response Time (p95)     | < 100ms      | Including authentication overhead           |
| Response Time (p99)     | < 200ms      | Under high load conditions                  |
| Database Query Time     | < 10ms       | Single indexed lookup                       |
| Throughput              | 1000+ req/s  | Stateless, read-only, simple query          |

### Database Optimization

**Index Usage:**
- `short_id` column has unique index (from migration)
- Query uses `WHERE short_id = ?` → index scan (fast)
- No table scans required
- Query plan: Index Scan → Single Row Fetch

**Query Complexity:** O(log n) due to B-tree index lookup

### Potential Bottlenecks

| Bottleneck              | Likelihood | Mitigation Strategy                                    |
|-------------------------|------------|--------------------------------------------------------|
| Database connection pool| Low        | Supabase manages connection pooling automatically      |
| JWT verification        | Low        | Supabase caches decoded tokens for short periods       |
| Network latency         | Medium     | Deploy API and database in same region                 |
| RLS policy evaluation   | Low        | RLS queries are optimized and use indexes              |
| JSON serialization      | Very Low   | Minimal payload size (~200 bytes)                      |

### Scalability Considerations

- **Horizontal Scaling:** Endpoint is stateless, can scale infinitely
- **Caching Strategy:** Not needed for MVP (QR status changes infrequently)
  - Future enhancement: Redis cache with 5-minute TTL
  - Cache invalidation on QR assignment/unassignment
- **Rate Limiting:** Should be implemented to prevent enumeration attacks
  - Suggested: 100 requests/minute per IP
  - Use Supabase Edge Functions rate limiting or middleware

### Monitoring Recommendations

- Track response time percentiles (p50, p95, p99)
- Monitor 404 rate (high rate may indicate scanning issues)
- Alert on 500 errors (should be near zero)
- Track QR code scan frequency by workspace (usage metrics)

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File:** `src/lib/validators/qr-code.validators.ts`

**Tasks:**
- Import Zod library
- Create `GetQrCodeByShortIdSchema` with regex validation for QR-XXXXXX format
- Export type inference `GetQrCodeByShortIdInput`
- Add error messages in Polish to match project conventions

**Acceptance Criteria:**
- Schema validates valid short_id formats (QR-A1B2C3, QR-000000, etc.)
- Schema rejects invalid formats (lowercase, wrong length, missing prefix)
- Error messages are clear and in Polish

---

### Step 2: Create Service Layer Function

**File:** `src/lib/services/qr-code.service.ts`

**Tasks:**
- Import `SupabaseClient` type from `@/db/supabase.client`
- Import `QrCodeDetailDto` from `@/types`
- Create `QrCodeNotFoundError` custom error class
- Implement `getQrCodeByShortId(supabase, shortId, userId)` function:
  - Query `qr_codes` table with `.select()` for required fields
  - Use `.eq("short_id", shortId)` filter
  - Use `.single()` to expect one result
  - Handle Supabase errors (PGRST116 = not found)
  - Throw `QrCodeNotFoundError` if not found or RLS denied
  - Log successful retrieval with context
  - Return `QrCodeDetailDto` typed response

**Acceptance Criteria:**
- Function signature matches pattern from box.service.ts
- Proper error handling with custom error class
- Comprehensive logging for success and error cases
- Type-safe response using QrCodeDetailDto

---

### Step 3: Create API Route Handler

**File:** `src/pages/api/qr-codes/[short_id].ts`

**Tasks:**
- Import `APIRoute` type from Astro
- Import service function and error class
- Import validation schema
- Import types (QrCodeDetailDto, ErrorResponse)
- Set `export const prerender = false`
- Implement `GET` handler:
  1. Extract `supabase` from `locals`
  2. Authenticate user with `supabase.auth.getUser()`
  3. Return 401 if authentication fails
  4. Extract `short_id` from `params`
  5. Validate with Zod schema
  6. Return 400 if validation fails
  7. Call service function in try-catch
  8. Handle `QrCodeNotFoundError` → 404
  9. Handle generic errors → 500
  10. Return 200 OK with JSON on success

**Acceptance Criteria:**
- Follows Astro API route conventions (uppercase GET handler)
- Proper error handling with appropriate status codes
- All responses include `Content-Type: application/json` header
- Error messages in Polish
- Logging for unexpected errors

---

### Step 4: Test Endpoint Manually

**Tasks:**
- Start dev server: `npm run dev`
- Ensure Supabase is running locally
- Create test data:
  - Create a workspace
  - Generate QR codes using POST /qr-codes/batch
  - Assign one QR code to a box
  - Keep one QR code unassigned
- Test scenarios with curl:
  1. **Valid assigned QR code** → expect 200 with box_id
  2. **Valid unassigned QR code** → expect 200 with null box_id
  3. **Non-existent QR code** → expect 404
  4. **Invalid short_id format** → expect 400
  5. **No auth token** → expect 401
  6. **Expired/invalid token** → expect 401
  7. **QR from different workspace** → expect 404 (RLS)

**Example curl commands:**

```bash
# Test 1: Valid assigned QR code
cat <<'EOF' | bash
TOKEN="your-jwt-token"
curl -s http://localhost:3000/api/qr-codes/QR-A1B2C3 \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool
EOF

# Test 2: Invalid format
curl -s http://localhost:3000/api/qr-codes/invalid \
  -H "Authorization: Bearer $TOKEN" \
| python3 -m json.tool

# Test 3: No auth
curl -s http://localhost:3000/api/qr-codes/QR-A1B2C3 \
| python3 -m json.tool
```

**Acceptance Criteria:**
- All test scenarios return expected status codes
- Response payloads match specification
- Error messages are descriptive
- No unexpected console errors

---

### Step 5: Code Quality Checks

**Tasks:**
- Run linter: `npm run lint`
- Fix any linting issues: `npm run lint:fix`
- Verify TypeScript compilation: `npx tsc --noEmit`
- Check code formatting: `npm run format`

**Acceptance Criteria:**
- No linting errors
- No TypeScript errors
- Code follows project style guide

---

### Step 6: Update API Documentation

**File:** `.ai_docs/api-plan.md`

**Tasks:**
- Update `GET /qr-codes/:short_id` section (lines 553-575)
- Add implementation status: `✅ Implemented`
- Add implementation file reference
- Add service layer reference
- Document any deviations from original plan
- Add testing script reference if created

**Acceptance Criteria:**
- Documentation is accurate and complete
- Implementation status clearly marked
- File paths reference actual implementation files

---

### Step 7: Integration Testing

**Tasks:**
- Test integration with frontend QR scanner component (if available)
- Verify correct routing behavior:
  - Unassigned QR → Create Box form
  - Assigned QR → Box Details page
- Test with real QR codes generated by the batch endpoint
- Verify mobile scanning workflow end-to-end

**Acceptance Criteria:**
- Frontend correctly interprets response
- Routing logic works as expected
- No CORS issues
- Mobile scanning experience is smooth

---

### Step 8: Create Test Script (Optional)

**File:** `.ai_docs/test-qr-codes-shortid.sh` (optional)

**Tasks:**
- Create bash script to automate test scenarios
- Include setup instructions (dev server, Supabase, test data)
- Document expected outputs for each test case
- Make script executable: `chmod +x .ai_docs/test-qr-codes-shortid.sh`

**Acceptance Criteria:**
- Script runs without errors
- All test cases pass
- Clear output showing pass/fail status

---

## Summary Checklist

- [ ] Validation schema created and tested
- [ ] Service layer function implemented with error handling
- [ ] API route handler created following project patterns
- [ ] Manual testing completed for all scenarios
- [ ] Code quality checks passed (linting, TypeScript)
- [ ] API documentation updated
- [ ] Integration testing with frontend (if applicable)
- [ ] Optional test script created

---

## Dependencies

- `zod` - Input validation
- `@/db/supabase.client` - Supabase client type
- `@/types` - DTO types and enums
- Astro API route types
- PostgreSQL with RLS enabled

---

## Estimated Effort

- **Validation schema:** 15 minutes
- **Service layer:** 30 minutes
- **API route handler:** 30 minutes
- **Manual testing:** 30 minutes
- **Code quality & docs:** 15 minutes
- **Total:** ~2 hours

---

## Notes

- Endpoint is read-only (GET), no data mutations
- Simple single-table query with indexed lookup
- RLS handles all authorization automatically
- Error messages follow project convention (Polish language)
- Pattern closely follows existing GET /api/boxes/:id implementation
