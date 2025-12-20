# Testing Guide: PATCH /api/locations/:id

This guide provides detailed test scenarios for the PATCH endpoint that updates location names and descriptions.

## Prerequisites

Before testing, you need:
1. **Running dev server**: `npm run dev` (should be running on http://localhost:3000)
2. **Valid JWT token**: Obtain from Supabase Auth (login through the app)
3. **Workspace ID**: ID of an existing workspace you have access to
4. **Location IDs**: IDs of existing locations in your workspace

## Test Scenarios

### Happy Path Tests

#### Test 1: Update Location Name Only
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "name": "Updated Garage"
}
```

**Expected Response: 200 OK**
```json
{
  "id": "uuid",
  "name": "Updated Garage",
  "description": "Główny garaż z półkami na narzędzia",
  "updated_at": "2025-12-20T10:30:00Z"
}
```

**Verification:**
- Name should be updated
- Description should remain unchanged
- `updated_at` should be current timestamp
- Path (ltree) should be regenerated with new slugified name

---

#### Test 2: Update Description Only
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "description": "Zaktualizowany opis lokalizacji przechowywania"
}
```

**Expected Response: 200 OK**
```json
{
  "id": "uuid",
  "name": "Garage",
  "description": "Zaktualizowany opis lokalizacji przechowywania",
  "updated_at": "2025-12-20T10:31:00Z"
}
```

**Verification:**
- Name should remain unchanged
- Description should be updated
- Path should remain unchanged (only name changes trigger path regeneration)

---

#### Test 3: Update Both Name and Description
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "name": "Main Storage Area",
  "description": "Główna strefa magazynowa dla rzeczy domowych i narzędzi"
}
```

**Expected Response: 200 OK**
```json
{
  "id": "uuid",
  "name": "Main Storage Area",
  "description": "Główna strefa magazynowa dla rzeczy domowych i narzędzi",
  "updated_at": "2025-12-20T10:32:00Z"
}
```

**Verification:**
- Both fields updated
- Path regenerated with new name

---

#### Test 4: Clear Description (Set to Null)
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "description": null
}
```

**Expected Response: 200 OK**
```json
{
  "id": "uuid",
  "name": "Main Storage Area",
  "description": null,
  "updated_at": "2025-12-20T10:33:00Z"
}
```

**Verification:**
- Description is cleared (set to null)
- Name unchanged

---

### Validation Error Tests (400 Bad Request)

#### Test 5: Empty Request Body
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{}
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "Validation error",
  "details": {
    "_errors": ["At least one field (name or description) must be provided"]
  }
}
```

---

#### Test 6: Empty Name String
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "name": ""
}
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "Validation error",
  "details": {
    "name": {
      "_errors": ["Name cannot be empty"]
    }
  }
}
```

---

#### Test 7: Invalid UUID Format
**Request:**
```http
PATCH /api/locations/not-a-valid-uuid
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "name": "Test"
}
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "Invalid location ID format",
  "details": {
    "id": {
      "_errors": ["Invalid location ID format"]
    }
  }
}
```

---

### Authentication Error Tests (401 Unauthorized)

#### Test 8: Missing Authorization Header
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Content-Type: application/json

{
  "name": "Test"
}
```

**Expected Response: 401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

---

#### Test 9: Invalid/Expired Token
**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer invalid.token.here
Content-Type: application/json

{
  "name": "Test"
}
```

**Expected Response: 401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

---

### Not Found Error Tests (404 Not Found)

#### Test 10: Non-Existent Location ID
**Request:**
```http
PATCH /api/locations/00000000-0000-0000-0000-000000000000
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "name": "Test"
}
```

**Expected Response: 404 Not Found**
```json
{
  "error": "Location not found"
}
```

---

#### Test 11: Location from Different Workspace
**Setup:** Create location in workspace A, try to update from workspace B user

**Expected Response: 404 Not Found** (RLS blocks access, appears as not found)
```json
{
  "error": "Location not found"
}
```

---

#### Test 12: Soft-Deleted Location
**Setup:** Soft-delete a location (set `is_deleted = true`), then try to update it

**Expected Response: 404 Not Found**
```json
{
  "error": "Location not found"
}
```

---

### Conflict Error Tests (409 Conflict)

#### Test 13: Duplicate Sibling Name
**Setup:**
1. Create two sibling locations: "Garage" and "Basement"
2. Try to rename "Basement" to "Garage"

**Request:**
```http
PATCH /api/locations/{basement-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "name": "Garage"
}
```

**Expected Response: 409 Conflict**
```json
{
  "error": "A location with this name already exists at this level"
}
```

**Important Notes:**
- Only siblings (same parent) cause conflicts
- Children with same name as parent are allowed
- Case-insensitive comparison (path is slugified)
- Special characters are normalized (e.g., "My Shelf" → "my_shelf")

---

## Path Regeneration Testing

When updating a location's name, the ltree path should be regenerated:

### Test 14: Verify Path Regeneration

**Setup:**
1. Create location hierarchy: Root → Garage → Top Shelf
2. Path would be: `root.garage.top_shelf`

**Action:** Rename "Top Shelf" to "Bottom Drawer"

**Expected Database State:**
- `name` = "Bottom Drawer"
- `path` = `root.garage.bottom_drawer` (regenerated)

**Verification Query:**
```sql
SELECT id, name, path, updated_at
FROM locations
WHERE id = '{location-id}';
```

---

### Test 15: Verify Special Characters in Name

**Request:**
```http
PATCH /api/locations/{valid-location-id}
Authorization: Bearer {valid-token}
Content-Type: application/json

{
  "name": "Półka #2 (Górna-Lewa)"
}
```

**Expected:**
- `name` = "Półka #2 (Górna-Lewa)" (stored as-is)
- `path` = `root.garaz.polka_2_gorna_lewa` (slugified, special chars replaced)

---

## Manual Testing Checklist

- [ ] Test 1: Update name only ✓
- [ ] Test 2: Update description only ✓
- [ ] Test 3: Update both fields ✓
- [ ] Test 4: Clear description (null) ✓
- [ ] Test 5: Empty body (400) ✓
- [ ] Test 6: Empty name (400) ✓
- [ ] Test 7: Invalid UUID (400) ✓
- [ ] Test 8: Missing auth (401) ✓
- [ ] Test 9: Invalid token (401) ✓
- [ ] Test 10: Non-existent ID (404) ✓
- [ ] Test 11: Different workspace (404) ✓
- [ ] Test 12: Soft-deleted (404) ✓
- [ ] Test 13: Duplicate sibling (409) ✓
- [ ] Test 14: Path regeneration ✓
- [ ] Test 15: Special characters ✓

## Using the HTTP Test File

A companion `test-patch-location.http` file is available in the project root with pre-configured requests.

**To use with VS Code REST Client extension:**
1. Install "REST Client" extension
2. Open `test-patch-location.http`
3. Update variables at the top (token, locationId, workspaceId)
4. Click "Send Request" above each test

**To use with curl:**
See individual test scenarios above and convert to curl commands.

---

## Database Verification

After running tests, verify database state:

```sql
-- Check updated location
SELECT id, name, description, path, updated_at, is_deleted
FROM locations
WHERE id = '{your-location-id}';

-- Verify no duplicate paths at same level
SELECT path, COUNT(*) as count
FROM locations
WHERE workspace_id = '{your-workspace-id}'
  AND is_deleted = false
GROUP BY path
HAVING COUNT(*) > 1;
```

---

## Notes for Developers

1. **RLS Behavior**: Users can only update locations in their own workspaces. RLS violations return 404 (not 403) to avoid information disclosure.

2. **Path Regeneration**: Only occurs when `name` changes. Description updates don't affect the path.

3. **Sibling Conflict Detection**: Uses slugified path comparison, so "My Shelf" and "My-Shelf" are considered duplicates.

4. **Soft Deletes**: Deleted locations (`is_deleted = true`) cannot be updated and return 404.

5. **Timestamps**: The `updated_at` field is automatically updated by the `moddatetime` trigger in the database.

6. **Partial Updates**: Both `name` and `description` are optional, but at least one must be provided.
