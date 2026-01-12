# Testing Implementation TODO

This document tracks what has been completed and what still needs to be done for the integration testing implementation.

## ✅ Completed

### Phase 0: Test Infrastructure Setup
- ✅ Supabase test configuration (`supabase/config.test.toml`)
- ✅ Test environment variables (`.env.test.example`)
- ✅ Test helpers created:
  - `tests/helpers/supabase-test-client.ts` - Supabase client management
  - `tests/helpers/db-setup.ts` - Database cleanup and seeding
  - `tests/helpers/auth-helper.ts` - User authentication helpers
  - `tests/helpers/factory.ts` - Test data factories
- ✅ Verification script (`tests/verify-test-setup.ts`)
- ✅ All Phase 0 verification tests passing (10/10)

### Phase 1: Test Helpers & Fixtures
- ✅ Created 7 fixture files:
  - `tests/fixtures/users.ts` - User test data
  - `tests/fixtures/workspaces.ts` - Workspace test data
  - `tests/fixtures/locations.ts` - Location hierarchy test data
  - `tests/fixtures/boxes.ts` - Box test data
  - `tests/fixtures/qr-codes.ts` - QR code test data
  - `tests/fixtures/index.ts` - Central export point
  - `tests/fixtures/initial-dataset.ts` - Complete test environment helper
- ✅ Created API client helper (`tests/helpers/api-client.ts`) with 10+ wrapper functions
- ✅ Created Phase 1 verification script (`tests/verify-phase1.ts`)
- ✅ All Phase 1 verification tests passing (10/10)
- ✅ Documentation in `tests/README.md`

### Phase 2: Authentication & Profile Endpoint Tests
- ✅ Created 3 test files (39 tests total):
  - `tests/integration/api/auth/session.test.ts` (17 tests)
  - `tests/integration/api/auth/delete-account.test.ts` (8 tests)
  - `tests/integration/api/profiles/profile.test.ts` (14 tests)
- ✅ Vitest configuration updated to load `.env.test`
- ✅ Documentation:
  - `tests/integration/README.md` - Integration testing guide
  - `tests/PHASE2_STATUS.md` - Detailed status and implementation guide
- ✅ Test infrastructure verified working
- ⚠️ Tests written but failing (expected - API endpoints not implemented yet)

**Test Status**: 40 failed | 4 passed (expected - following TDD)

---

## 📋 TODO: Phase 2 API Implementation

### ⚠️ REQUIRED: Implement API Endpoints to Make Phase 2 Tests Pass

Before continuing to Phase 3, these API endpoints should be implemented to validate the TDD approach:

#### 1. POST /api/auth/session (Login) - PRIORITY: HIGH
**Location**: `src/pages/api/auth/session.ts`

**Requirements**:
- Accept `{ email: string, password: string }` in request body
- Validate input with Zod schema:
  ```typescript
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });
  ```
- Call `supabase.auth.signInWithPassword({ email, password })`
- Set session cookie using Supabase SSR helpers
- Return `{ access_token, refresh_token, user }` on success
- Return 400 for validation errors
- Return 401 for authentication failures

**Tests covered**: 11 tests in `session.test.ts`

#### 2. DELETE /api/auth/session (Logout) - PRIORITY: HIGH
**Location**: `src/pages/api/auth/session.ts`

**Requirements**:
- Require authentication (check JWT token from cookie/header)
- Call `supabase.auth.signOut()`
- Clear session cookie
- Return 204 No Content on success
- Return 401 if not authenticated

**Tests covered**: 6 tests in `session.test.ts`

#### 3. GET /api/profiles/me - PRIORITY: MEDIUM
**Location**: `src/pages/api/profiles/me.ts`

**Requirements**:
- Require authentication
- Get user ID from JWT token
- Query `profiles` table: `SELECT * FROM profiles WHERE id = $1`
- Return profile data: `{ id, email, full_name, theme, created_at, updated_at }`
- Return 401 if not authenticated

**Tests covered**: 6 tests in `profile.test.ts`

#### 4. PATCH /api/profiles/me/theme - PRIORITY: MEDIUM
**Location**: `src/pages/api/profiles/me/theme.ts`

**Requirements**:
- Require authentication
- Validate theme with Zod:
  ```typescript
  const themeSchema = z.object({
    theme: z.enum(['light', 'dark', 'system'])
  });
  ```
- Update `profiles` table: `UPDATE profiles SET theme = $1, updated_at = NOW() WHERE id = $2`
- Return updated profile
- Return 400 for invalid theme
- Return 401 if not authenticated

**Tests covered**: 8 tests in `profile.test.ts`

#### 5. DELETE /api/auth/delete-account - PRIORITY: LOW
**Location**: `src/pages/api/auth/delete-account.ts`

**Requirements**:
- Require authentication
- Get user ID from JWT token
- Delete auth user: `supabase.auth.admin.deleteUser(userId)`
- Database cascade will automatically delete:
  - Profile (ON DELETE CASCADE from auth.users)
  - Workspaces owned by user
  - All workspace data (boxes, locations, QR codes)
- Clear session cookie
- Return 204 No Content on success
- Return 401 if not authenticated

**Tests covered**: 8 tests in `delete-account.test.ts`

### Implementation Notes:

**Authentication Middleware**:
- Use Astro middleware (`src/middleware/index.ts`) to extract JWT from cookies
- Add `context.locals.user` with authenticated user info
- API routes can check `context.locals.user` to verify authentication

**Response Helpers**:
```typescript
// Success response
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});

// No content response
return new Response(null, { status: 204 });

// Error response
return new Response(JSON.stringify({ error: message }), {
  status: 400,
  headers: { 'Content-Type': 'application/json' }
});
```

**Testing the Implementation**:
```bash
# Run Phase 2 tests
npm run test:integration

# Run specific endpoint tests
npm run test tests/integration/api/auth/session.test.ts
npm run test tests/integration/api/profiles/profile.test.ts
npm run test tests/integration/api/auth/delete-account.test.ts

# Watch mode for TDD
npm run test:watch tests/integration
```

**Success Criteria**:
- All 39 Phase 2 tests should pass
- Current status: 40 failed | 4 passed
- Expected after implementation: 0 failed | 44 passed

---

## 🚀 TODO: Phase 3 - Multi-Tenancy Core (~75 tests)

### Files to Create:

#### 3.1 Workspace Management Tests
**File**: `tests/integration/api/workspaces/workspaces.test.ts` (~15 tests)

**Endpoints to test**:
- `GET /api/workspaces` - List user workspaces
- `POST /api/workspaces` - Create workspace

**Test cases**:
- ✅ Success: List workspaces, empty array if none, create workspace
- ❌ 400: Validation errors (empty name, name too long)
- ❌ 401: Authentication required
- ❌ 403: Non-member cannot access workspace

#### 3.2 Workspace Detail Tests
**File**: `tests/integration/api/workspaces/workspace-detail.test.ts` (~20 tests)

**Endpoints to test**:
- `GET /api/workspaces/:id` - Get workspace details
- `PATCH /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

**Test cases**:
- ✅ Success: Get details, update name/description, delete workspace
- ❌ 400: Validation errors
- ❌ 401: Authentication required
- ❌ 403: Non-owner cannot update/delete
- ❌ 404: Workspace not found

#### 3.3 Workspace Members Tests
**File**: `tests/integration/api/workspaces/workspace-members.test.ts` (~15 tests)

**Endpoints to test**:
- `GET /api/workspaces/:id/members` - List members
- `POST /api/workspaces/:id/members` - Add member
- `PATCH /api/workspaces/:id/members/:user_id` - Update member role
- `DELETE /api/workspaces/:id/members/:user_id` - Remove member

**Test cases**:
- ✅ Success: List members, add member, update role, remove member
- ❌ 400: Invalid user/role
- ❌ 403: Non-owner cannot manage members, cannot remove owner
- ❌ 404: User not found
- ❌ 409: Duplicate member

#### 3.4 RLS Policy Tests
**File**: `tests/integration/database/rls-policies.test.ts` (~25 tests)

**Policies to test**:
- Workspace isolation (5 tests)
- Location isolation (6 tests)
- Box isolation (6 tests)
- QR code isolation (4 tests)
- Profile access (2 tests)
- Workspace member management (2 tests)

**Test approach**:
- Create User A with Workspace A
- Create User B with Workspace B
- User A attempts to access Workspace B data → expect 403 or empty results
- Test via API and direct Supabase queries

---

## 🚀 TODO: Phase 4 - Core Features (~85 tests)

### 4.1 Location Tests
**Files**:
- `tests/integration/api/locations/locations.test.ts` (~12 tests)
- `tests/integration/api/locations/location-detail.test.ts` (~18 tests)

**Endpoints**: GET/POST/PATCH/DELETE `/api/locations`

**Key tests**:
- Hierarchical location creation (up to 5 levels)
- ltree path generation
- Soft delete with cascade
- Box count per location

### 4.2 Box Tests
**Files**:
- `tests/integration/api/boxes/boxes.test.ts` (~18 tests)
- `tests/integration/api/boxes/box-detail.test.ts` (~25 tests)
- `tests/integration/api/boxes/box-search.test.ts` (~12 tests)

**Endpoints**: GET/POST/PATCH/DELETE `/api/boxes`, POST `/api/boxes/search`

**Key tests**:
- Box CRUD operations
- QR code assignment/unassignment
- Full-text search
- Auto-generated short_id (database trigger)
- Auto-updated search_vector (database trigger)

---

## 🚀 TODO: Phase 5 - QR Codes, Triggers & Exports (~47 tests)

### 5.1 QR Code Tests
**Files**:
- `tests/integration/api/qr-codes/qr-codes.test.ts` (~14 tests)
- `tests/integration/api/qr-codes/qr-code-detail.test.ts` (~9 tests)

**Endpoints**: GET/POST `/api/qr-codes`, GET `/api/qr-codes/:short_id`

**Key tests**:
- Batch QR code generation
- QR code status (generated/assigned)
- QR code assignment to boxes

### 5.2 Database Trigger Tests
**File**: `tests/integration/database/triggers.test.ts` (~14 tests)

**Triggers to test**:
- Box short_id generation (3 tests)
- Box search_vector generation (5 tests)
- QR code reset on box deletion (2 tests)
- Timestamp updates (4 tests)

### 5.3 Export Tests
**File**: `tests/integration/api/exports/export-inventory.test.ts` (~10 tests)

**Endpoint**: GET `/api/export/inventory`

**Key tests**:
- CSV export with all boxes
- Filter by location
- Handle special characters in CSV

---

## 📊 Progress Tracking

### Overall Progress
- **Total Target**: ~240 integration tests
- **Completed**: 39 tests (16%)
- **Remaining**: ~201 tests (84%)

### Phase Breakdown
| Phase | Description | Tests | Status |
|-------|-------------|-------|--------|
| 0 | Test Infrastructure | 10 | ✅ Complete |
| 1 | Helpers & Fixtures | 10 | ✅ Complete |
| 2 | Auth & Profiles | 39 | ✅ Tests Written ⚠️ API Not Implemented |
| 3 | Multi-Tenancy | ~75 | ⏳ TODO |
| 4 | Locations & Boxes | ~85 | ⏳ TODO |
| 5 | QR Codes & Exports | ~47 | ⏳ TODO |

### Coverage Targets
- **Overall Coverage**: 80% (lines, functions, branches, statements)
- **Critical Paths**: 100% (authentication, RLS, multi-tenancy)

---

## 🎯 Recommended Next Steps

### Option A: Complete TDD Cycle (Recommended for validation)
1. Implement Phase 2 API endpoints (5 endpoints)
2. Verify all 39 Phase 2 tests pass
3. Validate TDD workflow is working
4. Continue to Phase 3

### Option B: Continue Test Creation (Current approach)
1. Create Phase 3 tests (~75 tests)
2. Create Phase 4 tests (~85 tests)
3. Create Phase 5 tests (~47 tests)
4. Implement all API endpoints at once

**Current Decision**: Proceeding with Option B (Phase 3 test creation)

---

## 📚 Documentation

### Existing Documentation
- ✅ `tests/README.md` - Overall testing guide
- ✅ `tests/integration/README.md` - Integration testing guide
- ✅ `tests/PHASE2_STATUS.md` - Phase 2 detailed status
- ✅ `.claude/commands/guideline_testing.md` - Testing guidelines
- ✅ This file (`tests/TODO.md`) - Complete TODO tracking

### Documentation to Update
- Update `tests/README.md` after each phase completion
- Update `tests/PHASE2_STATUS.md` when API endpoints are implemented
- Create similar status files for Phase 3, 4, 5 if needed

---

## 🔧 Development Commands

```bash
# Verification
npm run test:verify          # Verify Phase 0 setup
npm run test:verify-phase1   # Verify Phase 1 helpers

# Run tests
npm run test:integration     # Run all integration tests
npm run test:unit           # Run all unit tests
npm run test:coverage       # Run with coverage report

# Run specific test file
npm run test tests/integration/api/auth/session.test.ts

# Watch mode (TDD)
npm run test:watch tests/integration

# Supabase
supabase start              # Start local Supabase
supabase stop               # Stop local Supabase
supabase status             # Check Supabase status
```

---

## 📝 Notes

- **TDD Approach**: Write tests first, implement endpoints second
- **Test Isolation**: Each test should be independent (beforeEach/afterEach)
- **Database Cleanup**: Always clear test data between tests
- **RLS Testing**: Verify multi-tenant isolation in Phase 3
- **Trigger Testing**: Verify database triggers work correctly in Phase 5
- **Documentation**: Keep this TODO.md updated as work progresses
