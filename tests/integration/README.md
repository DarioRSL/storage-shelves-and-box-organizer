# Integration Tests

This directory contains integration tests for REST API endpoints.

## Phase 2: Authentication & Profile Endpoints ✅

### Test Files

1. **tests/integration/api/auth/session.test.ts** (17 tests)
   - POST /api/auth/session (login)
     - ✅ Success: Valid credentials, return session token, include profile data
     - ❌ 400: Missing email/password, empty fields, invalid email format
     - ❌ 401: Incorrect password, non-existent email, case-sensitive mismatch
   - DELETE /api/auth/session (logout)
     - ✅ Success: Logout authenticated user, clear session cookie
     - ❌ 401: No token, invalid token, expired token

2. **tests/integration/api/auth/delete-account.test.ts** (8 tests)
   - DELETE /api/auth/delete-account
     - ✅ Success: Delete account, cascade delete workspaces/boxes/locations/QR codes
     - ✅ Success: Clear session after deletion, preserve other users' data
     - ❌ 401: No authentication, invalid token
     - ❌ 404: Already deleted user

3. **tests/integration/api/profiles/profile.test.ts** (14 tests)
   - GET /api/profiles/me
     - ✅ Success: Return profile data with all fields, include theme preference
     - ❌ 401: No authentication, invalid token, expired token
   - PATCH /api/profiles/me/theme
     - ✅ Success: Update to light/dark/system, persist in database, update timestamp
     - ❌ 400: Invalid theme, missing theme, empty/null theme
     - ❌ 401: No authentication, invalid token

### Running Phase 2 Tests

```bash
# Run all integration tests (includes Phase 2)
npm run test:integration

# Run specific test file
npm run test tests/integration/api/auth/session.test.ts

# Run with coverage
npm run test:coverage -- tests/integration

# Watch mode for TDD
npm run test:watch tests/integration
```

### Test Coverage Summary

**Total Tests**: 39 tests across 3 files

- Authentication (session management): 17 tests
- Authentication (account deletion): 8 tests
- User profiles: 14 tests

**Coverage Areas**:

- ✅ Success cases (2xx responses)
- ✅ Validation errors (400)
- ✅ Authentication errors (401)
- ✅ Not found errors (404)
- ✅ Database cascade operations
- ✅ Session management
- ✅ Data persistence verification

### Test Patterns Used

**Pattern 1: Simple Authentication Test**

```typescript
describe("Endpoint", () => {
  let user;

  beforeEach(async () => {
    await clearAllTestData();
    user = await createAuthenticatedUser();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it("should do something", async () => {
    const response = await authenticatedGet("/api/endpoint", user.token);
    assertSuccess(response);
  });
});
```

**Pattern 2: Database Verification Test**

```typescript
it("should persist changes in database", async () => {
  // Arrange
  const user = await createAuthenticatedUser();
  const adminClient = getAdminSupabaseClient();

  // Act
  await authenticatedPatch("/api/endpoint", user.token, { field: "value" });

  // Assert: Verify in database
  const { data } = await adminClient.from("table").select("field").eq("id", user.id).single();

  expect(data.field).toBe("value");
});
```

**Pattern 3: Cascade Deletion Test**

```typescript
it("should cascade delete related data", async () => {
  // Arrange
  const dataset = await seedInitialDataset();
  const user = dataset.users.admin;
  const workspaceId = dataset.workspaces.primary.id;
  const adminClient = getAdminSupabaseClient();

  // Verify data exists before
  const { data: before } = await adminClient.from("table").select("id").eq("workspace_id", workspaceId);
  expect(before.length).toBeGreaterThan(0);

  // Act: Delete
  await authenticatedDelete("/api/endpoint", user.token);

  // Assert: Data deleted
  const { data: after } = await adminClient.from("table").select("id").eq("workspace_id", workspaceId);
  expect(after).toEqual([]);
});
```

## Prerequisites

Before running integration tests:

1. **Start Supabase**:

   ```bash
   supabase start
   ```

2. **Set up test environment**:

   ```bash
   cp .env.test.example .env.test
   # Fill in credentials from: supabase status
   ```

3. **Verify test setup**:
   ```bash
   npm run test:verify
   ```

## Best Practices

1. **Test Isolation**: Each test should be independent
   - Use `beforeEach` to clear data and set up fresh state
   - Use `afterEach` for cleanup (safety net)

2. **Use Helpers**: Leverage test helpers from `tests/helpers/`
   - `createAuthenticatedUser()` for authentication
   - `authenticatedGet/Post/Patch/Delete()` for API calls
   - `assertSuccess/assertError()` for assertions
   - `seedInitialDataset()` for complex scenarios

3. **Database Verification**: When testing mutations, verify changes in database
   - Use `getAdminSupabaseClient()` to bypass RLS
   - Check both positive and negative cases

4. **Clear Error Messages**: Use descriptive test names and assertions
   - Test names: "should [action] [condition]"
   - Assertions: Include context in error messages

## Next Steps

- **Phase 3**: Multi-Tenancy Core (Workspaces and RLS) - ~75 tests
- **Phase 4**: Core Features (Locations & Boxes) - ~85 tests
- **Phase 5**: QR Codes, Triggers & Exports - ~47 tests
