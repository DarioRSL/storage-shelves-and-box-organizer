# Testing Guide: DELETE /api/locations/:id

This guide provides step-by-step instructions for manually testing the DELETE endpoint for locations.

## Prerequisites

1. **Running Services**:
   - Supabase local instance running (`supabase start`)
   - Dev server running (`npm run dev`)
   - Application accessible at `http://localhost:3000`

2. **Test Data Setup**:
   - At least one workspace created
   - User authenticated and member of the workspace
   - At least one location created
   - (Optional) Some boxes assigned to the location for comprehensive testing

3. **Tools**:
   - HTTP client (curl, Postman, Insomnia, or similar)
   - Valid authentication token (JWT)

---

## Test Scenarios

### Test 1: Successful Location Deletion (200 OK)

**Setup**:
- Create a location with ID `{location_id}`
- Optionally assign some boxes to this location

**Request**:
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/{location_id} \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json"
```

**Expected Response** (200 OK):
```json
{
  "message": "Lokalizacja została usunięta, a powiązane pudełka odłączone"
}
```

**Database Verification**:
```sql
-- Check location is marked as deleted
SELECT id, name, is_deleted FROM locations WHERE id = '{location_id}';
-- Expected: is_deleted = true

-- Check boxes are unassigned
SELECT id, name, location_id FROM boxes WHERE location_id IS NULL;
-- Expected: All boxes that were in this location now have location_id = NULL
```

---

### Test 2: Invalid UUID Format (400 Bad Request)

**Request**:
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/invalid-uuid \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json"
```

**Expected Response** (400 Bad Request):
```json
{
  "error": "Nieprawidłowy format ID lokalizacji"
}
```

---

### Test 3: Missing Authentication (401 Unauthorized)

**Request**:
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/{location_id} \
  -H "Content-Type: application/json"
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Brak autoryzacji"
}
```

---

### Test 4: Invalid/Expired Token (401 Unauthorized)

**Request**:
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/{location_id} \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json"
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Brak autoryzacji"
}
```

---

### Test 5: Location Not Found (404 Not Found)

**Request** (use non-existent UUID):
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json"
```

**Expected Response** (404 Not Found):
```json
{
  "error": "Lokalizacja nie została znaleziona"
}
```

---

### Test 6: Location Already Deleted (404 Not Found)

**Setup**:
- First, delete a location successfully
- Then try to delete it again

**Request** (same location ID as before):
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/{already_deleted_location_id} \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json"
```

**Expected Response** (404 Not Found):
```json
{
  "error": "Lokalizacja nie została znaleziona"
}
```

**Note**: Soft-deleted locations return 404 to prevent information leakage about deleted data.

---

### Test 7: Cross-Workspace Access Denied (404 Not Found)

**Setup**:
- Create two workspaces (Workspace A and Workspace B)
- Create a location in Workspace A
- Authenticate as a user who is only a member of Workspace B

**Request** (trying to delete location from Workspace A):
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/{workspace_a_location_id} \
  -H "Authorization: Bearer {workspace_b_user_token}" \
  -H "Content-Type: application/json"
```

**Expected Response** (404 Not Found):
```json
{
  "error": "Lokalizacja nie została znaleziona"
}
```

**Security Note**: RLS filters out locations from other workspaces, so unauthorized access attempts return 404 (not 403) to avoid leaking information about the existence of resources.

---

### Test 8: Location with Multiple Boxes

**Setup**:
- Create a location
- Create 3-5 boxes assigned to this location

**Request**:
```bash
curl -X DELETE \
  http://localhost:3000/api/locations/{location_id} \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json"
```

**Expected Response** (200 OK):
```json
{
  "message": "Lokalizacja została usunięta, a powiązane pudełka odłączone"
}
```

**Database Verification**:
```sql
-- All boxes should be unassigned
SELECT COUNT(*) FROM boxes
WHERE id IN ({box_id_1}, {box_id_2}, {box_id_3})
AND location_id IS NULL;
-- Expected: COUNT = 3 (or however many boxes you created)
```

---

## Integration Testing Checklist

After implementing the endpoint, verify the following:

### Functional Requirements
- [ ] Location is successfully soft-deleted (is_deleted = true)
- [ ] All boxes in the location are unassigned (location_id = NULL)
- [ ] Deleted location cannot be retrieved via GET /api/locations
- [ ] Deleted location cannot be updated via PATCH
- [ ] Deleted location cannot be deleted again (returns 404)
- [ ] Both database operations (boxes + location) complete atomically

### Security Requirements
- [ ] Unauthenticated requests are rejected (401)
- [ ] Invalid tokens are rejected (401)
- [ ] Users cannot delete locations from other workspaces (404 via RLS)
- [ ] Error messages don't leak sensitive information
- [ ] Audit logs contain user ID and location ID

### Error Handling
- [ ] Invalid UUID format returns 400
- [ ] Missing authentication returns 401
- [ ] Non-existent location returns 404
- [ ] Already deleted location returns 404
- [ ] Database errors return 500 with generic message

### Data Integrity
- [ ] Soft delete preserves location record in database
- [ ] Foreign key relationships remain intact
- [ ] No cascade deletions occur
- [ ] Transaction rollback on failure
- [ ] `updated_at` timestamp is updated

### Performance
- [ ] Single query to verify location exists
- [ ] Two UPDATE queries within transaction
- [ ] Response time < 200ms for typical use case
- [ ] No N+1 query issues

---

## Postman Collection (Optional)

You can import this JSON into Postman for easier testing:

```json
{
  "info": {
    "name": "Location DELETE Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Delete Location - Success",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/locations/{{location_id}}",
          "host": ["{{base_url}}"],
          "path": ["api", "locations", "{{location_id}}"]
        }
      }
    },
    {
      "name": "Delete Location - Invalid UUID",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/locations/invalid-uuid",
          "host": ["{{base_url}}"],
          "path": ["api", "locations", "invalid-uuid"]
        }
      }
    },
    {
      "name": "Delete Location - No Auth",
      "request": {
        "method": "DELETE",
        "url": {
          "raw": "{{base_url}}/api/locations/{{location_id}}",
          "host": ["{{base_url}}"],
          "path": ["api", "locations", "{{location_id}}"]
        }
      }
    },
    {
      "name": "Delete Location - Not Found",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/locations/00000000-0000-0000-0000-000000000000",
          "host": ["{{base_url}}"],
          "path": ["api", "locations", "00000000-0000-0000-0000-000000000000"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "auth_token",
      "value": "your_jwt_token_here"
    },
    {
      "key": "location_id",
      "value": "your_location_uuid_here"
    }
  ]
}
```

---

## Troubleshooting

### Issue: Getting 500 errors unexpectedly

**Solution**:
1. Check server logs for detailed error messages
2. Verify Supabase connection is working
3. Ensure RLS policies are correctly configured
4. Check that `is_deleted` column exists in `locations` table

### Issue: Boxes not being unassigned

**Solution**:
1. Verify foreign key relationship exists between `boxes.location_id` and `locations.id`
2. Check RLS policies on `boxes` table allow UPDATE for workspace members
3. Review transaction logic in `deleteLocation` service function

### Issue: RLS blocking legitimate deletions

**Solution**:
1. Verify user is a member of the workspace via `workspace_members` table
2. Check `is_workspace_member()` helper function is working correctly
3. Review RLS policies on `locations` table

---

## Expected Console Logs

### Success Case
```
Location service - Lokalizacja usunięta: {
  locationId: 'uuid',
  userId: 'uuid',
  workspaceId: 'uuid'
}
```

### Not Found Case
```
Location service - Lokalizacja nie znaleziona: {
  locationId: 'uuid',
  userId: 'uuid',
  error: 'error message'
}
```

### Database Error Case
```
Location service - Nie udało się odłączyć pudełek: {
  locationId: 'uuid',
  userId: 'uuid',
  error: 'error message'
}
```

---

## Summary

This testing guide covers all major scenarios for the DELETE /api/locations/:id endpoint:
- ✅ Happy path (successful deletion)
- ✅ Validation errors (invalid UUID)
- ✅ Authentication errors (missing/invalid token)
- ✅ Authorization errors (cross-workspace access)
- ✅ Not found errors (non-existent/deleted locations)
- ✅ Edge cases (multiple boxes, already deleted)

Complete all tests before marking the implementation as done.
