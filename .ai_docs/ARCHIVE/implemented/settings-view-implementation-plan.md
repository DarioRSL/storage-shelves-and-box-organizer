# Settings View Implementation Plan

## 1. Overview

The Settings view is a configuration page that enables users to manage their workspaces, appearance preferences, and perform confirmation-required actions (account deletion, workspace management). The view groups functionality into logical sections: Workspace Management, Appearance, Data, and Danger Zone. It supports workspace operations (create, edit, delete) and account security features (theme switching, logout, account deletion).

**MVP Status:** Core features (workspace management, theme toggle, logout) are required. Account deletion and data export are planned for Post-MVP but are included in the view specification.

## 2. View Routing

**Route Path:** `/app/settings`

**Component File:** `src/pages/settings.astro`

**Route Parameters:** None (all data fetched based on authenticated user from JWT token)

**Access Requirements:** User must be authenticated (valid Supabase session)

## 3. Component Structure

```
SettingsView (Astro container component)
├── ProfileHeader
│   ├── User email display
│   └── LogoutButton (React component)
├── WorkspaceManagementSection (React)
│   ├── SectionHeader
│   ├── WorkspaceList
│   │   └── WorkspaceCard[] (React)
│   │       ├── Workspace info display
│   │       ├── Member count badge
│   │       ├── Edit button
│   │       └── Delete button (conditional - owner only)
│   ├── CreateNewWorkspaceButton
│   └── WorkspaceEditModal (React - conditional)
├── AppearanceSection (React)
│   ├── SectionHeader
│   └── ThemeToggle
├── DataSection (React)
│   ├── SectionHeader
│   └── ExportDataButton
├── DangerZoneSection (React)
│   ├── SectionHeader
│   ├── DeleteWorkspaceButton (conditional - owner only)
│   └── DeleteAccountButton
├── WorkspaceCreateModal (React - conditional)
└── ConfirmationDialog (React - conditional/reusable)
```

## 4. Component Details

### SettingsView (Astro Container)

**Description:** Main container for the settings page. Astro component serving as layout, combining React sub-components and managing server-side data fetching.

**Main Elements:**

- Wrapper div with Tailwind classes (responsive layout, max-width container)
- Heading: "Settings"
- Series of section divs (workspace, appearance, data, danger zone)
- Imports and integration of React components

**Supported Interactions:**

- Page load triggers fetching of user profile and workspace list
- Error clearing on state changes
- Handling of redirects (logout, account deletion)

**Validation:**

- Authentication verification (Astro middleware)
- Permission checks for specific operations

**Types:**

- `ProfileDto`
- `WorkspaceDto[]`
- `WorkspaceMemberWithProfileDto[]` (for determining owner)

**Props:** None (Astro component)

---

### ProfileHeader (React)

**Description:** Header displaying current user information and logout button.

**Main Elements:**

- Avatar placeholder or user icon
- User email
- LogoutButton component

**Supported Interactions:**

- Click on LogoutButton triggers logout

**Validation:**

- Email must be valid email address (already validated in database)

**Types:**

- `ProfileDto`

**Props:**

```typescript
interface ProfileHeaderProps {
  profile: ProfileDto;
  onLogout: () => Promise<void>;
  isLoggingOut?: boolean;
}
```

---

### WorkspaceManagementSection (React)

**Description:** Workspace management section. Displays list of user's workspaces with edit and delete options (for owners). Includes button for creating new workspace.

**Main Elements:**

- Section header ("Workspace Management")
- List of WorkspaceCard components
- "Create New Workspace" button
- Edit modal (WorkspaceEditModal) - conditional
- Create modal (WorkspaceCreateModal) - conditional

**Supported Interactions:**

- Click "Create New Workspace" opens create modal
- Click "Edit" on workspace card opens edit modal
- Click "Delete" opens confirmation dialog
- Saving changes refreshes list

**Validation:**

- Workspace name cannot be empty
- Workspace name max 255 characters
- User must be workspace owner to delete it

**Types:**

- `WorkspaceDto`
- `WorkspaceWithOwnershipInfo` (custom type)
- `WorkspaceMemberWithProfileDto[]`

**Props:**

```typescript
interface WorkspaceManagementSectionProps {
  workspaces: WorkspaceWithOwnershipInfo[];
  currentUserId: string;
  onRefresh: () => Promise<void>;
  onError: (error: string) => void;
}
```

---

### WorkspaceCard (React)

**Description:** Component displaying single workspace. Shows name, member count, edit button (all users) and delete button (owner only).

**Main Elements:**

- Workspace icon or initials
- Workspace name
- Badge with member count
- "Edit" button
- "Delete" button (conditional - visible for owner only)

**Supported Interactions:**

- Click Edit → onEdit callback
- Click Delete → onDelete callback

**Validation:**

- Workspace ID must be valid UUID
- isOwner flag must be boolean

**Types:**

- `WorkspaceWithOwnershipInfo`

**Props:**

```typescript
interface WorkspaceCardProps {
  workspace: WorkspaceWithOwnershipInfo;
  isOwner: boolean;
  onEdit: (workspaceId: string) => void;
  onDelete: (workspaceId: string) => void;
}
```

---

### WorkspaceEditModal (React)

**Description:** Modal for editing existing workspace name. User can change name and save changes.

**Main Elements:**

- Modal dialog/overlay
- Input field with current workspace name
- "Save" button
- "Cancel" button
- Error message display

**Supported Interactions:**

- Text input change
- Click Save → validation → API call → refresh
- Click Cancel → close modal
- Click outside modal → close modal

**Validation:**

- Name cannot be empty
- Name max 255 characters
- Server-side validation (API response)

**Types:**

- `WorkspaceDto`
- `UpdateWorkspaceRequest` (custom type - `{ name: string }`)

**Props:**

```typescript
interface WorkspaceEditModalProps {
  workspace: WorkspaceDto;
  isOpen: boolean;
  onClose: () => void;
  onSave: (workspaceId: string, newName: string) => Promise<void>;
  isLoading?: boolean;
}
```

**Note:** Endpoint `PATCH /workspaces/:workspace_id` is not defined in API plan. Requires implementation.

---

### WorkspaceCreateModal (React)

**Description:** Modal for creating new workspace. User enters name and creates workspace.

**Main Elements:**

- Modal dialog/overlay
- Input field for new workspace name
- "Create" button
- "Cancel" button
- Error message display

**Supported Interactions:**

- Text input change
- Click Create → validation → API call → refresh
- Click Cancel → close modal
- Click outside modal → close modal

**Validation:**

- Name cannot be empty
- Name max 255 characters
- Server-side validation (API response)

**Types:**

- `CreateWorkspaceRequest` (already exists in types.ts)
- `WorkspaceDto` (response)

**Props:**

```typescript
interface WorkspaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  isLoading?: boolean;
}
```

---

### ThemeToggle (React)

**Description:** Component for switching between light, dark, and system theme modes. Setting is persistent in localStorage.

**Main Elements:**

- Radio buttons or segmented control with options: Light, Dark, System
- Icons representing each mode
- Currently selected mode is highlighted

**Supported Interactions:**

- Click on option changes theme
- Change applies immediately to document
- Setting is persistent in localStorage

**Validation:**

- Only valid theme values: 'light' | 'dark' | 'system'

**Types:**

```typescript
type ThemeMode = "light" | "dark" | "system";
```

**Props:**

```typescript
interface ThemeToggleProps {
  currentTheme: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}
```

---

### ExportDataButton (React)

**Description:** Button for exporting all boxes from current workspace to CSV file (Post-MVP).

**Main Elements:**

- Button with download icon
- Loading spinner during export
- Tooltip with action description

**Supported Interactions:**

- Click → API call to export
- CSV file download
- Display loading state during download

**Validation:**

- Workspace ID must be valid UUID
- User must have access to workspace

**Types:**

- `GetBoxesQuery` (for request parameters)

**Props:**

```typescript
interface ExportDataButtonProps {
  workspaceId: string;
  isLoading?: boolean;
  onError?: (error: string) => void;
}
```

**Note:** Endpoint `GET /export/inventory` is defined in API plan but as Post-MVP feature. May be in development phase or placeholder.

---

### DangerZoneSection (React)

**Description:** Section containing dangerous operations (workspace deletion, account deletion). Visually distinguished as risk zone.

**Main Elements:**

- Section header ("Danger Zone")
- "Delete Workspace" button (conditional - visible for workspace owner only)
- "Delete Account" button
- Text warnings

**Supported Interactions:**

- Click Delete Workspace → open ConfirmationDialog
- Click Delete Account → open ConfirmationDialog

**Validation:**

- User must be workspace owner to delete workspace (RLS enforcement)
- Each destructive action requires confirmation

**Types:**

- `WorkspaceWithOwnershipInfo`

**Props:**

```typescript
interface DangerZoneSectionProps {
  currentWorkspace: WorkspaceWithOwnershipInfo;
  currentUserId: string;
  onDeleteWorkspace: () => void;
  onDeleteAccount: () => void;
}
```

---

### ConfirmationDialog (React)

**Description:** Generic modal for confirming destructive actions. Requires user to type confirmation text to prevent accidental clicks.

**Main Elements:**

- Modal overlay with dimmed background
- Dialog title
- Action description
- Confirmation text (bold)
- Input field for confirmation
- "Confirm" button (disabled until text matches)
- "Cancel" button
- Error message display

**Supported Interactions:**

- Type text in input field
- Real-time validation - "Confirm" button enabled when text matches
- Click "Confirm" → API call
- Click "Cancel" → close dialog
- Click outside → close dialog

**Validation:**

- User-typed text must exactly match expectedConfirmText (case-sensitive)
- "Confirm" button disabled until validation passes
- Visual feedback on text correctness

**Types:**

```typescript
interface ConfirmationDialogState {
  inputValue: string;
  isValid: boolean;
  expectedText: string;
}
```

**Props:**

```typescript
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string; // text user must type (e.g "DELETE ACCOUNT")
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isDangerous?: boolean; // visualization (red button)
}
```

---

### LogoutButton (React)

**Description:** Button to logout user. Clears session and redirects to login page.

**Main Elements:**

- Button with logout icon
- Optional confirmation (simple click or modal)

**Supported Interactions:**

- Click → Supabase logout call
- Clear session
- Redirect to /login

**Validation:**

- Session must exist for logout to be meaningful

**Types:** None specific

**Props:**

```typescript
interface LogoutButtonProps {
  onLogout?: () => Promise<void>;
  isLoading?: boolean;
}
```

## 5. Types

### Existing Types (from types.ts)

```typescript
export type ProfileDto = Tables<"profiles">; // { id, email, full_name, avatar_url, created_at, updated_at }
export type WorkspaceDto = Tables<"workspaces">; // { id, owner_id, name, created_at, updated_at }
export type WorkspaceMemberDto = Tables<"workspace_members">; // { user_id, workspace_id, role, joined_at }
export type WorkspaceMemberWithProfileDto extends WorkspaceMemberDto {
  profile: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}
export type CreateWorkspaceRequest = Pick<WorkspaceDto, "name">;
export type UserRole = "owner" | "admin" | "member" | "read_only";
```

### New Types to Implement

```typescript
/**
 * Workspace with additional owner information
 */
export interface WorkspaceWithOwnershipInfo extends WorkspaceDto {
  isOwner: boolean;
  memberCount: number;
  role: UserRole;
}

/**
 * Request to update workspace
 */
export interface UpdateWorkspaceRequest {
  name: string;
}

/**
 * Response from workspace update
 */
export interface UpdateWorkspaceResponse {
  id: string;
  name: string;
  updated_at: string | null;
}

/**
 * Confirmation dialog state
 */
export interface ConfirmationDialogState {
  isOpen: boolean;
  confirmationType: "workspace" | "account";
  targetId: string | null;
  inputValue: string;
  expectedConfirmText: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Settings view state
 */
export interface SettingsViewState {
  workspaces: WorkspaceWithOwnershipInfo[];
  currentProfile: ProfileDto | null;
  selectedWorkspaceForEdit: WorkspaceDto | null;
  isCreateWorkspaceModalOpen: boolean;
  isEditWorkspaceModalOpen: boolean;
  isDeleteConfirmationOpen: boolean;
  deleteConfirmationType: "workspace" | "account";
  deleteTargetId: string | null;
  isLoading: Record<string, boolean>;
  error: string | null;
  successMessage: string | null;
  theme: "light" | "dark" | "system";
}

/**
 * Type for tracking loading state of specific operations
 */
export type OperationType =
  | "fetchProfile"
  | "fetchWorkspaces"
  | "createWorkspace"
  | "updateWorkspace"
  | "deleteWorkspace"
  | "deleteAccount"
  | "exportData"
  | "logout";

/**
 * Theme mode type
 */
export type ThemeMode = "light" | "dark" | "system";
```

## 6. State Management

### Custom Hook: `useSettingsView`

**Purpose:** Centralize management of entire Settings view state and API interactions.

**State:**

```typescript
const [state, setState] = useState<SettingsViewState>({
  workspaces: [],
  currentProfile: null,
  selectedWorkspaceForEdit: null,
  isCreateWorkspaceModalOpen: false,
  isEditWorkspaceModalOpen: false,
  isDeleteConfirmationOpen: false,
  deleteConfirmationType: "workspace",
  deleteTargetId: null,
  isLoading: {},
  error: null,
  successMessage: null,
  theme: "system",
});
```

**Functions:**

- `fetchData()` - Fetches profile and workspaces on load
- `createWorkspace(name)` - Creates new workspace
- `updateWorkspace(id, name)` - Updates workspace name
- `deleteWorkspace(id)` - Deletes workspace
- `deleteAccount()` - Deletes user account and all data
- `exportData(workspaceId)` - Exports data to CSV
- `setLoading(operation, value)` - Setter for loading state
- `setError(message)` - Setter for error message
- `clearError()` - Clears error message
- `openCreateModal()`, `closeCreateModal()` - Modal state
- `openEditModal(workspace)`, `closeEditModal()` - Modal state
- `openDeleteConfirmation(type, id)`, `closeDeleteConfirmation()` - Dialog state

**Usage:**

```typescript
const { state, fetchData, createWorkspace, setError, ... } = useSettingsView(currentUserId);

useEffect(() => {
  fetchData();
}, []);
```

---

### Custom Hook: `useTheme`

**Purpose:** Manage theme selection and localStorage persistence.

**State:**

- `currentTheme: ThemeMode`

**Functions:**

- `getTheme()` - Gets current theme from localStorage or system preference
- `setTheme(theme)` - Sets theme and applies it to DOM
- `applyTheme(theme)` - Applies CSS classes to documentElement

**Usage:**

```typescript
const { currentTheme, setTheme } = useTheme();

// Apply theme changes
useEffect(() => {
  const htmlElement = document.documentElement;
  if (currentTheme === "dark") {
    htmlElement.classList.add("dark");
  } else {
    htmlElement.classList.remove("dark");
  }
}, [currentTheme]);
```

---

### Custom Hook: `useConfirmationDialog`

**Purpose:** Manage confirmation dialog state (input value, validation, loading).

**State:**

- `inputValue: string`
- `isValid: boolean`
- `isLoading: boolean`

**Functions:**

- `setInputValue(value)` - Update input value and validate
- `resetState()` - Reset dialog to initial state
- `validateInput(input, expected)` - Case-sensitive comparison

**Usage:**

```typescript
const { inputValue, isValid, setInputValue } = useConfirmationDialog();

// Render input
<input
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value, "DELETE ACCOUNT")}
/>
```

---

### Nano Store (if global state needed)

Not required for this view, but theme preference could be globally persistent:

```typescript
import { atom } from "nanostores";

export const themeStore = atom<ThemeMode>("system");
```

## 7. API Integration

### Endpoint: `GET /profiles/me`

**Purpose:** Fetch current user information

**Request Type:** HTTP GET

**URL:** `/api/profiles/me`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:** None

**Response (200 OK):**

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

**Error Responses:**

- 401 Unauthorized: Missing/invalid token
- 404 Not Found: Profile not found (edge case)
- 500 Internal Server Error: Database error

**Implementation:**

```typescript
const response = await fetch("/api/profiles/me", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

if (!response.ok) throw new Error("Failed to fetch profile");
const profile = (await response.json()) as ProfileDto;
```

---

### Endpoint: `GET /workspaces`

**Purpose:** Fetch list of workspaces user belongs to

**Request Type:** HTTP GET

**URL:** `/api/workspaces`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:** None

**Response (200 OK):**

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

**Error Responses:**

- 401 Unauthorized: Missing/invalid token
- 500 Internal Server Error: Database error

**Implementation:**

```typescript
const response = await fetch("/api/workspaces", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

if (!response.ok) throw new Error("Failed to fetch workspaces");
const workspaces = (await response.json()) as WorkspaceDto[];
```

---

### Endpoint: `POST /workspaces`

**Purpose:** Create new workspace

**Request Type:** HTTP POST

**URL:** `/api/workspaces`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "New Workspace"
}
```

**Validation:**

- `name`: Non-empty string, max 255 characters

**Response (201 Created):**

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "name": "New Workspace",
  "created_at": "2023-10-27T10:05:00Z",
  "updated_at": "2023-10-27T10:05:00Z"
}
```

**Error Responses:**

- 400 Bad Request: Missing/invalid `name`
- 401 Unauthorized: Missing/invalid token
- 500 Internal Server Error: Database error

**Implementation:**

```typescript
const response = await fetch("/api/workspaces", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "New Workspace" }),
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || "Failed to create workspace");
}
const newWorkspace = (await response.json()) as WorkspaceDto;
```

---

### Endpoint: `PATCH /workspaces/:workspace_id` (NOT DEFINED IN API PLAN)

**Status:** Requires implementation

**Purpose:** Update workspace (name, description)

**Request Type:** HTTP PATCH

**URL:** `/api/workspaces/:workspace_id`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Updated Workspace Name"
}
```

**Expected Response (200 OK):**

```json
{
  "id": "uuid",
  "name": "Updated Workspace Name",
  "updated_at": "2023-10-27T10:10:00Z"
}
```

**Expected Error Responses:**

- 400 Bad Request: Invalid data
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner
- 404 Not Found: Workspace not found
- 500 Internal Server Error: Database error

---

### Endpoint: `DELETE /workspaces/:workspace_id` (NOT DEFINED IN API PLAN)

**Status:** Requires implementation

**Purpose:** Delete workspace (owner only)

**Request Type:** HTTP DELETE

**URL:** `/api/workspaces/:workspace_id`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:** None

**Expected Response (200 OK):**

```json
{
  "message": "Workspace deleted successfully"
}
```

**Expected Error Responses:**

- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not owner
- 404 Not Found: Workspace not found
- 500 Internal Server Error: Database error

---

### Endpoint: `GET /workspaces/:workspace_id/members`

**Purpose:** Fetch workspace members (to determine owner)

**Request Type:** HTTP GET

**URL:** `/api/workspaces/:workspace_id/members`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:** None

**Response (200 OK):**

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

**Error Responses:**

- 401 Unauthorized: Not authenticated
- 404 Not Found: Workspace not found
- 500 Internal Server Error: Database error

**Implementation:**

```typescript
const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

if (!response.ok) throw new Error("Failed to fetch members");
const members = (await response.json()) as WorkspaceMemberWithProfileDto[];
const isOwner = members.some((m) => m.user_id === currentUserId && m.role === "owner");
```

---

### Endpoint: `DELETE /auth/delete-account`

**Purpose:** Delete user account and all associated data

**Request Type:** HTTP DELETE

**URL:** `/api/auth/delete-account`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:** None

**Response (200 OK):**

```json
{
  "message": "Account successfully deleted."
}
```

**Error Responses:**

- 401 Unauthorized: Not authenticated
- 500 Internal Server Error: Database error

**Implementation:**

```typescript
const response = await fetch("/api/auth/delete-account", {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

if (!response.ok) throw new Error("Failed to delete account");
// Redirect to login
window.location.href = "/login";
```

---

### Endpoint: `GET /export/inventory`

**Status:** Post-MVP - may be placeholder

**Purpose:** Export all boxes to CSV

**Request Type:** HTTP GET

**URL:** `/api/export/inventory?workspace_id=:workspace_id`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**

- `workspace_id` (required): UUID

**Response (200 OK):**

- Content-Type: `text/csv`
- Body: CSV file content

**Error Responses:**

- 400 Bad Request: Missing workspace_id
- 401 Unauthorized: Not authenticated
- 500 Internal Server Error: Database error

**Implementation:**

```typescript
const response = await fetch(`/api/export/inventory?workspace_id=${workspaceId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

if (!response.ok) throw new Error("Failed to export data");
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);
document.body.removeChild(a);
```

## 8. User Interactions

| #   | Interaction                  | Component                  | Expected Result                                      | Flow                                                    |
| --- | ---------------------------- | -------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| 1   | Page load `/app/settings`    | SettingsView               | Fetches profile and workspaces, displays settings    | useEffect hooks, API calls                              |
| 2   | Display user email           | ProfileHeader              | Email from database displayed in header              | ProfileDto.email                                        |
| 3   | Click "Create New Workspace" | WorkspaceManagementSection | Opens WorkspaceCreateModal                           | State toggle, modal visibility                          |
| 4   | Type workspace name          | WorkspaceCreateModal       | Input value changes, Zod validation                  | Input handler, validation                               |
| 5   | Click "Create"               | WorkspaceCreateModal       | POST /workspaces → workspace added to list           | API call, list refresh                                  |
| 6   | Error on create              | WorkspaceCreateModal       | Error message shown, modal remains open              | Error state, conditional render                         |
| 7   | Click "Edit" on workspace    | WorkspaceCard              | Opens WorkspaceEditModal with current name           | onEdit callback, modal state                            |
| 8   | Change workspace name        | WorkspaceEditModal         | Input value changes                                  | Input handler                                           |
| 9   | Click "Save"                 | WorkspaceEditModal         | PATCH /workspaces/:id → workspace updated            | API call, list refresh (endpoint implementation needed) |
| 10  | Click "Delete" (owner only)  | WorkspaceCard              | Opens ConfirmationDialog                             | onDelete callback, dialog state                         |
| 11  | Type confirmation text       | ConfirmationDialog         | Input field validates text real-time, button toggles | Input handler, validation                               |
| 12  | Confirm delete               | ConfirmationDialog         | DELETE /workspaces/:id → workspace deleted           | API call, list refresh (endpoint implementation needed) |
| 13  | Click "Cancel"               | Modal                      | Modal closes                                         | onClose callback                                        |
| 14  | Switch theme to "Dark"       | ThemeToggle                | Dark mode applied to entire app                      | setTheme, DOM manipulation                              |
| 15  | Switch theme to "System"     | ThemeToggle                | Uses system preference, persists in localStorage     | getPreferredColorScheme, localStorage                   |
| 16  | Click "Export Data"          | ExportDataButton           | GET /export/inventory → CSV file downloaded          | API call, file download                                 |
| 17  | Export with no boxes         | ExportDataButton           | CSV file empty or informational                      | Response handling                                       |
| 18  | Click "Delete Account"       | DangerZoneSection          | Opens ConfirmationDialog with warning                | Dialog state, special styling                           |
| 19  | Type "DELETE ACCOUNT"        | ConfirmationDialog         | Text must match exactly (case-sensitive)             | Validation logic                                        |
| 20  | Confirm account deletion     | ConfirmationDialog         | DELETE /auth/delete-account → redirect to /login     | API call, session cleanup, redirect                     |
| 21  | Click "Logout"               | LogoutButton               | Supabase logout → redirect to /login                 | Session cleanup, redirect                               |
| 22  | Network error                | Any component              | Error message shown, retry option                    | Error boundary, error state                             |
| 23  | 401 Unauthorized             | Any component              | Redirect to /login (token expired)                   | Middleware, auth check                                  |
| 24  | Scroll to bottom             | SettingsView               | Danger Zone section visible                          | Scroll, responsive layout                               |

## 9. Conditions and Validation

### Authentication Conditions

**Condition:** User must be authenticated

- **Verification:** Astro middleware checks JWT token in cookie
- **Components Affected:** All components in SettingsView
- **Impact:** Unauthenticated users cannot access `/app/settings` - middleware redirects to `/login`
- **Implementation:**
  ```typescript
  const session = locals.session;
  if (!session?.user) {
    return redirect("/login");
  }
  ```

### Workspace Management Conditions

**Condition 1: User is workspace owner**

- **Verification:** `members.find(m => m.user_id === currentUserId)?.role === "owner"`
- **Components Affected:** WorkspaceCard, DangerZoneSection
- **Impact:** Only owner sees "Delete" button on workspace
- **Implementation:**
  ```typescript
  const isOwner = members.some((m) => m.user_id === currentUserId && m.role === "owner");
  if (!isOwner) {
    deleteButton.style.display = "none";
  }
  ```

**Condition 2: Workspace name cannot be empty**

- **Verification:** Client-side: `name.trim().length > 0`, Server-side: Zod schema in API
- **Components Affected:** WorkspaceCreateModal, WorkspaceEditModal
- **Impact:** "Create"/"Save" button disabled while name is empty
- **Implementation:**
  ```typescript
  const isNameValid = name.trim().length > 0 && name.length <= 255;
  <button disabled={!isNameValid}>Save</button>
  ```

**Condition 3: Workspace name max 255 characters**

- **Verification:** Client-side: input `maxLength="255"`, Server-side: Zod validation
- **Components Affected:** WorkspaceCreateModal, WorkspaceEditModal
- **Impact:** Input field accepts max 255 characters
- **Implementation:**
  ```typescript
  <input
    maxLength={255}
    onChange={(e) => setName(e.target.value.slice(0, 255))}
  />
  ```

**Condition 4: Workspace ID must be valid UUID**

- **Verification:** URL parameter validation in API
- **Components Affected:** WorkspaceEditModal, Delete operations
- **Impact:** Invalid UUID generates 400 Bad Request
- **Implementation:** Client-side does not send request with invalid ID (UI hides it)

### Theme Management Conditions

**Condition:** Theme must be one of: 'light' | 'dark' | 'system'

- **Verification:** Radio button group restricts options, TypeScript type checking
- **Components Affected:** ThemeToggle
- **Impact:** Invalid theme cannot be set
- **Implementation:**
  ```typescript
  const validThemes = ["light", "dark", "system"] as const;
  if (!validThemes.includes(theme)) {
    theme = "system"; // fallback
  }
  ```

### Confirmation Dialog Conditions

**Condition 1: Confirmation text must be case-sensitive match**

- **Verification:** `inputValue === expectedText` (case-sensitive)
- **Components Affected:** ConfirmationDialog
- **Impact:** "Confirm" button disabled until text exactly matches
- **Implementation:**
  ```typescript
  const isValid = inputValue === "DELETE ACCOUNT"; // case-sensitive
  <button disabled={!isValid}>Delete Account</button>
  ```

**Condition 2: Confirmation dialog must be open**

- **Verification:** `isOpen` state in dialog
- **Components Affected:** ConfirmationDialog
- **Impact:** User cannot confirm action without visible dialog
- **Implementation:** Dialog shown only when `isOpen === true`

### Data Export Conditions

**Condition:** Workspace ID must be valid UUID

- **Verification:** Query parameter validation in API
- **Components Affected:** ExportDataButton
- **Impact:** Invalid ID generates 400 Bad Request
- **Implementation:** Client-side validates workspace ID before request

### RLS (Row Level Security) Conditions

**Condition:** User must be workspace member

- **Verification:** RLS policy in Supabase: `auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = X)`
- **Components Affected:** All workspace operations
- **Impact:** Non-member users get 401/403 (RLS blocks query)
- **Implementation:** Automatically enforced at database level

## 10. Error Handling

### Scenario: Missing Authentication (401 Unauthorized)

**Cause:** JWT token expired, invalid, or missing

**Components Affected:** All API calls

**Handling Strategy:**

1. Catch 401 response status
2. Clear session storage
3. Redirect to `/login` page
4. Display message: "Your session has expired. Please log in again."

```typescript
if (response.status === 401) {
  sessionStorage.clear();
  window.location.href = "/login";
  throw new Error("Session expired");
}
```

---

### Scenario: Missing Permissions (403 Forbidden)

**Cause:** User is not workspace owner, attempting operation requiring specific role

**Components Affected:** Delete workspace, update member role

**Handling Strategy:**

1. Catch 403 response status
2. Display error message
3. Keep modal/dialog open for retry
4. Disable problematic action button

```typescript
if (response.status === 403) {
  setError("You don't have permission to perform this action");
  return;
}
```

---

### Scenario: Workspace Not Found (404 Not Found)

**Cause:** Workspace deleted by another user, invalid ID

**Components Affected:** WorkspaceEditModal, Delete operations

**Handling Strategy:**

1. Catch 404 response status
2. Close modal
3. Refresh workspace list
4. Display toast: "Workspace not found or was deleted"

```typescript
if (response.status === 404) {
  await fetchWorkspaces(); // refresh list
  onClose();
  toast.error("Workspace not found");
}
```

---

### Scenario: Validation Failed (400 Bad Request)

**Cause:** Empty workspace name, exceeds max length, invalid data format

**Components Affected:** WorkspaceCreateModal, WorkspaceEditModal

**Handling Strategy:**

1. Catch 400 response status
2. Parse error details from response
3. Display field-specific error messages
4. Keep modal open for corrections

```typescript
if (response.status === 400) {
  const error = await response.json();
  setFieldErrors(error.details); // { name: "Name cannot be empty" }
  return;
}
```

---

### Scenario: Conflict (409 Conflict)

**Cause:** Duplication (member already in workspace), invalid operation based on state (cannot change last owner role)

**Components Affected:** Workspace operations, member management

**Handling Strategy:**

1. Catch 409 response status
2. Display specific error message based on conflict type
3. Keep modal open or offer retry

```typescript
if (response.status === 409) {
  const error = await response.json();
  setError(error.error); // "Cannot remove the workspace owner"
}
```

---

### Scenario: Server Error (500 Internal Server Error)

**Cause:** Database connection issue, unexpected server error

**Components Affected:** Any API call

**Handling Strategy:**

1. Catch 500 response status
2. Display generic error message
3. Log error for debugging
4. Offer retry button
5. Keep UI in loadable state

```typescript
if (response.status === 500) {
  console.error("Server error:", await response.text());
  setError("An unexpected error occurred. Please try again.");
  setIsLoading(false);
}
```

---

### Scenario: Network Error / Timeout

**Cause:** No internet connection, server not responding, timeout

**Components Affected:** Any API call

**Handling Strategy:**

1. Catch network error (fetch throws)
2. Display error message
3. Offer retry button
4. Do not close modal/dialog to preserve user input

```typescript
try {
  const response = await fetch(...);
} catch (error) {
  setError("Network error. Please check your connection and try again.");
  // retry button visible
}
```

---

### Scenario: Export Data is Empty

**Cause:** Workspace has no boxes

**Components Affected:** ExportDataButton

**Handling Strategy:**

1. Check response content
2. Still download the file (may be empty or headers only)
3. Display info toast: "No data to export"
4. Allow user to close toast and continue

```typescript
const blob = await response.blob();
if (blob.size === 0 || blob.type === "text/csv") {
  toast.info("No boxes found in this workspace");
}
// Still trigger download
```

---

### Scenario: localStorage Not Available (Storage Quota Exceeded)

**Cause:** Device storage full, private browsing mode (Safari), storage permissions denied

**Components Affected:** ThemeToggle

**Handling Strategy:**

1. Try-catch around localStorage access
2. Fall back to in-memory storage (theme resets on refresh)
3. Display warning (optional): "Theme preference couldn't be saved"

```typescript
try {
  localStorage.setItem("theme", theme);
} catch (e) {
  console.warn("localStorage not available, using in-memory storage");
  // theme persists only in component state, not across page reloads
}
```

---

### Scenario: User Cancels Confirmation Dialog

**Cause:** User clicks "Cancel" or clicks outside dialog

**Components Affected:** ConfirmationDialog

**Handling Strategy:**

1. Clear input value
2. Reset dialog state
3. Close dialog
4. Do not perform any API call

```typescript
const handleCancel = () => {
  setInputValue("");
  onCancel();
};
```

---

### Error Boundary Component

Add error boundary for entire view:

```typescript
<ErrorBoundary>
  <SettingsView />
</ErrorBoundary>
```

Handles:

- React render errors
- Unexpected JS errors
- Displays fallback UI
- Log errors to monitoring service

## 11. Implementation Steps

### Phase 1: Setup & Infrastructure

1. **Create Astro page file:** `src/pages/settings.astro`
   - Import container component
   - Setup layout, basic styling
   - Add authentication guard

2. **Create components directory:** `src/components/settings/`
   - Create folder for organization

3. **Add new types to `src/types.ts`:**
   - WorkspaceWithOwnershipInfo
   - UpdateWorkspaceRequest
   - ConfirmationDialogState
   - SettingsViewState
   - ThemeMode type

4. **Create custom hooks:**
   - `src/components/hooks/useSettingsView.ts`
   - `src/components/hooks/useTheme.ts`
   - `src/components/hooks/useConfirmationDialog.ts`

---

### Phase 2: Core Components

5. **Implement ProfileHeader:**
   - Display user email
   - Add LogoutButton
   - Logout functionality (Supabase signOut)

6. **Implement ThemeToggle:**
   - Radio button group with options: Light, Dark, System
   - useEffect hook to apply theme to DOM
   - localStorage persistence
   - useTheme hook integration

7. **Implement WorkspaceCard:**
   - Display workspace name
   - Display member count
   - Edit button (callback based)
   - Delete button (conditional - owner only)
   - Conditional styling for owner status

---

### Phase 3: Workspace Management

8. **Implement WorkspaceManagementSection:**
   - List WorkspaceCard components
   - "Create New Workspace" button
   - useSettingsView hook integration
   - Fetch and display list on mount

9. **Implement WorkspaceCreateModal:**
   - Input field for workspace name
   - Zod validation (client-side)
   - Create button (disabled while loading/invalid)
   - Cancel button, click-outside-to-close
   - Error message display
   - POST /workspaces integration

10. **Implement WorkspaceEditModal:**
    - Pre-fill with current name
    - Input field for new name
    - Zod validation (client-side)
    - Save button (disabled while loading/invalid)
    - Cancel button, click-outside-to-close
    - Error message display
    - PATCH /workspaces/:id integration (endpoint implementation needed)

---

### Phase 4: Confirmation & Danger Zone

11. **Implement ConfirmationDialog:**
    - Modal overlay with styling
    - Title and description props
    - Input field for confirmation text
    - Real-time validation (case-sensitive)
    - Confirm button (disabled until valid)
    - Cancel button
    - isDangerous prop (for red styling)
    - Error message display
    - Loading state handling

12. **Implement DangerZoneSection:**
    - Visual separation (red/warning colors)
    - "Delete Workspace" button (owner only)
    - "Delete Account" button (all users)
    - onClick handlers → open ConfirmationDialog
    - Text warnings

---

### Phase 5: Data Export & Logout

13. **Implement ExportDataButton:**
    - Display button with download icon
    - Loading spinner during fetch
    - GET /export/inventory integration
    - File download handling
    - Error handling (network, empty data)
    - Disabled state if no workspace selected
    - Optional: loading toast

14. **Implement LogoutButton:**
    - Display button with logout icon
    - Supabase signOut() call
    - Clear session
    - Redirect to /login
    - Optional: confirmation dialog before logout

---

### Phase 6: Container & State Management

15. **Implement SettingsView container:**
    - useSettingsView hook initialization
    - Fetch profile and workspaces on mount
    - Determine workspace ownership (fetch members for each workspace)
    - Pass state and callbacks to child components
    - Handle errors and loading states
    - Error boundary wrapper

16. **Finalize useSettingsView hook:**
    - All API integration functions
    - State management (useState + reducers if complex)
    - Error handling and loading states
    - Data refresh logic

---

### Phase 7: Integration & Polish

17. **Create API endpoints (if needed):**
    - `PATCH /api/workspaces/:workspace_id` (edit workspace)
    - `DELETE /api/workspaces/:workspace_id` (delete workspace)
    - Verify POST /workspaces works
    - Verify DELETE /auth/delete-account works

18. **Integrate all components in SettingsView:**
    - Import all child components
    - Setup responsive layout (Tailwind)
    - Add proper spacing and visual hierarchy
    - Test interactions and state flow

19. **Add accessibility features:**
    - ARIA labels on buttons
    - ARIA labels on form fields
    - Proper heading hierarchy
    - Keyboard navigation (Tab, Enter, Esc)
    - Focus management in modals

20. **Add error handling & edge cases:**
    - Network timeouts
    - 401/403/404/500 responses
    - Empty workspace list
    - Last owner protection
    - Member count accuracy

---

### Phase 8: Testing & QA

21. **Manual testing:**
    - Create workspace flow
    - Edit workspace flow
    - Delete workspace flow (owner only)
    - Theme switching and persistence
    - Logout flow
    - Delete account flow
    - Export data flow
    - Error scenarios (401, 403, 404, 500)
    - Network errors

22. **Responsive design testing:**
    - Desktop (1920px, 1440px)
    - Tablet (768px)
    - Mobile (375px)
    - Modals and dialogs responsive
    - Buttons accessible on touch

23. **Accessibility testing:**
    - Keyboard navigation entire flow
    - Screen reader (Voice Over, NVDA)
    - Color contrast
    - Focus visibility
    - Tab order logical

24. **Performance optimization:**
    - Memoize components if needed
    - useCallback for event handlers
    - useMemo for derived state
    - Lazy load modals (optional)
    - Optimize API calls (no redundant fetches)

---

### Phase 9: Finalization

25. **Code cleanup:**
    - Remove console.logs
    - Fix linting errors (npm run lint:fix)
    - Format code (npm run format)
    - Add JSDoc comments where needed

26. **Documentation:**
    - Add comments in complex logic
    - Document custom hooks
    - Update CLAUDE.md if needed
    - Document API integrations

27. **Deployment:**
    - Test build: `npm run build`
    - Test preview: `npm run preview`
    - Deploy to staging
    - Final QA
    - Deploy to production

---

### Implementation Notes

**Critical:** Some endpoints needed for full view functionality are not defined in API plan:

- `PATCH /api/workspaces/:workspace_id` - Required for editing workspace name
- `DELETE /api/workspaces/:workspace_id` - Required for deleting workspace

**Recommendation:** Implement these endpoints before starting view work or defer workspace edit/delete to later version.

**Post-MVP Features:**

- Account deletion (`DELETE /auth/delete-account`) may be placeholder if not implemented in backend
- CSV export (`GET /export/inventory`) may be placeholder if not implemented in backend
- If so, disable these buttons in UI with message: "Coming soon"

**Storage & Persistence:**

- Theme preference: localStorage.setItem("theme", value)
- Session: Handled by Supabase (cookies)
- Other state: In-memory (resets on page reload)
