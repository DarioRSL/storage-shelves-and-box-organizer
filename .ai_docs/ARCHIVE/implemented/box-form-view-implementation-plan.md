# Box Form View Implementation Plan

## 1. Overview

The Box Form View is a universal form for creating and editing boxes in the Storage & Box Organizer application. It enables users to:
- Add new boxes manually or by scanning a QR code
- Edit existing boxes (change name, description, tags, location)
- Delete boxes with confirmation
- Manage box contents through description (up to 10,000 characters) and tags

The view supports both creation (create mode) and editing (edit mode) in a single component, with conditional rendering of buttons and validation based on context.

## 2. View Routing

- **Path for creation:** `/app/boxes/new`
- **Path for editing:** `/app/boxes/[id]/edit`
- **Path for details (optional):** `/app/boxes/[id]` (read-only view)

The form can be rendered as:
- Full page (in files `src/pages/app/boxes/new.astro` and `src/pages/app/boxes/[id]/edit.astro`)
- Modal (within another view, e.g., dashboard)

Recommendation: Full page for better accessibility and UX on mobile devices (post-MVP).

## 3. Component Structure

```
BoxFormView (main page/modal component)
├── BoxForm (React component)
│   ├── FormHeader
│   │   ├── Title (New box / Edit box)
│   │   └── CloseButton (if modal)
│   ├── FormFields
│   │   ├── NameField (NameInput)
│   │   ├── DescriptionField (DescriptionTextarea)
│   │   ├── TagsField (TagInput)
│   │   ├── LocationField (LocationSelector)
│   │   └── QRCodeField (QRCodeSelector - optional)
│   ├── FormActions
│   │   ├── SaveButton
│   │   ├── CancelButton
│   │   └── DeleteButton (edit mode only)
│   └── ConfirmationDialog (delete box)
├── LocationSelectorModal (should be openable from LocationField)
├── ErrorToast (general error messages)
└── LoadingSpinner (during data loading)
```

## 4. Component Details

### BoxForm

**Component description:** Main form component for creating and editing boxes. Manages form state, validation, API communication, and submit/delete flow.

**Main elements:**
- `<form>` element with `onSubmit` handler
- Sequence of input fields grouped in `<fieldset>` or `<div role="group">`
- Action section (buttons) at the bottom
- Conditionally rendered Delete button (edit mode only)
- Delete confirmation modal

**Supported interactions:**
- Text input in name and description fields
- Adding/removing tags
- Selecting location from tree/dropdown
- Selecting optional QR code
- Form submission (Enter or Save button click)
- Cancellation (Cancel button or modal close)
- Delete confirmation (Delete button → Confirmation Dialog → DELETE API call)

**Supported validation:**
- **Name:** required, non-empty string (minimum 1 character), max 255 characters (implicit from API schema)
- **Description:** optional, max 10,000 characters, real-time character counter
- **Tags:** optional array of strings, each tag max 50 characters (recommendation), no duplicates
- **Location:** optional UUID, must exist in workspace (server-side validation)
- **QR Code:** optional UUID, must have "generated" status (server-side validation)

Validation has two layers:
1. **Client-side:** Zod schema (mirror of API schema) for quick feedback
2. **Server-side:** API validates again for security

**Types:** CreateBoxRequest, CreateBoxResponse, UpdateBoxRequest, UpdateBoxResponse, BoxDto, LocationDto, GetBoxesQuery

**Props:**
```typescript
interface BoxFormProps {
  mode: 'create' | 'edit';
  boxId?: string; // required if mode === 'edit'
  workspaceId: string;
  initialLocationId?: string; // pre-select location from URL/context
  onSuccess?: (boxId: string) => void; // callback after successful submit/delete
  onCancel?: () => void; // cancel callback
  isModal?: boolean; // if true, render as modal
}
```

---

### NameInput

**Component description:** Input field for entering box name. Integral form element.

**Main elements:**
- `<label>` with `htmlFor` connector
- `<input type="text">` with placeholder
- Error icon (if error)
- Error text below input

**Supported interactions:**
- Text input
- Focus/blur for validation

**Supported validation:**
- Required field
- Minimum 1 character
- Can contain unicode (e.g., Polish characters)

**Types:** string

**Props:**
```typescript
interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}
```

---

### DescriptionTextarea

**Component description:** Textarea field for entering box description (contents). Supports character counter for UX feedback.

**Main elements:**
- `<label>` with `htmlFor`
- `<textarea>` with placeholder
- Character counter (e.g., "245 / 10,000")
- Error icon and text below
- Progress bar (optional) showing 80% (color change on warning)

**Supported interactions:**
- Text input
- Auto-resize textarea (optional)
- Focus/blur

**Supported validation:**
- Optional field
- Max 10,000 characters
- Real-time feedback on counter
- Warning color if > 80% (8,000 characters)

**Types:** string | null

**Props:**
```typescript
interface DescriptionTextareaProps {
  value: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  maxLength?: number; // default 10000
}
```

---

### TagInput

**Component description:** Combobox for managing box tags. Supports predefined tags (from workspace box history) and custom tags.

**Main elements:**
- `<label>` with `htmlFor`
- `<div role="combobox">` - container for interactive elements
- `<input>` for filtering/adding tags
- `<ul role="listbox">` with suggestions (predefined + recently used)
- Displayed tags as `<span>` or removable `<button>` elements
- Error icon and text below

**Supported interactions:**
- Text input → suggestions filtering
- Click suggestion or Enter → add tag
- Backspace in empty input → remove last tag
- Click X on tag → remove tag
- Ctrl+A → select all text
- Arrow keys → navigation in suggestions

**Supported validation:**
- Optional field
- Max 10 tags (UX recommendation)
- Each tag: 1-50 characters
- No duplicates (case-insensitive check)
- Only alphanumeric + -, _, spaces

**Types:** string[]

**Props:**
```typescript
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  suggestedTags?: string[]; // list of predefined tags from workspace
  maxTags?: number; // default 10
}
```

---

### LocationSelector

**Component description:** Location selector in tree/dropdown form. Displays hierarchical location structure with expand/collapse capability.

**Main elements:**
- `<label>` with `htmlFor`
- `<button>` to open tree/dropdown (trigger)
- Displayed selected location path (breadcrumb)
- Optional: dedicated modal/popover with tree view
  - Tree nodes: expand buttons, location names, box counts
  - "Unassigned" node for unassigned boxes
  - Loading state for lazy-loaded children
- Error icon and text below

**Supported interactions:**
- Click trigger → open tree/dropdown
- Click location node → selection
- Click expand icon → lazy load children
- Click outside tree → close
- Keyboard: Arrow Up/Down, Enter, Escape

**Supported validation:**
- Optional field (box can be without location)
- Selected location_id must exist and belong to workspace (server-side)
- Recursive loading: if parent_id provided, fetch only children

**Types:** LocationDto[], GetLocationsQuery

**Props:**
```typescript
interface LocationSelectorProps {
  value: string | null; // selected location_id
  onChange: (locationId: string | null) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  workspaceId: string;
  isLoading?: boolean;
}
```

---

### QRCodeSelector

**Component description:** Optional selector for assigning a free QR code to a box (if the box doesn't already have an assigned code in edit mode).

**Main elements:**
- `<label>` with `htmlFor`
- `<select>` or custom dropdown with list of available QR codes
- Displayed QR code short_id (format: QR-XXXXXX)
- Optional: QR code preview (SVG/canvas)
- `<button>` to generate new codes (if list empty)
- "No available codes" message (if empty)
- Error icon and text below

**Supported interactions:**
- Select from list → selection
- Click "Generate" → POST /qr-codes/batch
- Click preview → enlarge modal (optional)

**Supported validation:**
- Optional field
- Selected QR code must have "generated" status (server-side)
- Validation in create mode: can be null
- Validation in edit mode: if already assigned, readonly display

**Types:** QrCodeDetailDto[]

**Props:**
```typescript
interface QRCodeSelectorProps {
  value: string | null; // selected qr_code_id
  onChange: (qrCodeId: string | null) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  workspaceId: string;
  isLoading?: boolean;
  isEditing?: boolean; // if true, show current QR code read-only
  currentQRCode?: string; // display current QR in edit mode
}
```

---

### FormActions

**Component description:** Section with buttons at the bottom of the form (Save, Cancel, Delete).

**Main elements:**
- Container with flexbox for horizontal layout
- `<button type="submit">` Save/Create
- `<button type="button">` Cancel
- `<button type="button" variant="destructive">` Delete (edit mode only)
- Loading spinner on Save button during submission
- Disabled state on all buttons during submission

**Supported interactions:**
- Click Save → submit form
- Click Cancel → onCancel callback
- Click Delete → show confirmation dialog

**Types:** None (presentational)

**Props:**
```typescript
interface FormActionsProps {
  onSave?: () => void; // handled by form.onSubmit, but optional explicit
  onCancel: () => void;
  onDelete?: () => void; // if mode === 'edit'
  isSaving?: boolean;
  isDeleting?: boolean;
  mode: 'create' | 'edit';
  disabled?: boolean;
}
```

---

### ConfirmationDialog

**Component description:** Modal dialog for confirming dangerous operations (box deletion).

**Main elements:**
- Modal overlay
- Warning icon
- Title: "Delete box?"
- Text: "This action is irreversible. The box and all its data will be permanently deleted."
- `<input>` to type "DELETE" (optional, for extra safety)
- `<button variant="destructive">` Delete (disabled until confirmation text entered)
- `<button variant="outline">` Cancel

**Supported interactions:**
- Type confirmation text
- Click Delete → execute DELETE /boxes/:id
- Click Cancel → close dialog
- Escape key → close dialog

**Types:** None

**Props:**
```typescript
interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void; // trigger DELETE
  onCancel: () => void;
  isLoading?: boolean;
  boxName?: string; // display in text
}
```

---

## 5. Types

### CreateBoxRequest (existing in src/types.ts, repeated for clarity)

```typescript
interface CreateBoxRequest {
  workspace_id: string;        // required, UUID
  name: string;                // required, non-empty string
  description?: string | null; // optional, max 10,000 chars
  tags?: string[] | null;      // optional, array of tags
  location_id?: string | null; // optional, UUID of existing location
  qr_code_id?: string | null;  // optional, UUID of unassigned QR code
}
```

### UpdateBoxRequest (existing)

```typescript
type UpdateBoxRequest = Partial<Pick<Tables<"boxes">, "name" | "description" | "tags" | "location_id">>;

// In practice:
interface UpdateBoxRequestImpl {
  name?: string;               // optional on PATCH
  description?: string | null; // optional
  tags?: string[] | null;      // optional
  location_id?: string | null; // optional
}
```

### BoxFormState (new, ViewModel)

```typescript
interface BoxFormState {
  // Form fields
  name: string;
  description: string | null;
  tags: string[];
  location_id: string | null;
  qr_code_id: string | null;

  // UI state
  isLoading: boolean;        // while loading data in edit mode
  isSaving: boolean;         // during submit
  isDeleting: boolean;       // during delete
  isDirty: boolean;          // whether form has changed
  errors: Record<string, string>; // field-level errors

  // References
  availableLocations: LocationDto[];
  availableQRCodes: QrCodeDetailDto[];
  currentBox?: BoxDto; // in edit mode
}
```

### BoxFormValidationError (new)

```typescript
interface BoxFormValidationError {
  field: 'name' | 'description' | 'tags' | 'location_id' | 'qr_code_id';
  message: string;
}
```

### LocationTreeNode (new, for LocationSelector)

```typescript
interface LocationTreeNode extends LocationDto {
  children?: LocationTreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}
```

### TagSuggestion (new)

```typescript
interface TagSuggestion {
  value: string;
  count?: number; // how many boxes have this tag
  isRecent?: boolean; // from recent edits
}
```

---

## 6. State Management

### State Management Approach

Recommendation: **Combine React local state + custom hook** for BoxForm, with Nano Store for shared workspace context.

**React Local State (in BoxForm component):**
- Form fields (name, description, tags, location_id, qr_code_id)
- UI state (isLoading, isSaving, isDeleting, errors, isDirty)

**Custom Hook: `useBoxForm(mode, boxId?, workspaceId?)`**

```typescript
interface UseBoxFormReturn {
  // Form state
  formState: BoxFormState;
  setFormField: (field: keyof BoxFormState, value: any) => void;
  setErrors: (errors: Record<string, string>) => void;
  resetForm: () => void;

  // Actions
  submitForm: () => Promise<void>;
  deleteBox: () => Promise<void>;
  loadBoxData: () => Promise<void>; // for edit mode
  loadLocations: () => Promise<void>;
  loadAvailableQRCodes: () => Promise<void>;

  // Computed
  isFormValid: boolean;
  isSubmitDisabled: boolean;
}
```

**Nano Store (shared):**
- `workspaceStore` - current workspace_id, workspace info
- `userStore` - authenticated user info (optional)

### Data Fetching Strategy

1. **Init (mount):**
   - GET /locations?workspace_id=X (recursive) → cache in state
   - GET /qr-codes/batch? (list of available) or cache from previous page
   - If edit mode: GET /boxes/:id → pre-fill form

2. **On Changes:**
   - TagInput: debounced filter on suggestions
   - LocationSelector: lazy load children on expand

3. **On Submit:**
   - Validate client-side (Zod)
   - POST /boxes (create) or PATCH /boxes/:id (edit)
   - Handle errors from HTTP status + response body
   - Redirect or call onSuccess callback

4. **On Delete:**
   - Show confirmation dialog
   - DELETE /boxes/:id
   - Redirect

### Error State Management

Errors stored as:
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});
// e.g. { name: "Name cannot be empty", location_id: "Location not found" }
```

**Clearing errors:**
- On blur (field-level)
- On change (clear that field's error)
- On successful submit (clear all)

---

## 7. API Integration

### API Flow - Create Mode

**Step 1: Loading initial data (componentDidMount)**
```
GET /locations?workspace_id={workspaceId}
  → Response: LocationDto[]
  → Store in state.availableLocations
  → Build tree hierarchy on frontend

GET /qr-codes/... (no dedicated endpoint, fetch from storage or POST batch)
  → Response: list of available QR codes (status: "generated")
  → Store in state.availableQRCodes
```

**Step 2: User fills form**
- Real-time client-side validation
- Display errors below fields

**Step 3: User submits (Save button)**
```
POST /api/boxes
  Request: CreateBoxRequest {
    workspace_id: "{workspaceId}",
    name: "Winter Clothes",
    description: "Jackets and scarves from last winter",
    tags: ["winter", "clothes"],
    location_id: "{selectedLocationId}",
    qr_code_id: "{selectedQRCodeId}" // optional
  }

  Expected Response (201 Created):
  {
    id: "uuid",
    short_id: "X7K9P2mN4q",
    name: "Winter Clothes",
    workspace_id: "{workspaceId}",
    created_at: "2024-10-27T10:00:00Z"
  }

  Error Responses:
  - 400: Validation error (e.g., name empty)
    { "error": "Name cannot be empty" }
  - 401: Not authenticated
    { "error": "Unauthorized" }
  - 403: Workspace mismatch
    { "error": "No access to workspace" }
  - 404: Location or QR code not found
    { "error": "Location not found" }
  - 409: QR code already assigned
    { "error": "QR code already assigned to another box" }
```

**Step 4: Success handling**
- Show success toast/snackbar
- Call onSuccess callback with new box ID
- Navigate to /app/boxes/{newId} or /app/dashboard

**Step 5: Error handling**
- Parse response and extract error message
- Display error in modal or form-level error
- Keep form data for retry

---

### API Flow - Edit Mode

**Step 1: Loading box + data**
```
GET /boxes/{boxId}
  → Response: BoxDto (full data + location + qr_code)
  → Pre-fill form fields

GET /locations?workspace_id={workspaceId}
  → Response: LocationDto[]
  → Store in state.availableLocations
```

**Step 2: User modifies form**
- Validation as in create mode
- Track isDirty flag

**Step 3: User submits (Save button)**
```
PATCH /api/boxes/{boxId}
  Request: UpdateBoxRequest {
    name?: "Updated Winter Clothes",
    description?: "Updated description",
    tags?: ["updated", "tags"],
    location_id?: "{newLocationId}"
    // qr_code_id not updatable (only via GET /boxes/:id)
  }

  Expected Response (200 OK):
  {
    id: "{boxId}",
    name: "Updated Winter Clothes",
    updated_at: "2024-10-27T11:00:00Z"
  }

  Error Responses: as above (400, 401, 403, 404, 500)
```

**Step 4: Success handling**
- Show success toast
- Call onSuccess callback
- Refresh box details (optional)
- Navigate or close modal

---

### API Flow - Delete Mode

**Step 1: User clicks Delete button**
- Show ConfirmationDialog

**Step 2: User confirms (types "DELETE" and clicks Delete)**
```
DELETE /api/boxes/{boxId}
  Expected Response (200 OK):
  {
    message: "Box deleted successfully."
  }

  Error Responses:
  - 404: Box not found
    { "error": "Box not found" }
  - 500: Server error
    { "error": "Failed to delete box" }
```

**Step 3: Success handling**
- Close ConfirmationDialog
- Show success toast
- Call onSuccess callback
- Navigate to /app/dashboard (or previous page)

---

### Type Mappings

| API Endpoint | Request Type | Response Type | Frontend Handler |
|---|---|---|---|
| POST /boxes | CreateBoxRequest | CreateBoxResponse | createBox handler |
| PATCH /boxes/:id | UpdateBoxRequest | UpdateBoxResponse | updateBox handler |
| DELETE /boxes/:id | None | SuccessResponse | deleteBox handler |
| GET /locations | GetLocationsQuery (query params) | LocationDto[] | loadLocations handler |
| GET /boxes/:id | None | BoxDto | loadBoxData handler (edit mode) |
| GET /qr-codes/:short_id | None | QrCodeDetailDto | on scanning (not in form) |

---

## 8. User Interactions

### Scenario 1: New box (create mode)

1. User navigates to `/app/boxes/new`
2. BoxForm mounts, loads locations + available QR codes
3. Form is empty, Save button disabled (name required)
4. User types "Books" in Name field
5. Save button enabled
6. User adds description "Fantasy collection"
7. User clicks Location field → tree opens
8. User clicks Basement > Shelf A → selection
9. User types in Tag field "fantasy" → suggestion appears
10. User clicks suggestion → tag added
11. User types "books" → new tag added
12. User (optionally) selects QR code from list
13. User clicks Save button
14. Form submits POST /boxes
15. Success → toast, navigate to /app/boxes/{newId}
16. If error → error message in form, retry

---

### Scenario 2: Edit box (edit mode)

1. User navigates to `/app/boxes/{id}/edit`
2. BoxForm mounts, fetches locations + box data
3. Form pre-filled with box data (name, description, tags, location, qr_code)
4. User modifies description
5. isDirty flag = true
6. User changes location
7. User clicks Save
8. PATCH /boxes/{id} submits
9. Success → toast, redirect or close modal
10. If error → show error in form

---

### Scenario 3: Delete box (delete mode)

1. User is in `/app/boxes/{id}/edit`
2. User clicks Delete button (visible at bottom, destructive styling)
3. ConfirmationDialog opens
4. Dialog shows warning and instruction "Type DELETE to confirm"
5. User types "DELETE" in input
6. Confirm button becomes enabled
7. User clicks Confirm Delete
8. DELETE /boxes/{id} submits
9. Success → close dialog, toast, navigate to dashboard
10. If error → show error modal

---

### Scenario 4: Location selection via tree

1. User clicks Location field
2. Popover/modal opens with tree view
3. Root locations displayed (Basement, Garage, etc.)
4. User clicks expand arrow on Basement → children load (lazy)
5. Shelves visible
6. User clicks expand on Shelf A → more children
7. User clicks on "Shelf A > Top Shelf" location → selection
8. Popover closes, breadcrumb displays path
9. location_id updated in formState

---

### Scenario 5: Tag management

1. User clicks in Tag input
2. Input focused, showing recent/suggested tags
3. User types "win"
4. Filter updates, shows suggestions: ["winter", "window"]
5. User clicks "winter" → tag added
6. User types "clo" → filter shows ["clothes", "closet"]
7. User types full "clothes" and presses Enter → custom tag "clothes" added
8. User sees both tags as removable chips
9. User clicks X on "clothes" → removed
10. tags array updated

---

## 9. Conditions and Validation

### Client-Side Validation (Zod Schema)

```typescript
const BoxFormSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(255),
  description: z.string().max(10000, "Description cannot exceed 10,000 characters").nullable().optional(),
  tags: z.array(z.string().max(50)).max(10, "Maximum 10 tags").optional(),
  location_id: z.string().uuid("Invalid location ID").nullable().optional(),
  qr_code_id: z.string().uuid("Invalid QR code ID").nullable().optional(),
});
```

**Validation application:**
- On blur (field-level)
- On submit (entire form)
- Real-time on character counter (description)
- Real-time on tag duplicates

### Server-Side Validation (already implemented)

API endpoints validate:
- Name: required, non-empty
- Description: max 10,000 chars
- Tags: array of strings
- Location_id: must exist and belong to workspace (RLS)
- QR_code_id: must exist, status "generated" (server logic)

**Corresponding errors returned:**
- 400: Validation error
- 401: Not authenticated
- 403: Workspace forbidden
- 404: Location/QR not found
- 409: QR already assigned

### UI Conditions (conditional rendering)

| Condition | Element | Effect |
|---|---|---|
| mode === 'edit' | Delete button | Visible |
| mode === 'create' | Delete button | Hidden |
| isSaving === true | Save button | Disabled + loading spinner |
| errors.name exists | Name field | Red border, error text |
| isDirty === false && mode === 'edit' | Save button | Disabled |
| description.length > 8000 | Character counter | Warning color (yellow) |
| description.length === 10000 | Description input | Full, can't add more |
| availableLocations.length === 0 | Location field | "No locations" message |
| confirmDialog.inputValue !== "DELETE" | Confirm delete btn | Disabled |
| isLoading === true | Form | Opacity 0.5, disabled |

---

## 10. Error Handling

### Error Categories & Handling

**Validation Errors (400)**
- Field name empty: Show error below Name input
- Location doesn't exist: Show error below Location selector + log
- QR code already assigned: Show error below QR selector
- Description > 10k: Prevent typing (input maxLength)

Handler:
```typescript
if (error.status === 400) {
  const parsed = JSON.parse(error.body);
  setErrors({ [parsed.field]: parsed.message });
}
```

**Authentication Error (401)**
- User session expired
- Invalid JWT token

Handler:
```typescript
if (error.status === 401) {
  // Redirect to login
  window.location.href = '/login';
}
```

**Authorization Error (403)**
- User doesn't have access to workspace
- User doesn't have role for editing

Handler:
```typescript
if (error.status === 403) {
  showErrorModal("No access to this workspace");
}
```

**Not Found Error (404)**
- Box doesn't exist (edit mode)
- Location doesn't exist
- QR code doesn't exist

Handler:
```typescript
if (error.status === 404) {
  showErrorModal("Resources not found. Refresh and try again.");
  // Optionally navigate back
}
```

**Conflict Error (409)**
- QR code already assigned

Handler:
```typescript
if (error.status === 409) {
  setErrors({ qr_code_id: error.message });
  loadAvailableQRCodes(); // Refresh list
}
```

**Server Error (500)**
- Database error
- Unexpected error

Handler:
```typescript
if (error.status === 500) {
  showErrorModal("Server error. Try again later.");
  console.error(error);
}
```

**Network Errors**
- Timeout
- Connection lost
- CORS error

Handler:
```typescript
try {
  const response = await fetch(...);
} catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    showErrorModal("Connection error. Check your internet.");
  }
}
```

### Edge Cases

1. **User deletes location while editing box**
   - Location selector shows "Location deleted"
   - PATCH fails with 404
   - Handler suggests removing location_id

2. **QR code unassigned during submit**
   - POST submits, but QR already assigned by someone else
   - API returns 409
   - Handler: refresh available QRs, clear selection

3. **User switches tabs, workspace changes**
   - useEffect dependency on workspace_id
   - Reload form data

4. **Form submission timeout**
   - Set timeout: if request takes > 10s, show "still loading" message
   - Allow manual retry

5. **User navigates away with unsaved changes**
   - Check isDirty
   - Show confirmation dialog: "You have unsaved changes"

6. **Concurrent edits (edit mode)**
   - No optimistic locking mentioned
   - Last-write-wins approach
   - On conflict (version mismatch), show warning

---

## 11. Implementation Steps

### Phase 1: Setup & Structure

1. **Create Astro page file:** `src/pages/app/boxes/new.astro`
   - Import BoxForm React component
   - Pass props (mode: 'create', workspaceId from context)
   - Layout: centered card/panel

2. **Create Astro page file:** `src/pages/app/boxes/[id]/edit.astro`
   - Import BoxForm React component
   - Extract box ID from params
   - Pass props (mode: 'edit', boxId, workspaceId)

3. **Create folder:** `src/components/forms/`
   - All form components in this folder

---

### Phase 2: Basic Components

4. **Implement NameInput** (`src/components/forms/NameInput.tsx`)
   - Input field with label, error display
   - Handle onChange, onBlur
   - Placeholder: "e.g., Winter clothes"

5. **Implement DescriptionTextarea** (`src/components/forms/DescriptionTextarea.tsx`)
   - Textarea with label, error, character counter
   - Auto-resize (optional, can be fixed height)
   - Warning color if > 80%

6. **Implement TagInput** (`src/components/forms/TagInput.tsx`)
   - Combobox pattern (input + suggestions dropdown)
   - Suggestions: recent tags + filtered suggestions
   - Tag chips display + removable
   - Keyboard support (Enter, Backspace, Arrow keys)

7. **Implement LocationSelector** (`src/components/forms/LocationSelector.tsx`)
   - Button trigger showing selected breadcrumb
   - Dedicated modal/popover with tree view
   - Lazy load children on expand
   - Handle "Unassigned" node

8. **Implement QRCodeSelector** (`src/components/forms/QRCodeSelector.tsx`)
   - Dropdown/combobox with available QR codes
   - Display short_id (QR-XXXXXX format)
   - Optional "Generate batch" button

---

### Phase 3: Main Components

9. **Implement FormActions** (`src/components/forms/FormActions.tsx`)
   - Save, Cancel, Delete buttons
   - Loading state, disabled state
   - Conditional rendering Delete button

10. **Implement ConfirmationDialog** (`src/components/forms/ConfirmationDialog.tsx`)
    - Modal dialog for delete confirmation
    - Input field for "DELETE" confirmation text
    - Warning icon + messaging

11. **Implement custom hook: useBoxForm** (`src/components/forms/useBoxForm.ts`)
    - Manage form state (fields + UI state)
    - Validate with Zod
    - API communication (POST, PATCH, DELETE)
    - Load data (GET /locations, GET /boxes/:id)

12. **Implement BoxForm** (`src/components/forms/BoxForm.tsx`)
    - Main component, orchestrating all fields
    - Use useBoxForm hook
    - Render all fields + actions
    - Form submission handler
    - Error handling + displays

---

### Phase 4: Integration & Styling

13. **Implement LocationTree** (`src/components/forms/LocationTree.tsx`)
    - Recursive tree rendering
    - Expand/collapse logic
    - Lazy load children from GET /locations?parent_id=X

14. **Add Tailwind styling** to all components
    - Color scheme: red for errors, yellow for warnings, blue for primary actions
    - Responsive design: mobile-friendly
    - Accessibility: focus states, high contrast

15. **Implement error handling & toasts**
    - Error toast on validation errors
    - Success toast on successful submit/delete
    - Use existing toast component (from Shadcn/ui)

16. **Implement loading states & spinners**
    - Show spinner on Save button during submission
    - Disable form fields during loading

---

### Phase 5: Testing & Refinement

17. **Test create flow:**
    - Navigate to /app/boxes/new
    - Fill form, submit, verify POST /boxes called
    - Verify error handling (validation, network, API)
    - Verify redirect on success

18. **Test edit flow:**
    - Navigate to /app/boxes/[id]/edit
    - Verify form pre-filled (GET /boxes/:id)
    - Modify fields, submit, verify PATCH /boxes/:id
    - Verify isDirty logic + disable Save when not dirty

19. **Test delete flow:**
    - Click Delete button in edit mode
    - Verify ConfirmationDialog appears
    - Try to confirm without "DELETE" text (should be disabled)
    - Confirm delete, verify DELETE /boxes/:id
    - Verify redirect on success

20. **Test edge cases:**
    - Navigate away with unsaved changes (show confirmation)
    - Timeout during submission (show message, allow retry)
    - Error scenarios (401, 403, 404, 409, 500)
    - Location tree performance (lazy loading)
    - Tag input edge cases (duplicates, special chars)

21. **Accessibility testing:**
    - All form fields have labels
    - Error messages associated with inputs (aria-describedby)
    - Keyboard navigation (Tab, Shift+Tab, Enter, Escape)
    - Screen reader testing (labels, role attributes)

22. **Browser testing:**
    - Chrome, Firefox, Safari
    - Mobile browsers (iOS Safari, Chrome Mobile)
    - Responsive design breakpoints

---

### Phase 6: Documentation & Code Review

23. **Document component interfaces**
    - JSDoc comments on Props
    - Explain complex logic (e.g., lazy loading)

24. **Code review with team**
    - Verify adherence to coding guidelines (CLAUDE.md)
    - Consistency with existing patterns
    - Performance optimizations (memoization)

25. **Deploy & Monitor**
    - Deploy to staging
    - Test on staging environment
    - Monitor errors in production (Sentry, logs)
