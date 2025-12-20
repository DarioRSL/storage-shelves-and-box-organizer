# Testing Guide: PATCH /api/locations/:id

This guide explains how to test the PATCH endpoint for updating locations.

## Quick Start

### Prerequisites
1. Local Supabase running (via Docker/Podman)
2. Dev server running on port 3000

### Run All Tests

```bash
# 1. Start dev server (in one terminal)
npm run dev

# 2. Run test suite (in another terminal)
chmod +x run-patch-tests.sh
./run-patch-tests.sh
```

The script will automatically:
- ✅ Check if server is running
- ✅ Run 9 comprehensive tests
- ✅ Verify path regeneration in database
- ✅ Display pass/fail summary

## Test Suite Coverage

The automated test suite includes:

### Happy Path Tests (200 OK)
1. ✅ Update name only
2. ✅ Update description only
3. ✅ Update both name and description
4. ✅ Clear description (set to null)

### Validation Error Tests (400 Bad Request)
5. ✅ Empty request body
6. ✅ Empty name string
7. ✅ Invalid UUID format

### Not Found Tests (404 Not Found)
8. ✅ Non-existent location ID

### Conflict Tests (409 Conflict)
9. ✅ Duplicate sibling name

## Test Data

The script uses pre-created test data:

**User:** `testpatch@example.com`
**Workspace:** `Test Workspace PATCH` (ID: `67b47c38-73a5-4265-a9c1-466f113cb8b9`)

**Test Locations:**
```
root
└── Test Garage
    ├── Shelf A (modified during tests)
    └── Shelf B (used for conflict test)
```

## Expected Output

```
╔════════════════════════════════════════════════════╗
║  PATCH /api/locations/:id - Complete Test Suite   ║
╚════════════════════════════════════════════════════╝

Test Environment:
  User: testpatch@example.com
  Workspace: Test Workspace PATCH
  Test Locations:
    - Test Garage (root)
    - Shelf A (will be modified)
    - Shelf B (sibling for conflict test)

✓ Server is running

═══ HAPPY PATH TESTS ═══
────────────────────────────────────────────────────
TEST 1: Update name only
Expected: HTTP 200
✓ PASS - Got HTTP 200
...

╔════════════════════════════════════════════════════╗
║                  TEST SUMMARY                      ║
╚════════════════════════════════════════════════════╝

  Passed: 9
  Failed: 0
  Total:  9

✓✓✓ ALL TESTS PASSED! ✓✓✓
```

## Manual Testing with VS Code REST Client

For interactive testing:

1. Install "REST Client" extension in VS Code
2. Open [`test-patch-location.http`](test-patch-location.http)
3. Update the token variable at the top (use token from test script output)
4. Click "Send Request" above each test

## Resetting Test Data

To clean up and re-run tests:

```bash
podman exec supabase_db_supabase psql -U postgres -d postgres -c \
  "DELETE FROM locations WHERE workspace_id = '67b47c38-73a5-4265-a9c1-466f113cb8b9'; \
   DELETE FROM workspaces WHERE id = '67b47c38-73a5-4265-a9c1-466f113cb8b9';"
```

Then re-run the setup commands from the implementation session.

## Troubleshooting

### "Server is not running"
- Ensure dev server is running: `npm run dev`
- Check port 3000 is not in use: `lsof -ti:3000`

### "Token expired" or 401 errors
- The JWT token in the script expires after 1 hour
- Re-generate by creating a new user or logging in fresh

### Tests fail after multiple runs
- Some tests modify data (rename locations)
- Reset test data using command above
- Or restart with fresh database

## Implementation Details

**Files involved:**
- Service: [`src/lib/services/location.service.ts`](src/lib/services/location.service.ts) - `updateLocation()` function
- API Route: [`src/pages/api/locations/[id].ts`](src/pages/api/locations/[id].ts) - PATCH handler
- Test Script: [`run-patch-tests.sh`](run-patch-tests.sh) - Automated test suite
- Test Requests: [`test-patch-location.http`](test-patch-location.http) - Manual HTTP requests
- Documentation: [`.ai_docs/location-patch-testing-guide.md`](.ai_docs/location-patch-testing-guide.md) - Detailed guide

## Key Features Tested

✅ **Path Regeneration** - ltree path updates when name changes
✅ **Sibling Conflict Detection** - prevents duplicate names at same level
✅ **Validation** - Zod schemas for UUID and request body
✅ **RLS Integration** - Row Level Security enforced
✅ **Soft Delete Awareness** - deleted locations cannot be updated
✅ **Partial Updates** - name or description can be updated independently

---

For detailed test scenarios and expected responses, see [`.ai_docs/location-patch-testing-guide.md`](.ai_docs/location-patch-testing-guide.md)
