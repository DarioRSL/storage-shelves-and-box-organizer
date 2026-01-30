# Testing Documentation

This directory contains all tests for the Storage & Box Organizer application.

## Phase 0: Integration Test Setup ✅

**Status**: Complete and ready for verification

The test infrastructure has been set up with:

- **Test Supabase Configuration**: `supabase/config.test.toml` (ports 54421-54422)
- **Environment Variables**: `.env.test` with test database credentials
- **Test Helpers** (4 critical files created):
  - `tests/helpers/supabase-test-client.ts` - Supabase client management
  - `tests/helpers/db-setup.ts` - Database cleanup and seeding
  - `tests/helpers/auth-helper.ts` - User authentication helpers
  - `tests/helpers/factory.ts` - Test data factories

### Running Phase 0 Verification

**First-time setup:**

```bash
# 1. Copy the environment template
cp .env.test.example .env.test

# 2. Start your local Supabase instance
supabase start

# 3. Get your local credentials
supabase status

# 4. Edit .env.test and fill in the credentials from step 3
#    Look for: anon key and service_role key

# 5. Run verification script
npm run test:verify
```

**Subsequent runs:**

```bash
# Just run the verification (assuming Supabase is running)
npm run test:verify
```

**Important Security Notes:**

- Never commit `.env.test` - it contains sensitive tokens
- Use `.env.test.example` as a template for new developers
- Get credentials from `supabase status` when running locally

The verification script checks:

- ✓ Environment variables loaded correctly
- ✓ Database connection works
- ✓ All required tables exist (profiles, workspaces, locations, boxes, qr_codes)
- ✓ Helper functions work correctly (create user, workspace, location, box)
- ✓ RLS policies are enabled

## Directory Structure

```
tests/
├── unit/                    - Unit tests for services, utilities, validation logic
├── integration/             - Integration tests for API endpoints with Supertest
├── e2e/                     - End-to-end tests with Playwright
├── fixtures/                - Test data and fixtures
│   ├── users.ts            - User fixtures (admin, member, viewer)
│   ├── workspaces.ts       - Workspace fixtures
│   ├── locations.ts        - Location hierarchy fixtures
│   ├── boxes.ts            - Box fixtures with realistic data
│   ├── qr-codes.ts         - QR code fixtures
│   ├── initial-dataset.ts  - Complete test dataset helper
│   └── index.ts            - Central export point
├── helpers/                 - Test utilities and helper functions
│   ├── supabase-test-client.ts - Supabase client management
│   ├── db-setup.ts         - Database cleanup and seeding
│   ├── auth-helper.ts      - User authentication helpers
│   ├── factory.ts          - Test data factories
│   └── api-client.ts       - Supertest API wrappers
├── verify-test-setup.ts    - Phase 0 verification script
└── setup.ts                - Global Vitest setup file
```

## Test Stack

- **Unit Testing:** Vitest + Testing Library
- **Integration Testing:** Vitest + Supertest
- **E2E Testing:** Playwright (Chromium only)
- **Coverage:** Vitest Coverage (v8 provider)

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Watch mode
npm run test:watch

# With UI
npm run test:ui
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# With UI mode
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage
```

### Run All Tests

```bash
npm run test:all
```

## Writing Tests

### Unit Tests (Vitest Guidelines)

Follow the guidelines in [.claude/commands/guideline_testing.md](.claude/commands/guideline_testing.md):

- Use `vi.fn()` for function mocks
- Use `vi.spyOn()` to monitor existing functions
- Use `vi.mock()` factory patterns at the top level
- Create setup files for reusable configuration
- Use inline snapshots with `toMatchInlineSnapshot()`
- Structure tests with `describe` blocks using Arrange-Act-Assert pattern
- Enable TypeScript type checking in tests

Example:

```typescript
import { describe, it, expect, vi } from "vitest";

describe("MyService", () => {
  it("should do something", () => {
    // Arrange
    const mockFn = vi.fn();

    // Act
    const result = myFunction(mockFn);

    // Assert
    expect(result).toBe(expected);
    expect(mockFn).toHaveBeenCalledWith(expectedArgs);
  });
});
```

### Integration Tests (Supertest)

Follow the guidelines in [.claude/commands/guideline_testing.md](.claude/commands/guideline_testing.md):

- Use async/await with supertest
- Implement a test database for integration tests
- Use beforeEach/afterEach hooks for database setup and teardown

Example:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData } from "../helpers/db-setup";
import { createAuthenticatedUser } from "../helpers/auth-helper";
import { authenticatedGet, assertSuccess } from "../helpers/api-client";
import { seedInitialDataset } from "../fixtures/initial-dataset";

describe("API Endpoints", () => {
  let dataset;

  beforeEach(async () => {
    await clearAllTestData();
    dataset = await seedInitialDataset();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it("should list workspaces", async () => {
    const response = await authenticatedGet("/api/workspaces", dataset.users.admin.token);
    assertSuccess(response);
    expect(response.body).toHaveLength(2);
  });
});
```

## Test Helpers and Fixtures

### Fixtures (Predefined Test Data)

Import fixtures from `tests/fixtures`:

```typescript
import {
  ADMIN_USER,
  MEMBER_USER,
  PRIMARY_WORKSPACE,
  ROOT_GARAGE,
  ELECTRONICS_BOX,
  QR_ASSIGNED_ELECTRONICS,
} from "../fixtures";
```

**Available Fixtures:**

- **Users**: `ADMIN_USER`, `MEMBER_USER`, `VIEWER_USER`, `ISOLATED_USER`
- **Workspaces**: `PRIMARY_WORKSPACE`, `SECONDARY_WORKSPACE`
- **Locations**: `ROOT_GARAGE`, `METAL_RACK`, `TOP_SHELF`, etc. (3-level hierarchy)
- **Boxes**: `ELECTRONICS_BOX`, `HOLIDAY_DECORATIONS`, `BOOKS_BOX`, etc.
- **QR Codes**: `QR_GENERATED_001`, `QR_ASSIGNED_ELECTRONICS`, etc.

### Database Helpers

Located in `tests/helpers/db-setup.ts`:

```typescript
import { clearAllTestData, seedTable, getTableCount } from "../helpers/db-setup";

// Clear all test data (use in beforeEach/afterEach)
await clearAllTestData();

// Seed a specific table
const workspaces = await seedTable("workspaces", [workspaceData]);

// Get row count for verification
const count = await getTableCount("boxes");
```

### Authentication Helpers

Located in `tests/helpers/auth-helper.ts`:

```typescript
import { createAuthenticatedUser, getAuthHeader } from "../helpers/auth-helper";

// Create user with session and JWT token
const user = await createAuthenticatedUser({
  email: "test@example.com",
  password: "TestPass123!",
  full_name: "Test User",
});

// Use token for authenticated requests
const authHeader = getAuthHeader(user.token);
```

### Factory Functions

Located in `tests/helpers/factory.ts`:

```typescript
import {
  createWorkspaceFixture,
  createLocationFixture,
  createBoxFixture,
  createQRCodeFixture,
} from "../helpers/factory";

// Generate test data without IDs (let database generate them)
const workspaceData = createWorkspaceFixture({
  name: "Test Workspace",
  owner_id: userId,
});

const locationData = createLocationFixture(workspaceId, {
  name: "Test Location",
  path: "root.testlocation",
});
```

### API Client Helpers

Located in `tests/helpers/api-client.ts`:

```typescript
import {
  authenticatedGet,
  authenticatedPost,
  authenticatedPatch,
  authenticatedDelete,
  assertSuccess,
  assertError,
  extractId,
} from "../helpers/api-client";

// Make authenticated requests
const response = await authenticatedGet("/api/workspaces", userToken);
assertSuccess(response);

// Create and extract ID
const createResponse = await authenticatedPost("/api/workspaces", userToken, {
  name: "New Workspace",
});
const workspaceId = extractId(createResponse);

// Assert errors
const errorResponse = await unauthenticatedGet("/api/workspaces");
assertError(errorResponse, 401);
```

### Initial Dataset Helper

Located in `tests/fixtures/initial-dataset.ts`:

```typescript
import { seedInitialDataset } from "../fixtures/initial-dataset";

// Create complete test environment
const dataset = await seedInitialDataset();

// Access structured data
const adminToken = dataset.users.admin.token;
const primaryWorkspaceId = dataset.workspaces.primary.id;
const garageLocationId = dataset.locations.primary.garage.id;
const firstBox = dataset.boxes.primary[0];
```

The dataset includes:

- 3 users (admin, member, viewer)
- 2 workspaces (primary, secondary)
- 7 locations across both workspaces (hierarchical)
- 9 boxes total
- 20 QR codes (some assigned, some available)

### Common Test Patterns

**Pattern 1: Simple Test with User**

```typescript
describe("My Test", () => {
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

**Pattern 2: Full Dataset Test**

```typescript
describe("Complex Feature", () => {
  let dataset;

  beforeEach(async () => {
    await clearAllTestData();
    dataset = await seedInitialDataset();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  it("should handle complex scenario", async () => {
    // All test data is ready to use
    const response = await authenticatedGet("/api/workspaces", dataset.users.admin.token);
    expect(response.body).toHaveLength(2);
  });
});
```

**Pattern 3: Custom Factory Data**

```typescript
describe("Custom Test", () => {
  let user, workspace;

  beforeEach(async () => {
    await clearAllTestData();
    user = await createAuthenticatedUser();

    const workspaceData = createWorkspaceFixture({
      name: "Custom Workspace",
      owner_id: user.id,
    });
    [workspace] = await seedTable("workspaces", [workspaceData]);
  });

  it("should work with custom data", async () => {
    // Test with your custom setup
  });
});
```

### E2E Tests (Playwright)

Follow the guidelines in [.claude/commands/guideline_testing.md](.claude/commands/guideline_testing.md):

- Initialize with Chromium/Desktop Chrome browser only
- Use browser contexts for isolating test environments
- Implement Page Object Model for maintainable tests
- Use locators for resilient element selection
- Leverage API testing for backend validation
- Use expect assertions with specific matchers

Example:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should perform user action", async ({ page }) => {
    await page.goto("/feature");

    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByText("Success")).toBeVisible();
  });
});
```

## Coverage Targets

- **Overall Coverage:** 80% (lines, functions, branches, statements)
- **Critical Paths:** Should have higher coverage
- Focus on meaningful tests rather than arbitrary coverage percentages

## CI/CD Integration

Tests are automatically run on:

- Pull request creation
- Push to main/master branch
- Manual workflow dispatch

## Debugging Tests

### Vitest

```bash
# Run specific test file
npm run test -- tests/unit/my-test.test.ts

# Run tests matching pattern
npm run test -- -t "pattern"

# Debug with VS Code
# Use the "Debug Test" option in VS Code
```

### Playwright

```bash
# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npm run test:e2e -- tests/e2e/my-test.spec.ts

# Use Playwright Inspector
PWDEBUG=1 npm run test:e2e
```

## Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use descriptive test names** - Clearly state what is being tested
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Mock external dependencies** - Don't rely on external services
5. **Test behavior, not implementation** - Focus on what, not how
6. **Keep tests fast** - Unit tests should run in milliseconds
7. **Use Page Object Model** - For E2E tests to improve maintainability
8. **Clean up after tests** - Use afterEach hooks to reset state

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Library Documentation](https://testing-library.com/)
