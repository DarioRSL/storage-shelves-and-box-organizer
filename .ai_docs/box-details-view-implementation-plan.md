# Box Details View Implementation Plan

## 1. Overview

The Box Details View is a detailed view of a single box in the Storage & Box Organizer system. This view displays comprehensive information about a box, including its name, description, tags, complete location path (breadcrumbs), and associated QR code. It is a key view that users reach after scanning a QR code or clicking on a box from a list. The view also enables editing and deletion of the box through intuitive action buttons with a confirmation mechanism for destructive operations.

## 2. View Routing

- **Path:** `/app/boxes/[id]`
- **URL Parameters:** `id` - UUID of the box (e.g., `/app/boxes/b1b48d97-501c-4709-bd7b-d96519721367`)
- **Requirements:** User must be logged in (middleware authentication)
- **Access:** View is only accessible to members of the workspace containing the box (RLS enforcement)
- **File:** `src/pages/app/boxes/[id].astro` (main Astro layout)

## 3. Component Structure

```
BoxDetailsView (Astro page component)
├── LoadingSpinner (conditional display during fetch)
├── ErrorAlert (conditional display on fetch error)
└── BoxDetailsContent (React component - main content)
    ├── BoxHeader
    │   ├── box.name (title)
    │   └── Metadata (created_at, updated_at)
    ├── LocationBreadcrumbs
    │   └── Hierarchical path display
    ├── DescriptionSection
    │   └── box.description text content
    ├── TagsDisplay
    │   └── Tag list rendering
    ├── QrCodeDisplay
    │   ├── QR code visual (react-qr-code)
    │   ├── short_id label
    │   └── Print button
    └── ActionButtonsSection
        ├── EditButton (navigation)
        └── DeleteButton (with confirmation)
            └── DeleteConfirmationDialog (modal)
```

## 4. Component Details

### 4.1 BoxDetailsView (Astro Page Component)

**Description:** Main page component that handles routing, data loading, and loading/error states. It is an Astro layout that renders content on the server and hydrates interactive React components.

**Main Elements:**
- Page header with navigation breadcrumb
- Container with dynamic content
- Error boundary for error handling
- Loading spinner during data fetch

**Supported Interactions:**
- Page load - initiates GET request for the box
- Error handling - displays error messages
- Retry logic - button to retry loading after error

**Validation:**
- ID from URL params must be a valid UUID
- Check if user is authenticated
- Check access to box (RLS)

**Types:**
- `BoxDto` - complete box data
- `ErrorResponse` - API error response structure

**Props:** None (page component)

---

### 4.2 BoxDetailsContent (React Component)

**Description:** Main React component that manages loading state, box data, and coordinates the display of all sub-components. Handles fetching box data from the API on mount and manages error/loading states.

**Main Elements:**
- State variables for box data, loading, error
- useEffect hook for data fetching
- Conditional rendering based on loading/error states
- Container div with Tailwind styling

**Supported Interactions:**
- Component mount - fetch box data
- Error handling - show error message with retry
- Successful load - render box details

**Validation:**
- Check if id from params is a valid UUID
- API validation errors (400, 404, 500)
- Network error handling

**Types:**
- `BoxDto` - response from GET /api/boxes/:id
- `ErrorResponse` - error response

**Props:**
```typescript
interface BoxDetailsContentProps {
  boxId: string; // UUID from URL params
  currentUserId: string; // From authentication context
}
```

---

### 4.3 BoxHeader

**Description:** Component displaying the box header with its name and metadata (creation date, last update). Provides clear visual distinction of the box title from the rest of the content.

**Main Elements:**
- `<h1>` tag with box name
- Metadata section with formatted dates
- Icon or badge if the box has a special status

**Supported Interactions:**
- Display only (no interactions)

**Validation:**
- Check that name is not empty
- Date format (created_at, updated_at)

**Types:**
- `BoxDto` - source of data

**Props:**
```typescript
interface BoxHeaderProps {
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
}
```

---

### 4.4 LocationBreadcrumbs

**Description:** Component displaying the hierarchical location path of the box in breadcrumb navigation format. If the box has no assigned location, displays an "Unassigned" status.

**Main Elements:**
- `<nav>` semantic element with aria-label
- List of path segments separated by ">"
- Link to each hierarchy level (optional)
- Empty state for unassigned boxes

**Supported Interactions:**
- Display breadcrumb path
- Conditional rendering for unassigned state
- Optional click handlers on segments (if implementing location filtering)

**Validation:**
- Check if location exists
- Parse path string from API format
- Handle null/undefined location

**Types:**
- `BoxLocationSummary` (from BoxDto.location)

**Props:**
```typescript
interface LocationBreadcrumbsProps {
  location?: BoxLocationSummary | null;
}
```

---

### 4.5 DescriptionSection

**Description:** Component displaying the descriptive content of the box. Handles long text (up to 10,000 characters) with whitespace preservation and text wrapping.

**Main Elements:**
- Section tag with aria-label
- Description text with preformatted whitespace
- Empty state message if description is empty
- Section heading

**Supported Interactions:**
- Display only

**Validation:**
- Handle empty/null description
- Limit length display if needed
- Sanitize HTML characters if description comes from user input

**Types:**
- `string | null` - description content

**Props:**
```typescript
interface DescriptionSectionProps {
  description?: string | null;
}
```

---

### 4.6 TagsDisplay

**Description:** Component displaying the list of box tags. Each tag is displayed as a badge and can optionally be clickable for filtering.

**Main Elements:**
- Container for tag list
- Individual tag badges (Shadcn Badge component)
- Empty state if no tags
- Section heading

**Supported Interactions:**
- Display tag list
- Optional click handler (filter by tag) - if implementing
- Keyboard accessibility for tags

**Validation:**
- Handle empty/null tags array
- Validate array structure

**Types:**
- `string[]` - tags array

**Props:**
```typescript
interface TagsDisplayProps {
  tags?: string[] | null;
}
```

---

### 4.7 QrCodeDisplay

**Description:** Component displaying the box's QR code and its text identifier (short_id). Includes a print button for the QR code. If the box has no assigned QR code, displays an appropriate message.

**Main Elements:**
- QR code visual (react-qr-code library)
- short_id label below the code
- Print button with icon
- Empty state message if no code
- Section container

**Supported Interactions:**
- Print button click - trigger browser print dialog
- QR code might be scannable directly from screen

**Validation:**
- Check if qr_code exists in response
- Validate short_id format (QR-XXXXXX)
- Handle missing QR code gracefully

**Types:**
- `BoxQrCodeSummary` (from BoxDto.qr_code)

**Props:**
```typescript
interface QrCodeDisplayProps {
  qrCode?: BoxQrCodeSummary | null;
}
```

---

### 4.8 ActionButtonsSection

**Description:** Component containing action buttons for the box (Edit, Delete). Positioned at the bottom of the view, contains an Edit button that navigates to the edit form and a Delete button that opens a confirmation dialog.

**Main Elements:**
- Container flex for button layout
- Edit button (Shadcn Button)
- Delete button (Shadcn Button - danger variant)
- Spacing and responsive layout

**Supported Interactions:**
- Edit button click - navigate to `/app/boxes/[id]/edit`
- Delete button click - open confirmation dialog

**Validation:**
- Buttons enabled based on state (disabled while deleting)

**Types:** None (pure UI)

**Props:**
```typescript
interface ActionButtonsSectionProps {
  boxId: string;
  onDeleteClick: () => void;
  isDeleting?: boolean;
}
```

---

### 4.9 DeleteConfirmationDialog

**Description:** Modal dialog component for confirming box deletion. Displays a warning about the irreversibility of the operation and requires user confirmation.

**Main Elements:**
- Shadcn Dialog component as modal
- Warning icon and text
- Confirmation message
- Cancel button
- Confirm button (danger variant)
- Loading state during deletion

**Supported Interactions:**
- Dialog open/close
- Cancel button - close dialog without action
- Confirm button - call delete API and close dialog
- ESC key - close dialog
- Click outside - close dialog (if dialog supports this)

**Validation:**
- Dialog opened only when explicitly triggered
- Button states during API call

**Types:**
- `BoxDto` (optional, for displaying information)

**Props:**
```typescript
interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  boxId: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}
```

---

### 4.10 LoadingSpinner

**Description:** Component displaying loading state while fetching box data from the API.

**Main Elements:**
- Spinner/loader animation
- Text "Loading box data..."
- Center alignment in viewport

**Supported Interactions:** None

**Types:** None

**Props:**
```typescript
interface LoadingSpinnerProps {
  message?: string;
}
```

---

### 4.11 ErrorAlert

**Description:** Component displaying errors during box loading or operations. Contains an error message and a retry button.

**Main Elements:**
- Alert box (Shadcn Alert)
- Error message
- Retry button
- Close button (optional)
- Error icon

**Supported Interactions:**
- Retry button - retry last API call
- Close button - dismiss alert

**Types:**
- `ErrorResponse` - error data

**Props:**
```typescript
interface ErrorAlertProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}
```

---

## 5. Types

### 5.1 BoxDto (from existing types.ts)

```typescript
export interface BoxDto extends Tables<"boxes"> {
  /**
   * Nested location details if joined.
   */
  location?: BoxLocationSummary | null;
  /**
   * Nested QR code details if joined.
   */
  qr_code?: BoxQrCodeSummary | null;
}

// Where Tables<"boxes"> contains:
{
  id: string;                    // UUID
  short_id: string;              // 10-char alphanumeric
  workspace_id: string;          // UUID
  location_id: string | null;    // UUID or null
  name: string;                  // Required
  description: string | null;    // Max 10,000 chars
  tags: string[] | null;         // Array of tags
  image_url: string | null;      // Optional image
  created_at: string | null;     // ISO timestamp
  updated_at: string | null;     // ISO timestamp
}
```

### 5.2 BoxLocationSummary (from existing types.ts)

```typescript
export interface BoxLocationSummary {
  id?: string;        // Location UUID
  name: string;       // Location name
  path?: string;      // Hierarchical path (e.g., "root.basement.shelf_a")
}
```

### 5.3 BoxQrCodeSummary (from existing types.ts)

```typescript
export interface BoxQrCodeSummary {
  id: string;         // QR code UUID
  short_id: string;   // QR code short ID (format: QR-XXXXXX)
}
```

### 5.4 ErrorResponse (from existing types.ts)

```typescript
export interface ErrorResponse {
  error: string;
  details?: unknown;
}
```

### 5.5 New ViewModel Types (if needed)

```typescript
/**
 * View state for Box Details View
 */
export interface BoxDetailsViewState {
  box: BoxDto | null;
  isLoading: boolean;
  error: string | null;
  isDeleting: boolean;
  isDeleteConfirmDialogOpen: boolean;
}

/**
 * Formatted metadata for display
 */
export interface BoxMetadata {
  createdAtFormatted: string;
  updatedAtFormatted: string;
  daysAgo?: number;
}

/**
 * Parsed breadcrumb item
 */
export interface BreadcrumbItem {
  name: string;
  level: number;
  isLast: boolean;
}
```

---

## 6. State Management

### 6.1 State in BoxDetailsContent

**State variables:**

```typescript
const [box, setBox] = useState<BoxDto | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
```

**State flow:**
1. On mount: `isLoading = true`
2. During fetch: maintain `isLoading = true`
3. On success: `isLoading = false`, `box = data`, `error = null`
4. On error: `isLoading = false`, `error = message`, `box = null`
5. On delete click: `isDeleteConfirmDialogOpen = true`
6. On delete confirm: `isDeleting = true`, call API
7. On delete success: redirect to `/app`
8. On delete error: `isDeleting = false`, show error

### 6.2 useEffect Hooks

**Effect 1: Fetch box data on mount**
```typescript
useEffect(() => {
  if (!boxId) return;

  const fetchBox = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/boxes/${boxId}`);
      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error || 'Failed to fetch box');
      }
      const data = await response.json() as BoxDto;
      setBox(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  fetchBox();
}, [boxId]);
```

**Dependencies:** `[boxId]`

### 6.3 Custom Hook (optional - if needed)

```typescript
/**
 * Hook to manage box details
 */
function useBoxDetails(boxId: string) {
  const [box, setBox] = useState<BoxDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBox = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/boxes/${boxId}`);
      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error);
      }
      const data = await response.json() as BoxDto;
      setBox(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [boxId]);

  useEffect(() => {
    if (boxId) {
      fetchBox();
    }
  }, [boxId, fetchBox]);

  return { box, isLoading, error, refetch: fetchBox };
}
```

### 6.4 State Management Strategy

- **Local state** (useState) for UI state (loading, error, dialog open/close)
- **Props drilling** for component communication (alternatively: Context if structure becomes complex)
- **Nano Stores** (optionally) if global synchronization needed (e.g., notification system)

---

## 7. API Integration

### 7.1 GET /api/boxes/:id

**Purpose:** Fetch complete box data

**Request:**
```
GET /api/boxes/{boxId}
Header: Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "id": "b1b48d97-501c-4709-bd7b-d96519721367",
  "short_id": "ywGCkvMi3t",
  "workspace_id": "4d5a1187-e805-4a53-845d-f118945b0dd0",
  "location_id": "73316c0a-8a91-4488-bac2-4d8defdd7206",
  "name": "Winter Clothes",
  "description": "Jackets, scarves, and winter accessories for the whole family",
  "tags": ["winter", "clothes", "seasonal"],
  "image_url": null,
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

**Error Responses:**
- 400 Bad Request: Invalid UUID format
- 401 Unauthorized: Missing/invalid JWT token
- 404 Not Found: Box doesn't exist or user lacks access (RLS)
- 500 Internal Server Error: Database/server error

**Frontend handling:**
- Display BoxDto data in all sub-components
- Handle all error cases
- Show loading spinner during fetch

### 7.2 DELETE /api/boxes/:id

**Purpose:** Permanently delete a box

**Request:**
```
DELETE /api/boxes/{boxId}
Header: Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "message": "Box deleted successfully."
}
```

**Error Responses:**
- 400 Bad Request: Invalid UUID format
- 401 Unauthorized: Missing/invalid JWT
- 403 Forbidden: User doesn't have permission
- 404 Not Found: Box not found
- 500 Internal Server Error: Database error

**Frontend handling:**
- Show confirmation dialog before delete
- Set `isDeleting = true` during API call
- Disable buttons during delete
- On success: redirect to `/app` (dashboard)
- On error: show error message, stay on view
- Database trigger automatically resets linked QR code

---

## 8. User Interactions

### 8.1 Scenario 1: Opening the view

**Steps:**
1. User navigates to `/app/boxes/[id]` (e.g., via QR scan or box list click)
2. Astro renders page, passes boxId to React component
3. React component mounts, initiates GET /api/boxes/:id
4. Loading spinner displayed
5. After ~500ms-2s: data arrives, loading spinner hidden
6. All box details rendered

**Expected result:** Box view fully visible with all information

### 8.2 Scenario 2: Editing the box

**Steps:**
1. User clicks "Edit" button
2. Navigation triggered: `navigate('/app/boxes/' + boxId + '/edit')`
3. Edit form page loads (different page)

**Expected result:** Redirect to edit form

### 8.3 Scenario 3: Deleting the box

**Steps:**
1. User clicks "Delete" button
2. DeleteConfirmationDialog opens
3. User reads warning message
4. User clicks "Confirm" button
5. API call: DELETE /api/boxes/:id initiated
6. Loading state: isDeleting = true, buttons disabled, spinner shown
7. After ~500ms-1s: delete completes
8. Page redirects to `/app`

**Expected result:** Box deleted, user returns to dashboard

### 8.4 Scenario 4: Canceling deletion

**Steps:**
1. User clicks "Delete" button
2. DeleteConfirmationDialog opens
3. User clicks "Cancel" or clicks outside dialog
4. Dialog closes, data unchanged

**Expected result:** Dialog closed, box view unchanged

### 8.5 Scenario 5: Error handling during loading

**Steps:**
1. User opens box details view
2. GET /api/boxes/:id request fails (network error or 404)
3. Loading spinner removed
4. Error message displayed: "Failed to fetch box"
5. "Retry" button visible
6. User clicks retry
7. GET request sent again

**Expected result:** Graceful error handling, functional retry

---

## 9. Conditions and Validation

### 9.1 URL Parameter Validation

**Condition:** Box ID must be a valid UUID format
- **Component:** BoxDetailsContent
- **Validation:** On load, check if `boxId` matches UUID regex
- **Impact:** If invalid, show error "Invalid box identifier"

```typescript
const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boxId);
```

### 9.2 API Response Validation

**Condition:** Response from GET /api/boxes/:id must contain required fields
- **Component:** BoxDetailsContent (in try-catch)
- **Required fields:** `id`, `name`, `workspace_id`
- **Impact:** If validation fails, show error message
- **Logic:** TypeScript type checking (BoxDto) ensures validation

### 9.3 Box State Validation

**Condition:** Box must exist in database and be accessible to current user
- **Component:** BoxDetailsContent
- **Validation:** API checks (RLS) on backend
- **HTTP Status:** 404 if not found, 403 if no access
- **Frontend handling:** Show appropriate error message

```typescript
if (!response.ok) {
  if (response.status === 404) {
    setError('Box not found');
  } else if (response.status === 403) {
    setError('Access denied to this box');
  }
}
```

### 9.4 Box Data Validation

**Conditions:**
- `name`: string, min length 1
- `description`: string | null, max 10,000 characters
- `tags`: string[] | null
- `location`: BoxLocationSummary | null
- `qr_code`: BoxQrCodeSummary | null

**Frontend display:**
- Empty states for null/empty values
- Formatting for large texts
- CSS white-space preservation for descriptions

### 9.5 Delete Action Validation

**Conditions:**
- Delete button only enabled when not loading
- Confirm button in dialog disabled during API call
- User must be member of workspace (RLS)

**UI Impact:**
- Buttons disabled: `isDeleting || isLoading`
- Loading spinner visible: `isDeleting`

---

## 10. Error Handling

### 10.1 Error: Invalid box ID

**Scenario:** User navigates with invalid ID format

**Handling:**
```typescript
const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boxId);
if (!isValidUUID) {
  setError('Invalid box identifier');
  return;
}
```

**Display:** Error message + back link to dashboard

---

### 10.2 Error: 404 Box not found

**Scenario:** Box was deleted or ID is wrong

**Handling:**
```typescript
if (response.status === 404) {
  setError('Box not found or access has been revoked');
}
```

**Display:** Error message + navigation back option

---

### 10.3 Error: 403 Forbidden (No access)

**Scenario:** User is not a member of box workspace (RLS)

**Handling:**
```typescript
if (response.status === 403) {
  setError('Access denied to this box');
}
```

**Display:** Error message, auto-redirect to dashboard after 3s

---

### 10.4 Error: Network error

**Scenario:** No connectivity, timeout, etc.

**Handling:**
```typescript
catch (err) {
  setError('Network error while fetching data. Please try again.');
}
```

**Display:** Error message + retry button

---

### 10.5 Error: Delete failed (500)

**Scenario:** Delete API request failed on backend

**Handling:**
```typescript
if (!response.ok) {
  const errorData = await response.json() as ErrorResponse;
  setError(`Failed to delete box: ${errorData.error}`);
  setIsDeleting(false);
}
```

**Display:** Error message, stay on view, dialog closes, buttons re-enabled

---

### 10.6 Error: Race conditions

**Scenario:** User clicks delete button multiple times

**Handling:** Disable button while `isDeleting = true`, prevent duplicate requests

```typescript
<button
  disabled={isDeleting || isLoading}
  onClick={handleDeleteClick}
>
  Delete
</button>
```

---

### 10.7 Edge case: Empty description

**Scenario:** Box has no description

**Handling:** Display placeholder message: "No description"

---

### 10.8 Edge case: No QR code

**Scenario:** Box has no assigned QR code

**Handling:** Display message: "This box has no assigned QR code"

---

### 10.9 Edge case: No tags

**Scenario:** Box has no tags

**Handling:** Display message: "No tags" or simply omit tags section

---

### 10.10 Edge case: Unassigned location

**Scenario:** Box has no assigned location

**Handling:** Display: "Box has no assigned location" in breadcrumb section

---

## 11. Implementation Steps

### Step 1: Prepare Astro page file

1. Create file: `src/pages/app/boxes/[id].astro`
2. Import BoxDetailsContent React component
3. Set `export const prerender = false`
4. Check if user is logged in (via middleware)
5. Extract `id` from `Astro.params.id`
6. Validate ID format
7. Render BoxDetailsContent with props (id, userId)

**File structure:**
```astro
---
import { type APIRoute } from 'astro';
import BoxDetailsContent from '@/components/BoxDetailsContent';

export const prerender = false;

// Get box ID from URL params
const { id } = Astro.params;

// Validation
if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
  return Astro.redirect('/app');
}
---

<BoxDetailsContent client:load boxId={id} />
```

---

### Step 2: Implement BoxDetailsContent component

1. Create: `src/components/BoxDetailsContent.tsx`
2. Setup state variables (box, isLoading, error, isDeleteConfirmDialogOpen, isDeleting)
3. Implement useEffect for fetch box data
4. Implement handleRetry function
5. Implement handleDeleteClick function
6. Implement handleConfirmDelete function
7. Implement conditional rendering for loading/error/success states
8. Render all sub-components

**Key functions:**
```typescript
async function fetchBox() { /* ... */ }
async function handleConfirmDelete() { /* ... */ }
function handleDeleteClick() { /* ... */ }
function handleRetry() { /* ... */ }
```

---

### Step 3: Implement BoxHeader component

1. Create: `src/components/BoxHeader.tsx`
2. Accept props: `name`, `createdAt`, `updatedAt`
3. Format dates (use date-fns or similar)
4. Render `<h1>` with name
5. Render metadata section (formatted dates)

**Styling:** Tailwind classes, responsive

---

### Step 4: Implement LocationBreadcrumbs component

1. Create: `src/components/LocationBreadcrumbs.tsx`
2. Accept props: `location`
3. Parse `path` string if exists (split by dots)
4. Render `<nav>` element with aria-label
5. Display breadcrumb items separated by ">"
6. Handle unassigned case (display "Unassigned")

**Accessibility:**
- Use semantic `<nav>`
- Set `aria-label="Location path"`
- Use `aria-current="page"` for last item

---

### Step 5: Implement DescriptionSection component

1. Create: `src/components/DescriptionSection.tsx`
2. Accept props: `description`
3. Handle null/empty case (show "No description")
4. CSS: `white-space: pre-wrap` for text formatting
5. Render section with heading
6. Apply Tailwind styling for readability

---

### Step 6: Implement TagsDisplay component

1. Create: `src/components/TagsDisplay.tsx`
2. Accept props: `tags`
3. Handle null/empty case (show "No tags" or omit section)
4. Map array items to Badge components (Shadcn)
5. Apply styling for layout

---

### Step 7: Implement QrCodeDisplay component

1. Create: `src/components/QrCodeDisplay.tsx`
2. Accept props: `qrCode`
3. Import react-qr-code library
4. Handle null case (show "No QR code")
5. Render QR code with minimum 200x200px size
6. Display short_id below code
7. Add print button
8. Handle print button click

**Print functionality:**
```typescript
function handlePrint() {
  window.print();
  // Browser print dialog opens
}
```

---

### Step 8: Implement ActionButtonsSection component

1. Create: `src/components/ActionButtonsSection.tsx`
2. Accept props: `boxId`, `onDeleteClick`, `isDeleting`
3. Render Edit button (Shadcn) with navigation
4. Render Delete button (Shadcn - danger) with click handler
5. Disable buttons based on `isDeleting` || `isLoading`

**Navigation:**
```typescript
function handleEditClick() {
  navigate(`/app/boxes/${boxId}/edit`);
  // or: <a href={`/app/boxes/${boxId}/edit`}>Edit</a>
}
```

---

### Step 9: Implement DeleteConfirmationDialog component

1. Create: `src/components/DeleteConfirmationDialog.tsx`
2. Accept props: `isOpen`, `boxId`, `onConfirm`, `onCancel`, `isLoading`
3. Use Shadcn Dialog component
4. Display warning message
5. Display confirmation message
6. Render Cancel button (default variant)
7. Render Confirm button (danger variant)
8. Handle loading state (disable buttons, show spinner)
9. Handle ESC key (close dialog)

---

### Step 10: Implement LoadingSpinner component

1. Create: `src/components/LoadingSpinner.tsx`
2. Accept props: `message` (optional)
3. Use Shadcn Spinner/Loader component
4. Center alignment
5. Display message

---

### Step 11: Implement ErrorAlert component

1. Create: `src/components/ErrorAlert.tsx`
2. Accept props: `error`, `onRetry`, `onDismiss`
3. Use Shadcn Alert component
4. Display error message
5. Render retry button (if `onRetry` provided)
6. Render dismiss button
7. Use error icon

---

### Step 12: Add required types to `src/types.ts`

1. Check if BoxDto, BoxLocationSummary, BoxQrCodeSummary already exist
2. Check if ErrorResponse exists
3. Add if missing:
   - BoxDetailsViewState
   - BoxMetadata
   - BreadcrumbItem

---

### Step 13: Styling and Tailwind classes

1. Set consistent spacing, colors, typography
2. Desktop-first design (responsive design)
3. Dark mode support (if required)
4. Accessibility color contrast
5. Hover/focus states for buttons
6. Loading states visual

---

### Step 14: Testing

1. Test navigation to view (valid ID)
2. Test invalid ID handling
3. Test data loading and display
4. Test delete dialog open/close
5. Test delete operation (success & error)
6. Test error scenarios (404, 500, network error)
7. Test retry functionality
8. Test accessibility (keyboard navigation, screen readers)
9. Test mobile responsiveness
10. Test QR code display and print

---

### Step 15: Integration checks

1. Verify API endpoints work correctly
2. Verify RLS enforcement on backend
3. Verify JWT token handling
4. Test end-to-end flow (from QR scan to details display)
5. Test error handling on both sides (frontend + backend)

---

### Step 16: Performance optimization (optional)

1. Memoize components if needed (React.memo)
2. useCallback for handlers if reusing component
3. Lazy load QR code display if heavy
4. Optimize image loading if image_url exists

---

### Step 17: Documentation

1. Document custom hooks
2. Document component props (JSDoc comments)
3. Document API error handling logic
4. Update README if needed

---

## Summary

The Box Details View is a central interface for viewing box details. The implementation requires:
- Loading data from API GET /boxes/:id
- Displaying multi-part information (header, location, description, tags, QR code)
- Handling deletion with confirmation
- Navigation to edit form
- Solid error handling and accessibility

The plan provides a modular component structure for easy maintenance and testing, with special emphasis on user experience and error handling.
