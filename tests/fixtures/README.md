# Test Fixtures

This directory contains test data and fixtures for tests.

## Recommended Fixtures to Create

### User Fixtures
- `users.json` - Test user data
- `profiles.json` - Test profile data

### Workspace Fixtures
- `workspaces.json` - Test workspace data
- `workspace-members.json` - Test workspace membership data

### Location Fixtures
- `locations.json` - Test location hierarchy data

### Box Fixtures
- `boxes.json` - Test box data
- `box-items.json` - Test box item data

### QR Code Fixtures
- `qr-codes.json` - Test QR code data

## Usage Example

```typescript
import usersFixture from '../fixtures/users.json';
import workspacesFixture from '../fixtures/workspaces.json';

describe('My Test', () => {
  it('should use fixture data', () => {
    const testUser = usersFixture[0];
    const testWorkspace = workspacesFixture[0];

    // ... test logic using fixture data
  });
});
```

## Fixture Format Examples

### users.json
```json
[
  {
    "id": "test-user-1",
    "email": "user1@test.com",
    "password": "test-password"
  },
  {
    "id": "test-user-2",
    "email": "user2@test.com",
    "password": "test-password"
  }
]
```

### workspaces.json
```json
[
  {
    "id": "test-workspace-1",
    "name": "Test Workspace 1",
    "owner_id": "test-user-1"
  },
  {
    "id": "test-workspace-2",
    "name": "Test Workspace 2",
    "owner_id": "test-user-2"
  }
]
```