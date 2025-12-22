# Testing Guide: PATCH /api/workspaces/:workspace_id/members/:user_id

This guide explains how to test the workspace member role update endpoint.

## Endpoint Overview

**URL**: `PATCH /api/workspaces/:workspace_id/members/:user_id`

**Purpose**: Updates a workspace member's role (owner, admin, member, read_only)

**Implementation**:
- API Route: `src/pages/api/workspaces/[workspace_id]/members/[user_id].ts`
- Service Layer: `src/lib/services/workspace.service.ts::updateWorkspaceMemberRole()`

## Prerequisites

1. **Development server running**:
   ```bash
   npm run dev
   ```

2. **Supabase local instance running**:
   ```bash
   # Check if Supabase containers are running
   podman ps | grep supabase
   ```

3. **Test users exist** in `auth.users`:
   - `testuser@example.com` (will be owner)
   - `demo@example.com` (will be member)
   - `apitest@example.com` (will be admin)

## Setup Test Data

Run the SQL script to create test workspaces and members:

```bash
# Copy SQL to container and execute
podman exec -i supabase_db_supabase psql -U postgres -d postgres < .ai_docs/setup-test-data-members.sql
```

This creates:
- **Workspace 1** (`aaaaaaaa-bbbb-cccc-dddd-000000000001`): Multi-member workspace with owner, admin, and member
- **Workspace 2** (`aaaaaaaa-bbbb-cccc-dddd-000000000002`): Single-owner workspace (for testing last owner protection)

## Running Automated Tests

Execute the comprehensive test suite:

```bash
bash .ai_docs/test-patch-members-userid.sh
```

### Test Suite Coverage

The automated tests cover:

1. **Authentication**:
   - ✅ 401 Unauthorized - Missing authorization header

2. **Input Validation**:
   - ✅ 400 Bad Request - Invalid workspace_id format
   - ✅ 400 Bad Request - Invalid user_id format
   - ✅ 400 Bad Request - Invalid role enum value

3. **Business Logic**:
   - ✅ 404 Not Found - Non-existent member
   - ✅ 200 OK - Successfully update member to admin
   - ✅ 200 OK - Successfully update admin back to member
   - ✅ 409 Conflict - Attempt to change last owner's role (protection)

4. **Database Verification**:
   - Verifies role changes are persisted correctly in database

## Manual Testing with curl

### 1. Get JWT Token

First, authenticate to get an access token:

```bash
cat <<'SCRIPT' | bash
# Login as testuser@example.com
TOKEN=$(curl -s -X POST 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -H 'Content-Type: application/json' \
  -d '{"email": "testuser@example.com", "password": "password123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "Token: $TOKEN"
SCRIPT
```

### 2. Test Success Case

Update a member's role to admin:

```bash
cat <<'SCRIPT' | bash
WORKSPACE_ID="aaaaaaaa-bbbb-cccc-dddd-000000000001"
USER_ID="<demo-user-uuid>"  # Get from database
TOKEN="<your-jwt-token>"

curl -s -X PATCH \
  "http://localhost:3000/api/workspaces/$WORKSPACE_ID/members/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}' \
| python3 -m json.tool
SCRIPT
```

Expected response (200 OK):
```json
{
  "user_id": "uuid",
  "workspace_id": "uuid",
  "role": "admin",
  "joined_at": "2023-10-27T10:00:00Z"
}
```

### 3. Test Error Cases

**Invalid role value (400)**:
```bash
curl -s -X PATCH \
  "http://localhost:3000/api/workspaces/$WORKSPACE_ID/members/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "superadmin"}' \
| python3 -m json.tool
```

**Last owner protection (409)**:
```bash
# Try to change the only owner's role in single-owner workspace
WORKSPACE_ID="aaaaaaaa-bbbb-cccc-dddd-000000000002"
OWNER_ID="<testuser-uuid>"

curl -s -X PATCH \
  "http://localhost:3000/api/workspaces/$WORKSPACE_ID/members/$OWNER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}' \
| python3 -m json.tool
```

## Verifying Changes in Database

After making role changes, verify in the database:

```bash
podman exec supabase_db_supabase psql -U postgres -d postgres -c \
  "SELECT workspace_id, user_id, role FROM public.workspace_members WHERE workspace_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';"
```

## Testing with RLS Enabled

**Current Status**: RLS is currently **disabled** on workspace_members table.

**When RLS is enabled**, additional test scenarios:
- Non-members should not be able to view workspace members (404 or empty result)
- Non-members should not be able to update roles (403)
- RLS policies will automatically filter results based on workspace membership

To test with RLS enabled:
1. Enable RLS: `ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;`
2. Run test suite again
3. Verify that non-members cannot access or modify data
4. Disable RLS after testing if needed: `ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;`

## Common Issues

### Issue: "Brak autoryzacji" (401 Unauthorized)

**Cause**: JWT token expired or invalid

**Solution**:
1. Generate a new token (tokens typically expire after 1 hour)
2. Ensure you're using the correct Supabase anon key
3. Check that auth.users has the test user

### Issue: "Członek nie został znaleziony" (404 Not Found)

**Cause**: Target user is not a member of the workspace

**Solution**:
1. Verify the user_id exists in workspace_members
2. Check workspace_id is correct
3. Run setup-test-data-members.sql to recreate test data

### Issue: Test script fails with "No workspace with multiple members found"

**Cause**: No test data in database

**Solution**:
```bash
podman exec -i supabase_db_supabase psql -U postgres -d postgres < .ai_docs/setup-test-data-members.sql
```

## API Specification

See [api-plan.md](./api-plan.md#patch-workspacesworkspace_idmembersuser_id) for complete API specification.

## Implementation Details

### Service Layer Logic

The `updateWorkspaceMemberRole()` function performs:

1. **Permission Check**: Verifies current user is owner or admin
2. **Member Existence**: Confirms target user is a member
3. **Last Owner Protection**: Counts owners; prevents removing last owner
4. **Role Update**: Updates role in database
5. **Audit Logging**: Logs success/failure with full context

### Security Considerations

- JWT validation via Supabase Auth
- Role-based access control (only owner/admin)
- Last owner protection prevents orphaning workspaces
- Input validation with Zod schemas
- Comprehensive error handling and logging

### Error Codes Reference

| Code | Condition | Message (Polish) |
|------|-----------|------------------|
| 200 | Success | Updated member object |
| 400 | Invalid input | "Błąd walidacji" |
| 401 | Not authenticated | "Brak autoryzacji" |
| 403 | Insufficient permissions | "Brak uprawnień do zmiany roli członka" |
| 404 | Member not found | "Członek nie został znaleziony w tym workspace" |
| 409 | Last owner | "Nie można zmienić roli ostatniego właściciela workspace" |
| 500 | Server error | "Nie udało się zaktualizować roli członka" |
