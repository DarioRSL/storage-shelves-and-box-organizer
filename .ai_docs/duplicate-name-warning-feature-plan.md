# Duplicate Box Name Warning Feature - Implementation Plan

**Status:** 📋 PLANNED (Not Yet Implemented)
**Priority:** Medium
**Complexity:** Medium
**Estimated Effort:** 4-6 hours
**Target Branch:** `fb_box-duplicate-warning` (separate from Box Form implementation)
**Related Documents:**
- Box Form View Implementation: `.ai_docs/box-form-view-implementation-plan.md`
- Box Form Review: `.ai_docs/review/box-form-view-implementation-review.md`

---

## 1. Context and Background

During the Box Form View implementation (January 4, 2026), a discussion arose about whether box names should be unique per workspace. After investigation and user consultation, the following was determined:

**Current Situation:**
- ❌ No database constraint on (workspace_id, name) uniqueness
- ❌ No PRD requirement for name uniqueness
- ✅ Users may legitimately want duplicate names in different locations
- ✅ QR codes provide unique identification (short_id is globally unique)

**User Requirement:**
> "raczej bym tylko informował użytkownika i pozostawił mu wybór nie wymuszając unikalności na etapie MVP"
>
> Translation: "I would rather inform the user and leave them the choice without enforcing uniqueness at MVP stage"

**Decision Made:**
- **Do NOT enforce uniqueness constraint** (no blocking validation)
- **Do implement informational warning system** (non-blocking, helpful UX)
- **Allow users to proceed** even with duplicate names

---

## 2. Feature Overview

### Goal
Provide helpful, non-intrusive warnings to users when they create or edit a box with a name that already exists in their workspace, while still allowing them to save the box with that name if desired.

### User Value
1. **Awareness:** Users know when they're creating duplicate names
2. **Context:** Users can see where other boxes with same name are located
3. **Convenience:** System suggests better names to avoid confusion
4. **Freedom:** Users can ignore warnings if duplicates are intentional

### Non-Goals
- ❌ Blocking form submission when duplicate name detected
- ❌ Enforcing uniqueness at database level
- ❌ Preventing users from creating duplicates
- ❌ Complex conflict resolution UI

---

## 3. Proposed UX Solutions

The user expressed interest in **all three** of the following approaches working together:

### Solution 1: Subtle Warning in Form (Primary)
**When:** User types box name that already exists in workspace
**Where:** Below the name input field, above description
**Appearance:** Yellow/amber warning banner (not red error)
**Content:**
```
⚠️ Uwaga: W tym workspace istnieją już 2 pudełka o nazwie "Pudełko Kasi":
  • Garaż > Półka Metalowa > Górna Półka
  • Piwnica > Regał A > Środkowa Półka

Sugestia: "Pudełko Kasi (Garaż)" lub "Pudełko Kasi (Piwnica)"
```

**Behavior:**
- Appears in real-time as user types (debounced 500ms)
- Shows location paths of existing boxes with same name
- Suggests better name by appending location suffix
- Does NOT disable Save button
- Dismissible (X button) - user can acknowledge and proceed

**Technical Approach:**
- Add `checkDuplicateNames` API endpoint: `GET /api/boxes/check-duplicate?workspace_id=X&name=Y`
- Add debounced API call in `useBoxForm` hook
- Store `duplicateWarning` state with details (count, locations, suggested name)
- Render warning component in `BoxForm` below name input

---

### Solution 2: Show Location in Box List (Secondary - Dashboard Enhancement)
**When:** Viewing dashboard box list
**Where:** Each box card/row in dashboard
**Appearance:** Small gray text below box name
**Content:**
```
Pudełko Kasi
📍 Garaż > Półka Metalowa
```

**Behavior:**
- Always visible for all boxes (not just duplicates)
- Helps distinguish boxes with same name
- Clickable breadcrumb to navigate to location

**Technical Approach:**
- Modify `BoxCard` component to display location path
- Fetch location data with box data (already available in BoxDto)
- Build location breadcrumb from parent hierarchy
- Add subtle icon (📍 or similar)

**Scope Note:** This requires modifying dashboard components, which is outside the scope of Box Form View. Should be implemented as part of this feature for consistency.

---

### Solution 3: Suggest Better Name (Integrated with Solution 1)
**When:** Duplicate detected
**Where:** In warning banner (Solution 1)
**Appearance:** Clickable suggestion chip/button
**Content:**
```
Sugestia: "Pudełko Kasi (Garaż)"  [Użyj tej nazwy]
```

**Behavior:**
- Analyze duplicate locations and suggest meaningful suffix
- Show 1-2 suggestions (top location hierarchy level)
- Click suggestion → auto-fill name input with suggested name
- Clear duplicate warning after accepting suggestion

**Technical Approach:**
- Backend returns `suggestedName` in duplicate check response
- Algorithm: Take first meaningful location level (not "root")
- Example: "Garaż > Półka > Top" → suggests "Pudełko Kasi (Garaż)"
- Frontend displays as clickable chip/button
- onClick → `setFormField('name', suggestedName)`

---

## 4. API Design

### New Endpoint: Check Duplicate Names

**Endpoint:** `GET /api/boxes/check-duplicate`

**Query Parameters:**
```typescript
interface CheckDuplicateQuery {
  workspace_id: string;  // required
  name: string;          // required
  exclude_box_id?: string; // optional, for edit mode
}
```

**Response (200 OK):**
```typescript
interface CheckDuplicateResponse {
  exists: boolean;        // true if duplicates found
  count: number;          // number of boxes with this name
  boxes?: Array<{         // only if exists = true
    id: string;
    short_id: string;
    location_path: string; // e.g., "Garaż > Półka Metalowa > Górna Półka"
    location_id: string;
  }>;
  suggested_name?: string; // e.g., "Pudełko Kasi (Garaż)"
}
```

**Example Request:**
```
GET /api/boxes/check-duplicate?workspace_id=550e8400-e29b-41d4-a716-446655440000&name=Pudełko Kasi
```

**Example Response (duplicates found):**
```json
{
  "exists": true,
  "count": 2,
  "boxes": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "short_id": "X7K9P2mN4q",
      "location_path": "Garaż > Półka Metalowa > Górna Półka",
      "location_id": "loc-123"
    },
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "short_id": "Y8L0Q3nO5r",
      "location_path": "Piwnica > Regał A > Środkowa Półka",
      "location_id": "loc-456"
    }
  ],
  "suggested_name": "Pudełko Kasi (Garaż)"
}
```

**Example Response (no duplicates):**
```json
{
  "exists": false,
  "count": 0
}
```

**Error Responses:**
- 400: Missing required parameters
- 401: Not authenticated
- 403: No access to workspace

---

### Implementation Notes

**Database Query (SQL):**
```sql
-- Find boxes with same name in workspace, excluding current box (if editing)
SELECT
  b.id,
  b.short_id,
  b.location_id,
  -- Build location path using recursive CTE
  (
    WITH RECURSIVE location_path AS (
      SELECT id, name, parent_id, name as path
      FROM locations
      WHERE id = b.location_id

      UNION ALL

      SELECT l.id, l.name, l.parent_id, l.name || ' > ' || lp.path
      FROM locations l
      JOIN location_path lp ON l.id = lp.parent_id
    )
    SELECT path FROM location_path WHERE parent_id IS NULL
  ) as location_path
FROM boxes b
WHERE b.workspace_id = $1
  AND LOWER(b.name) = LOWER($2)  -- case-insensitive comparison
  AND b.id != COALESCE($3, '00000000-0000-0000-0000-000000000000')  -- exclude current box
ORDER BY b.created_at DESC
LIMIT 10;  -- safety limit
```

**Suggestion Algorithm:**
1. If only 1 duplicate found → suggest name with its top location
2. If multiple duplicates → suggest name with first/primary location
3. If box has no location (null) → don't include in path
4. Extract top-level location (e.g., "Garaż" from "Garaż > Półka > Top")
5. Format: "{original_name} ({top_location})"

**Service Layer Function:**
```typescript
async function checkDuplicateBoxName(
  supabase: SupabaseClient,
  workspaceId: string,
  name: string,
  excludeBoxId?: string
): Promise<CheckDuplicateResponse> {
  // 1. Query database for boxes with same name
  // 2. Build location paths for each duplicate
  // 3. Generate suggested name
  // 4. Return response
}
```

---

## 5. Frontend Implementation

### Types (add to src/types.ts)

```typescript
export interface DuplicateNameWarning {
  exists: boolean;
  count: number;
  boxes: Array<{
    id: string;
    short_id: string;
    location_path: string;
    location_id: string;
  }>;
  suggested_name: string | null;
}
```

### Update useBoxForm Hook

**File:** `src/components/hooks/useBoxForm.ts`

**Changes:**
1. Add `duplicateWarning: DuplicateNameWarning | null` to BoxFormState
2. Add `checkDuplicateName` function with debounced API call
3. Call `checkDuplicateName` on name change (useEffect with 500ms debounce)
4. Add `acceptSuggestedName` function to apply suggested name

**Implementation:**
```typescript
// Add to BoxFormState interface
export interface BoxFormState {
  // ... existing fields ...
  duplicateWarning: DuplicateNameWarning | null;
}

// Add to hook
const [duplicateCheckTimeout, setDuplicateCheckTimeout] = useState<NodeJS.Timeout | null>(null);

// Check for duplicates when name changes (debounced)
useEffect(() => {
  // Clear existing timeout
  if (duplicateCheckTimeout) {
    clearTimeout(duplicateCheckTimeout);
  }

  // Don't check if name is empty
  if (!formState.name.trim()) {
    setFormState(prev => ({ ...prev, duplicateWarning: null }));
    return;
  }

  // Debounce API call by 500ms
  const timeout = setTimeout(async () => {
    try {
      const response = await apiFetch<DuplicateNameWarning>(
        `/api/boxes/check-duplicate?workspace_id=${currentWorkspaceId}&name=${encodeURIComponent(formState.name)}${mode === 'edit' && boxId ? `&exclude_box_id=${boxId}` : ''}`
      );

      setFormState(prev => ({ ...prev, duplicateWarning: response.exists ? response : null }));
    } catch (error) {
      console.error('Failed to check duplicate names:', error);
      // Non-critical error, don't show to user
    }
  }, 500);

  setDuplicateCheckTimeout(timeout);

  // Cleanup
  return () => {
    if (timeout) clearTimeout(timeout);
  };
}, [formState.name, currentWorkspaceId, mode, boxId]);

// Add function to accept suggested name
const acceptSuggestedName = useCallback((suggestedName: string) => {
  setFormField('name', suggestedName);
  // Warning will clear automatically when name changes triggers new duplicate check
}, [setFormField]);

// Add to return interface
return {
  // ... existing returns ...
  acceptSuggestedName,
};
```

---

### New Component: DuplicateNameWarning

**File:** `src/components/forms/DuplicateNameWarning.tsx`

**Purpose:** Display warning banner when duplicate names detected

**Props:**
```typescript
interface DuplicateNameWarningProps {
  warning: DuplicateNameWarning;
  onAcceptSuggestion: (suggestedName: string) => void;
  onDismiss: () => void;
}
```

**Implementation:**
```tsx
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DuplicateNameWarning({ warning, onAcceptSuggestion, onDismiss }: DuplicateNameWarningProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-md p-4" role="alert">
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />

        <div className="flex-1">
          {/* Warning Message */}
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Uwaga: W tym workspace {warning.count === 1 ? 'istnieje już pudełko' : `istnieją już ${warning.count} pudełka`} o tej nazwie:
          </p>

          {/* List of duplicate locations */}
          <ul className="mt-2 space-y-1">
            {warning.boxes.map((box) => (
              <li key={box.id} className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <span className="text-amber-500">•</span>
                <span>{box.location_path || 'Bez lokalizacji'}</span>
                <span className="text-xs text-amber-600 dark:text-amber-400">({box.short_id})</span>
              </li>
            ))}
          </ul>

          {/* Suggested name */}
          {warning.suggested_name && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-amber-900 dark:text-amber-200">Sugestia:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAcceptSuggestion(warning.suggested_name!)}
                className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                {warning.suggested_name}
              </Button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0"
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

---

### Update BoxForm Component

**File:** `src/components/forms/BoxForm.tsx`

**Changes:**
1. Get `duplicateWarning` and `acceptSuggestedName` from hook
2. Add state for dismissing warning
3. Render DuplicateNameWarning component below NameInput

**Implementation:**
```tsx
// Import new component
import { DuplicateNameWarning } from "./DuplicateNameWarning";

// Inside BoxForm component
const [isDuplicateWarningDismissed, setIsDuplicateWarningDismissed] = useState(false);

// Get from hook
const {
  formState,
  // ... other returns ...
  acceptSuggestedName,
} = useBoxForm(mode, boxId, workspaceId);

// Reset dismissed state when name changes
React.useEffect(() => {
  setIsDuplicateWarningDismissed(false);
}, [formState.name]);

// In JSX, after NameInput
<NameInput
  value={formState.name}
  onChange={(value) => setFormField("name", value)}
  error={formState.errors.name}
  disabled={formState.isSaving}
/>

{/* Duplicate Name Warning */}
{formState.duplicateWarning && !isDuplicateWarningDismissed && (
  <DuplicateNameWarning
    warning={formState.duplicateWarning}
    onAcceptSuggestion={acceptSuggestedName}
    onDismiss={() => setIsDuplicateWarningDismissed(true)}
  />
)}

<DescriptionTextarea
  // ... rest of form ...
/>
```

---

### Dashboard Enhancement (Solution 2)

**File:** `src/components/dashboard/BoxCard.tsx` (or similar)

**Changes:**
1. Display location path below box name
2. Make location clickable (navigate to location view)

**Implementation:**
```tsx
// In BoxCard component
<div className="box-card">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
    {box.name}
  </h3>

  {/* Location Path */}
  {box.location && (
    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
      <MapPin className="h-3 w-3" />
      <span>{buildLocationPath(box.location)}</span>
    </p>
  )}

  {/* Rest of card content */}
</div>

// Helper function
function buildLocationPath(location: LocationDto): string {
  // Build hierarchical path from location data
  // Example: "Garaż > Półka Metalowa"
  const parts = [];
  let current = location;
  while (current) {
    parts.unshift(current.name);
    current = current.parent;  // if parent data available
  }
  return parts.join(' > ');
}
```

**Note:** This requires location hierarchy data to be available in BoxDto. May need to update API response to include full location path or implement recursive lookup.

---

## 6. Implementation Steps

### Phase 1: Backend API
1. Create new API endpoint: `src/pages/api/boxes/check-duplicate.ts`
2. Implement service function: `checkDuplicateBoxName` in `src/lib/services/box.service.ts`
3. Write database query with location path building (recursive CTE or ltree)
4. Implement suggestion algorithm
5. Add error handling and validation
6. Test endpoint manually (Postman/curl)

### Phase 2: Frontend Types & Hook
1. Add `DuplicateNameWarning` interface to `src/types.ts`
2. Update `BoxFormState` in `useBoxForm.ts` to include `duplicateWarning`
3. Add debounced duplicate check logic in `useBoxForm` useEffect
4. Add `acceptSuggestedName` function
5. Test hook in isolation

### Phase 3: Warning Component
1. Create `DuplicateNameWarning.tsx` component
2. Implement warning banner with amber styling
3. Display list of duplicate locations
4. Add suggested name button
5. Add dismiss functionality
6. Test component rendering

### Phase 4: BoxForm Integration
1. Update `BoxForm.tsx` to render DuplicateNameWarning
2. Add dismissed state management
3. Wire up `acceptSuggestedName` callback
4. Test full flow: type duplicate name → see warning → accept suggestion
5. Test dismiss functionality

### Phase 5: Dashboard Enhancement (Optional)
1. Update BoxCard component to show location path
2. Test location path display in dashboard
3. Make location clickable (navigate to location view)

### Phase 6: Testing & Refinement
1. Test create mode with duplicate names
2. Test edit mode with duplicate names (should exclude current box)
3. Test with no duplicates (warning should not appear)
4. Test suggestion acceptance
5. Test dismissing warning
6. Test debounce behavior (rapid typing)
7. Test API error handling
8. Test edge cases (null location, special characters in name)

---

## 7. Test Cases

### Test Case 1: Duplicate Detected (Create Mode)
**Setup:**
- Workspace has 2 boxes named "Pudełko Kasi"
- User creating new box

**Steps:**
1. Navigate to `/app/boxes/new`
2. Type "Pudełko Kasi" in name field
3. Wait 500ms

**Expected:**
- ✅ Warning banner appears
- ✅ Shows "istnieją już 2 pudełka o tej nazwie"
- ✅ Lists 2 locations
- ✅ Shows suggested name "Pudełko Kasi (Garaż)"
- ✅ Save button still enabled

---

### Test Case 2: Accept Suggestion
**Setup:**
- Warning banner visible with suggestion

**Steps:**
1. Click suggested name button "Pudełko Kasi (Garaż)"

**Expected:**
- ✅ Name input updated to "Pudełko Kasi (Garaż)"
- ✅ Warning banner disappears (new duplicate check runs)
- ✅ If new name is unique, no warning shows

---

### Test Case 3: Dismiss Warning
**Setup:**
- Warning banner visible

**Steps:**
1. Click X button to dismiss

**Expected:**
- ✅ Warning banner disappears
- ✅ Warning doesn't reappear unless user changes name again

---

### Test Case 4: Edit Mode (Exclude Current Box)
**Setup:**
- Editing box with name "Pudełko Kasi"
- Another box exists with same name

**Steps:**
1. Navigate to `/app/boxes/:id/edit`
2. Name field shows "Pudełko Kasi"

**Expected:**
- ✅ Warning shows "istnieje już pudełko" (count = 1, excluding current)
- ✅ API call includes `exclude_box_id` parameter

---

### Test Case 5: No Duplicates
**Setup:**
- No other boxes with typed name

**Steps:**
1. Type unique name "Unique Box 123"

**Expected:**
- ✅ No warning appears
- ✅ API returns `{ exists: false, count: 0 }`

---

### Test Case 6: Debounce Behavior
**Setup:**
- User typing rapidly

**Steps:**
1. Type "P" → wait 100ms
2. Type "u" → wait 100ms
3. Type "dełko" → wait 500ms

**Expected:**
- ✅ Only 1 API call made (after final 500ms delay)
- ✅ No API calls during rapid typing

---

### Test Case 7: API Error Handling
**Setup:**
- Mock API to return 500 error

**Steps:**
1. Type duplicate name

**Expected:**
- ✅ Warning doesn't appear (graceful failure)
- ✅ Error logged to console
- ✅ User can still submit form

---

### Test Case 8: Case-Insensitive Matching
**Setup:**
- Box exists named "Pudełko Kasi"
- User types "PUDEŁKO KASI" or "pudełko kasi"

**Expected:**
- ✅ Warning appears (case-insensitive match)
- ✅ Database query uses LOWER() comparison

---

### Test Case 9: Special Characters
**Setup:**
- Box exists named "Pudełko #1 (Garaż)"

**Steps:**
1. Type "Pudełko #1 (Garaż)"

**Expected:**
- ✅ Warning appears
- ✅ Special characters handled correctly
- ✅ URL encoding works in API call

---

### Test Case 10: Null Location
**Setup:**
- Duplicate box has no location (location_id = null)

**Steps:**
1. Type duplicate name

**Expected:**
- ✅ Warning shows "Bez lokalizacji" instead of empty path
- ✅ No JavaScript errors

---

## 8. Error Handling

### API Errors
- **400 Bad Request:** Missing parameters → Log error, don't show warning
- **401 Unauthorized:** Session expired → Redirect to `/auth`
- **403 Forbidden:** No workspace access → Log error, don't show warning
- **500 Server Error:** Database error → Log error, don't show warning

### Frontend Errors
- **Network error:** Connection lost → Log error, don't show warning
- **Timeout:** API takes >5s → Cancel request, don't show warning
- **Invalid response:** Malformed JSON → Log error, don't show warning

**Philosophy:** Duplicate warning is a **nice-to-have** feature. If it fails, user can still create box without issues. Fail gracefully and silently (log to console only).

---

## 9. Performance Considerations

### Debouncing
- 500ms debounce on name input prevents excessive API calls
- Debounce timeout cleared on component unmount

### API Response Time
- Database query limited to 10 results (safety limit)
- Location path building should be optimized (use ltree or materialized path)
- Consider caching duplicate check results (optional)

### Frontend Rendering
- DuplicateNameWarning component memoized with React.memo
- Only renders when warning exists and not dismissed

---

## 10. Accessibility

**ARIA Attributes:**
- Warning banner: `role="alert"`
- Dismiss button: `aria-label="Dismiss warning"`
- Suggested name button: Clear text label

**Keyboard Navigation:**
- Dismiss button: Focusable and activated with Enter/Space
- Suggested name button: Focusable and activated with Enter/Space
- Tab order: Warning appears after name input in tab sequence

**Screen Reader:**
- Warning announces when it appears (role="alert")
- Suggested name button clearly labeled

---

## 11. Localization (Polish)

**Text Strings:**
- "Uwaga: W tym workspace istnieje już pudełko o tej nazwie:" (singular)
- "Uwaga: W tym workspace istnieją już {count} pudełka o tej nazwie:" (plural)
- "Bez lokalizacji" (for null location)
- "Sugestia:" (Suggestion label)
- Dismiss button: `aria-label="Odrzuć ostrzeżenie"`

---

## 12. Future Enhancements (Out of Scope)

1. **Smart suggestions:** Analyze existing naming patterns, suggest numbered suffixes
2. **Duplicate grouping:** Show grouped view in dashboard for boxes with same name
3. **Bulk rename:** Allow renaming all duplicates at once
4. **Warning persistence:** Remember dismissed warnings in localStorage
5. **Duplicate statistics:** Show count of duplicates in workspace analytics

---

## 13. Dependencies

**Backend:**
- Supabase database with ltree extension (already installed)
- Existing box and location tables

**Frontend:**
- Existing useBoxForm hook
- Existing BoxForm component
- Lucide icons (AlertCircle, X)
- Shadcn/ui Button component
- apiFetch utility

**No new dependencies required** ✅

---

## 14. Success Criteria

Feature considered complete when:

1. ✅ API endpoint `/api/boxes/check-duplicate` works correctly
2. ✅ Duplicate warning appears in real-time (debounced)
3. ✅ Warning shows correct count and locations
4. ✅ Suggested name can be accepted with one click
5. ✅ Warning can be dismissed
6. ✅ Edit mode excludes current box from duplicate check
7. ✅ All test cases pass
8. ✅ No TypeScript errors
9. ✅ Accessible to keyboard and screen reader users
10. ✅ Polish localization complete
11. ✅ Dashboard shows location paths (optional)

---

## 15. Git Workflow

**Branch Name:** `fb_box-duplicate-warning`

**Commit Strategy:**
1. Backend API endpoint implementation
2. Frontend types and hook updates
3. DuplicateNameWarning component
4. BoxForm integration
5. Dashboard enhancement (optional)
6. Tests and documentation

**PR Title:** "feat(ui): add duplicate box name warning system"

**PR Description Template:**
```markdown
## Summary
Implements non-blocking duplicate name warning system for box creation/editing.

## Changes
- New API endpoint: GET /api/boxes/check-duplicate
- Updated useBoxForm hook with debounced duplicate checking
- New DuplicateNameWarning component
- BoxForm integration
- Dashboard location path display

## Features
- Real-time duplicate detection (debounced 500ms)
- Shows locations of existing boxes with same name
- Suggests better name with location suffix
- Non-blocking (user can still save)
- Dismissible warning
- Full Polish localization

## Testing
- ✅ All test cases pass
- ✅ Accessibility tested
- ✅ Edge cases handled

## Screenshots
[Screenshot of warning banner]
[Screenshot of suggestion accepted]
```

---

## 16. Documentation Updates

After implementation, update:

1. **CLAUDE.md** - Add note about duplicate name warning feature
2. **API Plan** (`.ai_docs/api-plan.md`) - Document new endpoint
3. **Box Form Plan** (`.ai_docs/box-form-view-implementation-plan.md`) - Mark as enhanced
4. **Project TODO** (`.ai_docs/project-TO-DO.md`) - Mark as completed

---

## 17. Rollback Plan

If feature causes issues in production:

1. **Quick fix:** Hide warning UI by adding feature flag
2. **Disable API:** Return empty response from endpoint
3. **Full rollback:** Revert PR, delete branch

**No database changes** required, so rollback is safe.

---

## 18. Open Questions

1. **Should we cache duplicate check results?**
   - Probably not needed, query is fast enough

2. **Should warning persist across page refreshes?**
   - No, warning is contextual to current typing session

3. **Should we track if user ignored warning?**
   - No, don't need analytics for MVP

4. **Should dashboard location path be always visible or only for duplicates?**
   - User wants it always visible (helps with navigation)

5. **Should we limit number of duplicates shown in warning?**
   - Yes, show max 5, then "... and X more"

---

## 19. Estimated Timeline

**Total Effort:** 4-6 hours

- **Phase 1 (Backend):** 1.5 hours
- **Phase 2 (Hook):** 1 hour
- **Phase 3 (Component):** 1 hour
- **Phase 4 (Integration):** 0.5 hours
- **Phase 5 (Dashboard):** 1 hour (optional)
- **Phase 6 (Testing):** 1-2 hours

---

## 20. Conclusion

This feature enhances user experience by providing helpful warnings without blocking workflow. It maintains user freedom while preventing accidental confusion from duplicate names.

The implementation is straightforward, requires no database schema changes, and fails gracefully if errors occur.

**Status:** Ready for planning session and implementation.

---

**Plan Created:** 2026-01-04
**Created By:** Claude Sonnet 4.5
**Next Step:** Schedule planning session to review this document and begin implementation