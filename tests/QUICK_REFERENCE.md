# Testing Quick Reference

Quick reference for running and writing tests in the Storage & Box Organizer project.

## Run Tests

```bash
# Unit tests
npm run test:unit              # Run once
npm run test:watch             # Watch mode (TDD)
npm run test:ui                # Visual UI mode

# Integration tests
npm run test:integration       # API endpoint tests

# E2E tests
npm run test:e2e              # Headless Chromium
npm run test:e2e:headed       # See browser
npm run test:e2e:ui           # Playwright UI
npm run test:e2e:debug        # Debug mode

# Coverage
npm run test:coverage         # Generate report
open coverage/index.html      # View report

# All tests
npm run test:all              # Run everything
```

## Write Unit Tests

```typescript
// tests/unit/my-service.test.ts
import { describe, it, expect, vi } from "vitest";
import { myService } from "@/lib/services/my-service";

describe("MyService", () => {
  it("should do something", () => {
    // Arrange
    const input = { id: "123" };

    // Act
    const result = myService.process(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(input.id);
  });
});
```

## Write Integration Tests

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";

describe("API /api/workspaces", () => {
  beforeEach(async () => {
    await seedTestDatabase();
  });

  afterEach(async () => {
    await cleanTestDatabase();
  });

  it("GET should return workspaces", async () => {
    const response = await request(app).get("/api/workspaces").set("Cookie", authCookie).expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

## Write E2E Tests

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from "@playwright/test";

test.describe("User Login", () => {
  test("should login successfully", async ({ page }) => {
    await page.goto("/auth");

    await page.getByLabel("Email").fill("user@test.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Zaloguj" }).click();

    await expect(page).toHaveURL("/app");
  });
});
```

## Common Patterns

### Mock Supabase

```typescript
vi.mock("@/db/supabase.client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));
```

### Mock Functions

```typescript
const mockFn = vi.fn((x) => x * 2);
const result = mockFn(5);
expect(mockFn).toHaveBeenCalledWith(5);
```

### Spy on Methods

```typescript
const spy = vi.spyOn(obj, "method");
obj.method();
expect(spy).toHaveBeenCalled();
```

### Async Tests

```typescript
it("should handle async", async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Playwright Locators

```typescript
// Prefer accessible locators
page.getByRole("button", { name: "Submit" });
page.getByLabel("Email");
page.getByText("Success");
page.getByTestId("custom-element");
```

## Coverage Targets

- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 80%
- **Statements:** 80%

## File Naming

- Unit/Integration: `*.test.ts`
- E2E: `*.spec.ts`
- Location: `tests/{unit|integration|e2e}/`

## Import Aliases

```typescript
import { service } from "@/lib/services/service";
import { Component } from "@/components/Component";
import { supabase } from "@/db/supabase.client";
```

## Testing Library Matchers

```typescript
expect(element).toBeInTheDocument();
expect(element).toHaveTextContent("text");
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveAttribute("attr", "value");
```

## Debugging

```bash
# Vitest
npm run test -- -t "test name"  # Run specific test
npm run test:ui                 # Visual debugger

# Playwright
npm run test:e2e:debug          # Step through tests
PWDEBUG=1 npm run test:e2e     # Playwright inspector
```

## Best Practices

✅ **DO:**

- Follow Arrange-Act-Assert pattern
- Use descriptive test names
- Keep tests isolated and independent
- Mock external dependencies
- Test behavior, not implementation
- Clean up after tests

❌ **DON'T:**

- Test implementation details
- Create test interdependencies
- Skip test cleanup
- Use real external services
- Commit test artifacts

## Resources

📚 Full docs: [TESTING.md](../.ai_docs/tests/TESTING.md)
📁 Test guidelines: [.claude/commands/guideline_testing.md](../.claude/commands/guideline_testing.md)
🔧 Tech stack: [.ai_docs/tech-stack.md](../.ai_docs/tech-stack.md)
