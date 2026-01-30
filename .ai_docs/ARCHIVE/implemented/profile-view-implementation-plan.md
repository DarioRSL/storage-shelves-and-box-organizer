# Profile View Implementation Plan

## 1. Overview

The Profile View is a dedicated page for viewing and editing user profile information. Users can update their display name, upload an avatar image, and view account statistics. The implementation uses Supabase Storage for avatar uploads with strict size limits and a modular architecture designed for future migration to external storage providers.

**MVP Status:** Core features (profile display, name editing, avatar upload) are required. Account statistics display is included but optional.

## 2. View Routing

**Route Path:** `/app/profile`

**Component File:** `src/pages/app/profile.astro`

**Route Parameters:** None (all data fetched based on authenticated user from JWT token)

**Access Requirements:** User must be authenticated (valid Supabase session via middleware)

## 3. Component Structure

```
ProfileView (Astro container component)
├── ProfileContainer (React)
│   ├── ProfileHeader
│   │   ├── BackButton (navigate to /app)
│   │   └── PageTitle ("Mój profil")
│   ├── AvatarSection (React)
│   │   ├── AvatarDisplay (current avatar or initials fallback)
│   │   ├── AvatarUploadButton
│   │   ├── AvatarRemoveButton (conditional - if avatar exists)
│   │   ├── AvatarUploadProgress
│   │   └── AvatarError
│   ├── ProfileForm (React)
│   │   ├── FullNameInput
│   │   ├── EmailDisplay (read-only)
│   │   ├── CharacterCounter
│   │   └── SaveButton
│   ├── AccountStatsSection (React)
│   │   ├── CreatedAtDisplay
│   │   ├── WorkspacesCountDisplay
│   │   └── BoxesCountDisplay (optional)
│   ├── ErrorAlert (conditional)
│   └── SuccessToast (conditional)
```

## 4. Component Details

### ProfileView (Astro Container)

**Description:** Main container for the profile page. Astro component serving as layout, combining React sub-components and managing server-side data fetching.

**Main Elements:**

- Wrapper div with Tailwind classes (responsive layout, max-width container)
- Heading: "Mój profil"
- Card container for profile content
- Back navigation link

**Supported Interactions:**

- Page load triggers fetching of user profile
- Error clearing on state changes
- Handling of success/error toasts

**Validation:**

- Authentication verification (Astro middleware)

**Types:**

- `ProfileDto`

**Props:** None (Astro component)

---

### ProfileContainer (React)

**Description:** Main React component managing profile state, data fetching, and coordinating child components.

**Main Elements:**

- State management for profile data, loading, errors
- useEffect for initial data fetch
- Form state management
- Avatar upload handling
- Stats fetching

**Supported Interactions:**

- Load profile data on mount
- Submit profile updates
- Upload avatar
- Remove avatar
- Navigate back to dashboard

**Validation:**

- full_name: optional, max 255 characters
- avatar: max 512KB, allowed types: image/jpeg, image/png, image/webp

**Types:**

- `ProfileDto`
- `UpdateProfileRequest`
- `UpdateProfileResponse`
- `ProfileStats`

**Props:**

```typescript
interface ProfileContainerProps {
  userId: string;
  initialProfile?: ProfileDto;
}
```

---

### AvatarSection (React)

**Description:** Component for displaying and managing user avatar with upload capability.

**Main Elements:**

- Avatar image display (128x128px, rounded-full)
- Initials fallback (gradient background)
- Hidden file input
- "Zmień zdjęcie" button
- "Usuń zdjęcie" button (conditional - visible when avatar exists)
- Upload progress bar
- Error message display
- File size/type requirements text

**Supported Interactions:**

- Click upload button → trigger file input
- Select file → client-side validate → upload
- Click remove → confirmation → DELETE avatar
- Hover state on avatar showing upload hint

**Validation:**

- File size: max 512KB (524,288 bytes)
- File types: image/jpeg, image/png, image/webp
- Client-side validation before upload

**Types:**

```typescript
interface AvatarSectionProps {
  avatarUrl: string | null;
  userEmail: string;
  userName: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading: boolean;
  uploadProgress?: number;
  error?: string;
}
```

---

### ProfileForm (React)

**Description:** Form for editing profile fields (currently only full_name).

**Main Elements:**

- Label: "Nazwa wyświetlana"
- Input field for full_name
- Character counter (X / 255)
- Label: "Adres e-mail"
- Email display (read-only, grayed out with lock icon)
- "Zapisz zmiany" button
- Loading spinner on button during save

**Supported Interactions:**

- Edit full name
- Submit form (Enter key or Save button)
- Real-time character counting
- isDirty detection (enable/disable Save button)

**Validation:**

- full_name: optional, max 255 characters, trimmed
- Cannot change email (display only)
- Save button disabled if not dirty

**Types:**

```typescript
interface ProfileFormProps {
  fullName: string | null;
  email: string;
  onSave: (data: { full_name: string | null }) => Promise<void>;
  isSaving: boolean;
  error?: string;
  isDirty: boolean;
}
```

---

### AccountStatsSection (React)

**Description:** Read-only section displaying account statistics.

**Main Elements:**

- Section header: "Statystyki konta"
- "Członek od" + formatted date
- "Liczba workspace'ów" + count
- "Liczba pudełek" + count (optional)
- Icons for each stat

**Supported Interactions:**

- Display only (no interactions)

**Validation:**

- None (read-only display)

**Types:**

```typescript
interface AccountStatsSectionProps {
  createdAt: string;
  workspacesCount: number;
  boxesCount?: number;
}
```

---

### ErrorAlert (React)

**Description:** Alert component for displaying errors.

**Main Elements:**

- Alert container (Shadcn Alert)
- Error icon
- Error message
- Dismiss button

**Supported Interactions:**

- Click dismiss → clear error

**Types:**

```typescript
interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
}
```

## 5. Types

### Existing Types (from types.ts)

```typescript
export type ProfileDto = Tables<"profiles">;
// { id, email, full_name, avatar_url, theme_preference, created_at, updated_at }

export type ThemeMode = "light" | "dark" | "system";

export interface UpdateThemeRequest {
  theme_preference: ThemeMode;
}

export interface UpdateThemeResponse {
  theme_preference: ThemeMode;
}
```

### New Types to Implement

```typescript
/**
 * Request body for PATCH /api/profiles/me
 */
export interface UpdateProfileRequest {
  full_name?: string | null;
  avatar_url?: string | null;
}

/**
 * Response from PATCH /api/profiles/me
 */
export interface UpdateProfileResponse {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

/**
 * Response from POST /api/profiles/me/avatar
 */
export interface UploadAvatarResponse {
  avatar_url: string;
  updated_at: string;
}

/**
 * Profile statistics for display
 */
export interface ProfileStats {
  createdAt: string;
  workspacesCount: number;
  boxesCount?: number;
}

/**
 * Avatar upload constraints - for client and server validation
 */
export const AvatarConstraints = {
  MAX_SIZE_BYTES: 524288, // 512KB
  MAX_SIZE_DISPLAY: "512KB",
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"] as const,
} as const;

export type AllowedAvatarType = (typeof AvatarConstraints.ALLOWED_TYPES)[number];

/**
 * Profile view state
 */
export interface ProfileViewState {
  profile: ProfileDto | null;
  stats: ProfileStats | null;
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  successMessage: string | null;
  isDirty: boolean;
}
```

## 6. State Management

### Custom Hook: `useProfile`

**Purpose:** Centralize management of profile data and operations.

**State:**

```typescript
const [profile, setProfile] = useState<ProfileDto | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [isUploading, setIsUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [error, setError] = useState<string | null>(null);
```

**Functions:**

- `fetchProfile()` - Fetches profile on load
- `updateProfile(data)` - Updates profile fields (full_name)
- `uploadAvatar(file)` - Uploads avatar to Supabase Storage
- `removeAvatar()` - Removes avatar from Storage and clears URL
- `setError(message)` - Setter for error message
- `clearError()` - Clears error message

**Usage:**

```typescript
const {
  profile,
  isLoading,
  isSaving,
  isUploading,
  uploadProgress,
  error,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  refetch,
} = useProfile(userId);

useEffect(() => {
  fetchProfile();
}, []);
```

---

### Custom Hook: `useProfileStats`

**Purpose:** Fetch and manage profile statistics.

**State:**

```typescript
const [stats, setStats] = useState<ProfileStats | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

**Functions:**

- `fetchStats()` - Fetches stats on load

**Usage:**

```typescript
const { stats, isLoading } = useProfileStats(userId);
```

---

### Form State (in ProfileContainer)

```typescript
const [fullName, setFullName] = useState<string>("");
const [isDirty, setIsDirty] = useState(false);

// Initialize from profile
useEffect(() => {
  if (profile) {
    setFullName(profile.full_name || "");
    setIsDirty(false);
  }
}, [profile]);

// Track changes
const handleFullNameChange = (value: string) => {
  setFullName(value);
  setIsDirty(value !== (profile?.full_name || ""));
};
```

## 7. API Integration

### Endpoint: `GET /api/profiles/me` (existing)

**Purpose:** Fetch current user profile

**Request Type:** HTTP GET

**URL:** `/api/profiles/me`

**Headers:** Cookie: sb_session (HttpOnly)

**Request Body:** None

**Response (200 OK):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jan Kowalski",
  "avatar_url": "https://xxx.supabase.co/storage/v1/object/public/avatars/...",
  "theme_preference": "system",
  "created_at": "2023-10-27T10:00:00Z",
  "updated_at": "2023-10-27T10:00:00Z"
}
```

**Error Responses:**

- 401 Unauthorized: Missing/invalid session
- 404 Not Found: Profile not found
- 500 Internal Server Error: Database error

---

### Endpoint: `PATCH /api/profiles/me` (NEW)

**Purpose:** Update profile fields (full_name, avatar_url)

**Request Type:** HTTP PATCH

**URL:** `/api/profiles/me`

**Headers:**

```
Cookie: sb_session
Content-Type: application/json
```

**Request Body:**

```json
{
  "full_name": "Nowa Nazwa"
}
```

**Validation (Zod):**

```typescript
const UpdateProfileSchema = z
  .object({
    full_name: z
      .string()
      .max(255, "Nazwa może mieć maksymalnie 255 znaków")
      .transform((val) => val?.trim() || null)
      .nullable()
      .optional(),
    avatar_url: z.string().url("Nieprawidłowy URL").nullable().optional(),
  })
  .refine((data) => data.full_name !== undefined || data.avatar_url !== undefined, {
    message: "Wymagane co najmniej jedno pole do aktualizacji",
  });
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "full_name": "Nowa Nazwa",
  "avatar_url": "https://...",
  "updated_at": "2023-10-27T11:00:00Z"
}
```

**Error Responses:**

- 400 Bad Request: Validation error
- 401 Unauthorized: Not authenticated
- 404 Not Found: Profile not found
- 500 Internal Server Error: Database error

**Implementation:**

```typescript
const response = await apiFetch<UpdateProfileResponse>("/api/profiles/me", {
  method: "PATCH",
  body: JSON.stringify({ full_name: newName }),
});
```

---

### Endpoint: `POST /api/profiles/me/avatar` (NEW)

**Purpose:** Upload avatar image to Supabase Storage

**Request Type:** HTTP POST

**URL:** `/api/profiles/me/avatar`

**Headers:**

```
Cookie: sb_session
Content-Type: multipart/form-data
```

**Request Body:** FormData with `avatar` field (File)

**Server-side Validation:**

```typescript
const AVATAR_MAX_SIZE = 524288; // 512KB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 1. Check file exists
// 2. Check file size <= 512KB
// 3. Check MIME type is allowed
```

**Storage Path Pattern:**

```
avatars/{user_id}/{timestamp}_{sanitized_filename}
```

**Response (200 OK):**

```json
{
  "avatar_url": "https://xxx.supabase.co/storage/v1/object/public/avatars/user-id/1234567890_avatar.jpg",
  "updated_at": "2023-10-27T11:00:00Z"
}
```

**Error Responses:**

- 400 Bad Request: "Brak pliku" / "Plik za duży (max 512KB)" / "Niedozwolony typ pliku"
- 401 Unauthorized: Not authenticated
- 500 Internal Server Error: Storage error

**Implementation:**

```typescript
const formData = new FormData();
formData.append("avatar", file);

const response = await fetch("/api/profiles/me/avatar", {
  method: "POST",
  credentials: "include",
  body: formData,
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || "Błąd uploadu");
}

const data = (await response.json()) as UploadAvatarResponse;
```

---

### Endpoint: `DELETE /api/profiles/me/avatar` (NEW)

**Purpose:** Remove avatar from Storage and clear profile.avatar_url

**Request Type:** HTTP DELETE

**URL:** `/api/profiles/me/avatar`

**Headers:** Cookie: sb_session

**Request Body:** None

**Server-side Steps:**

1. Get current avatar_url from profile
2. Extract storage path from URL
3. Delete file from Supabase Storage
4. Update profile.avatar_url = null

**Response (200 OK):**

```json
{
  "message": "Avatar usunięty"
}
```

**Error Responses:**

- 401 Unauthorized: Not authenticated
- 404 Not Found: No avatar to delete
- 500 Internal Server Error: Storage error

---

### Endpoint: `GET /api/profiles/me/stats` (NEW - optional)

**Purpose:** Fetch account statistics

**Request Type:** HTTP GET

**URL:** `/api/profiles/me/stats`

**Headers:** Cookie: sb_session

**Response (200 OK):**

```json
{
  "created_at": "2023-10-27T10:00:00Z",
  "workspaces_count": 3,
  "boxes_count": 47
}
```

**Query (service layer):**

```sql
SELECT
  p.created_at,
  (SELECT COUNT(*) FROM workspace_members WHERE user_id = p.id) as workspaces_count,
  (SELECT COUNT(*) FROM boxes b
   JOIN workspaces w ON b.workspace_id = w.id
   JOIN workspace_members wm ON w.id = wm.workspace_id
   WHERE wm.user_id = p.id) as boxes_count
FROM profiles p
WHERE p.id = :userId
```

## 8. User Interactions

| #   | Interaction                    | Component           | Expected Result                                    | Flow                          |
| --- | ------------------------------ | ------------------- | -------------------------------------------------- | ----------------------------- |
| 1   | Page load `/app/profile`       | ProfileView         | Fetches profile and stats, displays data           | useEffect hooks, API calls    |
| 2   | Display current avatar         | AvatarSection       | Avatar image shown (or initials fallback)          | profile.avatar_url check      |
| 3   | Click "Zmień zdjęcie"          | AvatarSection       | File picker opens                                  | hidden input click trigger    |
| 4   | Select valid image file        | AvatarSection       | Client validates, starts upload, shows progress    | validation → POST /avatar     |
| 5   | Select oversized file (>512KB) | AvatarSection       | Error message: "Plik za duży (max 512KB)"          | client-side validation        |
| 6   | Select invalid file type       | AvatarSection       | Error message: "Dozwolone formaty: JPG, PNG, WebP" | client-side validation        |
| 7   | Upload completes               | AvatarSection       | Avatar updated, success toast shown                | API response → state update   |
| 8   | Upload fails (server error)    | AvatarSection       | Error message shown, retry available               | error state, keep UI usable   |
| 9   | Click "Usuń zdjęcie"           | AvatarSection       | Confirmation prompt                                | confirmation dialog           |
| 10  | Confirm avatar removal         | AvatarSection       | Avatar removed, initials shown                     | DELETE /avatar → state update |
| 11  | Cancel avatar removal          | AvatarSection       | Dialog closes, no change                           | dialog close                  |
| 12  | Edit full_name field           | ProfileForm         | Input value changes, isDirty becomes true          | controlled input              |
| 13  | Clear full_name field          | ProfileForm         | Empty value allowed, isDirty true                  | validation passes             |
| 14  | Type > 255 characters          | ProfileForm         | Input prevented or truncated                       | maxLength attribute           |
| 15  | Click "Zapisz zmiany"          | ProfileForm         | PATCH /profiles/me → profile updated               | API call, success toast       |
| 16  | Click Save when not dirty      | ProfileForm         | Button disabled, no action                         | isDirty check                 |
| 17  | Save fails (validation)        | ProfileForm         | Error message below field                          | field-level error display     |
| 18  | Save fails (network)           | ProfileForm         | Error toast, form preserved                        | error state, retry available  |
| 19  | View account stats             | AccountStatsSection | Stats displayed (member since, counts)             | read-only display             |
| 20  | Click back button              | ProfileHeader       | Navigate to /app                                   | Astro navigation              |
| 21  | 401 Unauthorized               | Any component       | Redirect to /auth                                  | middleware or API response    |
| 22  | Network error                  | Any component       | Error message, retry option                        | catch block, error state      |

## 9. Conditions and Validation

### Authentication Conditions

**Condition:** User must be authenticated

- **Verification:** Astro middleware checks JWT token in cookie
- **Components Affected:** All components in ProfileView
- **Impact:** Unauthenticated users cannot access `/app/profile` - middleware redirects to `/auth`
- **Implementation:**
  ```typescript
  const user = locals.user;
  if (!user) {
    return redirect("/auth");
  }
  ```

### Profile Update Conditions

**Condition 1: full_name max 255 characters**

- **Verification:** Client-side: `value.length <= 255`, Server-side: Zod validation
- **Components Affected:** ProfileForm
- **Impact:** Input field has maxLength, server rejects longer values
- **Implementation:**
  ```typescript
  <input
    maxLength={255}
    value={fullName}
    onChange={(e) => handleFullNameChange(e.target.value)}
  />
  ```

**Condition 2: Save button disabled when not dirty**

- **Verification:** `isDirty === false`
- **Components Affected:** ProfileForm
- **Impact:** Prevents unnecessary API calls
- **Implementation:**
  ```typescript
  <button disabled={!isDirty || isSaving}>Zapisz zmiany</button>
  ```

### Avatar Upload Conditions

**Condition 1: File size max 512KB**

- **Verification:** Client-side: `file.size <= 524288`, Server-side: same check
- **Components Affected:** AvatarSection
- **Impact:** Large files rejected with clear message
- **Implementation:**
  ```typescript
  if (file.size > AvatarConstraints.MAX_SIZE_BYTES) {
    setError(`Plik za duży. Maksymalny rozmiar: ${AvatarConstraints.MAX_SIZE_DISPLAY}`);
    return;
  }
  ```

**Condition 2: File type must be image/jpeg, image/png, or image/webp**

- **Verification:** Client-side: type check, Server-side: MIME type validation
- **Components Affected:** AvatarSection
- **Impact:** Non-image files rejected
- **Implementation:**
  ```typescript
  if (!AvatarConstraints.ALLOWED_TYPES.includes(file.type as AllowedAvatarType)) {
    setError("Dozwolone formaty: JPG, PNG, WebP");
    return;
  }
  ```

**Condition 3: Remove button only visible when avatar exists**

- **Verification:** `profile.avatar_url !== null`
- **Components Affected:** AvatarSection
- **Impact:** Clean UI, no confusing button
- **Implementation:**
  ```typescript
  {avatarUrl && (
    <button onClick={handleRemove}>Usuń zdjęcie</button>
  )}
  ```

### RLS (Row Level Security) Conditions

**Condition:** User can only access their own profile

- **Verification:** RLS policy: `auth.uid() = id`
- **Components Affected:** All profile operations
- **Impact:** Database-level security
- **Implementation:** Automatically enforced at database level

## 10. Error Handling

### Scenario: Missing Authentication (401 Unauthorized)

**Cause:** JWT token expired, invalid, or missing

**Components Affected:** All API calls

**Handling Strategy:**

1. Catch 401 response status
2. Redirect to `/auth` page
3. Clear any local state

```typescript
if (response.status === 401) {
  window.location.href = "/auth";
  throw new Error("Sesja wygasła");
}
```

---

### Scenario: Profile Not Found (404 Not Found)

**Cause:** Profile doesn't exist (edge case - should not happen normally)

**Components Affected:** Profile fetch

**Handling Strategy:**

1. Catch 404 response status
2. Display error message
3. Offer retry or redirect

```typescript
if (response.status === 404) {
  setError("Profil nie został znaleziony");
}
```

---

### Scenario: Validation Failed (400 Bad Request)

**Cause:** Invalid data format, exceeds limits

**Components Affected:** ProfileForm, AvatarSection

**Handling Strategy:**

1. Catch 400 response status
2. Parse error details from response
3. Display field-specific error messages
4. Keep form/modal open for corrections

```typescript
if (response.status === 400) {
  const error = await response.json();
  setError(error.error || "Nieprawidłowe dane");
}
```

---

### Scenario: File Too Large (413 Payload Too Large or 400)

**Cause:** Avatar file exceeds 512KB limit

**Components Affected:** AvatarSection

**Handling Strategy:**

1. Client-side: Validate before upload
2. Server-side: Return 400 with message
3. Display clear size limit in error

```typescript
// Client-side prevention
if (file.size > 524288) {
  setError("Plik za duży. Maksymalny rozmiar: 512KB");
  return;
}
```

---

### Scenario: Invalid File Type

**Cause:** Non-image file or unsupported image format

**Components Affected:** AvatarSection

**Handling Strategy:**

1. Client-side: Validate MIME type
2. Accept attribute on file input
3. Clear error message

```typescript
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={handleFileSelect}
/>
```

---

### Scenario: Storage Upload Failed (500)

**Cause:** Supabase Storage error, network issue during upload

**Components Affected:** AvatarSection

**Handling Strategy:**

1. Catch error from upload
2. Display retry option
3. Keep previous avatar unchanged

```typescript
try {
  await uploadAvatar(file);
} catch (err) {
  setError("Błąd przesyłania pliku. Spróbuj ponownie.");
}
```

---

### Scenario: Network Error / Timeout

**Cause:** No internet connection, server not responding

**Components Affected:** Any API call

**Handling Strategy:**

1. Catch network error (fetch throws)
2. Display error message with retry option
3. Preserve form state for retry

```typescript
try {
  const response = await fetch(...);
} catch (error) {
  setError("Błąd połączenia. Sprawdź połączenie internetowe.");
}
```

## 11. Implementation Steps

### Phase 1: Storage & Infrastructure

1. **Create migration for avatars bucket:**
   - File: `supabase/migrations/YYYYMMDDHHMMSS_create_avatars_bucket.sql`
   - Create bucket with 512KB size limit
   - Add allowed MIME types
   - Add RLS policies

2. **Create storage abstraction layer:**
   - `src/lib/storage/types.ts` - StorageAdapter interface
   - `src/lib/storage/supabase-storage.ts` - Supabase implementation
   - `src/lib/storage/index.ts` - factory export

3. **Add new types to `src/types.ts`:**
   - UpdateProfileRequest
   - UpdateProfileResponse
   - UploadAvatarResponse
   - ProfileStats
   - AvatarConstraints
   - ProfileViewState

---

### Phase 2: API Endpoints

4. **Add PATCH handler to `/api/profiles/me.ts`:**
   - Zod validation schema
   - Service integration
   - Polish error messages

5. **Create `/api/profiles/me/avatar.ts`:**
   - POST handler for upload
   - DELETE handler for removal
   - File validation (size, type)
   - Storage integration

6. **Create `/api/profiles/me/stats.ts` (optional):**
   - GET handler for stats
   - Count queries for workspaces/boxes

7. **Extend `profile.service.ts`:**
   - Add `updateUserProfile()` function
   - Add `uploadUserAvatar()` function
   - Add `deleteUserAvatar()` function
   - Add `getProfileStats()` function

---

### Phase 3: Custom Hooks

8. **Create `useProfile` hook:**
   - `src/components/hooks/useProfile.ts`
   - Profile fetching
   - Update function
   - Avatar upload/delete

9. **Create `useProfileStats` hook (optional):**
   - `src/components/hooks/useProfileStats.ts`
   - Stats fetching

10. **Create Zod validators:**
    - `src/lib/validators/profile.validators.ts`
    - UpdateProfileSchema
    - AvatarFileSchema (for client-side)

---

### Phase 4: UI Components

11. **Create components directory:**
    - `src/components/profile/`

12. **Implement AvatarSection:**
    - Avatar display with initials fallback
    - Upload button and hidden input
    - Progress indicator
    - Remove button (conditional)
    - Error display
    - File requirements text

13. **Implement ProfileForm:**
    - Full name input with label
    - Character counter
    - Email display (read-only)
    - Save button
    - Loading state
    - Error display

14. **Implement AccountStatsSection:**
    - Stats cards with icons
    - Date formatting (relative or absolute)
    - Loading skeleton

15. **Implement ProfileContainer:**
    - useProfile hook integration
    - State coordination
    - Error/success handling
    - Form state management

---

### Phase 5: Page & Integration

16. **Create Astro page:**
    - `src/pages/app/profile.astro`
    - Auth guard
    - Layout integration (same as settings)
    - Pass initial data to React

17. **Update navigation:**
    - Add /app/profile link in UserMenu
    - Verify link in Settings ProfileHeader works

---

### Phase 6: Testing & Polish

18. **Manual testing:**
    - Profile loads correctly
    - Name editing (save, cancel, validation)
    - Avatar upload (success, size error, type error)
    - Avatar removal
    - Error scenarios (401, 404, 500, network)
    - Mobile responsiveness

19. **Accessibility testing:**
    - Keyboard navigation
    - Screen reader labels
    - Focus management
    - Color contrast

20. **Code cleanup:**
    - `npm run lint:fix`
    - Remove console.logs
    - Add JSDoc comments

---

### Phase 7: Documentation

21. **Document storage configuration:**
    - Bucket setup instructions
    - RLS policies explanation
    - Migration guide for future

22. **Move plan to implemented:**
    - Move to `.ai_docs/implemented/profile-view-implementation-plan.md`

## 12. Supabase Storage Configuration

### Bucket Setup

**Bucket name:** `avatars`

**Configuration (SQL):**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket for avatar URLs
  524288,  -- 512KB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

### Storage Policies

```sql
-- Users can upload their own avatars
CREATE POLICY "avatar_upload_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own avatars
CREATE POLICY "avatar_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own avatars
CREATE POLICY "avatar_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Avatars are publicly viewable
CREATE POLICY "avatar_public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
```

### Migration File

**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_avatars_bucket.sql`

```sql
-- migration: create_avatars_bucket
-- description: Creates storage bucket for user avatars with size and type limits
--
-- STORAGE CONFIGURATION:
-- - Bucket: avatars (public)
-- - Max file size: 512KB (524288 bytes)
-- - Allowed types: image/jpeg, image/png, image/webp
-- - Path pattern: avatars/{user_id}/{filename}
--
-- FUTURE MIGRATION NOTES:
-- To migrate to external storage (S3, Cloudflare R2, etc.):
-- 1. Create new storage adapter in src/lib/storage/
-- 2. Update upload/delete functions in profile.service.ts
-- 3. Run migration script to move existing files
-- 4. Update avatar_url values in profiles table
-- 5. Delete this bucket after migration complete

-- Create the avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  524288,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for avatars bucket
CREATE POLICY "avatar_upload_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatar_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatar_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatar_public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');
```

## 13. Storage Abstraction Layer (Future Migration Support)

### Storage Interface

**File:** `src/lib/storage/types.ts`

```typescript
/**
 * Storage adapter interface for avatar management.
 * Implement this interface to support different storage providers.
 *
 * Current implementation: Supabase Storage
 * Future options: AWS S3, Cloudflare R2, local filesystem
 */
export interface StorageAdapter {
  /**
   * Upload a file to storage
   * @param path - Storage path (e.g., "user-id/filename.jpg")
   * @param file - File buffer
   * @param options - Upload options
   * @returns Public URL of uploaded file
   */
  upload(path: string, file: Buffer, options?: UploadOptions): Promise<string>;

  /**
   * Delete a file from storage
   * @param path - Storage path or public URL
   */
  delete(path: string): Promise<void>;

  /**
   * Get public URL for a file
   * @param path - Storage path
   */
  getPublicUrl(path: string): string;
}

export interface UploadOptions {
  contentType: string;
  cacheControl?: string;
}
```

### Future Migration Guide

When ready to migrate from Supabase Storage to external provider:

1. **Create new storage adapter** (e.g., `src/lib/storage/s3-storage.ts`)
2. **Update factory function** in `src/lib/storage/index.ts`
3. **Set environment variable** `STORAGE_PROVIDER=s3`
4. **Run data migration script** to move existing files
5. **Update avatar_url values** in profiles table
6. **Verify migration** and delete old bucket

## 14. File Structure Summary

```
src/
├── pages/
│   └── app/
│       └── profile.astro                    # NEW
│   └── api/
│       └── profiles/
│           ├── me.ts                        # MODIFY (add PATCH)
│           └── me/
│               ├── theme.ts                 # EXISTS
│               ├── avatar.ts                # NEW
│               └── stats.ts                 # NEW (optional)
├── components/
│   └── profile/
│       ├── ProfileContainer.tsx             # NEW
│       ├── AvatarSection.tsx                # NEW
│       ├── ProfileForm.tsx                  # NEW
│       └── AccountStatsSection.tsx          # NEW
│   └── hooks/
│       ├── useProfile.ts                    # NEW
│       └── useProfileStats.ts               # NEW (optional)
├── lib/
│   ├── services/
│   │   └── profile.service.ts               # MODIFY
│   ├── storage/
│   │   ├── types.ts                         # NEW
│   │   ├── supabase-storage.ts              # NEW
│   │   └── index.ts                         # NEW
│   └── validators/
│       └── profile.validators.ts            # NEW
├── types.ts                                 # MODIFY

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_create_avatars_bucket.sql  # NEW
```
