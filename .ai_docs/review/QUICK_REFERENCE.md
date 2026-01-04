# ⚡ Quick Reference Guide

**Quick lookup for developers during implementation**
**Print this or bookmark in your IDE**

---

## PHASES AT A GLANCE

```
Phase 0 (2-3d): Shared Components, Hooks, Validation, API Client
Phase 1 (2-3d): Login/Registration + Auth Store
Phase 2 (3-4d): Dashboard (Location Tree + Box List)
Phase 3 (1-2d): Dashboard Modals
Phase 4 (2-3d): Box Details + Box Form
Phase 5 (3-4d): QR Generator + Settings (parallel possible)
Phase 6 (2-3d): Testing & Polish
```

---

## PHASE 0 TASKS

```
0.1 Shared Components (FormInput, ConfirmationDialog, ErrorAlert, LoadingSpinner, Modal)
0.2 Shared Hooks (useForm, useFetch, useDebounce, useLocalStorage)
0.3 Validation Schemas (auth.ts, workspace.ts, box.ts, location.ts)
0.4 API Client (client.ts, endpoints.ts)
0.5 Nano Stores (auth.store.ts, workspace.store.ts, theme.store.ts)
0.6 Type Extensions (src/types.ts)
```

**File Structure:**
```
src/
├── components/shared/
│   ├── FormInput.tsx
│   ├── ConfirmationDialog.tsx
│   ├── ErrorAlert.tsx
│   ├── LoadingSpinner.tsx
│   └── Modal.tsx
├── components/hooks/
│   ├── useForm.ts
│   ├── useFetch.ts
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
└── lib/
    ├── validation/ (auth.ts, workspace.ts, box.ts, location.ts, schemas.ts)
    ├── api/ (client.ts, endpoints.ts, types.ts)
    └── stores/ (auth.store.ts, workspace.store.ts, theme.store.ts)
```

---

## PHASE 1 TASKS

```
1.1 Auth Page Structure (src/pages/auth/index.astro)
1.2 Form Components (LoginForm, RegistrationForm, PasswordStrengthIndicator)
1.3 Auth Hook (useAuthForm)
1.4 Middleware Updates (src/middleware/index.ts)
1.5 Error Handling & Session Persistence
```

**Key Endpoints Used:**
- `signInWithPassword()` (Supabase Auth)
- `signUp()` (Supabase Auth)
- `GET /api/profiles/me`
- `GET /api/workspaces`

---

## PHASE 2 TASKS

```
2.1 Stores & Context (dashboard.store.ts, DashboardContext)
2.2 Custom Hooks (useWorkspaces, useLocations, useBoxes)
2.3 Layout Components (DashboardContainer, DashboardHeader, SearchInput)
2.4 Location Tree (LocationTree, LocationTreeNode, LocationContextMenu)
2.5 Box List (BoxListContainer, BoxList with react-window, BoxListItem)
```

**Key Endpoints Used:**
- `GET /api/workspaces`
- `GET /api/locations`
- `GET /api/boxes`
- `POST /api/locations`
- `PATCH /api/locations/:id`
- `DELETE /api/locations/:id`

**Dependencies:**
- `react-window` (virtual scrolling)
- Nano Stores
- Context API

---

## PHASE 3 TASKS

```
3.1 LocationEditorModal (create/edit location)
3.2 BoxEditorModal (create/edit box)
3.3 Utility Components (LocationSelector, QRCodeSelector)
```

**Integrates:**
- Uses shared FormInput, Modal, ErrorAlert
- Submits to endpoints from Phase 2

---

## PHASE 4 TASKS

```
4.1 Box Details View (/app/boxes/[id])
4.2 Box Form View (/app/boxes/new, /app/boxes/[id]/edit)
4.3 Form Components (NameInput, DescriptionTextarea, TagInput, etc.)
```

**Key Endpoints Used:**
- `GET /api/boxes/:id`
- `POST /api/boxes`
- `PATCH /api/boxes/:id`
- `DELETE /api/boxes/:id`

---

## PHASE 5 TASKS

### 5A: QR Generator (can run parallel with 5B)
```
5A.1 Form Components (NumberInput 1-100, GenerateButton, InstructionsPanel)
5A.2 Generation Hooks (useQRCodeGeneration, usePDFGeneration)
5A.3 Integration & Polish
```

**Dependencies:**
- `jspdf` library
- `qrcode` library

**Key Endpoint:**
- `POST /api/qr-codes/batch`

### 5B: Settings (can run parallel with 5A)
```
5B.1 Workspace Management (create, edit, delete workspace)
5B.2 Theme Toggle + Account Management
5B.3 Integration & Polish
```

**Key Endpoints:**
- `GET /api/workspaces`
- `POST /api/workspaces`
- `PATCH /api/workspaces/:id` (⚠️ MISSING - implement in Phase 1-2)
- `DELETE /api/workspaces/:id` (⚠️ MISSING - implement in Phase 1-2)
- `DELETE /api/auth/delete-account` (Optional)
- `GET /api/export/inventory` (Optional)

---

## CRITICAL PATHS

### Must Be Implemented Before Phase 3
```
PATCH /api/workspaces/:workspace_id    ← Settings Edit
DELETE /api/workspaces/:workspace_id   ← Settings Delete
```

See: `.ai_docs/MISSING_API_ENDPOINTS.md`

---

## FILE NAMING CONVENTION

```
Components:         PascalCase.tsx          (e.g., FormInput.tsx)
Hooks:              useCamelCase.ts         (e.g., useForm.ts)
Types:              types.ts                (or module.types.ts)
Stores:             store.ts                (e.g., auth.store.ts)
Pages:              lowercase/index.astro   (e.g., auth/index.astro)
Utils/Services:     camelCase.ts            (e.g., validation.ts)
```

---

## VALIDATION SCHEMAS

```typescript
// Common Validators
emailSchema              // email format
passwordSchema          // min 8 chars
nameSchema              // 1-255 chars
descriptionSchema       // max 10k chars
uuidSchema              // UUID format
tagsSchema              // max 10, each max 50 chars
workspaceNameSchema     // 1-255 chars

// Import from:
import { CommonValidation } from '@/lib/validation/schemas';
// or specific:
import { loginSchema } from '@/lib/validation/auth';
```

---

## API ENDPOINTS BY PHASE

### Phase 0
```
No API calls (infrastructure only)
```

### Phase 1
```
POST   /auth/signin                     (Supabase)
POST   /auth/signup                     (Supabase)
GET    /api/profiles/me
GET    /api/workspaces
```

### Phase 2
```
GET    /api/locations
GET    /api/boxes
POST   /api/locations
PATCH  /api/locations/:id
DELETE /api/locations/:id
```

### Phase 3
```
POST   /api/locations                   (reuse)
PATCH  /api/locations/:id               (reuse)
DELETE /api/locations/:id               (reuse)
POST   /api/boxes
PATCH  /api/boxes/:id
DELETE /api/boxes/:id
```

### Phase 4
```
GET    /api/boxes/:id
POST   /api/boxes                       (reuse)
PATCH  /api/boxes/:id                   (reuse)
DELETE /api/boxes/:id                   (reuse)
```

### Phase 5A (QR Generator)
```
POST   /api/qr-codes/batch
```

### Phase 5B (Settings)
```
GET    /api/workspaces                  (reuse)
POST   /api/workspaces                  (reuse)
PATCH  /api/workspaces/:id              ⚠️ MISSING
DELETE /api/workspaces/:id              ⚠️ MISSING
DELETE /api/auth/delete-account         (Optional)
GET    /api/export/inventory            (Optional)
```

---

## COMMON PATTERNS

### useForm Hook Usage
```typescript
const { values, errors, touched, handleSubmit } = useForm({
  initialValues: { email: '', password: '' },
  validationSchema: loginSchema,
  onSubmit: async (values) => { /* ... */ },
});
```

### useFetch Hook Usage
```typescript
const { data, loading, error } = useFetchData('/api/boxes');
// or direct call:
const data = await useFetch('/api/boxes', { method: 'GET' });
```

### useDebounce Usage
```typescript
const debouncedSearch = useDebounce(searchValue, 300);
useEffect(() => {
  refetchBoxes(); // triggers when debouncedSearch changes
}, [debouncedSearch]);
```

### API Client Usage
```typescript
import { apiClient } from '@/lib/api/endpoints';

const profile = await apiClient.profiles.getMe();
const workspaces = await apiClient.workspaces.list();
const updated = await apiClient.workspaces.update(id, { name: 'New' });
await apiClient.workspaces.delete(id);
```

### Nano Store Usage
```typescript
import { authStore, setAuthSuccess } from '@/lib/stores/auth.store';
import { useStore } from 'nanostores';

const auth = useStore(authStore);
setAuthSuccess(profile, workspace, token);
```

---

## COMPONENT PROPS TEMPLATES

### FormInput
```typescript
<FormInput
  label="Email"
  name="email"
  type="email"
  value={values.email}
  onChange={(v) => setFieldValue('email', v)}
  error={errors.email}
  disabled={isLoading}
/>
```

### ConfirmationDialog
```typescript
<ConfirmationDialog
  isOpen={isOpen}
  title="Delete Box?"
  description="This action cannot be undone."
  confirmText="DELETE"
  onConfirm={handleDelete}
  onCancel={() => setIsOpen(false)}
  isDangerous={true}
/>
```

### Modal
```typescript
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Edit Box">
  {/* content */}
</Modal>
```

### LoadingSpinner
```typescript
<LoadingSpinner visible={isLoading} message="Loading..." />
```

### ErrorAlert
```typescript
<ErrorAlert
  error={error}
  onDismiss={() => setError(null)}
  onRetry={() => refetch()}
/>
```

---

## ENVIRONMENT VARIABLES

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional
VITE_API_TIMEOUT=30000
VITE_LOG_LEVEL=info
```

---

## TESTING CHECKLIST PER PHASE

### Before Gate 0 → 1
- [ ] All components render
- [ ] All hooks initialize
- [ ] Validation schemas work
- [ ] API client accepts valid auth
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors

### Before Gate 1 → 2
- [ ] Login works end-to-end
- [ ] Registration works end-to-end
- [ ] Session persists on refresh
- [ ] Logout works
- [ ] Middleware redirects work
- [ ] Error messages display

### Before Gate 2 → 3
- [ ] Dashboard loads
- [ ] Location tree renders + expands
- [ ] Box list displays
- [ ] Search works
- [ ] Workspace switcher works
- [ ] All data fetches correctly

### Before Gate 3 → 4
- [ ] Modals open/close
- [ ] Create/edit/delete flows work
- [ ] Validation shows errors
- [ ] Lists update after CRUD

### Before Gate 4 → 5
- [ ] Box details page loads
- [ ] Edit/delete work
- [ ] Box form validates
- [ ] Create/edit submit works

### Before Gate 5 → 6
- [ ] QR generator works
- [ ] PDF downloads
- [ ] Settings page loads
- [ ] Workspace management works
- [ ] Theme toggle works

### Before Production
- [ ] All user flows tested
- [ ] Errors handled gracefully
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] Screen reader tested
- [ ] Performance acceptable

---

## COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | No JWT token | Check localStorage, login first |
| 403 Forbidden | No permission | Check user role/workspace membership |
| 404 Not Found | Resource missing | Verify ID is correct, check RLS |
| 500 Server Error | Database error | Check backend logs, restart API |
| Blank page | Component import missing | Check import path, verify file exists |
| Type errors | Props mismatch | Check component props interface |
| Validation not showing | Error state not set | Verify error field in state |
| API not called | useEffect deps wrong | Check dependency array |
| Infinite loop | Deps missing from useEffect | Add to dependency array |
| Memory leak | Async not cleaned up | Add cleanup function to useEffect |

---

## PERFORMANCE TIPS

```typescript
// Memoize expensive components
export const BoxList = React.memo(({ boxes }) => {
  return boxes.map(box => <BoxItem key={box.id} box={box} />);
});

// Memoize callbacks
const handleSubmit = useCallback(async (data) => {
  // ...
}, [dependency]);

// Debounce search
const debouncedSearch = useDebounce(searchValue, 300);

// Virtual list for 100+ items
<FixedSizeList
  height={600}
  itemCount={boxes.length}
  itemSize={50}
>
  {({ index, style }) => <BoxItem box={boxes[index]} style={style} />}
</FixedSizeList>
```

---

## DEBUGGING TIPS

### React DevTools
- Check component props in browser DevTools → Components
- Verify state changes in real-time
- Find re-render bottlenecks with Profiler

### TypeScript
```bash
npx tsc --noEmit  # Check types without compiling
```

### ESLint
```bash
npm run lint       # Find issues
npm run lint:fix   # Auto-fix
```

### API Calls
```typescript
// Log all API calls
console.log('API Call:', method, path);
console.log('Response:', data);
```

### State Management
```typescript
// Log store changes (Nano)
authStore.subscribe(console.log);
```

### Network
- Use browser DevTools → Network tab
- Check request/response headers
- Verify JWT token in Authorization header
- Check CORS headers

---

## GIT WORKFLOW

```bash
# Create feature branch per phase
git checkout -b feature/phase-0-shared-infrastructure

# Commit frequently with descriptive messages
git commit -m "feat: add FormInput component"

# Push when ready for review
git push origin feature/phase-0-shared-infrastructure

# Create PR for code review
# Merge after approval

# Continue to next phase
git checkout -b feature/phase-1-login-registration
```

---

## DOCUMENTATION LINKS

| Document | Purpose |
|----------|---------|
| IMPLEMENTATION_ROADMAP.md | Detailed task breakdown per phase |
| QUALITY_GATES.md | Test cases & verification per phase |
| MISSING_API_ENDPOINTS.md | API specs for missing endpoints |
| EXECUTION_SUMMARY.md | Overview & usage guide |
| api-plan.md | Complete API specification |
| db-plan.md | Database schema documentation |
| prd.md | Product requirements |
| tech-stack.md | Technology decisions |

---

## QUICK COMMANDS

```bash
# Development
npm run dev              # Start dev server

# Code Quality
npm run lint            # Check code quality
npm run lint:fix        # Auto-fix issues
npm run format          # Format with Prettier
npx tsc --noEmit        # Check TypeScript

# Build & Test
npm run build           # Build for production
npm run preview         # Preview build locally

# Git
git status              # Check changes
git diff                # View changes
git log --oneline       # View commit history
```

---

## KEYBOARD SHORTCUTS (IDE)

```
Cmd+Shift+F     Search across files
Cmd+K Cmd+C     Comment out code
Cmd+/           Toggle line comment
Cmd+D           Select next occurrence
Cmd+Shift+L     Select all occurrences
Cmd+K Cmd+0     Fold all regions
Cmd+K Cmd+J     Unfold all regions
F12             Go to definition
Shift+F12       Find all references
```

---

## REMINDERS

✅ **Always:**
- Test locally before pushing
- Follow phase sequence
- Verify quality gate before next phase
- Write descriptive commit messages
- Keep TypeScript strict
- Comment complex logic
- Request code review

❌ **Never:**
- Skip quality gate checks
- Push without testing
- Use `any` types unnecessarily
- Leave console.logs in production code
- Force push to main branch
- Skip accessibility checks

---

## CONTACT QUICK LINKS

| Role | Contact | For |
|------|---------|-----|
| Tech Lead | (assign) | Architecture questions |
| Backend Lead | (assign) | API/database questions |
| QA Lead | (assign) | Testing procedures |
| PM | (assign) | Timeline/scope questions |

---

## ESTIMATED TIME BREAKDOWN

| Phase | Duration | Dev Count | Total Hours |
|-------|----------|-----------|------------|
| 0 | 2-3d | 1 | 12-15 |
| 1 | 2-3d | 1 | 16-20 |
| 2 | 3-4d | 1-2 | 20-25 |
| 3 | 1-2d | 1 | 8-10 |
| 4 | 2-3d | 1-2 | 14-18 |
| 5A | 1-2d | 1 | 10-12 |
| 5B | 2-3d | 1 | 12-15 |
| 6 | 2-3d | 2 | 10-15 |
| **TOTAL** | **15-22d** | **3-5** | **102-130** |

---

**Print this page. Keep it handy. Reference often. 🚀**

**Last Updated:** 2025-12-28
**Maintained By:** Tech Lead
