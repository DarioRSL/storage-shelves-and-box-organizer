# Testing Guide: GET /api/locations

This document provides manual testing scenarios for the GET /api/locations endpoint implementation.

## Prerequisites

1. Start the development server: `npm run dev`
2. Ensure you have a valid authentication token (login through the app first)
3. Have at least one workspace with some locations created

## Test Scenarios

### Test 1: Missing workspace_id (400 Bad Request)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "error": "Walidacja nie powiodła się",
  "details": {
    "workspace_id": "Nieprawidłowy format ID przestrzeni roboczej"
  }
}
```

**Status Code:** 400

---

### Test 2: Invalid workspace_id UUID format (400 Bad Request)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=invalid-uuid" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "error": "Walidacja nie powiodła się",
  "details": {
    "workspace_id": "Nieprawidłowy format ID przestrzeni roboczej"
  }
}
```

**Status Code:** 400

---

### Test 3: Invalid parent_id UUID format (400 Bad Request)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=550e8400-e29b-41d4-a716-446655440000&parent_id=not-a-uuid" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "error": "Walidacja nie powiodła się",
  "details": {
    "parent_id": "Nieprawidłowy format ID lokalizacji nadrzędnej"
  }
}
```

**Status Code:** 400

---

### Test 4: Unauthenticated request (401 Unauthorized)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=550e8400-e29b-41d4-a716-446655440000"
```

**Expected Response:**
```json
{
  "error": "Nieautoryzowany dostęp"
}
```

**Status Code:** 401

---

### Test 5: User not a member of workspace (403 Forbidden)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=WORKSPACE_ID_YOU_DONT_BELONG_TO" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "error": "Nie masz uprawnień do przeglądania lokalizacji w tej przestrzeni roboczej"
}
```

**Status Code:** 403

---

### Test 6: Valid request - Get root locations (200 OK)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_id": null,
    "name": "Basement",
    "description": "Main storage area",
    "path": "root.basement",
    "is_deleted": false,
    "created_at": "2024-12-15T10:00:00Z",
    "updated_at": "2024-12-15T10:00:00Z"
  },
  {
    "id": "8d0f7780-8536-51ef-b827-557766551111",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_id": null,
    "name": "Garage",
    "description": "Vehicle storage and tools",
    "path": "root.garage",
    "is_deleted": false,
    "created_at": "2024-12-15T11:00:00Z",
    "updated_at": "2024-12-15T11:00:00Z"
  }
]
```

**Status Code:** 200

**Validation Checks:**
- ✅ Returns array (even if empty)
- ✅ All locations have `parent_id: null` (root level)
- ✅ All paths start with "root." and have depth 2
- ✅ Locations are sorted by name alphabetically
- ✅ No deleted locations are returned (`is_deleted: false`)
- ✅ Response includes `Cache-Control: private, max-age=60` header

---

### Test 7: Valid request - Get children of specific parent (200 OK)

**Prerequisites:** Create a location with children first

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=YOUR_WORKSPACE_ID&parent_id=PARENT_LOCATION_ID" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "9e1f8891-9647-62fg-c938-668877662222",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Shelf A",
    "description": "Top shelf",
    "path": "root.basement.shelf_a",
    "is_deleted": false,
    "created_at": "2024-12-15T12:00:00Z",
    "updated_at": "2024-12-15T12:00:00Z"
  },
  {
    "id": "af2g9902-a758-73gh-d049-779988773333",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Shelf B",
    "description": "Bottom shelf",
    "path": "root.basement.shelf_b",
    "is_deleted": false,
    "created_at": "2024-12-15T13:00:00Z",
    "updated_at": "2024-12-15T13:00:00Z"
  }
]
```

**Status Code:** 200

**Validation Checks:**
- ✅ Returns only direct children of specified parent
- ✅ All locations have `parent_id` matching the requested parent_id
- ✅ All paths start with parent's path + one more segment
- ✅ No grandchildren are included (only depth +1)
- ✅ Locations are sorted by name alphabetically

---

### Test 8: Parent location doesn't exist (404 Not Found)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=YOUR_WORKSPACE_ID&parent_id=00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "error": "Nie znaleziono lokalizacji nadrzędnej"
}
```

**Status Code:** 404

---

### Test 9: Empty result set (200 OK with empty array)

**Request:** Query a workspace with no locations or a parent with no children

```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=EMPTY_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
[]
```

**Status Code:** 200

---

### Test 10: Soft-deleted locations are excluded

**Prerequisites:** Soft delete a location first

**Request:**
```bash
curl -X GET "http://localhost:3000/api/locations?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Behavior:**
- Soft-deleted locations should NOT appear in the response
- Only locations with `is_deleted: false` are returned

---

## Performance Tests

### Test 11: Large dataset performance

**Prerequisites:** Create 100+ locations in a workspace

**Request:**
```bash
time curl -X GET "http://localhost:3000/api/locations?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Behavior:**
- Response time should be < 1 second
- All locations returned correctly
- Cache-Control header present

---

### Test 12: Deep hierarchy navigation

**Prerequisites:** Create locations with 5 levels of depth

**Test Sequence:**
1. Get root locations (depth 1)
2. Get children of root location (depth 2)
3. Get children of depth 2 location (depth 3)
4. Continue until depth 5

**Expected Behavior:**
- Each level returns only direct children
- parent_id is correctly populated at each level
- No performance degradation at deeper levels

---

## Testing Checklist

- [ ] Test 1: Missing workspace_id returns 400
- [ ] Test 2: Invalid workspace_id UUID returns 400
- [ ] Test 3: Invalid parent_id UUID returns 400
- [ ] Test 4: Unauthenticated request returns 401
- [ ] Test 5: Non-member workspace access returns 403
- [ ] Test 6: Valid request returns root locations with 200
- [ ] Test 7: Valid request with parent_id returns children with 200
- [ ] Test 8: Non-existent parent_id returns 404
- [ ] Test 9: Empty workspace returns empty array with 200
- [ ] Test 10: Soft-deleted locations are excluded
- [ ] Test 11: Performance with 100+ locations is acceptable
- [ ] Test 12: Deep hierarchy navigation works correctly
- [ ] Cache-Control header is present in successful responses
- [ ] Locations are alphabetically sorted by name
- [ ] parent_id derivation works correctly for all levels

---

## Notes for Developers

### How to get your auth token:

1. Open browser DevTools
2. Login to the application
3. Go to Application/Storage → Cookies
4. Find the session cookie (usually `sb-<project>-auth-token`)
5. Copy the value and use it in the Authorization header

### How to get workspace_id:

1. Login to the application
2. Navigate to workspaces page
3. Check the URL or inspect network requests
4. Use the workspace UUID from the response

### Common Issues:

**Issue:** "Nie udało się sprawdzić członkostwa w przestrzeni roboczej"
- **Cause:** Database connection error or workspace_members table issue
- **Solution:** Check database connection and RLS policies

**Issue:** "Nie udało się pobrać lokalizacji"
- **Cause:** Database query error
- **Solution:** Check database logs and ltree extension

**Issue:** parent_id is always null
- **Cause:** Parent lookup query failing
- **Solution:** Verify locations table has proper path data

---

## Automated Testing (Future)

For automated testing, consider implementing:

1. **Unit tests** for `getLocations` service function
2. **Integration tests** using a test database
3. **E2E tests** with Playwright or Cypress
4. **API contract tests** with tools like Pact or Dredd

Example test framework setup:
- Vitest for unit tests
- Supabase local development for integration tests
- Mock authentication tokens for API tests
