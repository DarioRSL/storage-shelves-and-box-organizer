# Testing Guide

Complete testing setup for the Storage & Box Organizer application.

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Run all tests (300+ unit tests passing)
npm run test:all

# Run specific test types
npm run test:unit          # Unit tests only (300+ tests)
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only

# Development mode
npm run test:watch        # Watch mode for unit/integration tests
npm run test:ui          # Vitest UI mode

# Coverage
npm run test:coverage    # Generate coverage report (80%+ target)
```

## Phase 1 Completion Status ✅

**All Phase 1 Quick Wins Completed!** (4/4 tasks)

| Task | File | Tests | Coverage | Status |
|------|------|-------|----------|--------|
| **Task 1** | `transliterate.ts` | 63 tests | 100% | ✅ |
| **Task 2** | `usePasswordStrength.ts` | 109 tests | 100% | ✅ |
| **Task 3** | `qr-code.validators.ts` | 35 tests | 100% | ✅ |
| **Task 4** | `box.validators.ts` | 93 tests | 100% | ✅ |

**Total:** 300 unit tests passing with 100% coverage on all critical Phase 1 files.

See [UNIT_TEST_PLAN.md](UNIT_TEST_PLAN.md) for detailed test specifications and Phase 2 roadmap.

## Test Stack

| Type | Framework | Purpose |
|------|-----------|---------|
| **Unit** | Vitest + Testing Library | Test services, utilities, validation |
| **Integration** | Vitest + Supertest | Test API endpoints |
| **E2E** | Playwright | Test user workflows |
| **Coverage** | Vitest Coverage (v8) | Track code coverage |

## Directory Structure

```
tests/
├── unit/           - Unit tests (*.test.ts)
├── integration/    - API integration tests (*.test.ts)
├── e2e/           - End-to-end tests (*.spec.ts)
├── fixtures/      - Test data (JSON files)
├── helpers/       - Reusable test utilities
└── setup.ts       - Global Vitest setup
```

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/setup.ts` - Global test setup

## Writing Tests

### Unit Tests (Vitest)

Based on [guideline_testing.md](.claude/commands/guideline_testing.md):

**Best Practices:**
- Use `vi.fn()` for function mocks
- Use `vi.spyOn()` to monitor existing functions
- Use `vi.mock()` factory patterns at top level
- Structure with Arrange-Act-Assert pattern
- Use inline snapshots with `toMatchInlineSnapshot()`

**Example:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { myService } from '@/lib/services/my-service';

describe('MyService', () => {
  it('should perform operation', () => {
    // Arrange
    const input = { id: '123' };
    const mockFn = vi.fn();

    // Act
    const result = myService.process(input, mockFn);

    // Assert
    expect(result).toBeDefined();
    expect(mockFn).toHaveBeenCalledWith(input);
  });
});
```

### Integration Tests (Supertest)

Based on [guideline_testing.md](.claude/commands/guideline_testing.md):

**Best Practices:**
- Use async/await with supertest
- Implement test database setup/teardown
- Use beforeEach/afterEach hooks for database cleanup

**Example:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

describe('API Endpoints', () => {
  beforeEach(async () => {
    // Setup test database
    await seedTestDatabase();
  });

  afterEach(async () => {
    // Cleanup test database
    await cleanTestDatabase();
  });

  it('GET /api/workspaces should return workspaces', async () => {
    const response = await request(app)
      .get('/api/workspaces')
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

### E2E Tests (Playwright)

Based on [guideline_testing.md](.claude/commands/guideline_testing.md):

**Best Practices:**
- Initialize with Chromium/Desktop Chrome only (configured)
- Use browser contexts for isolation
- Implement Page Object Model
- Use locators for resilient element selection

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('should allow user to login', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    await expect(page).toHaveURL('/app');
  });
});
```

## Coverage Configuration

Target: **80%** coverage for lines, functions, branches, and statements

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

Coverage is configured in [vitest.config.ts](vitest.config.ts):
- Includes: `src/**/*.{ts,tsx}`, `src/lib/services/**/*.{ts,tsx}`
- Excludes: Type definitions, tests, auto-generated files

## Debugging Tests

### Vitest
```bash
# Run specific test file
npm run test -- tests/unit/my-test.test.ts

# Run tests matching pattern
npm run test -- -t "pattern"

# UI mode for debugging
npm run test:ui
```

### Playwright
```bash
# Debug mode (step through tests)
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# UI mode
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- tests/e2e/my-test.spec.ts
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main/master branch
- Manual workflow dispatch

### GitHub Actions Example
```yaml
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests
  run: npm run test:integration

- name: Run E2E Tests
  run: npm run test:e2e

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Test Guidelines Summary

From [guideline_testing.md](.claude/commands/guideline_testing.md):

### Vitest Guidelines
- ✅ Leverage `vi` object for test doubles
- ✅ Master `vi.mock()` factory patterns
- ✅ Create setup files for reusable configuration
- ✅ Use inline snapshots for readable assertions
- ✅ Make watch mode part of workflow
- ✅ Configure jsdom for DOM testing
- ✅ Structure tests for maintainability
- ✅ Leverage TypeScript type checking

### Playwright Guidelines
- ✅ Initialize with Chromium/Desktop Chrome only
- ✅ Use browser contexts for isolating environments
- ✅ Implement Page Object Model
- ✅ Use locators for resilient selection
- ✅ Leverage API testing for backend validation
- ✅ Use expect assertions with specific matchers
- ✅ Leverage parallel execution

### Supertest Guidelines
- ✅ Use async/await with supertest
- ✅ Implement test database for integration tests
- ✅ Use beforeEach/afterEach hooks for database setup/teardown

## Next Steps

**Phase 1 Complete ✅** - All quick wins implemented with 100% coverage.

**Phase 2: Service Layer & API Tests** (See [UNIT_TEST_PLAN.md](UNIT_TEST_PLAN.md))

1. **Service Layer Unit Tests**
   - Box service
   - Workspace service
   - Location service
   - QR code service

2. **API Integration Tests**
   - Set up Supertest with test database
   - Test authentication flows
   - Test CRUD operations
   - Test error handling

3. **Test Infrastructure**
   - Create test helpers (in `tests/helpers/`)
   - Create test fixtures (in `tests/fixtures/`)
   - Set up test database seeding/cleanup

4. **E2E Tests**
   - Critical user workflows
   - Box creation and management
   - QR code scanning flows

5. **CI/CD Pipeline**
   - Configure GitHub Actions
   - Add coverage reporting (Codecov)
   - Set up test database for CI

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Library Documentation](https://testing-library.com/)
- [Project Testing Guidelines](.claude/commands/guideline_testing.md)
- [Tech Stack Documentation](.ai_docs/tech-stack.md)

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
- Check path aliases in `vitest.config.ts`
- Ensure imports use correct paths

**Playwright tests timeout**
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Use `--headed` mode to debug

**Coverage too low**
- Focus on critical code paths first
- Don't chase arbitrary percentages
- Write meaningful tests, not just coverage

**Database connection errors**
- Check environment variables
- Ensure test database is configured
- Verify Supabase credentials

## Support

For issues or questions:
- Check [tests/README.md](tests/README.md) for detailed documentation
- Review [guideline_testing.md](.claude/commands/guideline_testing.md) for best practices
- Create an issue in the repository