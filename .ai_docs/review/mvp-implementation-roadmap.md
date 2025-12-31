# MVP Implementation Roadmap

## Overview
This document provides a detailed implementation plan for the MVP release of Storage & Box Organizer. It prioritizes features based on user flow dependencies and development complexity.

---

## Frontend Implementation Phases

### Phase 1: Authentication & Core Navigation (Week 1)
**Objective:** Enable users to create accounts and access the application

#### Features:
- **US-001: Login & Registration Pages**
  - Email/Password registration form
  - Email/Password login form
  - Form validation (email format, password strength 8+ chars)
  - Error handling and display
  - Session management (JWT token in localStorage)
  - Redirect authenticated users to /app

#### Components to Build:
- `LoginPage.tsx` - Login form with email/password inputs
- `RegisterPage.tsx` - Registration form with confirmation
- `AuthService` - Handle auth API calls to Supabase
- `useAuth()` hook - Auth state management with Nano Stores
- `ProtectedRoute.tsx` - Route guard for authenticated pages
- Middleware update - Session validation

#### Backend Requirement:
- ✅ Supabase Auth is already configured
- JWT token handling via Supabase

---

### Phase 2: Dashboard & Search (Week 1-2)
**Objective:** Users can search and find boxes by name, description, tags

#### Features:
- **US-010: Live Search**
  - Search input component with debounce (300ms)
  - Real-time results dropdown
  - Minimum 3 characters before search
  - Display: box name + location breadcrumb
  - Click result → navigate to box details

#### Components to Build:
- `Dashboard.astro` - Main app layout
- `SearchInput.tsx` - Search component with debounce
- `SearchResults.tsx` - Results dropdown/list
- `BoxList.tsx` - Display boxes in results
- Pagination support (limit: 50)

#### Backend Already Ready:
- ✅ `GET /api/boxes?workspace_id=X&q=search_term`
- Full-text search via search_vector

#### Acceptance Criteria:
- Search works with 3+ characters
- Results appear within 100ms (visual feedback)
- Can click result to go to box details

---

### Phase 3: Location Management (Week 2)
**Objective:** Users can create and manage hierarchical locations

#### Features:
- **US-003: Add Locations**
  - Create location with name and optional description
  - Support nested locations (max 5 levels deep)
  - Visual tree view showing hierarchy

- **US-004: Delete Locations**
  - Soft delete with user confirmation
  - Show warning: "Boxes in this location will be moved to Unassigned"
  - Display unassigned boxes after deletion

#### Components to Build:
- `LocationTree.tsx` - Hierarchical tree view
- `LocationForm.tsx` - Add/edit location modal
- `AddLocationButton.tsx` - Trigger modal
- `DeleteLocationConfirm.tsx` - Confirmation dialog
- `ConfirmationDialog.tsx` - Reusable confirmation component

#### Backend Already Ready:
- ✅ `GET /api/locations?workspace_id=X`
- ✅ `POST /api/locations` (create)
- ✅ `PATCH /api/locations/:id` (update)
- ✅ `DELETE /api/locations/:id` (soft delete)

#### UI Design Notes:
- Desktop-first: Tree on left sidebar or collapsible panel
- Show "Unassigned Boxes" as virtual location
- Support expand/collapse for each node

---

### Phase 4: Box Management - Core CRUD (Week 2-3)
**Objective:** Users can create, view, edit, and delete boxes

#### Features:
- **US-006: Create Box (via QR Scan)**
  - QR redirect page: `/qr/:short_id`
  - Logic: If QR unassigned → Show new box form with pre-filled ID
  - If QR assigned → Redirect to box details

- **US-007: Box Form (Name, Description, Tags)**
  - Name field (required, string)
  - Description field (max 10,000 chars, textarea)
  - Tags input (comma-separated or combobox from existing tags)
  - Location selector (dropdown or tree)
  - Save/Cancel buttons

- **US-008: Box Details Page**
  - Display: name, description, tags
  - Show full location breadcrumb
  - Edit button
  - Delete button with confirmation

- **US-009: Move Box to Different Location**
  - Location selector in edit form
  - Update location_id on save

#### Components to Build:
- `QrRedirect.astro` - Server-side redirect logic
- `BoxForm.tsx` - Create/edit form
- `BoxDetails.tsx` - Display box info
- `TagInput.tsx` - Tag management combobox
- `LocationSelector.tsx` - Hierarchical location picker
- `DeleteBoxConfirm.tsx` - Delete confirmation

#### Backend Already Ready:
- ✅ `GET /api/qr-codes/:short_id` (scan logic)
- ✅ `POST /api/boxes` (create)
- ✅ `GET /api/boxes/:id` (details)
- ✅ `PATCH /api/boxes/:id` (update)
- ✅ `DELETE /api/boxes/:id` (delete)

#### UI Design Notes:
- Form validation on client and server
- Show loading state during API calls
- Toast notifications for success/error
- Unassigned boxes can have location_id = NULL

---

### Phase 5: QR Code Generation (Week 3)
**Objective:** Users can generate QR codes for printing

#### Features:
- **US-005: QR Generator Page**
  - Input: quantity of codes (1-100)
  - Generate button → calls batch endpoint
  - Display: table/grid of generated QR codes
  - Each code shows: QR visual + text ID
  - Print functionality: window.print() for A4 layout

#### Components to Build:
- `QrGenerator.tsx` - Main generator page
- `QrCodeDisplay.tsx` - Single QR code display
- `QrCodeGrid.tsx` - Grid of all generated codes
- CSS: Printable layout (3 columns × 7 rows for A4)

#### Backend Already Ready:
- ✅ `POST /api/qr-codes/batch` (generate batch)
- Supabase returns QR short_ids

#### Implementation Details:
- Generate QR visuals client-side using: react-qr-code
- Layout: 3 columns, 7 rows = 21 codes per A4 sheet
- Print CSS: `@media print { ... }`
- No PDF library needed (print dialog handles it)

---

## Component Library Setup

### Global Components (to be built in Phase 1-5):
```
src/components/
├── ui/                    # Shadcn/ui components
│   ├── Button.tsx         # ✅ Already exists
│   ├── Input.tsx          # Form inputs
│   ├── Textarea.tsx       # Text area
│   ├── Dialog.tsx         # Modal dialogs
│   ├── Dropdown.tsx       # Dropdowns
│   └── Toast.tsx          # Notifications
├── SearchInput.tsx        # Phase 2
├── LocationTree.tsx       # Phase 3
├── LocationForm.tsx       # Phase 3
├── BoxForm.tsx           # Phase 4
├── BoxDetails.tsx        # Phase 4
├── TagInput.tsx          # Phase 4
├── LocationSelector.tsx  # Phase 4
├── QrCodeDisplay.tsx     # Phase 5
├── QrCodeGrid.tsx        # Phase 5
├── ConfirmationDialog.tsx# Phase 3-4
├── Navigation.tsx        # Global nav (Phase 1)
└── Layout.tsx            # Main layout wrapper
```

---

## State Management Setup

### Nano Stores Structure:
```typescript
// auth.store.ts
export const authStore = map({
  user: null,
  token: null,
  workspaceId: null,
  isLoading: false,
  error: null,
});

// ui.store.ts
export const uiStore = map({
  searchQuery: '',
  selectedLocationId: null,
  selectedBoxId: null,
  isDarkMode: false,
});
```

---

## API Integration Checklist

### Already Implemented (Backend Ready):
- ✅ User authentication (Supabase Auth)
- ✅ Workspace creation on signup
- ✅ Location CRUD
- ✅ Box CRUD
- ✅ QR code generation (batch)
- ✅ QR code lookup (scan)
- ✅ Search with full-text indexing

### Frontend API Layer Needed:
- AuthService (login, register, logout)
- BoxesService (CRUD + search)
- LocationsService (CRUD + tree)
- QrCodesService (batch generate, lookup)

---

## Testing Strategy

### Phase Completion Criteria:
Each phase must have:
1. Happy path working (core flow)
2. Error handling for API failures
3. Form validation
4. Navigation between pages
5. Accessibility basics (semantic HTML, ARIA)

### Manual Testing:
- Test on Chrome/Firefox/Safari
- Test with different screen sizes (desktop focus)
- Test error scenarios (offline, API errors)
- Test QR code scanning (use browser dev tools or actual QR scanner)

---

## Deployment Milestones

| Phase | Timeline | Deploy Target |
|-------|----------|----------------|
| Phase 1 (Auth) | Week 1 | Staging |
| Phase 2 (Search) | Week 1-2 | Staging |
| Phase 3 (Locations) | Week 2 | Staging |
| Phase 4 (Boxes) | Week 2-3 | Staging |
| Phase 5 (QR Gen) | Week 3 | MVP Release |

---

## Success Metrics (from PRD)

By end of MVP, we should see:
1. ✅ Users can add boxes in <45 seconds
2. ✅ Search results appear instantly
3. ✅ QR codes generate and print
4. ✅ No 404s on box details after scan
5. ✅ All CRUD operations working

---

## Known Gaps (Post-MVP)

- Mobile responsive optimization
- Dark mode
- OAuth (Google, Apple)
- Export to CSV
- Account deletion
- Password recovery

---

## Questions for PM

1. ✅ **Desktop-first UI** - Confirmed
2. ✅ **QR printing** - Minimal implementation (browser print dialog)
3. ✅ **Auth method** - Email/password only for MVP
4. What's the priority if we finish early? (dark mode, export, etc.)
5. Should we add skeleton loaders for better UX?
6. Any preference on error toast vs inline errors?

