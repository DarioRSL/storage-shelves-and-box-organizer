# 📋 ACTION PLAN - Zaplanowana ścieżka wyeksekwowania (2-12 stycznia 2026)

**Dokument:** Action Plan dla Storage & Box Organizer MVP
**Data utworzenia:** 31 grudnia 2025
**Okres:** 2 stycznia - 12 stycznia 2026 (11 dni)
**Status:** READY FOR EXECUTION

---

## 🎯 GŁÓWNE CELE

| # | Cel | Status | Target Date | Owner |
|---|-----|--------|-------------|-------|
| 1 | Napraw wszystkie linting errors | 📌 URGENT | 2025-12-31 EOD | Dario |
| 2 | Dokończ Phase 3 (Modals) | 🔨 IN PROGRESS | 2026-01-02 | Dario |
| 3 | Wdrożyć Phase 4 (Box Management) | 🚀 PLANNED | 2026-01-05 | Dario |
| 4 | Wdrożyć Phase 5A (QR Generator) | 🚀 PLANNED | 2026-01-05 | TBD |
| 5 | Wdrożyć Phase 5B (Settings) | 🚀 PLANNED | 2026-01-08 | TBD |
| 6 | Wdrożyć Phase 6 (Testing & Polish) | 🚀 PLANNED | 2026-01-12 | TBD |

---

## 📅 WEEKEND 1: 31 grudnia 2025 - 2 stycznia 2026

### ZADANIE 1.1: Napraw Linting Errors (PRIORITY 1)
**Zespół:** Dario SL
**Szacunkowy czas:** 30-45 minut
**Data:** 31 grudnia 2025 (dzisiaj)

#### Kroki:
```bash
# 1. Auto-fix with prettier
npm run lint:fix

# 2. Manually fix issues:
```

**Plik 1:** `src/components/AuthLayout.tsx`
- Usuń console.logs z linii: 30, 34, 43, 47, 50, 55
- Usuń zbędne newlines w formatowaniu

**Plik 2:** `src/components/dashboard/BoxEditorModal.tsx`
- Usuń console.log z linii 76

**Plik 3:** `src/components/dashboard/BoxListItem.tsx`
- Usuń unused variable `isHovered` z linii 23

**Plik 4:** `src/components/dashboard/DashboardContainer.tsx`
- Usuń unused imports: `LocationTreeNode`, `BoxListItem` (linie 16-17)

#### Weryfikacja:
```bash
# 3. Verify no errors remain
npm run lint

# Expected output:
# ✅ No errors found
# 0 errors, 0 warnings in X files
```

#### Deliverable:
- ✅ Wszystkie pliki skomitowane
- ✅ Brak linting errors
- ✅ `npm run lint` passes

---

### ZADANIE 1.2: Complete Phase 3 - LocationSelector Component
**Zespół:** Dario SL
**Szacunkowy czas:** 2-3 godziny
**Data:** 1 stycznia 2026

#### Co robić:
Stwórz plik: `src/components/dashboard/LocationSelector.tsx`

**Wymagania:**
- Tree picker komponent (recursive)
- Expand/collapse dla lokacji
- Selection + radio button
- Validation (nie można wybrać lokacji na >level 5)
- Używany w LocationEditorModal i BoxEditorModal

**Implementacja:**
```typescript
interface LocationSelectorProps {
  workspaceId: string;
  selectedLocationId?: string | null;
  onSelect: (locationId: string | null) => void;
  maxLevel?: number; // default 5
  excludeLocationId?: string; // exclude current when editing
}

// Komponenty:
// - LocationSelectorRoot (recursive, treats root as level 0)
// - LocationSelectorNode (item w tree)
// - Ikony: ChevronDown, MapPin, AlertCircle
```

**Test Cases:**
- ✅ Load locations on mount
- ✅ Expand/collapse works
- ✅ Selection works
- ✅ Max level validation
- ✅ Integration z LocationEditorModal

---

### ZADANIE 1.3: Complete Phase 3 - QRCodeSelector Component
**Zespół:** Dario SL
**Szacunkowy czas:** 1.5-2 godziny
**Data:** 1 stycznia 2026

#### Co robić:
Stwórz plik: `src/components/dashboard/QRCodeSelector.tsx`

**Wymagania:**
- Dropdown komponent
- Fetch available QR codes (status = 'generated')
- Display QR code ID + status
- Select one
- Używany w BoxEditorModal

**Implementacja:**
```typescript
interface QRCodeSelectorProps {
  workspaceId: string;
  selectedQRCodeId?: string | null;
  onSelect: (qrCodeId: string) => void;
  disabled?: boolean;
}

// Komponenty:
// - QRCodeDropdown (shadcn/ui Select based)
// - QRCodeOption (item w dropdown)
// - Status badges (generated/assigned)
```

**Test Cases:**
- ✅ Load QR codes on mount
- ✅ Filter by workspace
- ✅ Show only 'generated' status
- ✅ Selection works
- ✅ Disabled state
- ✅ Integration z BoxEditorModal

---

### ZADANIE 1.4: Integrate Modals into DashboardContainer
**Zespół:** Dario SL
**Szacunkowy czas:** 2-3 godziny
**Data:** 1 stycznia 2026

#### Co robić:
Zaktualizuj: `src/components/dashboard/DashboardContainer.tsx`

**Wymagania:**
- Hook up all modal state (isLocationEditorOpen, isBoxEditorOpen, etc.)
- Connect buttons to modals (from context menu)
- Pass callbacks (onSubmit, onCancel)
- Handle API responses
- Refetch data after successful operations

**Struktura State Management:**
```typescript
// Modal states
const [activeModal, setActiveModal] = useState<'location' | 'box' | null>(null);
const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
const [selectedItem, setSelectedItem] = useState<any | null>(null);

// Context actions
const contextValue = {
  openLocationEditor: (mode, parentId?, itemId?) => {...},
  closeLocationEditor: () => {...},
  submitLocationEditor: async (data) => {...},
  openBoxEditor: (mode, itemId?) => {...},
  closeBoxEditor: () => {...},
  submitBoxEditor: async (data) => {...},
};
```

**Test Cases:**
- ✅ LocationEditorModal opens on button click
- ✅ Create location flow: form submit → API → refetch → close
- ✅ Edit location flow: pre-fill → submit → refetch → close
- ✅ Delete location: confirm → API → refetch
- ✅ BoxEditorModal opens
- ✅ Create box flow: complete
- ✅ Edit box flow: complete
- ✅ Delete box: confirm → API → refetch

---

### ZADANIE 1.5: Phase 3 Quality Gate Sign-off
**Zespół:** Dario SL + QA
**Szacunkowy czas:** 1 godzina
**Data:** 2 stycznia 2026

#### Checklist:
```
Phase 3: Dashboard Modals & Utilities

✅ All components created:
  - [ ] LocationEditorModal.tsx (from Phase 2)
  - [ ] BoxEditorModal.tsx (from Phase 2)
  - [ ] LocationSelector.tsx (NEW)
  - [ ] QRCodeSelector.tsx (NEW)
  - [ ] DeleteConfirmationDialog.tsx (reuse from shared)

✅ Functional testing:
  - [ ] Create location: form → API call → list updates
  - [ ] Edit location: pre-fill → edit → API → list updates
  - [ ] Delete location: confirm dialog → API → list updates
  - [ ] Create box: form → API call → list updates
  - [ ] Edit box: pre-fill → edit → API → list updates
  - [ ] Delete box: confirm dialog → API → list updates

✅ Validation:
  - [ ] Location name required
  - [ ] Box name required
  - [ ] Max level validation (5 levels)
  - [ ] Tags limit (10 max)
  - [ ] Description limit (10k chars)

✅ Error handling:
  - [ ] API error messages display
  - [ ] Network error handling
  - [ ] Validation error messages
  - [ ] Retry logic works

✅ UI/UX:
  - [ ] Loading states during submission
  - [ ] Disabled buttons during loading
  - [ ] Modal animations smooth
  - [ ] Success notifications (if toast added)

✅ Code quality:
  - [ ] npm run lint passes
  - [ ] npm run build succeeds
  - [ ] No TypeScript errors
  - [ ] Components are memoized (React.memo)

✅ Accessibility:
  - [ ] Form labels associated
  - [ ] ARIA attributes present
  - [ ] Keyboard navigation works
  - [ ] Focus management correct

SIGN-OFF:
- [ ] Developer: Dario SL
- [ ] QA: TBD
- [ ] Tech Lead: TBD
- Date: 2026-01-02
```

#### Deliverable:
- ✅ Phase 3 complete
- ✅ All tests passing
- ✅ Ready to merge
- ✅ Quality Gate 3 PASSED

---

## 📅 WEEKEND 2: 3-5 stycznia 2026

### ZADANIE 2.1: Start Phase 4 Branch & Setup Pages
**Zespół:** Dario SL
**Szacunkowy czas:** 2-3 godziny
**Data:** 3 stycznia 2026

#### Co robić:
```bash
# 1. Create new branch
git checkout -b fb_phase_4_box_management

# 2. Create page files:
touch src/pages/app/boxes/new.astro
touch src/pages/app/boxes/[id].astro
touch src/pages/app/boxes/[id]/edit.astro

# 3. Create component files:
touch src/components/box/BoxDetailsContent.tsx
touch src/components/box/BoxForm.tsx
touch src/components/box/NameInput.tsx
touch src/components/box/DescriptionTextarea.tsx
touch src/components/box/TagInput.tsx
```

#### Struktura:
```
src/pages/app/boxes/
├── new.astro                 # Create new box
├── [id]/
│   ├── index.astro          # Details page
│   └── edit.astro           # Edit page

src/components/box/
├── BoxDetailsContent.tsx     # Display box data
├── BoxForm.tsx              # Universal form (create/edit)
├── NameInput.tsx            # Form field
├── DescriptionTextarea.tsx  # Form field
└── TagInput.tsx             # Form field
```

---

### ZADANIE 2.2: Implement Box Details Page
**Zespół:** Dario SL
**Szacunkowy czas:** 6-8 godzin
**Data:** 3-4 stycznia 2026

#### Plik: `src/pages/app/boxes/[id].astro`
```astro
---
export const prerender = false;

// Get box ID from URL params
const { id } = Astro.params;
if (!id) return Astro.redirect('/app');

// Check auth
if (!Astro.locals.user) return Astro.redirect('/login');
---

<MainLayout title="Box Details">
  <BoxDetailsView client:load boxId={id} />
</MainLayout>
```

#### Komponent: `src/components/box/BoxDetailsContent.tsx`
**Features:**
- Fetch box via `GET /api/boxes/:id`
- Display all data:
  - Box name
  - Description
  - Location breadcrumb
  - Tags
  - QR code (with react-qr-code)
  - Created/updated timestamps
  - Owner info
- Buttons:
  - Edit → navigate to edit page
  - Delete → confirmation → DELETE /api/boxes/:id → redirect
  - Print QR → print QR code
  - Back → navigate to /app
- States:
  - Loading spinner
  - Error alert
  - 404 if not found

**Implementation:**
```typescript
export function BoxDetailsContent({ boxId }: BoxDetailsContentProps) {
  // 1. Fetch box data
  const { data: box, isLoading, error } = useFetchData(`/api/boxes/${boxId}`);

  // 2. Handle loading/error
  if (isLoading) return <LoadingSpinner />;
  if (error || !box) return <ErrorAlert error={error?.message} />;

  // 3. Delete handler
  const handleDelete = async () => {
    await apiClient.delete(`/api/boxes/${boxId}`);
    window.location.href = '/app';
  };

  // 4. Render
  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <button onClick={() => history.back()}>← Back</button>
        <h1>{box.name}</h1>
      </header>

      <section className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Box details */}
          <Card>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Location</h3>
                <Breadcrumb path={box.location_path} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Description</h3>
                <p>{box.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {box.tags?.map(tag => <Badge key={tag}>{tag}</Badge>)}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <aside>
          {/* QR code */}
          <Card className="text-center">
            <QRCode value={box.qr_code_id} size={200} />
            <p className="text-sm font-mono">{box.qr_code_id}</p>
            <button onClick={handlePrint}>Print QR</button>
          </Card>

          {/* Actions */}
          <Card className="space-y-2">
            <Link href={`/app/boxes/${box.id}/edit`}>
              <Button>Edit</Button>
            </Link>
            <Button onClick={handleDeleteClick} variant="destructive">
              Delete
            </Button>
          </Card>
        </aside>
      </section>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        title="Delete Box?"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
```

---

### ZADANIE 2.3: Implement Box Form (Create/Edit)
**Zespół:** Dario SL
**Szacunkowy czas:** 8-10 godzin
**Data:** 4-5 stycznia 2026

#### Plik: `src/pages/app/boxes/new.astro` (Create)
```astro
---
export const prerender = false;
if (!Astro.locals.user) return Astro.redirect('/login');
---

<MainLayout title="Create Box">
  <BoxFormPage client:load mode="create" />
</MainLayout>
```

#### Plik: `src/pages/app/boxes/[id]/edit.astro` (Edit)
```astro
---
export const prerender = false;
const { id } = Astro.params;
if (!id || !Astro.locals.user) return Astro.redirect('/login');
---

<MainLayout title="Edit Box">
  <BoxFormPage client:load mode="edit" boxId={id} />
</MainLayout>
```

#### Komponent: `src/components/box/BoxForm.tsx`
**Features:**
- Universal form (create/edit mode via prop)
- Fields:
  - Name (required, 1-255 chars)
  - Description (optional, 0-10000 chars, with counter)
  - Tags (optional, max 10, with autocomplete from workspace history)
  - Location (required, via LocationSelector)
  - QR Code (optional, via QRCodeSelector)
- Validation with Zod
- Form state with useForm hook
- API call (POST for create, PATCH for edit)
- Success → redirect to /app
- Error handling → display error alert
- Delete button (edit mode only)
- Character counter for description
- Tag suggestions (fetch from workspace box history)

**Implementation:**
```typescript
export function BoxForm({ mode, boxId }: BoxFormProps) {
  const [locations, setLocations] = useState([]);
  const [qrCodes, setQRCodes] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);

  // 1. Fetch data (locations, QR codes, tag suggestions, box data if edit)
  useEffect(() => {
    const workspaceId = currentWorkspaceId.get();
    if (mode === 'edit' && boxId) {
      // Fetch box data for pre-fill
      fetchBox(boxId);
    }
    fetchLocations(workspaceId);
    fetchQRCodes(workspaceId);
    fetchTagSuggestions(workspaceId);
  }, [mode, boxId]);

  // 2. Setup form
  const form = useForm({
    initialValues: {
      name: box?.name || '',
      description: box?.description || '',
      tags: box?.tags || [],
      location_id: box?.location_id || '',
      qr_code_id: box?.qr_code_id || '',
    },
    validationSchema: boxFormSchema,
    onSubmit: handleSubmit,
  });

  // 3. Handle submit
  async function handleSubmit(values) {
    const payload = {
      ...values,
      workspace_id: currentWorkspaceId.get(),
    };

    if (mode === 'create') {
      await apiClient.post('/api/boxes', payload);
    } else {
      await apiClient.patch(`/api/boxes/${boxId}`, payload);
    }

    // Redirect to box details
    window.location.href = `/app/boxes/${response.id}`;
  }

  // 4. Render form
  return (
    <div className="container max-w-2xl mx-auto p-6">
      <h1>{mode === 'create' ? 'Create Box' : 'Edit Box'}</h1>

      <form onSubmit={form.handleSubmit} className="space-y-6">
        <NameInput
          label="Box Name"
          value={form.values.name}
          onChange={(v) => form.setFieldValue('name', v)}
          error={form.touched.name ? form.errors.name : undefined}
        />

        <DescriptionTextarea
          label="Description"
          value={form.values.description}
          onChange={(v) => form.setFieldValue('description', v)}
          maxLength={10000}
          showCounter
          error={form.touched.description ? form.errors.description : undefined}
        />

        <TagInput
          label="Tags"
          value={form.values.tags}
          onChange={(v) => form.setFieldValue('tags', v)}
          suggestions={tagSuggestions}
          maxTags={10}
        />

        <LocationSelector
          label="Location"
          value={form.values.location_id}
          onSelect={(v) => form.setFieldValue('location_id', v)}
          locations={locations}
        />

        <QRCodeSelector
          label="QR Code"
          value={form.values.qr_code_id}
          onSelect={(v) => form.setFieldValue('qr_code_id', v)}
          qrCodes={qrCodes}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={!form.isDirty || form.isSubmitting}>
            {form.isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
          </Button>
          <Button variant="outline" onClick={() => history.back()}>
            Cancel
          </Button>
          {mode === 'edit' && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>

        {form.error && <ErrorAlert error={form.error} />}
      </form>
    </div>
  );
}
```

#### Form Field Components:
- `NameInput.tsx` - Text input z validation
- `DescriptionTextarea.tsx` - Textarea z character counter
- `TagInput.tsx` - Tag input z autocomplete + suggestions

---

### ZADANIE 2.4: Phase 4 Quality Gate
**Zespół:** Dario SL + QA
**Szacunkowy czas:** 1 godzina
**Data:** 5 stycznia 2026

#### Checklist:
```
Phase 4: Box Management

✅ Pages created:
  - [ ] /app/boxes/new (create)
  - [ ] /app/boxes/[id] (details)
  - [ ] /app/boxes/[id]/edit (edit)

✅ Components created:
  - [ ] BoxDetailsContent.tsx
  - [ ] BoxForm.tsx
  - [ ] NameInput.tsx
  - [ ] DescriptionTextarea.tsx
  - [ ] TagInput.tsx

✅ Functional testing:
  - [ ] Details page: load box → display → edit button → navigate
  - [ ] Create page: fill form → submit → API → redirect
  - [ ] Edit page: load → pre-fill → edit → submit → API → redirect
  - [ ] Delete: confirm → API → redirect to /app

✅ Form validation:
  - [ ] Name required
  - [ ] Description max 10k chars
  - [ ] Tags max 10
  - [ ] Location required
  - [ ] Character counter works
  - [ ] Tag autocomplete works

✅ Error handling:
  - [ ] API errors display
  - [ ] Network errors handled
  - [ ] Validation errors show

✅ Code quality:
  - [ ] npm run lint passes
  - [ ] No TypeScript errors
  - [ ] Components memoized
  - [ ] No console.logs

SIGN-OFF:
- [ ] Developer: Dario SL
- [ ] QA: TBD
```

---

## 📅 WEEKEND 3: 6-8 stycznia 2026

### ZADANIE 3.1: Phase 5A - QR Generator (PARALLEL)
**Zespół:** Developer #2 (TBD)
**Szacunkowy czas:** 10-12 godzin
**Data:** 6-7 stycznia 2026

#### Overview:
- Create `/app/qr-generator` page
- Form with quantity input (1-100)
- Generate via POST /api/qr-codes/batch
- Create PDF with A4 layout (4x5 grid = 20 per page)
- Auto-download

#### Page: `src/pages/app/qr-generator.astro`
```astro
---
export const prerender = false;
if (!Astro.locals.user) return Astro.redirect('/login');
---

<MainLayout title="QR Code Generator">
  <QRGeneratorView client:load />
</MainLayout>
```

#### Components:
1. **QRGeneratorView.tsx** - Main container
2. **QRGeneratorForm.tsx** - Form with quantity input
3. **GenerateButton.tsx** - Generate button with loading state
4. **InstructionsPanel.tsx** - Instructions for printing
5. **useQRCodeGeneration.ts** - Hook for POST /api/qr-codes/batch
6. **usePDFGeneration.ts** - Hook for PDF generation (jsPDF)

#### Implementation Steps:
1. Create form with number input (1-100)
2. On submit:
   - Call POST /api/qr-codes/batch with quantity
   - Get array of QR code objects
   - Generate PDF (jsPDF):
     - A4 size (210x297mm)
     - 4 columns x 5 rows = 20 QR codes per page
     - Add borders, numbers, cutting lines
   - Download PDF with filename: `qr-codes-{date}.pdf`
3. Error handling
4. Success message

#### Libraries to install:
```bash
npm install jspdf qrcode
npm install --save-dev @types/jspdf
```

---

### ZADANIE 3.2: Phase 5B - Settings View (PARALLEL)
**Zespół:** Developer #3 (TBD)
**Szacunkowy czas:** 12-15 godzin
**Data:** 6-8 stycznia 2026

#### Overview:
- Create `/app/settings` page
- Workspace management (list, create, edit, delete)
- Theme toggle (light/dark/system)
- Data export
- Account management
- Logout

#### Page: `src/pages/app/settings.astro`
```astro
---
export const prerender = false;
if (!Astro.locals.user) return Astro.redirect('/login');
---

<MainLayout title="Settings">
  <SettingsView client:load />
</MainLayout>
```

#### Components:
1. **SettingsView.tsx** - Main container
2. **ProfileHeader.tsx** - User profile section
3. **WorkspaceManagementSection.tsx** - Workspace list + buttons
4. **WorkspaceCard.tsx** - Single workspace card
5. **WorkspaceCreateModal.tsx** - Create workspace modal
6. **WorkspaceEditModal.tsx** - Edit workspace modal
7. **ThemeToggle.tsx** - Light/dark toggle
8. **ExportDataButton.tsx** - Export to CSV
9. **DangerZoneSection.tsx** - Delete account
10. **LogoutButton.tsx** - Logout button

#### Implementation Steps:
1. Fetch user profile + workspaces
2. Display sections:
   - Profile header (name, email)
   - Workspace management (list, create, edit, delete)
   - Theme toggle
   - Data export
   - Account danger zone
3. Modals for workspace create/edit
4. Delete account confirmation
5. Logout redirect

---

### ZADANIE 3.3: Phase 5 Quality Gate
**Zespół:** Both developers + QA
**Szacunkowy czas:** 1-2 godziny
**Data:** 8 stycznia 2026

---

## 📅 WEEKEND 4: 9-12 stycznia 2026

### ZADANIE 4.1: Phase 6 - Testing & Polish
**Zespół:** All developers + QA
**Szacunkowy czas:** 10-15 godzin
**Data:** 9-12 stycznia 2026

#### Co robić:
1. End-to-end testing (all user flows)
2. Edge case testing
3. Error scenario testing
4. Cross-browser testing
5. Mobile responsive testing
6. Accessibility audit (WCAG 2.1)
7. Performance testing
8. Bug fixes
9. Code cleanup
10. Documentation update

#### Checklist:
```
✅ Functional testing:
  - [ ] User signup → creates workspace → redirects to /app
  - [ ] User login → redirects to /app
  - [ ] Dashboard: load locations, boxes, search
  - [ ] Create location → list updates
  - [ ] Edit location → list updates
  - [ ] Delete location → list updates
  - [ ] Create box → list updates
  - [ ] Edit box → list updates
  - [ ] Delete box → list updates
  - [ ] View box details → edit → update → view
  - [ ] Generate QR codes → download PDF
  - [ ] Change theme → persists on reload
  - [ ] Export data → download CSV
  - [ ] Logout → redirect to /login

✅ Browser testing:
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)

✅ Device testing:
  - [ ] Desktop (1920x1080)
  - [ ] Tablet (768x1024)
  - [ ] Mobile (375x667)

✅ Accessibility:
  - [ ] Keyboard navigation works
  - [ ] ARIA labels present
  - [ ] Screen reader tested
  - [ ] Color contrast OK
  - [ ] Focus indicators visible

✅ Performance:
  - [ ] Page load < 3 seconds
  - [ ] No TypeScript errors
  - [ ] npm run lint passes
  - [ ] npm run build succeeds
  - [ ] npm run preview works

✅ Code quality:
  - [ ] No console.logs
  - [ ] No debug statements
  - [ ] Commented code removed
  - [ ] Consistent naming
  - [ ] Proper error handling

✅ Documentation:
  - [ ] README.md updated
  - [ ] CHANGELOG.md created
  - [ ] API docs updated
  - [ ] Code comments where needed
  - [ ] Architecture docs updated
```

---

### ZADANIE 4.2: Final Deployment
**Zespół:** Tech Lead + Dario SL
**Szacunkowy czas:** 2-3 godziny
**Data:** 12 stycznia 2026

#### Steps:
```bash
# 1. Final build
npm run build

# 2. Preview
npm run preview

# 3. Deploy to staging (if available)
# 4. Final QA on staging
# 5. Deploy to production
```

---

## 📊 MILESTONES & DELIVERABLES

### Milestone 1: Phase 3 Complete (2 stycznia)
- ✅ All linting errors fixed
- ✅ LocationSelector & QRCodeSelector implemented
- ✅ Modals fully integrated
- ✅ Quality Gate 3 PASSED
- ✅ Ready to merge

### Milestone 2: Phase 4 Complete (5 stycznia)
- ✅ Box details page working
- ✅ Box create page working
- ✅ Box edit page working
- ✅ All CRUD operations tested
- ✅ Quality Gate 4 PASSED
- ✅ Ready to merge

### Milestone 3: Phase 5 Complete (8 stycznia)
- ✅ QR Generator page working
- ✅ PDF download functional
- ✅ Settings page working
- ✅ Workspace management functional
- ✅ Theme toggle working
- ✅ Data export working
- ✅ Quality Gate 5 PASSED
- ✅ Ready to merge

### Milestone 4: MVP Complete (12 stycznia)
- ✅ Phase 6 testing complete
- ✅ All bugs fixed
- ✅ Code quality excellent
- ✅ Documentation up to date
- ✅ Production ready
- ✅ Quality Gate 6 PASSED
- ✅ **LIVE ON PRODUCTION**

---

## 🎯 SUCCESS CRITERIA

### For Each Phase:
- [ ] All planned tasks completed
- [ ] Code reviewed
- [ ] Tests passing
- [ ] npm run lint passes (0 errors)
- [ ] npm run build succeeds
- [ ] Quality gate signed off

### For MVP:
- [ ] All 6 phases complete
- [ ] All 50+ tasks finished
- [ ] Zero critical bugs
- [ ] Zero TypeScript errors
- [ ] All user flows E2E tested
- [ ] WCAG 2.1 compliant
- [ ] Performance < 3s
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] **DEPLOYED TO PRODUCTION**

---

## 🚨 RISK MITIGATION

### High Risk Items:
1. **Linting blocking progress** → RUN `npm run lint:fix` FIRST
2. **API integration issues** → TEST API in Postman BEFORE UI
3. **Performance on dashboard** → USE virtual scrolling (react-window)
4. **Accessibility compliance** → TEST with screen reader DURING development

### Medium Risk Items:
1. **Scope creep** → STICK TO PHASE PLAN, defer post-MVP features
2. **Time estimation** → BUILD IN 20% buffer
3. **Testing gaps** → FOLLOW quality gate checklist EXACTLY

---

## 📞 CONTACT & COMMUNICATION

**Daily standups:** 15 minutes (if needed)
**Phase reviews:** After each quality gate
**Escalation:** Contact Tech Lead immediately if blocked

---

## ✅ IMMEDIATE NEXT STEPS

### TODAY (31 grudnia 2025):
1. [ ] Read this action plan (you are here)
2. [ ] Run `npm run lint:fix`
3. [ ] Fix remaining linting issues manually
4. [ ] Verify `npm run lint` passes
5. [ ] Commit & push changes

### TOMORROW (1 stycznia 2026):
1. [ ] Create LocationSelector.tsx
2. [ ] Create QRCodeSelector.tsx
3. [ ] Integrate modals into DashboardContainer
4. [ ] Test CRUD flows

### DAY 3 (2 stycznia 2026):
1. [ ] Sign off Phase 3 quality gate
2. [ ] Merge Phase 3 to master
3. [ ] Create Phase 4 branch
4. [ ] Start Phase 4 page setup

---

**Action Plan Created:** 31 grudnia 2025
**Next Review:** 2 stycznia 2026 (after Phase 3 completion)
**Status:** READY FOR EXECUTION

---

**Good luck! You've got this! 🚀**
