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

```bash
# Start test Supabase instance (different ports than dev)
supabase start --config supabase/config.test.toml

# Run verification script
npm run test:verify
```

The verification script checks:
- ✓ Environment variables loaded correctly
- ✓ Database connection works
- ✓ All required tables exist (profiles, workspaces, locations, boxes, qr_codes)
- ✓ Helper functions work correctly (create user, workspace, location, box)
- ✓ RLS policies are enabled

## Directory Structure

```
tests/
├── unit/           - Unit tests for services, utilities, validation logic
├── integration/    - Integration tests for API endpoints with Supertest
├── e2e/           - End-to-end tests with Playwright
├── fixtures/      - Test data and fixtures
├── helpers/       - Test utilities and helper functions
└── setup.ts       - Global Vitest setup file
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
import { describe, it, expect, vi } from 'vitest';

describe('MyService', () => {
  it('should do something', () => {
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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

describe('API Endpoints', () => {
  beforeEach(async () => {
    // Setup test database
  });

  afterEach(async () => {
    // Teardown test database
  });

  it('should return 200 for valid request', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toMatchObject({ success: true });
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
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should perform user action', async ({ page }) => {
    await page.goto('/feature');

    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Success')).toBeVisible();
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