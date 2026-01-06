# Main Dashboard View Implementation Plan

## 1. Overview

The Main Dashboard is the central navigation point of the Storage & Box Organizer application. The view enables users to browse, search, and manage locations and boxes within their workspace. The interface combines a hierarchical location tree with a box list and live search functionality, allowing users to quickly find desired items without physically opening boxes.

## 2. View Routing

- **Path**: `/app`
- **Component file**: `src/pages/app.astro`
- **Layout**: `src/layouts/MainLayout.astro`
- **Required authentication**: YES (middleware redirect to `/login` if user not authenticated)
- **Workspace scope**: Always associated with current user's `workspace_id` from context

## 3. Component Structure

```
MainDashboard (Astro page: /app)
├── DashboardContainer (React)
│   ├── DashboardHeader
│   │   ├── WorkspaceSelector
│   │   └── UserMenu
│   ├── DashboardContent (Two-column layout)
│   │   ├── LeftPanel
│   │   │   ├── SearchInput
│   │   │   └── LocationTree
│   │   │       └── LocationTreeNode (recursive)
│   │   │           ├── LocationNodeItem
│   │   │           └── LocationContextMenu
│   │   └── RightPanel
│   │       └── BoxListContainer
│   │           ├── BoxListHeader
│   │           ├── BoxList
│   │           │   └── BoxListItem (virtualized)
│   │           │       └── BoxContextMenu
│   │           └── EmptyState
│   │
│   └── Modals/Dialogs (portaled)
│       ├── LocationEditorModal
│       ├── BoxEditorModal
│       └── DeleteConfirmationDialog
```

## 4. Component Details

### DashboardContainer
- **Description**: Main component managing the state of the entire dashboard. Coordinates data fetching from API, manages selected location and search results.
- **Main elements**:
  - DashboardHeader with WorkspaceSelector and UserMenu
  - DashboardContent with two-column layout (desktop) / single-column (mobile)
  - Modal dialogs for editing
  - Error boundary
- **Supported interactions**:
  - Location selection
  - Workspace switching
  - Box search
  - CRUD operations on locations and boxes
- **Validation rules**:
  - User workspace_id verification in logged-in user context
  - RLS validation (enforced automatically by API)
- **Types**: `DashboardState`, `DashboardContextType`
- **Props**: None (Astro component)

### SearchInput
- **Description**: Input field for real-time box search. Implements debouncing and enforces minimum 3 characters for searching.
- **Main elements**:
  - Input field with placeholder "Search boxes..."
  - X button for clearing search
  - Loading indicator (spinner)
  - Result count (optional)
- **Supported interactions**:
  - onChange with debouncing (300ms)
  - onClick on X button
  - onFocus/onBlur for accessibility
- **Validation rules**:
  - Minimum 3 characters for search
  - Trim whitespace
  - Max 200 characters
- **Types**: `SearchQuery`
- **Props**: `{ value: string; onChange: (query: string) => void; isLoading: boolean; onClear: () => void }`

### LocationTree
- **Description**: Hierarchical location tree supporting up to 5 levels of nesting. Renders special "Unassigned" node for boxes without location. Supports context menu for adding, editing, and deleting locations.
- **Main elements**:
  - Recursive LocationTreeNode components
  - Expand/collapse toggle for each node
  - Box count badge next to each location
  - Context menu button (...)
  - "Unassigned" special node at the beginning
- **Supported interactions**:
  - Click on LocationNodeItem = select location
  - Click on expand/collapse = toggle children visibility
  - Right-click or click on ... = show context menu
  - Delete with confirmation
  - Add new location
  - Edit location name/description
- **Validation rules**:
  - Check max 5 levels of nesting
  - Unique names among siblings
  - Soft delete validation (confirmation that boxes move to Unassigned)
  - Loading state
- **Types**: `LocationTreeNode`, `LocationContextMenuAction`
- **Props**: `{ locations: LocationTreeNode[]; selectedLocationId?: string; onSelectLocation: (id: string) => void; onAddLocation: (parentId?: string) => void; onEditLocation: (id: string) => void; onDeleteLocation: (id: string) => void; isLoading: boolean }`

### LocationTreeNode
- **Description**: Recursive component for rendering individual location nodes in hierarchy.
- **Main elements**:
  - Node item with folder icon
  - Expand/collapse button
  - Location name
  - Box count badge
  - Context menu button
- **Supported interactions**:
  - Click to select
  - Expand/collapse logic
  - Context menu access
- **Validation rules**: Inherited from LocationTree
- **Types**: `LocationTreeNode`
- **Props**: `{ node: LocationTreeNode; level: number; isSelected: boolean; onSelect: () => void; onToggleExpand: () => void; onContextMenu: (action: string) => void; onAddChild: () => void }`

### LocationContextMenu
- **Description**: Context menu (dropdown) for each location with options to add, edit, and delete.
- **Main elements**:
  - Menu items (Add sublocation, Edit, Delete)
  - Icons for each action
  - Disabled state for delete (if last location)
- **Supported interactions**:
  - Click on "Add sublocation" → open LocationEditorModal
  - Click on "Edit" → open LocationEditorModal in edit mode
  - Click on "Delete" → show DeleteConfirmationDialog
- **Validation rules**: Soft delete confirmation
- **Types**: None specific
- **Props**: `{ locationId: string; parentId?: string; hasChildren: boolean; onAdd: () => void; onEdit: () => void; onDelete: () => void }`

### BoxListContainer
- **Description**: Container for box list. Manages loading state, handles pagination, and displays empty state.
- **Main elements**:
  - BoxListHeader (with sorting options if available)
  - BoxList (virtualized)
  - EmptyState (when no boxes)
  - Loading skeleton
- **Supported interactions**:
  - Scroll for virtual list
  - Load more (if pagination)
- **Validation rules**: Handles API errors and empty states
- **Types**: `BoxListItem`
- **Props**: `{ boxes: BoxListItem[]; selectedLocationId?: string; searchQuery: string; isLoading: boolean; error?: string; onRefresh: () => void }`

### BoxList
- **Description**: Virtualized box list for performance with large datasets.
- **Main elements**:
  - Virtualized list (react-window or similar)
  - Loading skeleton items
  - Empty state for no results
- **Supported interactions**:
  - Scroll loading
  - Item click → show details / edit
- **Validation rules**: Loading state rendering
- **Types**: `BoxListItem`
- **Props**: `{ items: BoxListItem[]; isLoading: boolean; onSelectBox: (id: string) => void; onEditBox: (id: string) => void; onDeleteBox: (id: string) => void }`

### BoxListItem
- **Description**: Component displaying single box in list. Shows name, location, and quick action buttons.
- **Main elements**:
  - Box name
  - Description preview (truncated)
  - Tags
  - Location breadcrumb
  - QR code short_id
  - Context menu button (...)
  - Hover state with action buttons
- **Supported interactions**:
  - Click on item → show details
  - Right-click → show context menu
  - Click on ... → show context menu
  - Quick action buttons (Edit, Delete)
- **Validation rules**: None specific
- **Types**: `BoxListItem`
- **Props**: `{ box: BoxListItem; isSelected: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void }`

### BoxContextMenu
- **Description**: Context menu for box with options to view, edit, move, and delete.
- **Main elements**:
  - Menu items (View details, Edit, Move, Delete)
  - Icons
  - Danger zone for Delete
- **Supported interactions**:
  - Click on "View details" → navigate to details
  - Click on "Edit" → open BoxEditorModal
  - Click on "Move" → open LocationSelector
  - Click on "Delete" → show DeleteConfirmationDialog
- **Validation rules**: None specific
- **Types**: None specific
- **Props**: `{ boxId: string; onViewDetails: () => void; onEdit: () => void; onMove: () => void; onDelete: () => void }`

### EmptyState
- **Description**: Welcome component for new users without boxes or with no search results. Contains CTA buttons to add location or box.
- **Main elements**:
  - Illustration / icon
  - Headline
  - Description text
  - CTA buttons (Create location, Add box manually, Scan QR)
- **Supported interactions**:
  - Click on "Create location" → open LocationEditorModal
  - Click on "Add box manually" → open BoxEditorModal
  - Click on "Scan QR" → trigger camera
- **Validation rules**: None specific
- **Types**: None specific
- **Props**: `{ type: 'empty-workspace' | 'no-results'; onAddLocation?: () => void; onAddBox?: () => void; onScanQr?: () => void }`

### LocationEditorModal
- **Description**: Modal dialog for creating new location or editing existing one. Supports hierarchical parent location selection.
- **Main elements**:
  - Form fields: name (required), description (optional)
  - Parent location selector (dropdown / tree picker)
  - Real-time validation (unique name, max depth)
  - Submit/Cancel buttons
  - Error messages
- **Supported interactions**:
  - onChange on input fields
  - onChange on parent selector
  - onClick on Submit → POST /locations or PATCH /locations/:id
  - onClick on Cancel → close modal
- **Validation rules**:
  - Name required, max 255 chars
  - Description optional, max 1000 chars
  - Parent location valid
  - Max depth check (level 5)
  - Sibling name uniqueness
- **Types**: `CreateLocationRequest`, `LocationTreeNode`
- **Props**: `{ isOpen: boolean; mode: 'create' | 'edit'; parentLocationId?: string; initialValues?: Partial<LocationDto>; onSubmit: (data: CreateLocationRequest) => void; onClose: () => void; isLoading: boolean }`

### BoxEditorModal
- **Description**: Modal dialog for creating new box or editing existing one. Supports adding description, tags, and assigning location.
- **Main elements**:
  - Form fields: name (required), description (optional, max 10k chars), tags (array), location_id (optional)
  - QR code assignment (optional, select from free codes list)
  - Location selector (dropdown / tree picker)
  - Rich text editor for description (optional)
  - Submit/Cancel buttons
  - Error messages
  - Character counter for description
- **Supported interactions**:
  - onChange on input fields
  - onChange on location selector
  - onChange on tags (add/remove)
  - onChange on description
  - onClick on Submit → POST /boxes or PATCH /boxes/:id
  - onClick on Cancel → close modal
- **Validation rules**:
  - Name required, max 255 chars
  - Description optional, max 10000 chars (per API spec)
  - Tags array, each max 50 chars
  - Location valid (if selected)
  - QR code not already assigned (if selected)
- **Types**: `CreateBoxRequest`, `UpdateBoxRequest`, `BoxListItem`
- **Props**: `{ isOpen: boolean; mode: 'create' | 'edit'; selectedLocationId?: string; initialValues?: Partial<BoxDto>; onSubmit: (data: CreateBoxRequest | UpdateBoxRequest) => void; onClose: () => void; isLoading: boolean; error?: string }`

### DeleteConfirmationDialog
- **Description**: Generic confirmation dialog for deleting locations or boxes. Requires user confirmation.
- **Main elements**:
  - Headline
  - Description (informs user about consequences)
  - Warning message (e.g., "This action is irreversible")
  - Cancel / Delete buttons
  - Danger styling on Delete button
- **Supported interactions**:
  - Click on Cancel → close dialog
  - Click on Delete → trigger deletion API call
- **Validation rules**: None specific (confirmation is validation itself)
- **Types**: None specific
- **Props**: `{ isOpen: boolean; type: 'location' | 'box'; title: string; description: string; itemName: string; warning?: string; isLoading: boolean; onConfirm: () => void; onCancel: () => void }`

### WorkspaceSelector
- **Description**: Dropdown for workspace selection (if user belongs to more than one).
- **Main elements**:
  - Current workspace name / badge
  - Dropdown menu with list of workspaces
  - Select button for each workspace
- **Supported interactions**:
  - Click on workspace → switch workspace
- **Validation rules**: User membership check (RLS)
- **Types**: `WorkspaceDto`
- **Props**: `{ currentWorkspaceId: string; workspaces: WorkspaceDto[]; onSelectWorkspace: (id: string) => void }`

### UserMenu
- **Description**: Menu with user options (Settings, Logout).
- **Main elements**:
  - Avatar / user icon
  - Dropdown menu
  - User email
  - Settings link
  - Logout button
- **Supported interactions**:
  - Click on avatar → toggle menu
  - Click on Settings → navigate
  - Click on Logout → trigger logout
- **Validation rules**: None specific
- **Types**: `ProfileDto`
- **Props**: `{ user: ProfileDto; onLogout: () => void }`

## 5. Types

### DashboardState
```typescript
interface DashboardState {
  // Workspace context
  currentWorkspaceId: string;
  userWorkspaces: WorkspaceDto[];

  // Location selection and hierarchy
  selectedLocationId: string | null; // null = "Unassigned"
  locations: LocationTreeNode[];
  expandedLocationIds: Set<string>; // Track which nodes are expanded

  // Search state
  searchQuery: string;
  searchResults: BoxListItem[];
  isSearchActive: boolean;

  // Boxes data
  boxes: BoxListItem[];
  totalBoxesCount: number;

  // Loading states
  isLoadingLocations: boolean;
  isLoadingBoxes: boolean;
  isLoadingWorkspaces: boolean;

  // UI state
  selectedBoxId: string | null;
  activeModal: 'location-editor' | 'box-editor' | 'delete-confirm' | null;
  modalData: {
    mode: 'create' | 'edit';
    itemId?: string;
    parentId?: string;
    itemType?: 'location' | 'box';
  };

  // Error handling
  error: string | null;
  lastError: { message: string; timestamp: number } | null;
}
```

### LocationTreeNode
```typescript
interface LocationTreeNode {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  path: string; // ltree path as string (e.g., "root.basement.shelf_a")
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;

  // ViewModel fields
  boxCount: number;
  isExpanded: boolean;
  isLoading: boolean;
  level: number; // Nesting level for validation
  children?: LocationTreeNode[];
}
```

### BoxListItem
```typescript
interface BoxListItem {
  // From API
  id: string;
  short_id: string;
  workspace_id: string;
  location_id: string | null;
  name: string;
  description: string | null;
  tags: string[] | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;

  // Nested data from API
  location?: {
    id: string;
    name: string;
    path: string;
  } | null;

  qr_code?: {
    id: string;
    short_id: string; // Format: QR-XXXXXX
  } | null;

  // ViewModel fields
  isLoading?: boolean;
  isSelected?: boolean;
  isHovering?: boolean;
}
```

### SearchQuery
```typescript
interface SearchQuery {
  query: string;
  workspaceId: string;
  locationId?: string | null; // Can be filtered to specific location
  minChars: number; // Minimum 3 characters
  debounceMs: number; // 300ms default
}
```

### DashboardContextType
```typescript
interface DashboardContextType {
  state: DashboardState;
  actions: {
    selectLocation: (locationId: string | null) => void;
    expandLocation: (locationId: string) => void;
    collapseLocation: (locationId: string) => void;
    setSearchQuery: (query: string) => void;
    clearSearch: () => void;

    openLocationEditor: (mode: 'create' | 'edit', parentId?: string, itemId?: string) => void;
    closeLocationEditor: () => void;
    submitLocationEditor: (data: CreateLocationRequest) => Promise<void>;

    openBoxEditor: (mode: 'create' | 'edit', itemId?: string) => void;
    closeBoxEditor: () => void;
    submitBoxEditor: (data: CreateBoxRequest | UpdateBoxRequest) => Promise<void>;

    deleteLocation: (locationId: string) => Promise<void>;
    deleteBox: (boxId: string) => Promise<void>;

    switchWorkspace: (workspaceId: string) => Promise<void>;

    refetchLocations: (parentId?: string) => Promise<void>;
    refetchBoxes: () => Promise<void>;

    setError: (error: string | null) => void;
  };
}
```

### LocationContextMenuAction
```typescript
type LocationContextMenuAction = 'add' | 'edit' | 'delete';
```

### EmptyStateType
```typescript
type EmptyStateType = 'empty-workspace' | 'no-results' | 'no-locations';
```

## 6. State Management

### Global State (Nano Store)

Use Nano Stores for global data not sensitive to component re-renders:

```typescript
// stores/dashboard.ts
import { atom } from 'nanostores';

export const currentWorkspaceId = atom<string | null>(null);
export const selectedLocationId = atom<string | null>(null);
export const searchQuery = atom<string>('');
export const expandedLocationIds = atom<Set<string>>(new Set());
```

### Context API (React)

Create DashboardContext for managing actions and more complex state:

```typescript
// contexts/DashboardContext.ts
import React from 'react';

export const DashboardContext = React.createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}
```

### Component-Level State

Use `useState` for:
- Modal visibility state
- Form input state
- Loading states for individual components
- UI states (hover, focus, selection)

### Custom Hooks

**useWorkspaces():**
```typescript
function useWorkspaces() {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetch() {
      try {
        const res = await fetch('/api/workspaces');
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setWorkspaces(data);
        if (data.length > 0 && !currentWorkspaceId.get()) {
          currentWorkspaceId.set(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch workspaces');
      } finally {
        setIsLoading(false);
      }
    }

    fetch();
  }, []);

  return { workspaces, isLoading, error };
}
```

**useLocations(workspaceId, parentId?):**
```typescript
function useLocations(workspaceId: string, parentId?: string | null) {
  const [locations, setLocations] = React.useState<LocationTreeNode[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetch = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (parentId) params.set('parent_id', parentId);

      const res = await fetch(`/api/locations?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      // Transform to LocationTreeNode
      const nodes = data.map((loc: LocationDto) => ({
        ...loc,
        boxCount: 0, // Will be set from boxes data
        isExpanded: false,
        isLoading: false,
        level: loc.path.split('.').length - 1,
      }));

      setLocations(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, parentId]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  return { locations, isLoading, error, refetch: fetch };
}
```

**useBoxes(workspaceId, locationId?, searchQuery?):**
```typescript
function useBoxes(
  workspaceId: string,
  locationId?: string | null,
  searchQuery?: string
) {
  const [boxes, setBoxes] = React.useState<BoxListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Debounced search query
  const debouncedQuery = useDebounce(searchQuery, 300);

  const fetch = React.useCallback(async () => {
    if (debouncedQuery && debouncedQuery.length < 3) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (locationId) params.set('location_id', locationId);
      if (locationId === null && !debouncedQuery) {
        // "Unassigned" case
        params.set('is_assigned', 'false');
      }

      const res = await fetch(`/api/boxes?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      setBoxes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boxes');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, locationId, debouncedQuery]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  return { boxes, isLoading, error, refetch: fetch };
}
```

**useDebounce(value, delay):**
```typescript
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}
```

## 7. API Integration

### Endpoints Used in Main Dashboard

#### 1. GET /profiles/me
- **When**: On page load (middleware/layout)
- **Request type**: No body
- **Response type**: `ProfileDto`
- **Purpose**: Fetch logged-in user data for UserMenu display
- **Error handling**: 401 → redirect to /login

#### 2. GET /workspaces
- **When**: On DashboardContainer load
- **Request type**: No parameters (user from context)
- **Response type**: `WorkspaceDto[]`
- **Purpose**: Fetch list of workspaces for WorkspaceSelector
- **Error handling**: 401 → redirect, others → error message

#### 3. GET /locations
- **When**:
  - On page load (parent_id = null for root)
  - On click expand on LocationTreeNode
  - After adding/editing location (refetch)
- **Request type**: Query params: `workspace_id` (required), `parent_id` (optional)
- **Response type**: `LocationDto[]`
- **Transformation**: Convert to `LocationTreeNode[]` with boxCount = 0 (count from boxes)
- **Error handling**: 401 → redirect, 403 → error, 404 → remove from tree

#### 4. POST /locations
- **When**: Submit LocationEditorModal in create mode
- **Request type**: `CreateLocationRequest`
```json
{
  "workspace_id": "uuid",
  "name": "string (1-255 chars)",
  "description": "string (optional, 0-1000 chars)",
  "parent_id": "uuid (optional)"
}
```
- **Response type**: `LocationDto`
- **Error handling**:
  - 400 → form validation error
  - 409 → sibling conflict error
  - 401 → redirect
  - 403 → permission error
  - 404 → parent not found

#### 5. PATCH /locations/:id
- **When**: Submit LocationEditorModal in edit mode
- **Request type**: URL param `id`, body: `UpdateLocationRequest`
```json
{
  "name": "string (optional)",
  "description": "string (optional)"
}
```
- **Response type**: `UpdateLocationResponse`
- **Error handling**: 400 → validation, 401 → unauthorized, 404 → not found

#### 6. DELETE /locations/:id
- **When**: Confirm Delete in LocationContextMenu
- **Request type**: URL param `id`
- **Response type**: `{ message: string }`
- **Error handling**:
  - 400 → invalid UUID
  - 401 → unauthorized
  - 404 → not found
  - 500 → server error
- **Effect**: Boxes in location move to "Unassigned", location removed from tree

#### 7. GET /boxes
- **When**:
  - On page load
  - On location selection (location_id query param)
  - On SearchInput typing (q query param, min 3 chars)
  - After adding/editing/deleting box (refetch)
- **Request type**: Query params: `workspace_id` (required), `q` (optional), `location_id` (optional), `is_assigned` (optional), `limit` (optional, default 50), `offset` (optional, default 0)
- **Response type**: `BoxDto[]` (which extends to `BoxListItem[]`)
- **Error handling**: 400 → validation, 401 → redirect, 500 → error

#### 8. POST /boxes
- **When**: Submit BoxEditorModal in create mode
- **Request type**: `CreateBoxRequest`
```json
{
  "workspace_id": "uuid",
  "name": "string (1-255 chars)",
  "description": "string (optional, 0-10000 chars)",
  "tags": ["string[]"] (optional),
  "location_id": "uuid (optional)",
  "qr_code_id": "uuid (optional)"
}
```
- **Response type**: `CreateBoxResponse`
- **Error handling**:
  - 400 → validation error
  - 409 → QR code already assigned
  - 401 → unauthorized
  - 403 → permission error
  - 404 → location/QR not found

#### 9. PATCH /boxes/:id
- **When**: Submit BoxEditorModal in edit mode
- **Request type**: URL param `id`, body: `UpdateBoxRequest`
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "tags": ["string[]"] (optional),
  "location_id": "uuid (optional)"
}
```
- **Response type**: `UpdateBoxResponse`
- **Error handling**: 400 → validation, 401 → unauthorized, 404 → not found

#### 10. DELETE /boxes/:id
- **When**: Confirm Delete in BoxContextMenu
- **Request type**: URL param `id`
- **Response type**: `{ message: string }`
- **Error handling**: 401 → unauthorized, 404 → not found
- **Effect**: Box deleted, QR code returns to "generated" status

### API Integration Flow

```
Page Load
  ├─ GET /profiles/me → ProfileDto (UserMenu)
  ├─ GET /workspaces → WorkspaceDto[] (WorkspaceSelector)
  └─ GET /locations?workspace_id=... → LocationDto[] → LocationTreeNode[] (LocationTree)
     └─ GET /boxes?workspace_id=... → BoxDto[] → BoxListItem[] (BoxList)

User selects location
  ├─ Update selectedLocationId in store
  └─ GET /boxes?workspace_id=...&location_id=... → BoxListItem[]

User types in SearchInput
  ├─ Debounce 300ms
  ├─ If length >= 3:
  │  └─ GET /boxes?workspace_id=...&q=<query> → BoxListItem[]
  └─ If length < 3:
     └─ GET /boxes?workspace_id=...&location_id=... (restore filtered list)

User submits LocationEditorModal (create)
  ├─ POST /locations → LocationDto
  ├─ Transform to LocationTreeNode
  └─ Refetch: GET /locations?workspace_id=...&parent_id=<parent>

User submits LocationEditorModal (edit)
  ├─ PATCH /locations/:id → UpdateLocationResponse
  └─ Refetch: GET /locations?workspace_id=...

User deletes location
  ├─ DELETE /locations/:id
  ├─ Remove from tree
  └─ Refetch: GET /boxes?workspace_id=... (update box counts)

User submits BoxEditorModal (create)
  ├─ POST /boxes → CreateBoxResponse
  └─ Refetch: GET /boxes?workspace_id=...&location_id=...

User submits BoxEditorModal (edit)
  ├─ PATCH /boxes/:id → UpdateBoxResponse
  └─ Refetch: GET /boxes?workspace_id=...&location_id=...

User deletes box
  ├─ DELETE /boxes/:id
  └─ Refetch: GET /boxes?workspace_id=...&location_id=...
```

## 8. User Interactions

### 1. Browsing Locations

**User action**: User opens page `/app`
**Expected result**:
- Loading root locations list
- Display "Unassigned" at top
- Ability to expand/collapse each location
- Display box count for each location
- First location auto-selected (if available)

### 2. Expanding Hierarchy

**User action**: User clicks expand button on LocationTreeNode
**Expected result**:
- Load children locations via GET /locations?parent_id=...
- Expand animation
- Display children with proportional indentation
- Update UI with spinner during loading

### 3. Selecting Location

**User action**: User clicks on LocationNodeItem
**Expected result**:
- Highlight selected location (visual feedback)
- Refetch boxes: GET /boxes?location_id=...
- Display boxes for selected location
- Update selectedLocationId in store
- Update breadcrumb (if exists)

### 4. Searching Boxes

**User action**: User types in SearchInput
**Expected result**:
- Real-time update (debounce 300ms)
- If < 3 chars: don't display results (show message)
- If >= 3 chars: GET /boxes?q=...
- Display matching boxes with location breadcrumb
- Spinner during loading
- "No results" message if no matches
- X button for clearing

### 5. Clearing Search

**User action**: User clicks X button in SearchInput
**Expected result**:
- Clear search query
- Restore filtered list based on selectedLocationId
- Focus remains in SearchInput
- Refetch boxes if needed

### 6. Adding Location

**User action**: User clicks "Add location" in LocationContextMenu or CTA button
**Expected result**:
- Open LocationEditorModal in create mode
- Parent location pre-selected (if from context menu)
- Form fields: name, description
- Parent selector available
- Real-time validation (max depth check)
- On submit: POST /locations
- On success: Refetch locations, close modal, show success toast
- On error: Display validation errors in modal

### 7. Editing Location

**User action**: User clicks "Edit" in LocationContextMenu
**Expected result**:
- Open LocationEditorModal in edit mode
- Pre-populate: name, description
- On submit: PATCH /locations/:id
- On success: Update tree, close modal, show success toast
- On error: Display errors in modal

### 8. Deleting Location

**User action**: User clicks "Delete" in LocationContextMenu
**Expected result**:
- Open DeleteConfirmationDialog
- Display: "All boxes in this location will be moved to Unassigned"
- On confirm: DELETE /locations/:id
- On success: Remove from tree, Refetch boxes, close dialog, show success toast
- On error: Display error message

### 9. Adding Box

**User action**: User clicks "Add box" button (CTA or header)
**Expected result**:
- Open BoxEditorModal in create mode
- Current location pre-selected
- Form fields: name, description, tags, location_id, qr_code_id
- On submit: POST /boxes
- On success: Refetch boxes, close modal, show success toast
- On error: Display validation errors

### 10. Editing Box

**User action**: User clicks "Edit" on BoxListItem or BoxContextMenu
**Expected result**:
- Open BoxEditorModal in edit mode
- Pre-populate: name, description, tags, location
- On submit: PATCH /boxes/:id
- On success: Refetch boxes, close modal, show success toast
- On error: Display errors

### 11. Deleting Box

**User action**: User clicks "Delete" on BoxListItem or BoxContextMenu
**Expected result**:
- Open DeleteConfirmationDialog
- Display: "This action is irreversible"
- On confirm: DELETE /boxes/:id
- On success: Remove from list, show success toast
- On error: Display error message

### 12. Moving Box

**User action**: User clicks "Move" in BoxContextMenu (future feature)
**Expected result**:
- Open LocationSelector modal
- Select new location
- On submit: PATCH /boxes/:id with new location_id
- On success: Refetch boxes, close modal, show toast

### 13. Switching Workspace

**User action**: User clicks on workspace in WorkspaceSelector
**Expected result**:
- Switch workspace context
- Refetch all data (locations, boxes)
- Reset selectedLocationId
- Clear search query
- Update store

### 14. Logout

**User action**: User clicks "Logout" in UserMenu
**Expected result**:
- Clear session/auth token
- Redirect to /login
- Clear all cached data

## 9. Conditions and Validation

### Component-Level Validation

#### SearchInput
- **Minimum 3 characters**: If < 3, don't send API call, display help text "Minimum 3 characters for search"
- **Whitespace trim**: Automatically trim leading/trailing spaces
- **Max 200 characters**: Prevent typing more
- **Special characters**: Allow (will be escaped on API)

#### LocationEditorModal
- **Name required**: Show error if empty
- **Name max 255 chars**: Real-time feedback
- **Description max 1000 chars**: Counter + error
- **Parent selection**: If selected, check level < 5
- **Sibling name uniqueness**: Backend validation (respond with 409 conflict), display error if conflict

#### BoxEditorModal
- **Name required**: Show error if empty
- **Name max 255 chars**: Real-time feedback
- **Description max 10000 chars**: Counter + error
- **Tags validation**: Each tag max 50 chars, remove duplicates
- **Location selection**: Optional, but if selected must be valid
- **QR code assignment**: Check on API if not already assigned (409 error)

#### LocationTreeNode
- **Level validation**: level < 5 (from path.split('.').length - 1)
- **Disable delete**: If only root location (backend validation)
- **Expand disabled**: If no children

#### BoxListItem
- **Location display**: If null, display "Unassigned"
- **Description truncate**: Max 100 chars in preview
- **Tags display**: Max 3 tags in preview, "+ N more" if more

### API-Level Conditions

All endpoints have built-in validation (see endpoint implementation), but frontend should:

1. **Check 401**: If 401 on any API call → redirect to /login
2. **Check 403**: If 403 (permission denied) → show error toast, don't allow action
3. **Check 404**: If 404 (item not found) → remove from UI, refetch relevant data
4. **Check 409**: If 409 (conflict) → show validation error in modal
5. **Check 400**: If 400 (bad request) → parse error details, display in modal
6. **Check 500**: If 500 → show generic error message, suggest retry

### Location Hierarchy Validation

```typescript
function validateMaxDepth(level: number, maxDepth: number = 5): boolean {
  return level < maxDepth;
}

function getLocationLevel(path: string): number {
  // path format: "root.basement.shelf_a"
  return path.split('.').length - 1;
}
```

### Box Count Calculation

Box count for location should be calculated from filtered boxes:

```typescript
function calculateBoxCounts(locations: LocationTreeNode[], boxes: BoxListItem[]): Map<string, number> {
  const counts = new Map<string, number>();

  boxes.forEach(box => {
    const locId = box.location_id || 'unassigned';
    counts.set(locId, (counts.get(locId) || 0) + 1);
  });

  return counts;
}
```

## 10. Error Handling

### Network Errors

- **Network timeout**: Show error toast "Sometimes failed. Try again." with retry button
- **CORS error**: Log to console, show generic error message (develop issue with backend)
- **Server 5xx**: Show error toast "Server error. Try again later."

### Authentication Errors

- **401 Unauthorized**:
  - Clear auth token
  - Redirect to /login
  - Show message "Your session expired. Please log in again."

- **403 Forbidden**:
  - Show error toast "You don't have access to this workspace"
  - Optionally redirect to /app with different workspace

### Validation Errors

- **400 Bad Request**:
  - Parse error details from response
  - Display field-specific errors in modal/form
  - Highlight input fields with errors
  - Show first error in toast (for context)

- **409 Conflict** (sibling name):
  - Display in modal: "A location with this name already exists at this level"
  - Focus name input
  - Suggest unique name

### Business Errors

- **Max depth exceeded**:
  - Disable "Add sublocation" for level 5 locations
  - Show tooltip: "Maximum 5 levels of nesting"

- **QR code already assigned**:
  - Show error in modal: "This QR code is already assigned to another box"
  - Suggest selecting different code

- **Location not found** (404):
  - Show error toast
  - Refetch locations
  - Remove deleted location from tree

- **Box not found** (404):
  - Show error toast
  - Refetch boxes
  - Remove deleted box from list

### Error Boundary

Implement React Error Boundary for DashboardContainer:

```typescript
class DashboardErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Retry Logic

For critical API calls (GET locations, GET boxes):

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status >= 400) return res; // Don't retry 4xx/5xx
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}
```

## 11. Implementation Steps

### Phase 1: Setup and Infrastructure (2-3 hours)

1. **Create Astro page component**:
   - `src/pages/app.astro`
   - Import `DashboardContainer` component
   - Setup layout, meta tags
   - Middleware check (authenticated)

2. **Create Nano Stores**:
   - `src/stores/dashboard.ts`
   - `currentWorkspaceId`, `selectedLocationId`, `searchQuery`, `expandedLocationIds`

3. **Create Context**:
   - `src/contexts/DashboardContext.tsx`
   - DashboardContext type definition
   - useDashboard hook

4. **Create custom hooks**:
   - `src/components/hooks/useWorkspaces.ts`
   - `src/components/hooks/useLocations.ts`
   - `src/components/hooks/useBoxes.ts`
   - `src/components/hooks/useDebounce.ts`

5. **Create types**:
   - Add to `src/types.ts`: `DashboardState`, `LocationTreeNode`, `BoxListItem`, `DashboardContextType`

### Phase 2: Layout Components (4-5 hours)

6. **Create DashboardContainer**:
   - `src/components/dashboard/DashboardContainer.tsx`
   - Setup state management
   - Fetch initial data (workspaces, locations, boxes)
   - Provide DashboardContext
   - Layout structure (header + content)

7. **Create DashboardHeader**:
   - `src/components/dashboard/DashboardHeader.tsx`
   - WorkspaceSelector
   - UserMenu
   - Logo/title

8. **Create SearchInput**:
   - `src/components/dashboard/SearchInput.tsx`
   - Input field with debouncing
   - X button
   - Loading spinner
   - Accessibility attributes

9. **Create LocationTree**:
   - `src/components/dashboard/LocationTree.tsx`
   - Recursive rendering
   - "Unassigned" node
   - Expand/collapse logic
   - Box count display

10. **Create LocationTreeNode**:
    - `src/components/dashboard/LocationTreeNode.tsx`
    - Item display
    - Expand button
    - Selection state
    - Context menu button

11. **Create BoxListContainer**:
    - `src/components/dashboard/BoxListContainer.tsx`
    - Virtualized list setup
    - Empty state logic
    - Loading state

### Phase 3: List and Modal Components (4-5 hours)

12. **Create BoxList**:
    - `src/components/dashboard/BoxList.tsx`
    - Virtualization (react-window)
    - Item rendering
    - Loading skeleton

13. **Create BoxListItem**:
    - `src/components/dashboard/BoxListItem.tsx`
    - Box information display
    - Hover state
    - Context menu button

14. **Create EmptyState**:
    - `src/components/dashboard/EmptyState.tsx`
    - Multiple types (empty-workspace, no-results)
    - CTA buttons
    - Styling

15. **Create LocationEditorModal**:
    - `src/components/dashboard/LocationEditorModal.tsx`
    - Form fields (name, description, parent)
    - Validation
    - Submit logic
    - Error handling

16. **Create BoxEditorModal**:
    - `src/components/dashboard/BoxEditorModal.tsx`
    - Form fields (name, description, tags, location, qr_code)
    - Validation
    - Submit logic
    - Error handling
    - Character counter for description

17. **Create DeleteConfirmationDialog**:
    - `src/components/dashboard/DeleteConfirmationDialog.tsx`
    - Generic for locations and boxes
    - Warning messaging
    - Loading state during delete

### Phase 4: Context Menus and Actions (3-4 hours)

18. **Create LocationContextMenu**:
    - `src/components/dashboard/LocationContextMenu.tsx`
    - Menu items (Add, Edit, Delete)
    - Disabled states
    - Icon button trigger

19. **Create BoxContextMenu**:
    - `src/components/dashboard/BoxContextMenu.tsx`
    - Menu items (View, Edit, Move, Delete)
    - Icon button trigger

20. **Create WorkspaceSelector**:
    - `src/components/dashboard/WorkspaceSelector.tsx`
    - Dropdown display
    - Workspace switcher
    - Loading state

21. **Create UserMenu**:
    - `src/components/dashboard/UserMenu.tsx`
    - Avatar/icon
    - Dropdown menu
    - Settings link
    - Logout button

### Phase 5: Integration and Error Handling (3-4 hours)

22. **Implement API integration in hooks**:
    - Complete fetch logic for all endpoints
    - Error handling (401, 403, 404, 400, 500)
    - Retry logic for critical endpoints
    - Request debouncing

23. **Implement actions in DashboardContainer**:
    - selectLocation action
    - setSearchQuery action
    - CRUD actions for locations and boxes
    - switchWorkspace action

24. **Create helper functions**:
    - `calculateBoxCounts()`
    - `transformLocationToTreeNode()`
    - `validateMaxDepth()`
    - `getLocationLevel()`

25. **Create toast notifications**:
    - Create toast utility (`src/lib/toast.ts`)
    - Success messages
    - Error messages
    - Auto-dismiss logic

### Phase 6: Styling and Accessibility (3-4 hours)

26. **Tailwind styling**:
    - Desktop-first responsive design
    - Hover states
    - Loading states
    - Dark mode support (future)

27. **Accessibility**:
    - ARIA labels and descriptions
    - Semantic HTML
    - Keyboard navigation (especially LocationTree)
    - Focus management
    - Live regions for error messages

28. **Responsiveness**:
    - Desktop layout (two columns)
    - Tablet layout (one column)
    - Mobile layout (drill-down navigation)
    - Touch-friendly buttons

### Phase 7: Testing and Optimization (2-3 hours)

29. **Manual testing**:
    - All user interactions
    - Error scenarios
    - Edge cases
    - Different workspace sizes
    - Network errors

30. **Performance optimization**:
    - React.memo for list items
    - useCallback for event handlers
    - useMemo for expensive computations
    - Virtual list rendering
    - Lazy loading for locations

31. **Code quality**:
    - Run `npm run lint`
    - Fix linting issues
    - Code organization check
    - Type safety verification

32. **Final refinements**:
    - Toast messages clear and helpful
    - Error messages clear
    - Loading states proper
    - Animations smooth (transitions API)
    - Cross-browser testing

### Time Estimates

- **Total time**: ~20-25 hours (can be split across days)
- **Per phase**: 2-5 hours
- **Buffer for issues**: +25%

### Existing Resources to Leverage

- Shadcn/ui components for UI elements
- Tailwind CSS 4 for styling
- React 19 with latest hooks
- Nano Stores for state management
- Zod for validation (existing pattern)
- TypeScript strict mode

### Later-Phase Optimization Possibilities

- Add sorting to BoxList (US-023)
- Add tag filtering (US-032)
- Add quick verification checkbox (US-030)
- Add drag & drop (US-034)
- Add activity history (US-029)
- Add duplicate box feature (US-024)
