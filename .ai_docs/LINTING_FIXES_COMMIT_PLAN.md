# 🔧 Linting Fixes - Detailed Commit Plan

**Date:** 31 grudnia 2025
**Purpose:** Naprawić wszystkie linting errory (217 problems: 43 errors, 174 warnings)
**Status:** READY FOR EXECUTION

---

## 📊 SUMMARY OF ERRORS

### Error Types Distribution
| Type | Count | Severity | Fix Type |
|------|-------|----------|----------|
| console.log statements | ~70 | WARNING | Remove all console.log() calls |
| Unused variables | 8 | ERROR | Remove unused declarations |
| Unused imports | 4 | ERROR | Remove unused type imports |
| `any` types | 12 | ERROR | Replace with proper types |
| Missing ARIA attrs | 4 | ERROR | Add required aria-selected |
| React hook deps | 2 | WARNING | Add missing dependencies |
| HTML entities | 2 | ERROR | Escape quotes properly |
| Non-null assertion | 1 | ERROR | Remove `!` assertion |
| **TOTAL** | **217** | - | - |

---

## 🎯 COMMIT STRATEGY

**Strategy:** Group by file category + type of fix, 5-6 commits total

### Commit 1: Components - Remove console.logs (Phase 1 & 2)
**Files affected:** 6 components
**Type:** Warnings removal
**Impact:** Phase 1-2 stabilization

```
Files:
- src/components/AuthLayout.tsx (6 console.log statements)
- src/components/dashboard/BoxEditorModal.tsx (1 console.log)
- src/components/dashboard/LocationEditorModal.tsx (1 console.log)
- src/components/dashboard/UserMenu.tsx (1 console.log)

Details:
- AuthLayout.tsx line 29: console.log("[AuthLayout] Auth success...")
- AuthLayout.tsx line 33: console.log("[AuthLayout] Sending token...")
- AuthLayout.tsx line 42: console.log("[AuthLayout] Response status...")
- AuthLayout.tsx line 46: console.log("[AuthLayout] Session established...")
- AuthLayout.tsx line 49: console.error("[AuthLayout] Failed...")
- AuthLayout.tsx line 54: console.error("[AuthLayout] Fetch error...")
- BoxEditorModal.tsx line 76: console.log("[BoxEditorModal] onSubmit...")
- LocationEditorModal.tsx line 73: console.log("[LocationEditorModal]...")
- UserMenu.tsx line 27: console.log("[UserMenu]...")

Rationale:
These console.logs are debug statements left during development.
They should be removed before merge to maintain clean production code.
If debug logs are needed, they should use proper logging service, not console.log.
```

---

### Commit 2: Components - Fix unused variables & imports (Phase 2)
**Files affected:** 4 components
**Type:** Errors removal
**Impact:** Type safety improvement

```
Files:
- src/components/dashboard/BoxListItem.tsx
- src/components/dashboard/DashboardContainer.tsx
- src/components/dashboard/LocationTreeNode.tsx
- src/components/dashboard/DeleteConfirmationDialog.tsx

Details:

BoxListItem.tsx line 23:
- Remove: const [isHovered, setIsHovered] = React.useState(false);
- Reason: State declared but never used in component logic
- Remove event handlers: onMouseEnter, onMouseLeave on line 41-42

DashboardContainer.tsx lines 16-17:
- Remove: import { useLocations, type LocationTreeNode }
- Remove: import { useBoxes, type BoxListItem }
- Keep: import { useLocations, useBoxes }
- Reason: Type imports unused; only component usage matters

DashboardContainer.tsx line 38:
- Remove: const $userProfile = useStore(userProfile);
- Reason: State atom loaded but never used in component

DashboardContainer.tsx line 178:
- Remove: itemName?: string parameter from openDeleteConfirm
- Reason: Parameter defined but never used in function body

DashboardContainer.tsx line 98:
- Change: console.error(...) → logError("[DashboardContainer]", err)
- Reason: Use consistent error logging utility

LocationTreeNode.tsx line 68:
- Add: aria-selected={selectedId === item.id ? "true" : "false"}
- Reason: ARIA role treeitem requires aria-selected attribute

DeleteConfirmationDialog.tsx line 55:
- Change: "Czy na pewno chcesz usunąć " + ...
- To: "Czy na pewno chcesz usunąć " + ... (escape quotes)
- Reason: HTML entity escaping for JSX

Rationale:
Unused variables/imports are code smell and indicate incomplete refactoring.
Removing them improves type safety and code clarity.
```

---

### Commit 3: Hooks - Fix type safety (Phase 0)
**Files affected:** 4 hooks
**Type:** Errors removal
**Impact:** Strict TypeScript compliance

```
Files:
- src/components/hooks/useFetch.ts
- src/components/hooks/useForm.ts
- src/components/hooks/useAuthForm.ts
- src/components/hooks/useLocalStorage.ts

Details:

useFetch.ts:
- Line 4, 7, 16, 55: Replace 'any' with proper types
- Change from:
  const response: any = await fetch(...)
- To:
  const response = await fetch(url, options)
  // Let TS infer Response type

useForm.ts:
- Line 1: Remove unused 'useReducer' import
- Lines 4, 10, 17, 45, 96: Replace 'any' with generics
- Change from:
  onSubmit: (values: any) => Promise<void>
- To:
  onSubmit: (values: T) => Promise<void>
- Reason: Use generic type T from interface

useAuthForm.ts:
- Line 137, 222: Add 'error' to useCallback dependency array
- Change from:
  useCallback(() => {...}, [mode])
- To:
  useCallback(() => {...}, [mode, error])
- Reason: Effect depends on 'error' state changes

useLocalStorage.ts:
- Similar pattern: Fix 'any' types with proper generics
- Use localStorage properly typed

Rationale:
Strict TypeScript prevents runtime errors at compile time.
Proper typing improves IDE autocomplete and refactoring safety.
```

---

### Commit 4: API Endpoints - Remove console.log statements
**Files affected:** 14 API route files
**Type:** Warnings removal
**Impact:** Production code cleanliness

```
Files (all in src/pages/api/):
- auth/session.ts (10 console statements)
- auth/delete-account.ts (2 console statements)
- boxes.ts (4 console statements)
- boxes/[id].ts (6 console statements)
- locations/index.ts (2 console statements)
- locations/[id].ts (2 console statements)
- workspaces.ts (3 console statements)
- workspaces/[workspace_id].ts (2 console statements)
- workspaces/[workspace_id]/members.ts (2 console statements)
- workspaces/[workspace_id]/members/[user_id].ts (2 console statements)
- qr-codes/batch.ts (4 console statements)
- qr-codes/[short_id].ts (2 console statements)
- export/inventory.ts (2 console statements)
- profiles/me.ts (1 console statement)

Rationale:
API endpoints should not log to console in production.
Debug info should be sent to proper logging service (Sentry, etc.).
Leaving console.logs exposes debug information to clients.
```

---

### Commit 5: Services & Utilities - Fix any types
**Files affected:** 12 service files + utilities
**Type:** Errors removal
**Impact:** Type safety across services

```
Files:
- src/lib/api-client.ts
- src/lib/services/ (all files)
- src/stores/dashboard.ts
- src/contexts/DashboardContext.tsx
- src/middleware/index.ts

Details:

api-client.ts:
- Replace any with proper error types
- Use consistent Error handling pattern

Services (auth, box, location, workspace, qr-code, etc.):
- Replace any with specific types from database.types.ts
- Use proper error handling patterns
- Remove any console.log statements

DashboardContext.tsx:
- Fix type definitions in context
- Ensure all actions have proper types

dashboard.ts store:
- Lines 21, 24, 27, 33: Replace 'any' with proper atom types
- Example:
  From: const errorMessage = atom<any>(null)
  To: const errorMessage = atom<string | null>(null)

Rationale:
Proper typing across all layers ensures type safety.
Services are critical business logic - must be type-safe.
```

---

### Commit 6: Shared Components - Fix ARIA & HTML issues
**Files affected:** 6 shared components
**Type:** Accessibility & HTML fixes
**Impact:** WCAG 2.1 compliance

```
Files:
- src/components/dashboard/LocationTree.tsx
- src/components/dashboard/LocationTreeNode.tsx
- src/components/shared/ConfirmationDialog.tsx
- src/components/shared/Modal.tsx

Details:

LocationTree.tsx line 47:
- Remove: aria-selected attribute from button role
- Add: Proper role="treeitem" or remove aria-selected
- Reason: aria-selected only valid for listbox, option, row, tab, treeitem

LocationTreeNode.tsx line 68:
- Add: aria-selected={isSelected}
- Reason: treeitem role requires aria-selected
- Add: aria-expanded={isExpanded} if applicable

LocationTreeNode.tsx line 102:
- Fix: Remove aria-selected from button (not valid)
- Add to parent treeitem instead

LocationTreeNode.tsx line 156:
- Remove: Non-null assertion (!)
- Change: const item = items[index]!;
- To: if (!item) return null;
- Reason: Non-null assertion hides potential errors

ConfirmationDialog.tsx line 55:
- Fix HTML entity escaping
- Change: `"text"` (unescaped)
- To: `&quot;text&quot;` or use single quotes

Rationale:
ARIA attributes must match their roles per WCAG spec.
Proper accessibility ensures usability for all users.
```

---

## 📋 EXECUTION CHECKLIST

### Pre-Execution
- [ ] Create new branch: `git checkout -b fix/linting-errors`
- [ ] Verify current status: `npm run lint`
- [ ] Document baseline: Save lint output to file

### Commit 1: Components console.logs
```bash
# Fix in these files:
# src/components/AuthLayout.tsx - remove 6 console.log/error calls
# src/components/dashboard/BoxEditorModal.tsx - remove 1 console.log
# src/components/dashboard/LocationEditorModal.tsx - remove 1 console.log
# src/components/dashboard/UserMenu.tsx - remove 1 console.log

git add src/components/AuthLayout.tsx
git add src/components/dashboard/BoxEditorModal.tsx
git add src/components/dashboard/LocationEditorModal.tsx
git add src/components/dashboard/UserMenu.tsx

git commit -m "fix: remove debug console.log statements from components

- AuthLayout.tsx: Remove 6 console.log/error statements (lines 29, 33, 42, 46, 49, 54)
  Removed debug output for token length, session establishment, and error logging
- BoxEditorModal.tsx: Remove 1 console.log statement (line 76)
  Removed debug output from onSubmit handler
- LocationEditorModal.tsx: Remove 1 console.log statement (line 73)
  Removed debug output from modal lifecycle
- UserMenu.tsx: Remove 1 console.log statement (line 27)
  Removed debug output from menu interactions

Rationale: Debug console.logs should not be in production code. Use proper
logging service for debug output. These were left from development iteration.

Severity: 9 warnings
Impact: Phase 1-2 (Auth, Dashboard components)
Type: Code cleanliness
"
```

### Commit 2: Phase 2 component fixes
```bash
# Fix in these files:
# src/components/dashboard/BoxListItem.tsx - remove unused state
# src/components/dashboard/DashboardContainer.tsx - remove unused imports/vars
# src/components/dashboard/LocationTreeNode.tsx - add ARIA attribute
# src/components/dashboard/DeleteConfirmationDialog.tsx - fix HTML entities

git add src/components/dashboard/BoxListItem.tsx
git add src/components/dashboard/DashboardContainer.tsx
git add src/components/dashboard/LocationTreeNode.tsx
git add src/components/dashboard/DeleteConfirmationDialog.tsx

git commit -m "fix: resolve unused variables and ARIA accessibility issues in dashboard

UNUSED VARIABLES:
- BoxListItem.tsx: Remove unused isHovered state and event handlers (line 23, 41-42)
  State was declared but never used in component logic
- DashboardContainer.tsx: Remove unused type imports LocationTreeNode, BoxListItem (lines 16-17)
  Only component usage needed, not type exports
- DashboardContainer.tsx: Remove unused $userProfile store subscription (line 38)
  Atom loaded but never used in component
- DashboardContainer.tsx: Remove unused itemName parameter from openDeleteConfirm (line 178)
  Parameter defined but never referenced in function body
- DashboardContainer.tsx: Replace console.error with logError utility (line 98)
  Use consistent error logging across application

ACCESSIBILITY FIXES:
- LocationTreeNode.tsx: Add required aria-selected attribute to treeitem (line 68)
  ARIA role treeitem requires aria-selected per WCAG spec
- LocationTreeNode.tsx: Remove non-null assertion (!) (line 156)
  Add proper null check instead of hiding potential errors
- DeleteConfirmationDialog.tsx: Fix HTML entity escaping for quotes (line 55)
  Properly escape quote characters in JSX

Severity: 8 errors
Impact: Type safety, accessibility compliance, code cleanliness
Type: Code quality improvement
"
```

### Commit 3: TypeScript type safety in hooks
```bash
# Fix in these files:
# src/components/hooks/useFetch.ts
# src/components/hooks/useForm.ts
# src/components/hooks/useAuthForm.ts
# src/components/hooks/useLocalStorage.ts

git add src/components/hooks/useFetch.ts
git add src/components/hooks/useForm.ts
git add src/components/hooks/useAuthForm.ts
git add src/components/hooks/useLocalStorage.ts

git commit -m "fix: replace 'any' types with proper TypeScript generics in hooks

useFetch.ts:
- Replace 'any' type annotations with proper types (lines 4, 7, 16, 55)
- Use generic typing for request/response handling
- Improve IDE autocomplete and type checking

useForm.ts:
- Remove unused 'useReducer' import (line 1)
- Replace all 'any' parameters with proper generic type T (lines 4, 10, 17, 45, 96)
- Use generic type from UseFormOptions<T> interface throughout
- Better type safety for form field operations

useAuthForm.ts:
- Add missing 'error' dependency to useCallback hooks (lines 137, 222)
- Effects depend on error state changes - must include in dependency array
- Fixes React hooks exhaustive-deps warning

useLocalStorage.ts:
- Replace 'any' with proper generic type <T> for localStorage operations
- Improve type safety for stored/retrieved values

Benefits:
- Enables strict TypeScript mode compliance
- Better IDE autocomplete and refactoring
- Catches type errors at compile time
- Prevents runtime type errors from 'any' usage

Severity: 12 errors, 2 warnings
Impact: Phase 0 (shared hooks) - affects all downstream components
Type: Type system hardening
"
```

### Commit 4: Remove debug logs from API endpoints
```bash
# Fix all API endpoint files in src/pages/api/

git add src/pages/api/

git commit -m "fix: remove console.log statements from all API endpoints

Removed debug console.log/error statements from 14 API route files:
- auth/session.ts: 10 statements (debug token handling, session flow)
- auth/delete-account.ts: 2 statements (debug account deletion)
- boxes.ts: 4 statements (debug CRUD operations)
- boxes/[id].ts: 6 statements (debug single box operations)
- locations/index.ts: 2 statements (debug location list)
- locations/[id].ts: 2 statements (debug location updates)
- workspaces.ts: 3 statements (debug workspace operations)
- workspaces/[workspace_id].ts: 2 statements (debug workspace management)
- workspaces/[workspace_id]/members.ts: 2 statements (debug member operations)
- workspaces/[workspace_id]/members/[user_id].ts: 2 statements (debug member details)
- qr-codes/batch.ts: 4 statements (debug QR generation)
- qr-codes/[short_id].ts: 2 statements (debug QR lookup)
- export/inventory.ts: 2 statements (debug CSV export)
- profiles/me.ts: 1 statement (debug profile fetch)

Rationale:
- Production API endpoints should not expose debug logs to clients
- Debug information should use proper logging service (Sentry, DataDog, etc.)
- Reduces security risk of exposing internal logic via console
- Improves API response cleanliness

Total: 42 warning statements removed

Severity: 42 warnings
Impact: API security and cleanliness
Type: Security/Production readiness
"
```

### Commit 5: Service layer type safety
```bash
# Fix in these files:
# src/lib/api-client.ts
# src/lib/services/*.ts
# src/stores/dashboard.ts
# src/contexts/DashboardContext.tsx
# src/middleware/index.ts

git add src/lib/
git add src/stores/
git add src/contexts/
git add src/middleware/

git commit -m "fix: improve type safety in services, stores, and context

SERVICES (src/lib/services/):
- Replace 'any' type annotations with proper service-specific types
- Use database.types.ts for entity types
- Consistent error handling patterns across all services
- Files: auth.service.ts, box.service.ts, location.service.ts,
  workspace.service.ts, qr-code.service.ts, profile.service.ts, exportService.ts

API CLIENT (src/lib/api-client.ts):
- Replace 'any' with proper error type definitions
- Use typed ApiError class consistently
- Improve fetch error handling type safety

STORES (src/stores/dashboard.ts):
- Replace 'any' with specific atom types (lines 21, 24, 27, 33)
- Fix errorMessage, selectedItem, and other atoms to have proper types
- Example: atom<string | null>(null) instead of atom<any>(null)

CONTEXT (src/contexts/DashboardContext.tsx):
- Ensure all context action signatures have proper types
- Fix any type annotations in context state

MIDDLEWARE (src/middleware/index.ts):
- Replace 'any' with proper types for request/response
- Type-safe Astro context usage

Benefits:
- Enables strict TypeScript mode
- Prevents runtime type errors
- Better IDE support throughout services
- Safer refactoring

Severity: 12 errors
Impact: Core infrastructure (Phase 0, used by all phases)
Type: Type system hardening
"
```

### Commit 6: Shared components accessibility
```bash
# Fix in these files:
# src/components/dashboard/LocationTree.tsx
# src/components/dashboard/LocationTreeNode.tsx
# src/components/shared/ConfirmationDialog.tsx
# src/components/shared/Modal.tsx

git add src/components/dashboard/LocationTree.tsx
git add src/components/dashboard/LocationTreeNode.tsx
git add src/components/shared/ConfirmationDialog.tsx
git add src/components/shared/Modal.tsx

git commit -m "fix: improve accessibility and fix HTML entities in shared components

LOCATION TREE ACCESSIBILITY (WCAG 2.1):
- LocationTree.tsx line 47: Remove invalid aria-selected from button role
  The aria-selected attribute is only valid for: listbox, option, row, tab, treeitem
  Button role should not have aria-selected

- LocationTreeNode.tsx line 68: Add required aria-selected to treeitem role
  When using role=\"treeitem\", aria-selected is REQUIRED attribute
  Set to true/false based on selection state

- LocationTreeNode.tsx line 102: Remove aria-selected from button, move to parent
  Buttons should not have aria-selected; only treeitem

- LocationTreeNode.tsx line 156: Remove non-null assertion (!)
  Change: const item = items[index]!;
  To: if (!item) return null; const item = items[index];
  Reason: Non-null assertion hides potential errors

HTML ENTITY ESCAPING:
- ConfirmationDialog.tsx line 55: Properly escape quote characters in JSX
  Change: \"text\" to &quot;text&quot; or use single quotes
  Reason: JSX requires proper HTML entity escaping for special characters

WCAG 2.1 COMPLIANCE:
- All interactive tree components now have proper ARIA attributes
- Tree items have role and required aria-selected/aria-expanded
- Keyboard navigation properly announced to screen readers
- Visual states properly communicated via ARIA

Severity: 4 errors
Impact: Accessibility (Phase 2-3 interactive components)
Type: WCAG 2.1 compliance improvement
"
```

### Post-Execution
- [ ] Verify no new lint errors: `npm run lint`
- [ ] Build check: `npm run build`
- [ ] Push to branch: `git push origin fix/linting-errors`
- [ ] Create PR with all commits
- [ ] Request code review

---

## 🎯 FINAL RESULTS EXPECTED

After all 6 commits:

```
Before:
✖ 217 problems (43 errors, 174 warnings)

After:
✓ 0 problems (0 errors, 0 warnings)

Files modified: ~44
Total lines changed: ~150 (mostly deletions)
Commits: 6 (grouped by category)
```

---

**Ready to execute!**

When ready, execute commits in order 1-6 above.

