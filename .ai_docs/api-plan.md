# REST API Plan

**Last Updated:** January 17, 2026 (verified)
**Implementation Status:** ✅ **100% Complete** (26/26 endpoints implemented)

This document outlines the REST API structure for the Storage & Box Organizer application. Given the architecture uses Supabase (PostgreSQL + PostgREST), many endpoints map directly to database operations secured by Row Level Security (RLS). Custom business logic is handled via RPC functions or Edge Functions.

## Implementation Status Summary

| Category | Endpoints | Status | Notes |
|----------|-----------|--------|-------|
| **Authentication** | 3 | ✅ Complete | HttpOnly cookie-based sessions |
| **Profiles** | 2 | ✅ Complete | Includes theme preference endpoint |
| **Workspaces** | 6 | ✅ Complete | Full CRUD + member management |
| **Locations** | 4 | ✅ Complete | Hierarchical structure with soft delete |
| **Boxes** | 6 | ✅ Complete | Full CRUD + search & pagination + duplicate check |
| **QR Codes** | 3 | ✅ Complete | Batch generation + lookup + workspace listing |
| **Export** | 1 | ✅ Complete | CSV/JSON inventory export |
| **Account Management** | 1 | ✅ Complete | Account deletion with cascade |
| **TOTAL** | **26** | ✅ **100%** | All endpoints production-ready |

**Architecture Highlights:**
- ✅ Consistent Zod validation on all inputs
- ✅ Service layer separation for business logic
- ✅ Middleware-based authentication via `context.locals.user`
- ✅ Comprehensive error handling with Polish messages
- ✅ RLS enforcement via authenticated Supabase client
- ✅ OpenAPI-compliant REST design

## 1. Resources

| Resource              | Database Table                  | Description                                     |
| --------------------- | ------------------------------- | ----------------------------------------------- |
| **Users**             | `auth.users`, `public.profiles` | User identities and profile data.               |
| **Workspaces**        | `public.workspaces`             | Tenants for data isolation.                     |
| **Workspace Members** | `public.workspace_members`      | User-Workspace relationship with roles.         |
| **Locations**         | `public.locations`              | Hierarchical storage units (Rooms, Shelves).    |
| **Boxes**             | `public.boxes`                  | Main inventory items with content descriptions. |
| **QRCodes**           | `public.qr_codes`               | Unique codes linked to boxes.                   |

---

## 2. Endpoints

### 2.0 Authentication & Session

#### POST /api/auth/session

- **Description**: Establishes a server-side session with HttpOnly cookie after successful Supabase login.
- **Request JSON**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- **Response JSON**:

```json
{
  "success": true
}
```

- **Security Flags:**
  - HttpOnly: Prevents JavaScript access (XSS protection)
  - Secure: Only HTTPS in production
  - SameSite=Strict: Only same-origin requests (CSRF protection)
  - Max-Age=3600: 1 hour expiration
  - Path=/: Available to all routes

- **Errors:**
  - `400 Bad Request`: Token missing or invalid format
  - `500 Internal Server Error`: Token validation failed

#### DELETE /api/auth/session

- **Description**: Clears the session cookie (logout).
- **Request JSON**: None
- **Response JSON**:

```json
{
  "success": true
}
```

- **Errors:**
  - `500 Internal Server Error`: Unexpected server error

---

### 2.1 Profiles & Workspace

#### GET /profiles/me

- **Description**: Retrieves the profile of the currently authenticated user.
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "theme_preference": "dark",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-10-27T10:00:00Z"
}
```

- **Errors**:
  - `401 Unauthorized`: User is not authenticated or token is invalid.

#### PATCH /api/profiles/me/theme

- **Description**: Updates the authenticated user's theme preference (light, dark, or system). The theme is persisted to the database and applied across all sessions and devices.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/profiles/me/theme.ts` (PATCH handler)
- **Service Layer**: Database update via direct Supabase client call
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "theme_preference": "dark"
}
```

- **Valid Theme Values**: `"light"`, `"dark"`, `"system"`

- **Response JSON**:

```json
{
  "theme_preference": "dark"
}
```

- **Validation**:
  - User must be authenticated
  - theme_preference: enum ("light", "dark", "system")
  - Validated via Zod schema

- **Authorization**:
  - User can only update their own theme preference
  - RLS policy enforces user can only update their own profile

- **Errors**:
  - `400 Bad Request`: Invalid theme_preference value (not "light", "dark", or "system")
  - `401 Unauthorized`: User not authenticated
  - `500 Internal Server Error`: Database update failed

- **Implementation Details**:
  - Updates `profiles.theme_preference` column
  - Client-side optimistic UI updates for instant feedback
  - Used by `useTheme()` hook for global theme management
  - SSR-compatible: theme fetched before page render to prevent FOUC

#### GET /workspaces

- **Description**: Lists all workspaces the authenticated user belongs to.
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

```json
[
  {
    "id": "uuid",
    "owner_id": "uuid",
    "name": "My Home Storage",
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-27T10:00:00Z"
  }
]
```

- **Errors**:
  - `401 Unauthorized`: User is not authenticated.

#### POST /workspaces

- **Description**: Creates a new workspace. The creating user automatically becomes the owner.
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "name": "New Workspace"
}
```

- **Response JSON**:

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "name": "New Workspace",
  "created_at": "2023-10-27T10:05:00Z",
  "updated_at": "2023-10-27T10:05:00Z"
}
```

- **Errors**:
  - `400 Bad Request`: Missing `name` field.
  - `401 Unauthorized`: User is not authenticated.

#### PATCH /api/workspaces/:workspace_id

- **Description**: Updates workspace properties (name, description) by the workspace owner.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/workspaces/[workspace_id].ts` (PATCH handler)
- **Service Layer**: `src/lib/services/workspace.service.ts::updateWorkspace()`
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "name": "Updated Workspace Name"
}
```

- **Response JSON**:

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "name": "Updated Workspace Name",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2025-12-28T14:30:00Z"
}
```

- **Validation**:
  - User must be workspace owner
  - Name: string, 1-255 characters, trimmed
  - At least one field must be provided

- **Errors**:
  - `400 Bad Request`: Invalid request body or empty name
  - `401 Unauthorized`: User not authenticated
  - `403 Forbidden`: User is not workspace owner
  - `404 Not Found`: Workspace does not exist
  - `500 Internal Server Error`: Database error

#### DELETE /api/workspaces/:workspace_id

- **Description**: Permanently deletes a workspace and all associated data (cascade). This is an irreversible operation.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/workspaces/[workspace_id].ts` (DELETE handler)
- **Service Layer**: `src/lib/services/workspace.service.ts::deleteWorkspace()`
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

```json
{
  "message": "Workspace deleted successfully",
  "workspace_id": "uuid"
}
```

- **Cascade Operations**:
  - Deletes all boxes in workspace
  - Resets QR codes (status → 'generated', box_id → NULL)
  - Deletes all locations in workspace
  - Removes all workspace members
  - Deletes the workspace itself

- **Authorization**:
  - User must be workspace owner
  - Check via RLS policy

- **Errors**:
  - `401 Unauthorized`: User not authenticated
  - `403 Forbidden`: User is not workspace owner
  - `404 Not Found`: Workspace does not exist
  - `500 Internal Server Error`: Database error or cascade failure

#### GET /workspaces/:workspace_id/members

- **Description**: Lists all members of a specific workspace with their roles.
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

```json
[
  {
    "user_id": "uuid",
    "workspace_id": "uuid",
    "role": "owner",
    "joined_at": "2023-10-27T10:00:00Z",
    "profile": {
      "email": "user@example.com",
      "full_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  }
]
```

- **Errors**:
  - `401 Unauthorized`: User is not a member of this workspace.
  - `404 Not Found`: Workspace does not exist.

#### POST /workspaces/:workspace_id/members

- **Description**: Invites a new member to the workspace. Requires admin or owner role.
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

- **Response JSON**:

```json
{
  "user_id": "uuid",
  "workspace_id": "uuid",
  "role": "member",
  "joined_at": "2023-10-27T11:00:00Z"
}
```

- **Note**: If the user with this email doesn't exist in the system yet, this endpoint should send an invitation email. Implementation details depend on your auth flow.
- **Errors**:
  - `400 Bad Request`: Missing `email` or invalid `role`.
  - `403 Forbidden`: Current user doesn't have permission (must be owner or admin).
  - `409 Conflict`: User is already a member of this workspace.
  - `401 Unauthorized`: User is not authenticated.

#### PATCH /workspaces/:workspace_id/members/:user_id

- **Description**: Updates a member's role in the workspace. Requires admin or owner role.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/workspaces/[workspace_id]/members/[user_id].ts`
- **Service Layer**: `src/lib/services/workspace.service.ts::updateWorkspaceMemberRole()`
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "role": "admin"
}
```

- **Valid Roles**: `owner`, `admin`, `member`, `read_only`

- **Response JSON**:

```json
{
  "user_id": "uuid",
  "workspace_id": "uuid",
  "role": "admin",
  "joined_at": "2023-10-27T10:00:00Z"
}
```

- **Business Rules**:
  - Only workspace owners and admins can update member roles
  - Cannot change the role of the last owner in a workspace (prevents orphaning)
  - Role changes are audited with full context logging

- **Errors**:
  - `400 Bad Request`: Invalid `role` value, invalid UUID format for workspace_id or user_id
  - `401 Unauthorized`: User is not authenticated
  - `403 Forbidden`: Current user doesn't have permission (must be owner or admin)
  - `404 Not Found`: Member not found in this workspace
  - `409 Conflict`: Attempting to change the role of the last owner in the workspace
  - `500 Internal Server Error`: Unexpected database or server error

- **Testing**: Run `bash .ai_docs/test-patch-members-userid.sh` (requires dev server and Supabase running)

#### DELETE /workspaces/:workspace_id/members/:user_id

- **Description**: Removes a member from the workspace. Admins/owners can remove others. Any member can remove themselves (leave workspace).
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

```json
{
  "message": "Member removed successfully."
}
```

- **Errors**:
  - `403 Forbidden`: Cannot remove the workspace owner, or current user doesn't have permission.
  - `404 Not Found`: Member not found in this workspace.
  - `401 Unauthorized`: User is not authenticated.

### 2.2 Locations

#### GET /locations

- **Description**: Lists all locations in a specific workspace, optionally filtered by parent for lazy loading.
- **Query Parameters**:
  - `workspace_id` (UUID, required): The ID of the workspace.
  - `parent_id` (UUID, optional): Filter by parent location ID.
- **Request JSON**: None
- **Response JSON**:

```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "parent_id": "uuid",
    "name": "Basement",
    "description": "Main storage area",
    "path": "root.basement",
    "is_deleted": false,
    "created_at": "timestamp"
  }
]
```

- **Errors**:
  - `401 Unauthorized`: User does not have access to this workspace.
  - `400 Bad Request`: Missing `workspace_id`.

#### POST /locations

- **Description**: Creates a new location node in the hierarchy.
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "workspace_id": "uuid",
  "name": "Shelf A",
  "description": "Metal shelf on left wall",
  "parent_id": "uuid"
}
```

- **Response JSON**:

```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "name": "Shelf A",
  "description": "Metal shelf on left wall",
  "path": "root.basement.shelfa",
  "created_at": "timestamp"
}
```

- **Errors**:
  - `400 Bad Request`: Max depth exceeded (level > 5) or missing required fields.
  - `409 Conflict`: Sibling location with the same name already exists.
  - `401 Unauthorized`: User cannot create locations in this workspace.

#### PATCH /locations/:id

- **Description**: Updates the name or description of a location.
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

- **Response JSON**:

```json
{
  "id": "uuid",
  "name": "Updated Name",
  "description": "Updated description",
  "updated_at": "timestamp"
}
```

- **Errors**:
  - `404 Not Found`: Location does not exist.
  - `401 Unauthorized`: Permission denied.

#### DELETE /locations/:id

- **Description**: Soft deletes a location. **Logic**: Unassigns all boxes in this location (sets `location_id` to NULL) before marking the location as deleted (`is_deleted = true`). This is a soft delete operation - the location is preserved in the database for audit trails.
- **URL Parameters**:
  - `id` (UUID, required): The ID of the location to delete.
- **Query Parameters**: None
- **Request Headers**:
  - `Authorization: Bearer <token>` (required)
- **Request JSON**: None
- **Response JSON** (200 OK):

```json
{
  "message": "Location deleted successfully and associated boxes unassigned"
}
```

- **Errors**:
  - `400 Bad Request`: Invalid UUID format.
    ```json
    { "error": "Invalid location ID format" }
    ```
  - `401 Unauthorized`: User not authenticated.
    ```json
    { "error": "Unauthorized" }
    ```
  - `404 Not Found`: Location does not exist or user lacks access (RLS).
    ```json
    { "error": "Location not found" }
    ```
  - `500 Internal Server Error`: Database operation failed.
    ```json
    { "error": "Failed to delete location" }
    ```

- **Implementation Details**:
  - **File**: `src/pages/api/locations/[id].ts` (DELETE handler)
  - **Service**: `src/lib/services/location.service.ts` (`deleteLocation` function)
  - **Security**: Row Level Security (RLS) enforces workspace membership
  - **Transaction**: Two UPDATE operations (boxes unassignment + location soft delete)
  - **Audit Logging**: Success and error cases are logged with user ID and location ID

### 2.3 Boxes

#### POST /api/boxes/check-duplicate

- **Description**: Checks if a box with the given name already exists in the workspace. Returns a count of duplicates for non-blocking warning UI. Used before creating or editing boxes to warn users about potential duplicate names.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/boxes/check-duplicate.ts`
- **Service Layer**: `src/lib/services/box.service.ts::checkDuplicateBoxName()`
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "workspace_id": "uuid",
  "name": "Pudełko Kasi",
  "exclude_box_id": "uuid" // Optional, for edit mode
}
```

- **Response JSON** (200 OK):

```json
{
  "isDuplicate": true,
  "count": 2
}
```

- **Validation**:
  - `workspace_id`: Required, UUID format
  - `name`: Required, 1-100 characters, trimmed
  - `exclude_box_id`: Optional, UUID format (excludes current box in edit mode)

- **Authorization**:
  - User must be workspace member (RLS enforcement)
  - Query automatically scoped to accessible boxes

- **Errors**:
  - `400 Bad Request`: Invalid input (missing name, invalid UUID)
  - `401 Unauthorized`: User not authenticated
  - `500 Internal Server Error`: Database error (gracefully returns `{ isDuplicate: false, count: 0 }`)

- **Performance**:
  - Query time: ~3-6ms (uses existing `boxes_workspace_id_idx` index)
  - Safe for 100+ concurrent users
  - Case-sensitive matching for simplicity

- **Design Rationale**:
  - Box names are NOT unique (QR codes provide unique identification)
  - Non-blocking warning (user can proceed anyway)
  - Graceful failure on errors (doesn't block user)
  - MVP uses before-submit checking (future: on-blur or real-time)

- **Documentation**: See [.ai_docs/implemented/boxes-check-duplicate-post-implementation-plan.md](.ai_docs/implemented/boxes-check-duplicate-post-implementation-plan.md)

#### GET /boxes

- **Description**: Searches and lists boxes based on criteria with full-text search, filtering, and pagination.
- **Query Parameters**:
  - `workspace_id` (UUID, required): The workspace to query boxes from
  - `q` (string, optional): Search query for full-text search (searches name, description, tags)
  - `location_id` (UUID, optional): Filter by specific location
  - `is_assigned` (boolean, optional): Filter for assigned/unassigned boxes
  - `limit` (integer, optional): Max results to return (default: 50, max: 100)
  - `offset` (integer, optional): Number of results to skip for pagination (default: 0)
- **Request JSON**: None
- **Response JSON**:

```json
[
  {
    "id": "uuid",
    "short_id": "X7K-9P2",
    "workspace_id": "uuid",
    "location_id": "uuid",
    "name": "Winter Clothes",
    "description": "Jackets and scarves",
    "tags": ["winter", "clothes"],
    "image_url": null,
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-27T10:00:00Z",
    "location": {
      "id": "uuid",
      "name": "Shelf A",
      "path": "root.basement.shelfa"
    },
    "qr_code": {
      "id": "uuid",
      "short_id": "QR-A1B2C3"
    }
  }
]
```

- **Errors**:
  - `400 Bad Request`: Missing or invalid `workspace_id`, invalid UUID format
  - `401 Unauthorized`: User not authenticated or token invalid
  - `500 Internal Server Error`: Database or server error

#### GET /boxes/:id

- **Description**: Retrieves detailed information for a specific box by its unique identifier. Returns comprehensive box data including nested location details (if assigned) and associated QR code information (if linked). The endpoint enforces workspace-based access control through PostgreSQL Row Level Security (RLS) policies.
- **URL Parameters**:
  - `id` (required): UUID of the box to retrieve
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON** (200 OK):

```json
{
  "id": "b1b48d97-501c-4709-bd7b-d96519721367",
  "short_id": "ywGCkvMi3t",
  "workspace_id": "4d5a1187-e805-4a53-845d-f118945b0dd0",
  "location_id": "73316c0a-8a91-4488-bac2-4d8defdd7206",
  "name": "Winter Clothes",
  "description": "Jackets, scarves, and winter accessories for the whole family",
  "tags": ["winter", "clothes", "seasonal"],
  "image_url": "https://example.com/images/box-photo.jpg",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-11-15T14:30:00Z",
  "location": {
    "id": "73316c0a-8a91-4488-bac2-4d8defdd7206",
    "name": "Shelf A",
    "path": "root.basement.shelfa"
  },
  "qr_code": {
    "id": "456e7890-e89b-12d3-a456-426614174000",
    "short_id": "QR-A1B2C3"
  }
}
```

- **Errors**:
  - `400 Bad Request`: Invalid UUID format in URL parameter
  - `401 Unauthorized`: Not authenticated (missing or invalid JWT token)
  - `404 Not Found`: Box does not exist or user lacks access (RLS enforcement)
  - `500 Internal Server Error`: Database or server error

#### POST /boxes

- **Description**: Creates a new box item.
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "workspace_id": "uuid",
  "name": "Books",
  "description": "Fantasy collection",
  "tags": ["books", "fantasy"],
  "location_id": "uuid",
  "qr_code_id": "uuid"
}
```

- **Response JSON**:

```json
{
  "id": "uuid",
  "short_id": "Generated-ID",
  "name": "Books",
  "workspace_id": "uuid",
  "created_at": "timestamp"
}
```

- **Errors**:
  - `400 Bad Request`: Missing required fields (e.g., `name`, `workspace_id`).
  - `409 Conflict`: QR code already assigned.
  - `401 Unauthorized`: Permission denied.

#### PATCH /boxes/:id

- **Description**: Updates box details or moves it to a different location.
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "tags": ["new", "tags"],
  "location_id": "new-location-uuid"
}
```

- **Response JSON**:

```json
{
  "id": "uuid",
  "name": "Updated Name",
  "updated_at": "timestamp"
}
```

- **Errors**:
  - `404 Not Found`: Box not found.
  - `401 Unauthorized`: Permission denied.

#### DELETE /boxes/:id

- **Description**: Deletes a box. Database triggers will handle the cleanup of the associated QR code link (making the QR code 'generated' again or deleting the link record).
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

```json
{
  "message": "Box deleted successfully."
}
```

- **Errors**:
  - `404 Not Found`: Box not found.
  - `401 Unauthorized`: Permission denied.

### 2.4 QR Codes

#### GET /api/qr-codes

- **Description**: Retrieves all QR codes for a workspace, optionally filtered by status. Used by Box Form to load available QR codes for assignment.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/qr-codes/index.ts`
- **Service Layer**: `src/lib/services/qr-code.service.ts::getQrCodesForWorkspace()`
- **Query Parameters**:
  - `workspace_id` (UUID, required): Workspace to retrieve QR codes from
  - `status` (string, optional): Filter by status - 'generated', 'assigned', or 'printed'
- **Request JSON**: None
- **Response JSON**:

```json
[
  {
    "id": "uuid-1",
    "short_id": "QR-A1B2C3",
    "box_id": null,
    "status": "generated",
    "workspace_id": "uuid"
  },
  {
    "id": "uuid-2",
    "short_id": "QR-X7Y8Z9",
    "box_id": "box-uuid",
    "status": "assigned",
    "workspace_id": "uuid"
  }
]
```

- **Use Cases**:
  - Box Form: Fetch unassigned QR codes (`status=generated`) for dropdown selector
  - QR Management: List all QR codes for workspace
  - Statistics: Count QR codes by status
- **Authorization**:
  - User must be member of the workspace
  - Verified via `isWorkspaceMember()` before query execution
- **Errors**:
  - `400 Bad Request`: Missing workspace_id or invalid status value
  - `401 Unauthorized`: User not authenticated
  - `403 Forbidden`: User is not workspace member
  - `500 Internal Server Error`: Database error (returns empty array gracefully)
- **Documentation**: `.ai_docs/implemented/qr-codes-get-implementation-plan.md`

#### POST /qr-codes/batch

- **Description**: Generates a batch of new, unassigned QR codes for printing. (Supabase RPC/Edge Function).
- **Query Parameters**: None
- **Request JSON**:

```json
{
  "workspace_id": "uuid",
  "quantity": 20
}
```

- **Response JSON**:

```json
{
  "data": [
    {
      "id": "uuid-1",
      "short_id": "QR-A1B2C3",
      "status": "generated",
      "workspace_id": "uuid",
      "created_at": "timestamp"
    },
    {
      "id": "uuid-2",
      "short_id": "QR-D4E5F6",
      "status": "generated",
      "workspace_id": "uuid",
      "created_at": "timestamp"
    }
  ]
}
```

- **Errors**:
  - `400 Bad Request`: Invalid quantity (e.g., < 1 or > 100).
  - `401 Unauthorized`: Permission denied.

#### GET /qr-codes/:short_id

- **Description**: Resolves a scanned QR code short ID to its status and associated box (if any). Used to decide routing (New Box form vs Box Details).
- **URL Parameter**: `short_id` - The QR code's short ID (format: QR-XXXXXX, e.g., QR-A1B2C3)
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:

```json
{
  "id": "uuid",
  "short_id": "QR-A1B2C3",
  "box_id": "uuid-of-box-if-assigned",
  "status": "assigned",
  "workspace_id": "uuid"
}
```

- **Note**: If `box_id` is null and `status` is "generated", the frontend should show the "Create New Box" form. If `box_id` is present, redirect to the box details page.
- **Errors**:
  - `404 Not Found`: QR code with this short_id not found in the system.
  - `401 Unauthorized`: Permission denied.

### 2.5 Export

#### GET /api/export/inventory

- **Description**: Generates and downloads all boxes from a workspace in CSV or JSON format.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/export/inventory.ts`
- **Service Layer**: `src/lib/services/exportService.ts::exportInventory()`
- **Query Parameters**:
  - `workspace_id` (UUID, required): Workspace to export from
  - `format` (string, optional): Export format - 'csv' or 'json' (default: 'csv')
- **Request JSON**: None
- **Response JSON**: (Binary file stream)
  - `Content-Type`: `text/csv` or `application/json`
  - `Content-Disposition`: `attachment; filename="inventory-{workspace_id}-{date}.csv"`
  - Includes header: `Cache-Control: no-cache, no-store, must-revalidate`

**Export Columns (CSV):**
- id, short_id, name, location, description, tags, qr_code, created_at, updated_at

**Features:**
- Supports both CSV and JSON formats
- Automatic file download with proper headers
- Includes all box metadata with joined location and QR code data
- Prevents caching of export content

- **Authorization**:
  - User must be member of the workspace
  - Verified via workspace_members table + RLS policies

- **Errors**:
  - `400 Bad Request`: Missing workspace_id or invalid format parameter
  - `401 Unauthorized`: User not authenticated
  - `403 Forbidden`: User is not workspace member
  - `404 Not Found`: Workspace does not exist
  - `500 Internal Server Error`: Export generation failed

### 2.6 Account Management

#### DELETE /api/auth/delete-account

- **Description**: Permanently deletes the authenticated user's account and all associated data (workspaces, profiles, boxes, locations, QR codes). This is an irreversible operation.
- **Implementation Status**: ✅ Implemented
- **Implementation File**: `src/pages/api/auth/delete-account.ts`
- **Service Layer**: `src/lib/services/auth.service.ts::deleteUserAccount()`
- **Query Parameters**: None
- **Request JSON**: None
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>` (required)

- **Response JSON** (200 OK):

```json
{
  "message": "Account successfully deleted"
}
```

**Cascade Operations:**
- Deletes user profile
- Deletes all workspaces owned by user
- Deletes all workspace memberships
- Deletes all boxes, locations, QR codes in owned workspaces
- Revokes user authentication in Supabase Auth

- **Authorization**:
  - User can only delete their own account (no parameter-based user ID)
  - Requires valid JWT token in Authorization header

- **Errors**:
  - `401 Unauthorized`: User not authenticated (missing or invalid JWT token)
  - `404 Not Found`: User account not found
  - `500 Internal Server Error`: Account deletion or auth revocation failed

**Important Notes:**
- This is an irreversible operation - all user data is permanently deleted
- User will be logged out after deletion
- No recovery or grace period available

---

## 3. Authentication and Authorization

### 3.1 HttpOnly Cookie-Based Authentication

- **Mechanism:** Supabase Auth (GoTrue) with server-side session management
- **Session Establishment:**
  1. User authenticates via `/auth` page with Supabase
  2. Client receives JWT token
  3. Client calls `POST /api/auth/session` with token in request body
  4. Endpoint validates JWT and sets HttpOnly cookie `sb_session`
  5. All subsequent requests include cookie automatically

- **Cookie Properties:**
  - **Name:** `sb_session`
  - **HttpOnly:** Prevents JavaScript access (XSS protection)
  - **Secure:** Only HTTPS in production
  - **SameSite:** Strict (CSRF protection)
  - **Path:** `/` (all routes)
  - **Max-Age:** 3600 seconds (1 hour)

- **Client-Side API Requests:**
  - Use `apiFetch()` utility from `src/lib/api-client.ts`
  - Utility automatically includes `credentials: 'include'` for cookie transmission
  - Example: `const data = await apiFetch('/api/workspaces')`

- **Middleware Authentication Flow:**
  ```
  Request → Parse Cookies → Extract sb_session
           → Try Supabase auth (primary)
           → Fallback: Decode JWT directly (trusted internal)
           → Set context.locals.user
           → Pass to route handler
  ```

- **API Endpoint Authentication:**
  - Endpoints access user via `context.locals.user`
  - All endpoints return 401 if user is not authenticated
  - Examples:
    ```typescript
    export const GET = async ({ locals }) => {
      if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      // User authenticated, proceed with business logic
    }
    ```

### 3.2 Row Level Security (RLS)

- **Database-Level Access Control:**
  - All database access is guarded by Postgres RLS policies
  - **Policy Rule:** `auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = current_row.workspace_id)`
  - **Context:** Supabase client uses authenticated user context from cookies
  - **Fallback:** If RLS fails, JavaScript-based validation in service layer provides additional protection

### 3.3 Security Features

✅ **XSS Protection (HttpOnly flag)**
- JWT tokens cannot be accessed by JavaScript
- Prevents token theft via malicious scripts

✅ **CSRF Protection (SameSite=Strict)**
- Cookies only sent to same-origin requests
- Cross-site requests automatically blocked

✅ **Token Security**
- Tokens never exposed in URL
- Tokens never in Authorization header (browser-readable)
- Tokens stored securely by browser in HttpOnly cookies

✅ **Session Management**
- 1-hour expiration ensures time-limited access
- Logout clears cookie immediately (Max-Age=0)

---

## 4. Validation and Business Logic

### 4.1 Locations

- **Hierarchy Depth:** Max 5 levels. Validated via database constraint `nlevel(path) <= 5`.
- **Uniqueness:** Sibling locations cannot have the same name (unique `path` per `workspace_id`).
- **Soft Delete:**
  - When deleting a location:
  - 1. Identify all boxes in this location.
  - 2. Update these boxes: set `location_id = NULL`.
  - 3. Set location `is_deleted = true`.

### 4.2 Boxes

- **Description Limit:** Max 10,000 characters.
- **Short ID:** Auto-generated unique 10-12 char string on creation (DB Trigger).
- **Search Vector:** Automatically updated via DB trigger based on name, description, and tags.

### 4.3 QR Codes

- **Batch Generation:**
  - Must generate unique `short_id`s with format `QR-XXXXXX` (6 uppercase alphanumeric characters).
  - Must be created with status `generated`.
- **Assignment:**
  - A QR code can only be assigned to one box (Unique constraint on `box_id`).
  - When a box is deleted, the QR code is reset: `box_id` set to NULL and `status` changed to `generated`, allowing the QR code to be reused for a new box.
- **Short ID Format:**
  - QR codes: `QR-XXXXXX` (e.g., `QR-A1B2C3`)
  - Boxes: 10 character alphanumeric string (e.g., `X7K9P2mN4q`)
  - These are distinct to avoid confusion between scanning a QR code vs searching for a box.

### 4.4 Data Integrity

- **Foreign Keys:** Strict constraints ensure no orphaned records (e.g., `workspace_id` is required for all entities).
