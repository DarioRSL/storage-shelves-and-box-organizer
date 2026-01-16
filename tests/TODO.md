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

**Test Status**: 39 failed | 4 passed (expected - following TDD)

**Test Execution**: Tested 2026-01-12 - all tests running correctly, failing as expected (ECONNREFUSED)

### Phase 3: Multi-Tenancy Core Tests
- ✅ Created 4 test files (97 tests total):
  - `tests/integration/api/workspaces/workspaces.test.ts` (19 tests)
  - `tests/integration/api/workspaces/workspace-detail.test.ts` (26 tests)
  - `tests/integration/api/workspaces/workspace-members.test.ts` (26 tests)
  - `tests/integration/database/rls-policies.test.ts` (25 tests)
- ✅ All tests follow TDD approach
- ✅ Test infrastructure validated
- ⚠️ Tests written but failing (expected - API endpoints not implemented yet)

**Test Status**: 97 failed | 4 passed (expected - following TDD)

**Test Execution**: Tested 2026-01-12 - all tests running correctly, failing as expected (ECONNREFUSED)

**Coverage**:
- Workspace CRUD operations
- Workspace member management (add/update/remove)
- Multi-tenant isolation (RLS policies)
- Role-based access control (owner/member/read_only)
- Database-level security verification

### Phase 4: Core Features - Locations & Boxes Tests
- ✅ Created 5 test files (141 tests total):
  - `tests/integration/api/locations/locations.test.ts` (24 tests)
  - `tests/integration/api/locations/location-detail.test.ts` (28 tests)
  - `tests/integration/api/boxes/boxes.test.ts` (47 tests)
  - `tests/integration/api/boxes/box-detail.test.ts` (25 tests)
  - `tests/integration/api/boxes/box-search.test.ts` (17 tests)
- ✅ All tests follow TDD approach
- ✅ Test infrastructure validated
- ⚠️ Tests written but failing (expected - API endpoints not implemented yet)

**Test Status**: 270 failed | 4 passed (expected - following TDD)

**Test Execution**: Tested 2026-01-12 - all tests running correctly, failing as expected (ECONNREFUSED)

**Coverage**:
- Location CRUD operations with ltree path management
- Hierarchical location creation (up to 5 levels)
- Soft delete with cascade to children and box unlinking
- Box CRUD operations with auto-generated short_id (database trigger)
- QR code assignment/unassignment during box operations
- Auto-update search_vector on content changes (database trigger)
- QR code reset on box deletion (database trigger)
- Full-text search by name, description, tags with relevance ranking
- Duplicate name checking
- RLS policy enforcement for multi-tenant isolation

### Phase 5: QR Codes, Triggers & Exports Tests
- ✅ Created 4 test files (47 tests total):
  - `tests/integration/api/qr-codes/qr-codes.test.ts` (14 tests)
  - `tests/integration/api/qr-codes/qr-code-detail.test.ts` (9 tests)
  - `tests/integration/database/triggers.test.ts` (14 tests)
  - `tests/integration/api/exports/export-inventory.test.ts` (10 tests)
- ✅ All tests follow TDD approach
- ✅ Test infrastructure validated
- ⚠️ Tests written but failing (expected - API endpoints not implemented yet)

**Test Status**: 317 failed | 4 passed (expected - following TDD)

**Test Execution**: Tested 2026-01-12 - all tests running correctly, failing as expected (ECONNREFUSED)

**Coverage**:
- QR code listing with status filtering (generated/assigned)
- Batch QR code generation (1-100 codes, QR-XXXXXX format)
- QR code detail retrieval by short_id
- Database trigger verification:
  - Box short_id auto-generation (10-char alphanumeric)
  - Box search_vector auto-update on content changes
  - QR code reset to "generated" on box deletion
  - Timestamp updates on record modifications
- CSV export with special character handling (quotes, commas, newlines)
- Location-based filtering for exports
- RLS policy enforcement

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

## 📋 TODO: Phase 3 API Implementation

### ⚠️ REQUIRED: Implement API Endpoints to Make Phase 3 Tests Pass

Phase 3 tests are complete. These API endpoints need implementation:

#### 1. GET /api/workspaces - PRIORITY: HIGH
**Location**: `src/pages/api/workspaces/index.ts`

**Requirements**:
- Require authentication
- Query `workspaces` table with RLS: User sees only workspaces they're members of
- Return array of workspaces with metadata
- Return empty array if user has no workspaces
- Return 401 if not authenticated

**Tests covered**: 8 tests in `workspaces.test.ts`

#### 2. POST /api/workspaces - PRIORITY: HIGH
**Location**: `src/pages/api/workspaces/index.ts`

**Requirements**:
- Require authentication
- Validate input with Zod:
  ```typescript
  const createWorkspaceSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional()
  });
  ```
- Create workspace with `owner_id = authenticated_user_id`
- Automatically create workspace_members entry with role='owner'
- Return created workspace (201)
- Return 400 for validation errors
- Return 401 if not authenticated

**Tests covered**: 11 tests in `workspaces.test.ts`

#### 3. GET /api/workspaces/:id - PRIORITY: HIGH
**Location**: `src/pages/api/workspaces/[id].ts`

**Requirements**:
- Require authentication
- Query workspace by ID with RLS enforcement
- Return workspace details
- Return 401 if not authenticated
- Return 403 if user not a member
- Return 404 if workspace doesn't exist

**Tests covered**: 6 tests in `workspace-detail.test.ts`

#### 4. PATCH /api/workspaces/:id - PRIORITY: HIGH
**Location**: `src/pages/api/workspaces/[id].ts`

**Requirements**:
- Require authentication + owner role
- Validate input (name, description)
- Update workspace
- Return updated workspace
- Return 400 for validation errors
- Return 401 if not authenticated
- Return 403 if not owner
- Return 404 if workspace doesn't exist

**Tests covered**: 9 tests in `workspace-detail.test.ts`

#### 5. DELETE /api/workspaces/:id - PRIORITY: MEDIUM
**Location**: `src/pages/api/workspaces/[id].ts`

**Requirements**:
- Require authentication + owner role
- Delete workspace (cascade deletes locations, boxes, QR codes via FK)
- Return 204 No Content
- Return 401 if not authenticated
- Return 403 if not owner
- Return 404 if workspace doesn't exist

**Tests covered**: 11 tests in `workspace-detail.test.ts`

#### 6. GET /api/workspaces/:id/members - PRIORITY: MEDIUM
**Location**: `src/pages/api/workspaces/[id]/members.ts`

**Requirements**:
- Require authentication + workspace membership
- Query workspace_members with user details
- Return array of members with roles
- Return 401 if not authenticated
- Return 403 if not a member

**Tests covered**: 4 tests in `workspace-members.test.ts`

#### 7. POST /api/workspaces/:id/members - PRIORITY: MEDIUM
**Location**: `src/pages/api/workspaces/[id]/members.ts`

**Requirements**:
- Require authentication + owner role
- Validate input:
  ```typescript
  const addMemberSchema = z.object({
    user_id: z.string().uuid(),
    role: z.enum(['owner', 'member', 'read_only'])
  });
  ```
- Insert workspace_members entry
- Return created member entry (201)
- Return 400 for validation errors
- Return 401 if not authenticated
- Return 403 if not owner
- Return 404 if user doesn't exist
- Return 409 if member already exists

**Tests covered**: 10 tests in `workspace-members.test.ts`

#### 8. PATCH /api/workspaces/:id/members/:user_id - PRIORITY: MEDIUM
**Location**: `src/pages/api/workspaces/[id]/members/[user_id].ts`

**Requirements**:
- Require authentication + owner role
- Validate role with Zod
- Update member role
- Prevent demoting last owner
- Return updated member
- Return 400 for validation errors
- Return 401 if not authenticated
- Return 403 if not owner or attempting to demote last owner
- Return 404 if member doesn't exist

**Tests covered**: 5 tests in `workspace-members.test.ts`

#### 9. DELETE /api/workspaces/:id/members/:user_id - PRIORITY: MEDIUM
**Location**: `src/pages/api/workspaces/[id]/members/[user_id].ts`

**Requirements**:
- Require authentication + owner role OR self-removal
- Delete workspace_members entry
- Allow member to remove themselves
- Prevent owner from removing themselves if last owner
- Return 204 No Content
- Return 401 if not authenticated
- Return 403 if not authorized or last owner
- Return 404 if member doesn't exist

**Tests covered**: 7 tests in `workspace-members.test.ts`

### Implementation Notes:

**RLS Policy Enforcement**:
- All queries automatically filtered by `is_workspace_member(workspace_id)` function
- Test RLS policies directly with database queries (see `rls-policies.test.ts`)
- RLS tests verify multi-tenant isolation at database level

**Role Checking**:
- Create helper function: `isWorkspaceOwner(supabase, workspaceId, userId): Promise<boolean>`
- Query `workspace_members` table for role='owner'

**Testing the Implementation**:
```bash
# Run Phase 3 tests
npm run test tests/integration/api/workspaces/
npm run test tests/integration/database/rls-policies.test.ts

# Watch mode for TDD
npm run test:watch tests/integration
```

**Success Criteria**:
- All 97 Phase 3 tests should pass
- Current status: 97 failed | 4 passed
- Expected after implementation: 0 failed | 101 passed

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
- **Completed**: 324 tests (135% - significantly exceeded target!)
- **All Phases Complete**: Ready for API implementation

### Phase Breakdown
| Phase | Description | Tests | Status |
|-------|-------------|-------|--------|
| 0 | Test Infrastructure | 10 | ✅ Complete |
| 1 | Helpers & Fixtures | 10 | ✅ Complete |
| 2 | Auth & Profiles | 39 | ✅ Tests Written ⚠️ API Not Implemented |
| 3 | Multi-Tenancy | 97 | ✅ Tests Written ⚠️ API Not Implemented |
| 4 | Locations & Boxes | 141 | ✅ Tests Written ⚠️ API Not Implemented |
| 5 | QR Codes & Exports | 47 | ✅ Tests Written ⚠️ API Not Implemented |

**Total Integration Tests**: 324 tests across 22 test files

### Coverage Targets
- **Overall Coverage**: 80% (lines, functions, branches, statements)
- **Critical Paths**: 100% (authentication, RLS, multi-tenancy)

---

## 🎯 Recommended Next Steps

### ✅ ALL TESTS COMPLETE - Ready for API Implementation

**Test Creation Status**: 100% Complete (324/240 tests - 135% of target)

**Next Step**: Implement API Endpoints

#### Recommended Implementation Order:

1. **Phase 2: Auth & Profiles** (5 endpoints, 39 tests)
   - Start here to validate TDD workflow
   - Foundation for all protected endpoints
   - Tests: Authentication, logout, profile management

2. **Phase 3: Multi-Tenancy** (9 endpoints, 97 tests)
   - Critical for data isolation
   - Workspace CRUD and member management
   - RLS policy verification

3. **Phase 4: Locations & Boxes** (10 endpoints, 141 tests)
   - Core business logic
   - Location hierarchy with ltree
   - Box management with full-text search

4. **Phase 5: QR Codes & Exports** (3 endpoints, 47 tests)
   - QR code generation and assignment
   - CSV export functionality
   - Database trigger verification (tested via API)

**Total API Endpoints to Implement**: 27 endpoints
**Total Tests to Pass**: 324 integration tests

**Success Criteria**:
- All 324 tests pass
- 80%+ code coverage
- RLS policies enforce multi-tenant isolation
- Database triggers work correctly

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
