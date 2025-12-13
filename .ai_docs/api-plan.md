# REST API Plan

This document outlines the REST API structure for the Storage & Box Organizer application. Given the architecture uses Supabase (PostgreSQL + PostgREST), many endpoints map directly to database operations secured by Row Level Security (RLS). Custom business logic is handled via RPC functions or Edge Functions.

## 1. Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| **Users** | `auth.users`, `public.profiles` | User identities and profile data. |
| **Workspaces** | `public.workspaces` | Tenants for data isolation. |
| **Locations** | `public.locations` | Hierarchical storage units (Rooms, Shelves). |
| **Boxes** | `public.boxes` | Main inventory items with content descriptions. |
| **QRCodes** | `public.qr_codes` | Unique codes linked to boxes. |

---

## 2. Endpoints

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
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-10-27T10:00:00Z"
}
```
- **Errors**:
  - `401 Unauthorized`: User is not authenticated or token is invalid.

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
- **Description**: Soft deletes a location. **Logic**: Unassigns all boxes in this location (sets `location_id` to NULL) before marking the location as deleted.
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:
```json
{
  "message": "Location deleted successfully and associated boxes unassigned."
}
```
- **Errors**:
  - `404 Not Found`: Location not found.
  - `401 Unauthorized`: Permission denied.
  - `500 Internal Server Error`: Failed to execute soft delete RPC.

### 2.3 Boxes

#### GET /boxes
- **Description**: Searches and lists boxes based on criteria.
- **Query Parameters**:
  - `workspace_id` (UUID, required)
  - `q` (string, optional): Search query for text search.
  - `location_id` (UUID, optional): Filter by specific location.
  - `is_assigned` (boolean, optional): Filter for unassigned boxes.
  - `limit` (integer, optional): For pagination.
  - `offset` (integer, optional): For pagination.
- **Request JSON**: None
- **Response JSON**:
```json
[
  {
    "id": "uuid",
    "short_id": "X7K-9P2",
    "name": "Winter Clothes",
    "description": "Jackets and scarves",
    "tags": ["winter", "clothes"],
    "location_id": "uuid",
    "location": { "name": "Shelf A" },
    "created_at": "timestamp"
  }
]
```
- **Errors**:
  - `400 Bad Request`: Missing `workspace_id`.
  - `401 Unauthorized`: Permission denied.

#### GET /boxes/:id
- **Description**: Retrieves detailed information for a specific box.
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:
```json
{
  "id": "uuid",
  "short_id": "X7K-9P2",
  "name": "Winter Clothes",
  "description": "Jackets and scarves...",
  "tags": ["winter", "clothes"],
  "location_id": "uuid",
  "image_url": "url",
  "location": {
    "id": "uuid",
    "name": "Shelf A",
    "path": "root.basement.shelfa"
  },
  "qr_code": {
    "id": "uuid",
    "short_id": "X7K-9P2"
  },
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```
- **Errors**:
  - `404 Not Found`: Box does not exist.
  - `401 Unauthorized`: Permission denied.

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
    { "id": "uuid-1", "short_id": "A1B-2C3", "status": "generated" },
    { "id": "uuid-2", "short_id": "D4E-5F6", "status": "generated" }
  ]
}
```
- **Errors**:
  - `400 Bad Request`: Invalid quantity (e.g., < 1 or > 100).
  - `401 Unauthorized`: Permission denied.

#### GET /qr-codes/:short_id
- **Description**: Resolves a scanned QR code short ID to its status and associated box (if any). Used to decide routing (New Box form vs Box Details).
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:
```json
{
  "id": "uuid",
  "short_id": "A1B-2C3",
  "box_id": "uuid-of-box-if-assigned", 
  "status": "generated" // or "assigned"
}
```
- **Errors**:
  - `404 Not Found`: QR code not found in the system.
  - `401 Unauthorized`: Permission denied.

### 2.5 Export

#### GET /export/inventory
- **Description**: Generates and downloads a CSV/Excel file of all boxes in the workspace.
- **Query Parameters**:
  - `workspace_id` (UUID, required)
- **Request JSON**: None
- **Response JSON**: (Binary file stream)
  - `Content-Type`: `text/csv` or `application/vnd.ms-excel`
- **Errors**:
  - `401 Unauthorized`: Permission denied.
  - `400 Bad Request`: Missing workspace ID.

### 2.6 Account Management

#### DELETE /auth/delete-account
- **Description**: Permanently deletes the authenticated user's account and all associated data (Workspace, Profiles, etc.).
- **Query Parameters**: None
- **Request JSON**: None
- **Response JSON**:
```json
{
  "message": "Account successfully deleted."
}
```
- **Errors**:
  - `401 Unauthorized`: User not authenticated.
  - `500 Internal Server Error`: Deletion process failed.

---

## 3. Authentication and Authorization

*   **Mechanism:** Supabase Auth (GoTrue).
*   **Tokens:** JWT (JSON Web Tokens) passed in the `Authorization: Bearer <token>` header.
*   **RLS (Row Level Security):**
    *   All database access is guarded by Postgres RLS policies.
    *   **Policy Rule:** `auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = current_row.workspace_id)`.
    *   **Context:** The API (PostgREST) automatically applies these policies based on the JWT user.

---

## 4. Validation and Business Logic

### 4.1 Locations
*   **Hierarchy Depth:** Max 5 levels. Validated via database constraint `nlevel(path) <= 5`.
*   **Uniqueness:** Sibling locations cannot have the same name (unique `path` per `workspace_id`).
*   **Soft Delete:**
    *   When deleting a location:
    *   1. Identify all boxes in this location.
    *   2. Update these boxes: set `location_id = NULL`.
    *   3. Set location `is_deleted = true`.

### 4.2 Boxes
*   **Description Limit:** Max 10,000 characters.
*   **Short ID:** Auto-generated unique 10-12 char string on creation (DB Trigger).
*   **Search Vector:** Automatically updated via DB trigger based on name, description, and tags.

### 4.3 QR Codes
*   **Batch Generation:**
    *   Must generate unique `short_id`s.
    *   Must be created with status `generated`.
*   **Assignment:**
    *   A QR code can only be assigned to one box (Unique constraint).
    *   When a box is deleted, the QR code status reverts or the record is deleted (depending on specific requirement, here schema says "Delete associated qr_codes record").

### 4.4 Data Integrity
*   **Foreign Keys:** Strict constraints ensure no orphaned records (e.g., `workspace_id` is required for all entities).
