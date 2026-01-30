# Test Helpers

This directory contains reusable helper functions and utilities for tests.

## Recommended Helpers to Create

### Authentication Helpers

- `createTestUser()` - Create a test user in Supabase
- `getAuthCookie()` - Get authentication cookie for API tests
- `createTestSession()` - Create a test session

### Database Helpers

- `seedDatabase()` - Seed test database with initial data
- `cleanDatabase()` - Clean up test database after tests
- `createTestWorkspace()` - Create a test workspace
- `createTestLocation()` - Create a test location
- `createTestBox()` - Create a test box
- `createTestQRCode()` - Create a test QR code

### Mock Helpers

- `mockSupabaseClient()` - Mock Supabase client
- `mockAuthContext()` - Mock authentication context
- `mockAPIContext()` - Mock Astro API context

### Assertion Helpers

- `expectValidUUID()` - Assert valid UUID format
- `expectValidDate()` - Assert valid date format
- `expectErrorResponse()` - Assert error response structure

## Usage Example

```typescript
import { createTestUser, getAuthCookie } from "../helpers/auth";
import { createTestWorkspace } from "../helpers/database";

describe("My Test", () => {
  let authCookie: string;
  let testUser: User;

  beforeEach(async () => {
    testUser = await createTestUser();
    authCookie = await getAuthCookie(testUser.email, "password");
  });

  it("should work", async () => {
    const workspace = await createTestWorkspace(testUser.id);
    // ... test logic
  });
});
```
