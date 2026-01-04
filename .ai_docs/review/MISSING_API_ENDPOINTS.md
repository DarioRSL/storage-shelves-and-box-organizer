# 🔌 API Endpoints Specification - CRITICAL & POST-MVP

**Storage & Box Organizer - Implementation Status**
**Last Updated:** 2025-12-28

---

## ⚠️ IMPORTANT UPDATE - DOCUMENT ARCHIVED

**This document is now ARCHIVED for historical reference only.**

**Reason:** Both critical endpoints and post-MVP features have now been fully implemented! See updated status below.

---

## CURRENT STATUS (Updated 2025-12-28)

### ✅ CRITICAL ENDPOINTS - FULLY IMPLEMENTED

These endpoints were originally marked as "missing" but are now complete:

| Endpoint | Status | Implementation | Tests | Docs |
|----------|--------|----------------|-------|------|
| **PATCH /api/workspaces/:workspace_id** | ✅ Complete | `src/pages/api/workspaces/[workspace_id].ts:22-162` | ✅ | ✅ |
| **DELETE /api/workspaces/:workspace_id** | ✅ Complete | `src/pages/api/workspaces/[workspace_id].ts:181-297` | ✅ (8/8) | ✅ |

**Documentation:** See `.ai_docs/api-plan.md` (lines 93-164)

### ✅ POST-MVP FEATURES - ALSO FULLY IMPLEMENTED!

These were planned as post-MVP but have also been completed:

| Endpoint | Status | Implementation | Tests | Docs |
|----------|--------|----------------|-------|------|
| **DELETE /api/auth/delete-account** | ✅ Complete | `src/pages/api/auth/delete-account.ts` | ✅ | ✅ |
| **GET /api/export/inventory** | ✅ Complete | `src/pages/api/export/inventory.ts` | ✅ | ✅ |

**Documentation:** See `.ai_docs/api-plan.md` (lines 614-683 and 577-610)

---

## 📋 ORIGINAL CONTENT (Archived for Reference)

This document originally specified endpoints needed for MVP implementation. All specified endpoints are now complete. The original content is preserved below for historical reference.

---

# CRITICAL ENDPOINTS (Must Implement)

## 1. PATCH /api/workspaces/:workspace_id

### Purpose
Update workspace properties (name, description, etc.)

### Used By
- Settings view (WorkspaceEditModal)
- Dashboard (future: workspace settings)

### Request

```http
PATCH /api/workspaces/{workspace_id}
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Updated Workspace Name"
}
```

### Request Body Schema

```typescript
interface PatchWorkspaceRequest {
  name?: string;                    // Optional, max 255 chars
  description?: string;            // Optional (future)
}
```

### Validation

- **name:**
  - Type: string
  - Required: false (at least one field must be provided)
  - Min length: 1
  - Max length: 255
  - Trimmed (no leading/trailing spaces)
  - Unique within user's workspaces (optional): Not required

- **Permissions:**
  - User must be workspace owner
  - Check via: `workspace_members.user_id = auth.uid() AND workspace_members.role = 'owner'`

### Response

**Success (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_id": "user-uuid-here",
  "name": "Updated Workspace Name",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2025-12-28T14:30:00Z"
}
```

**Type Definition:**
```typescript
interface PatchWorkspaceResponse extends WorkspaceDto {
  // inherits all WorkspaceDto fields
  // with updated_at timestamp
}
```

### Error Responses

| Status | Condition | Message | Details |
|--------|-----------|---------|---------|
| **400** | Invalid request body | Bad Request | Invalid JSON or schema violation |
| **400** | Name is empty | Bad Request | "Workspace name cannot be empty" |
| **400** | Name > 255 chars | Bad Request | "Workspace name must be less than 255 characters" |
| **401** | Missing JWT | Unauthorized | "Missing or invalid JWT token" |
| **403** | User is not owner | Forbidden | "Only workspace owner can update" |
| **404** | Workspace not found | Not Found | "Workspace does not exist" |
| **409** | Duplicate name | Conflict | "Workspace with this name already exists" (optional) |
| **500** | Database error | Internal Server Error | "Failed to update workspace" |

### Implementation Notes

**Database Query:**
```sql
-- Verify ownership
SELECT role FROM workspace_members
WHERE user_id = auth.uid() AND workspace_id = {workspace_id};
-- Result must have role = 'owner'

-- Update workspace
UPDATE workspaces
SET name = {name}, updated_at = NOW()
WHERE id = {workspace_id}
RETURNING *;
```

**RLS Policy:**
```sql
CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

**Tests Required:**
- [ ] Owner can update workspace name
- [ ] Non-owner cannot update (403)
- [ ] Invalid name rejected (400)
- [ ] Non-existent workspace returns 404
- [ ] Response includes updated_at timestamp

---

## 2. DELETE /api/workspaces/:workspace_id

### Purpose
Delete workspace and all associated data (cascade)

### Used By
- Settings view (DangerZoneSection - delete workspace)

### Request

```http
DELETE /api/workspaces/{workspace_id}
Authorization: Bearer <JWT_TOKEN>
```

### Query Parameters
None

### Request Body
None

### Validation

- **Permissions:**
  - User must be workspace owner
  - Check via RLS policy

- **Restrictions:**
  - Cannot delete if user has only 1 workspace (future: allow but suggest creating new)
  - All cascade deletions must succeed or rollback

### Response

**Success (200 OK):**
```json
{
  "message": "Workspace deleted successfully",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Type Definition:**
```typescript
interface DeleteWorkspaceResponse {
  message: string;
  workspace_id: string;
}
```

### Error Responses

| Status | Condition | Message | Details |
|--------|-----------|---------|---------|
| **401** | Missing JWT | Unauthorized | "Missing or invalid JWT token" |
| **403** | User is not owner | Forbidden | "Only workspace owner can delete" |
| **404** | Workspace not found | Not Found | "Workspace does not exist" |
| **409** | Cannot delete (only workspace) | Conflict | "Cannot delete your only workspace" (optional) |
| **500** | Database error | Internal Server Error | "Failed to delete workspace" |

### Implementation Notes

**Cascade Delete Strategy:**

```sql
-- 1. Delete all boxes in workspace
DELETE FROM boxes
WHERE workspace_id = {workspace_id};

-- 2. Reset QR codes associated with deleted boxes
UPDATE qr_codes
SET status = 'generated', box_id = NULL
WHERE workspace_id = {workspace_id} AND status = 'assigned';

-- 3. Delete all locations in workspace
DELETE FROM locations
WHERE workspace_id = {workspace_id};

-- 4. Delete all workspace members
DELETE FROM workspace_members
WHERE workspace_id = {workspace_id};

-- 5. Delete workspace
DELETE FROM workspaces
WHERE id = {workspace_id}
RETURNING *;
```

**Or use Postgres Triggers for FOREIGN KEY CASCADE:**
```sql
ALTER TABLE boxes
ADD CONSTRAINT fk_boxes_workspace
FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
ON DELETE CASCADE;

-- Repeat for locations, workspace_members, qr_codes
```

**Transaction Requirement:**
```sql
BEGIN;
  -- All DELETE statements
  DELETE FROM boxes WHERE workspace_id = ...;
  DELETE FROM locations WHERE workspace_id = ...;
  DELETE FROM workspace_members WHERE workspace_id = ...;
  DELETE FROM workspaces WHERE id = ...;
COMMIT;
```

**RLS Policy:**
```sql
CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());
```

**Tests Required:**
- [ ] Owner can delete workspace
- [ ] Non-owner cannot delete (403)
- [ ] Workspace not found returns 404
- [ ] All cascade deletions succeed
- [ ] Workspace members cleared
- [ ] Locations deleted
- [ ] Boxes deleted
- [ ] QR codes reset
- [ ] Transaction rollback on error

---

# OPTIONAL ENDPOINTS (Post-MVP)

These endpoints are referenced in Settings view but are marked as **Post-MVP**. Implement if time permits, otherwise disable the UI buttons.

## 3. DELETE /api/auth/delete-account

### Purpose
Permanently delete user account and all associated data

### Used By
- Settings view (DangerZoneSection - delete account)

### Status
❌ **Not yet implemented** - Post-MVP feature

### Request

```http
DELETE /api/auth/delete-account
Authorization: Bearer <JWT_TOKEN>
```

### Response

**Success (200 OK):**
```json
{
  "message": "Account successfully deleted"
}
```

### Error Responses

| Status | Condition | Message |
|--------|-----------|---------|
| **401** | Not authenticated | Unauthorized |
| **500** | Database error | Internal Server Error |

### Implementation Notes

**Cascade Delete:**
- Delete user profile
- Delete all workspaces owned by user
- Delete workspace memberships
- Delete all data associated with user
- Revoke Supabase Auth user

**Recommendation:**
- Add soft-delete flag (deleted_at) instead of hard delete
- Allow account reactivation (grace period of 30 days)
- Data anonymization instead of deletion

---

## 4. GET /api/export/inventory

### Purpose
Export all boxes from workspace to CSV file

### Used By
- Settings view (DataSection - export button)

### Status
❌ **Placeholder in API plan** - Post-MVP feature

### Request

```http
GET /api/export/inventory?workspace_id={workspace_id}
Authorization: Bearer <JWT_TOKEN>
Accept: text/csv
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workspace_id | UUID | Yes | Workspace to export |
| format | string | No | Export format: csv, json (default: csv) |

### Response

**Success (200 OK):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="inventory-{workspace_id}-{date}.csv"

name,location,description,tags,qr_code,created_at,updated_at
"Winter Clothes","Basement > Shelf A","Jackets and scarves","seasonal,clothes,winter","QR-A1B2C3","2023-10-27T10:00:00Z","2023-11-15T14:30:00Z"
"Tools","Garage > Workbench","Power drill and bits","tools,hardware","QR-X9Y8Z7","2023-10-28T11:00:00Z","2023-11-16T15:00:00Z"
...
```

### CSV Column Definition

| Column | Source | Notes |
|--------|--------|-------|
| id | boxes.id | UUID |
| short_id | boxes.short_id | 10-char alphanumeric |
| name | boxes.name | Text |
| location | locations.name | Full path (e.g., "Basement > Shelf A") |
| description | boxes.description | Text, max 10k chars |
| tags | boxes.tags | JSON array as comma-separated string |
| qr_code | qr_codes.short_id | Format: QR-XXXXXX |
| created_at | boxes.created_at | ISO 8601 timestamp |
| updated_at | boxes.updated_at | ISO 8601 timestamp |

### Error Responses

| Status | Condition | Message |
|--------|-----------|---------|
| **400** | Missing workspace_id | Bad Request |
| **400** | Invalid workspace_id | Bad Request |
| **401** | Not authenticated | Unauthorized |
| **403** | No access to workspace | Forbidden |
| **404** | Workspace not found | Not Found |
| **500** | Server error | Internal Server Error |

### Implementation Notes

**Query:**
```sql
SELECT
  b.id,
  b.short_id,
  b.name,
  l.path as location_path,
  b.description,
  array_to_string(b.tags, ',') as tags,
  q.short_id as qr_code,
  b.created_at,
  b.updated_at
FROM boxes b
LEFT JOIN locations l ON b.location_id = l.id
LEFT JOIN qr_codes q ON b.id = q.box_id
WHERE b.workspace_id = {workspace_id}
ORDER BY b.created_at DESC;
```

**CSV Generation:**
- Use npm package: `csv-stringify` or similar
- Handle quotes, commas, newlines in fields
- Format location path as breadcrumb (Basement > Shelf A)
- Format tags as CSV string ("tag1,tag2,tag3")
- ISO 8601 timestamps

**Response Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="inventory-{workspace_id}-{YYYY-MM-DD}.csv"
```

---

# IMPLEMENTATION PRIORITY

## Phase 0-1 (Critical - Blocks Phase 3)
```
Priority 1: PATCH /api/workspaces/:workspace_id
Priority 2: DELETE /api/workspaces/:workspace_id
```

**Timeline:** Should be implemented before Phase 3 (Dashboard Modals)
**Estimated Dev Time:** 4-6 hours per endpoint

## Phase 5+ (Optional - Post-MVP)
```
Priority 3: DELETE /api/auth/delete-account
Priority 4: GET /api/export/inventory
```

**Timeline:** Can implement after MVP launch
**Estimated Dev Time:** 3-4 hours per endpoint

---

# IMPLEMENTATION CHECKLIST

## Endpoint 1: PATCH /api/workspaces/:workspace_id

### Backend
- [ ] Route created: `PATCH /api/workspaces/:workspace_id`
- [ ] Request validation (Zod schema)
- [ ] Permission check (user is owner)
- [ ] Database update
- [ ] Response formatted correctly
- [ ] Error handling for all cases
- [ ] RLS policy created/updated
- [ ] Migration created (if needed)
- [ ] Tests written:
  - [ ] Owner can update
  - [ ] Non-owner rejected
  - [ ] Invalid data rejected
  - [ ] 404 on missing workspace

### Frontend
- [ ] API endpoint called (POST /api/workspaces/:id)
- [ ] Request body formatted
- [ ] Response handled
- [ ] Error messages displayed
- [ ] Form validation works
- [ ] List updates after save
- [ ] Loading state shown

### Testing
- [ ] Manual test with valid data
- [ ] Manual test with invalid data
- [ ] Manual test with permission error
- [ ] Automated tests passing
- [ ] Load test (100+ workspaces)

---

## Endpoint 2: DELETE /api/workspaces/:workspace_id

### Backend
- [ ] Route created: `DELETE /api/workspaces/:workspace_id`
- [ ] Permission check (user is owner)
- [ ] Transaction for cascade deletes
- [ ] Database deletions:
  - [ ] Boxes deleted
  - [ ] Locations deleted
  - [ ] Workspace members deleted
  - [ ] QR codes reset
  - [ ] Workspace deleted
- [ ] Response formatted correctly
- [ ] Error handling + rollback on failure
- [ ] RLS policy created/updated
- [ ] Tests written:
  - [ ] Owner can delete
  - [ ] Non-owner rejected
  - [ ] Cascade deletes verify
  - [ ] Transaction rollback verify

### Frontend
- [ ] Confirmation dialog displays
- [ ] User must type "DELETE WORKSPACE"
- [ ] API call DELETE /api/workspaces/:id
- [ ] Response handled
- [ ] List updates (workspace removed)
- [ ] Redirect to /app (if deleted current workspace)
- [ ] Loading state shown

### Testing
- [ ] Manual test delete + verify cascade
- [ ] Manual test permission denied
- [ ] Manual test rollback on error
- [ ] Automated tests passing
- [ ] Data integrity verified

---

# FRONTEND INTEGRATION NOTES

## useSettingsView Hook Usage

```typescript
// In src/components/hooks/useSettingsView.ts

export function useSettingsView(userId: string) {
  const [state, setState] = useState<SettingsViewState>({
    workspaces: [],
    // ...
  });

  const updateWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      try {
        const updated = await apiClient.patch(
          `/api/workspaces/${workspaceId}`,
          { name }
        );

        // Update local state
        setState(prev => ({
          ...prev,
          workspaces: prev.workspaces.map(w =>
            w.id === workspaceId ? { ...w, ...updated } : w
          ),
        }));
      } catch (err) {
        throw new Error(`Failed to update workspace: ${err.message}`);
      }
    },
    []
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        await apiClient.delete(`/api/workspaces/${workspaceId}`);

        // Update local state
        setState(prev => ({
          ...prev,
          workspaces: prev.workspaces.filter(w => w.id !== workspaceId),
        }));
      } catch (err) {
        throw new Error(`Failed to delete workspace: ${err.message}`);
      }
    },
    []
  );

  return {
    state,
    actions: {
      updateWorkspace,
      deleteWorkspace,
      // ... other actions
    },
  };
}
```

## API Endpoints Definition

```typescript
// In src/lib/api/endpoints.ts

export const workspacesApi = {
  // ... existing endpoints

  update: (id: string, name: string) =>
    apiClient.patch<WorkspaceDto>(`/api/workspaces/${id}`, { name }),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/workspaces/${id}`),
};
```

---

# TESTING STRATEGY

## Unit Tests (Backend)

```typescript
describe('PATCH /api/workspaces/:id', () => {
  it('should update workspace name if user is owner', async () => {
    // Setup
    const owner = await createUser();
    const workspace = await createWorkspace(owner.id);

    // Execute
    const response = await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${owner.token}` },
      body: JSON.stringify({ name: 'New Name' }),
    });

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('New Name');
  });

  it('should reject if user is not owner', async () => {
    // Setup
    const owner = await createUser();
    const member = await createUser();
    const workspace = await createWorkspace(owner.id);
    await addWorkspaceMember(workspace.id, member.id, 'member');

    // Execute
    const response = await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${member.token}` },
      body: JSON.stringify({ name: 'New Name' }),
    });

    // Assert
    expect(response.status).toBe(403);
  });
});
```

## Integration Tests (Frontend)

```typescript
describe('WorkspaceEditModal', () => {
  it('should update workspace on save', async () => {
    const { getByText, getByDisplayValue } = render(
      <WorkspaceEditModal
        workspace={{ ...mockWorkspace, name: 'Old Name' }}
        isOpen={true}
        onClose={() => {}}
        onSave={jest.fn()}
      />
    );

    const input = getByDisplayValue('Old Name');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(getByText('Save'));

    // Verify API call
    expect(mockApiClient.patch).toHaveBeenCalledWith(
      '/api/workspaces/workspace-id',
      { name: 'New Name' }
    );
  });
});
```

---

# DEPLOYMENT NOTES

## Pre-Deployment Checklist

- [ ] Endpoints created in Supabase
- [ ] RLS policies configured
- [ ] Database migrations applied
- [ ] API endpoints tested with curl/Postman
- [ ] Frontend code calls correct endpoints
- [ ] Error handling verified
- [ ] Logging configured
- [ ] Monitoring alerts setup

## Database Migrations

Create migration file:
```sql
-- supabase/migrations/20241228_add_workspace_management_endpoints.sql

-- Add RLS policy for PATCH
CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Add RLS policy for DELETE
CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Add cascade delete for foreign keys (if not exists)
ALTER TABLE boxes
ADD CONSTRAINT fk_boxes_workspace
FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
ON DELETE CASCADE;

-- Similar for other tables...
```

---

# ROLLBACK PLAN

If endpoints have issues post-deployment:

1. **Disable UI buttons temporarily:**
   ```typescript
   // In Settings component
   <button disabled title="Coming soon">Delete Workspace</button>
   <button disabled title="Coming soon">Edit Workspace</button>
   ```

2. **Disable API calls:**
   ```typescript
   throw new Error('Workspace management temporarily unavailable');
   ```

3. **Roll back database changes:**
   ```bash
   supabase migration down --version {migration_number}
   ```

4. **Redeploy without endpoint code**

---

# SUMMARY TABLE

| Endpoint | Status | Priority | Timeline | Blocks | Est. Hours |
|----------|--------|----------|----------|--------|-----------|
| PATCH /workspaces/:id | ❌ Missing | HIGH | Phase 1-2 | Phase 3 | 4-6 |
| DELETE /workspaces/:id | ❌ Missing | HIGH | Phase 1-2 | Phase 3 | 4-6 |
| DELETE /auth/delete-account | ❌ Missing | MEDIUM | Phase 5+ | None | 3-4 |
| GET /export/inventory | ❌ Missing | MEDIUM | Phase 5+ | None | 3-4 |

---

# CONTACT & ESCALATION

**For implementation questions:**
- Backend Lead: ___________________
- API Architect: ___________________
- Database Admin: ___________________

**For blockers:**
- Product Owner: ___________________
- Tech Lead: ___________________

---

**Document Version:** 1.0
**Last Updated:** 2025-12-28
**Next Review:** Before Phase 3 starts
