# 🚀 Storage & Box Organizer - Implementation Roadmap

**Status:** ✅ **MVP COMPLETED** (All phases delivered)
**Last Updated:** January 2, 2026 (Roadmap finalized December 28, 2025)
**Actual Duration:** 21 calendar days (December 12, 2025 - January 2, 2026)
**Target Duration:** ~~15-22 calendar days (102-130 hours development)~~ → **Achieved: 21 days**

## 🎉 Implementation Complete

All phases (0-6) have been successfully delivered. This document is now **archived** for reference. See [MVP_STATUS_REPORT_2026_01_02.md](./MVP_STATUS_REPORT_2026_01_02.md) for current project status.

---

## 📑 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Shared Infrastructure (Phase 0)](#phase-0-shared-infrastructure)
4. [Foundation Setup (Phase 1)](#phase-1-login--registration-foundation)
5. [Dashboard Core (Phase 2)](#phase-2-main-dashboard)
6. [Modal Utilities (Phase 3)](#phase-3-dashboard-modals--utilities)
7. [Box Management (Phase 4)](#phase-4-box-management)
8. [Secondary Views (Phase 5)](#phase-5-secondary-views)
9. [Testing & Polish (Phase 6)](#phase-6-testing--polish)
10. [Quality Gates](#quality-gates)
11. [Missing API Endpoints](#missing-api-endpoints)
12. [Risk Assessment](#risk-assessment)
13. [Team Structure](#team-structure)

---

## EXECUTIVE SUMMARY

This roadmap provides:
- **Detailed phase breakdown** (0-6)
- **Task-by-task implementation guide** per phase
- **Quality gates between phases**
- **Missing API endpoint specifications**
- **Risk assessment & mitigation**
- **Parallelization opportunities**

**Key Principles:**
- ✅ Shared infrastructure first
- ✅ Single source of truth (types, API, validation)
- ✅ Strict dependency ordering
- ✅ Quality gates between phases
- ✅ Parallel work where possible

---

## ARCHITECTURE OVERVIEW

### Dependency Graph
```
Shared Infrastructure (Phase 0)
    ↓
Login/Registration (Phase 1) ← CRITICAL PATH
    ↓
Dashboard Core (Phase 2) ← DEPENDS ON PHASE 1
    ↓
Modals & Utilities (Phase 3) ← DEPENDS ON PHASE 2
    ↓
Box Details & Form (Phase 4) ← DEPENDS ON PHASE 3
    ↓
QR Generator & Settings (Phase 5) ← PARALLEL POSSIBLE
    ↓
Testing & Polish (Phase 6)
```

### Parallelization Opportunities
```
Recommended Team Structure (5-6 developers):
- Dev 1: Shared Infrastructure (Phase 0) - 2-3 days
- Dev 2: Login (Phase 1) - 2-3 days (starts after Phase 0)
- Dev 3: Dashboard (Phase 2) - 3-4 days (starts after Phase 1)
- Dev 4: Box Management (Phase 4) - 2-3 days (starts after Phase 3)
- Dev 5-6: QR Generator & Settings (Phase 5) - 3-4 days (parallel after Phase 2)

Sequential Bottlenecks:
├─ Phase 0 blocks all others
├─ Phase 1 blocks Phase 2
└─ Phase 3 blocks Phase 4 (but Phases 5 can start after Phase 2)
```

---

# PHASE 0: SHARED INFRASTRUCTURE

**Duration:** 2-3 days (12-15 hours)
**Team:** 1 senior developer
**Dependencies:** None
**Blocks:** All other phases

## Overview

Establish foundational code that ALL views depend on:
- Shared UI components
- Reusable React hooks
- Validation schemas (Zod)
- API client layer
- Global stores (Nano)
- Type definitions

**Why First?**
- Prevents duplication across 6 views
- Ensures consistency (error handling, forms, API calls)
- Reduces rework in later phases
- Enables better code reuse

## Deliverables

```
src/
├── components/
│   ├── shared/                          ← NEW
│   │   ├── FormInput.tsx               (reusable input field)
│   │   ├── ConfirmationDialog.tsx      (delete/action confirmation)
│   │   ├── ErrorAlert.tsx              (error messages)
│   │   ├── LoadingSpinner.tsx          (loading states)
│   │   ├── Modal.tsx                   (dialog wrapper)
│   │   └── Button.tsx                  (reusable button)
│   └── hooks/
│       ├── useForm.ts                  (generic form state + validation)
│       ├── useFetch.ts                 (API calls with auth)
│       ├── useDebounce.ts              (search/input debounce)
│       └── useLocalStorage.ts          (localStorage wrapper)
├── lib/
│   ├── validation/                      ← NEW
│   │   ├── schemas.ts                  (common validators)
│   │   ├── auth.ts                     (email, password)
│   │   ├── workspace.ts                (workspace name)
│   │   ├── box.ts                      (box fields)
│   │   └── location.ts                 (location fields)
│   ├── api/                             ← NEW
│   │   ├── client.ts                   (authenticated fetch)
│   │   ├── types.ts                    (API error types)
│   │   └── endpoints.ts                (typed API calls)
│   └── stores/
│       ├── auth.store.ts               (user + session)
│       ├── workspace.store.ts          (current workspace)
│       └── theme.store.ts              (light/dark/system)
└── types.ts                             (EXTEND with new types)
```

## Tasks (in order)

### Task 0.1: Shared Components Foundation (2-3 hours)

#### 0.1.1 Create `src/components/shared/FormInput.tsx`
**Purpose:** Reusable form input with validation feedback

**Features:**
- Label + Input + Error message + Helper text
- Support for text, email, password, number types
- Real-time validation feedback
- Accessibility: aria-label, aria-describedby, aria-invalid
- Disabled state support
- Character counter (optional, for description/name fields)

**Used by:** Login, Box Form, Settings

**Implementation Notes:**
```typescript
// Signature
export interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  helpText?: string;
  showCounter?: boolean; // for maxLength tracking
  containerClassName?: string;
}
```

**Test with:** Login email field

---

#### 0.1.2 Create `src/components/shared/ConfirmationDialog.tsx`
**Purpose:** Reusable modal for confirming dangerous actions (delete, logout, etc.)

**Features:**
- Modal overlay with dark background
- Title, description, warning text
- Input field for confirmation text (type "DELETE" to confirm)
- Confirm button (disabled until input matches)
- Cancel button
- isDangerous prop for red styling
- Loading state with spinner
- isOpen prop to control visibility

**Used by:** Login (logout), Dashboard (delete box/location), Box Form (delete), Settings (delete workspace/account)

**Implementation Notes:**
```typescript
export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string; // User must type this (e.g., "DELETE")
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDangerous?: boolean; // Red button styling
  isLoading?: boolean;
  error?: string;
}
```

**Special Cases:**
- Account deletion: "DELETE ACCOUNT" (case-sensitive)
- Workspace deletion: "DELETE WORKSPACE" (case-sensitive)
- Box deletion: "DELETE" or simpler message
- Logout: Simple confirmation (no text input)

---

#### 0.1.3 Create `src/components/shared/ErrorAlert.tsx`
**Purpose:** Display error messages with dismiss + optional retry

**Features:**
- Alert container with error styling
- Error icon + title + message
- Dismiss button (X)
- Optional retry button
- Optional details (technical info, collapsed)
- Role="alert" for accessibility

**Used by:** All views (network errors, API errors, form validation)

**Implementation Notes:**
```typescript
export interface ErrorAlertProps {
  error: string;
  onDismiss: () => void;
  onRetry?: () => void;
  title?: string;
  details?: string;
  role?: 'alert' | 'status';
}
```

---

#### 0.1.4 Create `src/components/shared/LoadingSpinner.tsx`
**Purpose:** Standardized loading indicator

**Features:**
- SVG or CSS spinner animation
- Center alignment
- Optional message text
- Optional progress indicator (0-100%)
- Aria-live region for status updates

**Used by:** All views (data loading, form submission)

**Implementation Notes:**
```typescript
export interface LoadingSpinnerProps {
  message?: string;
  visible?: boolean;
  progress?: number; // 0-100 (optional)
  size?: 'sm' | 'md' | 'lg';
  ariaLive?: 'polite' | 'assertive';
}
```

---

#### 0.1.5 Create `src/components/shared/Modal.tsx`
**Purpose:** Reusable modal/dialog wrapper

**Features:**
- Overlay + content container
- Close button (X in top right)
- Click outside to close option
- ESC key to close
- Focus management (trap focus inside)
- Accessible (role="dialog", aria-modal="true")
- Size variants (sm, md, lg)

**Used by:** All views (edit/create modals, confirmation dialogs)

**Implementation Notes:**
```typescript
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  isDismissible?: boolean;
  className?: string;
}
```

**Note:** Can be wrapper for ConfirmationDialog and other modals

---

### Task 0.2: Shared React Hooks (2-3 hours)

#### 0.2.1 Create `src/components/hooks/useForm.ts`
**Purpose:** Generic form state management + client-side validation

**Features:**
- Manage form field values (with useReducer or useState)
- Real-time validation with Zod schema
- Track touched fields (to show errors only after interaction)
- Track dirty state (form changed)
- setFieldValue, setFieldError, reset, submit handlers
- Disable submit button when invalid or loading

**Used by:** Login, Box Form, Settings modals, Dashboard modals

**Implementation Notes:**
```typescript
export interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validationSchema: z.ZodSchema;
  onSubmit: (values: T) => Promise<void>;
}

export interface UseFormReturn<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;

  setFieldValue: (field: keyof T, value: any) => void;
  setFieldTouched: (field: keyof T, value: boolean) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

// Usage in component:
const { values, errors, touched, handleSubmit } = useForm({
  initialValues: { email: '', password: '' },
  validationSchema: loginSchema,
  onSubmit: async (values) => { /* ... */ }
});
```

---

#### 0.2.2 Create `src/components/hooks/useFetch.ts`
**Purpose:** Centralized API calls with auth, error handling, loading states

**Features:**
- Wrapper around native fetch
- Auto-inject Authorization header (from localStorage/context)
- Handle 401 → redirect to /login
- Handle 403 → show permission error
- Handle 404, 500 → show user-friendly errors
- Network error handling (timeout, connection failed)
- Generic typing for request/response
- Retry logic (optional exponential backoff)

**Used by:** All API calls across all views

**Implementation Notes:**
```typescript
export interface UseFetchOptions<T = any> {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  retries?: number;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export async function useFetch<T = any>(
  options: UseFetchOptions<T>
): Promise<T> {
  // Implementation
}

// Or as hook:
export function useFetchData<T = any>(
  url: string,
  options?: Omit<UseFetchOptions<T>, 'url'>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    useFetch<T>({ url, ...options })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}
```

---

#### 0.2.3 Create `src/components/hooks/useDebounce.ts`
**Purpose:** Debounce value changes (search, input)

**Features:**
- Delay value update by N ms
- Cancel pending debounce on unmount
- Configurable delay

**Used by:** Dashboard search, Settings filters

**Implementation Notes:**
```typescript
export function useDebounce<T>(
  value: T,
  delayMs: number = 300
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}
```

---

#### 0.2.4 Create `src/components/hooks/useLocalStorage.ts`
**Purpose:** Safe localStorage access with type safety

**Features:**
- Get/set with automatic JSON stringify/parse
- Type-safe with generics
- Fallback if localStorage unavailable (private browsing)
- onChange listener support

**Used by:** Theme toggle (Settings)

**Implementation Notes:**
```typescript
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  // Implementation
}
```

---

### Task 0.3: Validation Schemas (1-2 hours)

#### 0.3.1 Create `src/lib/validation/schemas.ts`
**Purpose:** Common validation patterns

**Contents:**
```typescript
import { z } from 'zod';

// Common patterns
export const emailSchema = z.string()
  .email('Invalid email format')
  .trim();

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .trim();

export const nameSchema = z.string()
  .min(1, 'Name cannot be empty')
  .max(255, 'Name must be less than 255 characters')
  .trim();

export const descriptionSchema = z.string()
  .max(10000, 'Description cannot exceed 10,000 characters')
  .trim()
  .optional()
  .nullable();

export const uuidSchema = z.string()
  .uuid('Invalid ID format');

export const tagsSchema = z.array(
  z.string()
    .max(50, 'Tag must be less than 50 characters')
    .trim()
)
  .max(10, 'Maximum 10 tags')
  .optional()
  .nullable();

export const workspaceNameSchema = z.string()
  .min(1, 'Workspace name cannot be empty')
  .max(255, 'Workspace name must be less than 255 characters')
  .trim();

// Export all for convenience
export const CommonValidation = {
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  description: descriptionSchema,
  uuid: uuidSchema,
  tags: tagsSchema,
  workspaceName: workspaceNameSchema,
};
```

---

#### 0.3.2 Create `src/lib/validation/auth.ts`
**Purpose:** Authentication-specific validation

**Contents:**
```typescript
import { z } from 'zod';
import { CommonValidation } from './schemas';

export const loginSchema = z.object({
  email: CommonValidation.email,
  password: CommonValidation.password,
});

export const registrationSchema = z.object({
  email: CommonValidation.email,
  password: CommonValidation.password,
  confirmPassword: z.string(),
  agreeToPasswordLimitation: z.boolean(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegistrationFormData = z.infer<typeof registrationSchema>;
```

---

#### 0.3.3 Create `src/lib/validation/workspace.ts` & `box.ts` & `location.ts`
**Similar to above but for specific domains**

---

### Task 0.4: API Client Layer (2-3 hours)

#### 0.4.1 Create `src/lib/api/client.ts`
**Purpose:** Centralized authenticated API client

**Features:**
- Inject JWT token from localStorage/context
- Handle 401 → redirect to /login
- Handle 403 → permission error
- Handle 404, 500 → user-friendly errors
- Network timeout handling
- Automatic JSON encoding/decoding
- Request logging (optional)

**Implementation Skeleton:**
```typescript
export interface ApiErrorResponse {
  status: number;
  message: string;
  error?: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number; // default 30000
}

/**
 * Main API client function
 * Handles auth, errors, and common response parsing
 */
export async function apiClient<T = any>(
  path: string,
  options?: ApiClientOptions
): Promise<T> {
  const url = `${process.env.SUPABASE_URL || 'http://localhost:3000'}${path}`;
  const token = getToken(); // from localStorage or context

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = { ...defaultHeaders, ...options?.headers };
  const timeout = options?.timeout || 30000;

  // Implement timeout with AbortController
  // Handle fetch errors
  // Parse response
  // Handle specific status codes (401, 403, 404, 500)
  // Return typed response
}

// Export for convenience in components
export const apiClient = {
  get<T = any>(path: string, options?: ApiClientOptions) {
    return apiClient<T>(path, { ...options, method: 'GET' });
  },
  post<T = any>(path: string, body?: any, options?: ApiClientOptions) {
    return apiClient<T>(path, { ...options, method: 'POST', body });
  },
  patch<T = any>(path: string, body?: any, options?: ApiClientOptions) {
    return apiClient<T>(path, { ...options, method: 'PATCH', body });
  },
  delete<T = any>(path: string, options?: ApiClientOptions) {
    return apiClient<T>(path, { ...options, method: 'DELETE' });
  },
};
```

---

#### 0.4.2 Create `src/lib/api/endpoints.ts`
**Purpose:** Type-safe API endpoint definitions

**Features:**
- Strongly typed request/response
- Centralized URL construction
- Error handling abstraction
- Request validation before sending

**Implementation Skeleton:**
```typescript
import { apiClient, ApiError } from './client';
import * as types from '@/types';

// AUTH
export const authApi = {
  signin: (email: string, password: string) => {
    // Use Supabase SDK directly
    // Return: { user, token }
  },
  signup: (email: string, password: string) => {
    // Return: { user, token }
  },
  signout: () => {
    // Clear token
  },
};

// PROFILES
export const profilesApi = {
  getMe: () => apiClient<types.ProfileDto>('/api/profiles/me'),
};

// WORKSPACES
export const workspacesApi = {
  list: () => apiClient<types.WorkspaceDto[]>('/api/workspaces'),

  create: (name: string) =>
    apiClient<types.WorkspaceDto>('/api/workspaces', {
      method: 'POST',
      body: { name },
    }),

  update: (id: string, name: string) =>
    apiClient<types.WorkspaceDto>(`/api/workspaces/${id}`, {
      method: 'PATCH',
      body: { name },
    }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/api/workspaces/${id}`, {
      method: 'DELETE',
    }),

  getMembers: (id: string) =>
    apiClient<types.WorkspaceMemberWithProfileDto[]>(
      `/api/workspaces/${id}/members`
    ),
};

// LOCATIONS
export const locationsApi = {
  list: (workspaceId: string, parentId?: string | null) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (parentId) params.set('parent_id', parentId);
    return apiClient<types.LocationDto[]>(`/api/locations?${params}`);
  },

  create: (data: types.CreateLocationRequest) =>
    apiClient<types.LocationDto>('/api/locations', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: Partial<types.LocationDto>) =>
    apiClient<types.LocationDto>(`/api/locations/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/api/locations/${id}`, {
      method: 'DELETE',
    }),
};

// BOXES
export const boxesApi = {
  list: (workspaceId: string, locationId?: string | null, q?: string) => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (locationId) params.set('location_id', locationId);
    if (q) params.set('q', q);
    return apiClient<types.BoxDto[]>(`/api/boxes?${params}`);
  },

  get: (id: string) => apiClient<types.BoxDto>(`/api/boxes/${id}`),

  create: (data: types.CreateBoxRequest) =>
    apiClient<types.BoxDto>('/api/boxes', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: Partial<types.UpdateBoxRequest>) =>
    apiClient<types.BoxDto>(`/api/boxes/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/api/boxes/${id}`, {
      method: 'DELETE',
    }),
};

// QR CODES
export const qrCodesApi = {
  generateBatch: (workspaceId: string, quantity: number) =>
    apiClient<types.BatchGenerateQrCodesResponse>(
      '/api/qr-codes/batch',
      {
        method: 'POST',
        body: { workspace_id: workspaceId, quantity },
      }
    ),
};

// EXPORT
export const exportApi = {
  inventory: (workspaceId: string) =>
    apiClient<Blob>(`/api/export/inventory?workspace_id=${workspaceId}`, {
      headers: { 'Accept': 'text/csv' },
    }),
};
```

---

### Task 0.5: Global Stores (Nano) (1 hour)

#### 0.5.1 Create `src/lib/stores/auth.store.ts`
**Purpose:** Global authentication state

**Contents:**
```typescript
import { atom } from 'nanostores';
import type { ProfileDto, WorkspaceDto } from '@/types';

export const authStore = atom<{
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  user: ProfileDto | null;
  workspace: WorkspaceDto | null;
  token: string | null;
}>({
  isLoading: false,
  error: null,
  isAuthenticated: false,
  user: null,
  workspace: null,
  token: null,
});

// Actions
export function setAuthLoading(loading: boolean) {
  authStore.setKey('isLoading', loading);
}

export function setAuthError(error: string | null) {
  authStore.setKey('error', error);
}

export function setAuthSuccess(user: ProfileDto, workspace: WorkspaceDto, token: string) {
  authStore.set({
    isAuthenticated: true,
    user,
    workspace,
    token,
    isLoading: false,
    error: null,
  });
}

export function clearAuth() {
  authStore.set({
    isLoading: false,
    error: null,
    isAuthenticated: false,
    user: null,
    workspace: null,
    token: null,
  });
}
```

---

#### 0.5.2 Create `src/lib/stores/workspace.store.ts` & `theme.store.ts`
**Similar pattern to auth.store**

---

### Task 0.6: Type Extensions (30 min)

#### 0.6.1 Update `src/types.ts`
**Add new types:**
```typescript
// Form states
export interface FormFieldError {
  field: string;
  message: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

// Workspace management
export interface WorkspaceWithOwnershipInfo extends WorkspaceDto {
  isOwner: boolean;
  memberCount: number;
}

// Theme
export type ThemeMode = 'light' | 'dark' | 'system';

// Add more as needed (copy from view plans)
```

---

## Quality Gate 0: Phase 0 Completion

✅ **Before moving to Phase 1:**

- [ ] All 5 shared components created and tested locally
- [ ] All 4 shared hooks created with TypeScript compilation
- [ ] All validation schemas export correctly (Zod)
- [ ] API client created with full auth flow
- [ ] All endpoints defined with proper typing
- [ ] Nano stores initialized
- [ ] Types added to src/types.ts
- [ ] No TypeScript compilation errors
- [ ] npm run lint passes
- [ ] Components render without runtime errors

**Test Checklist:**
```typescript
// Test FormInput
<FormInput
  label="Email"
  value=""
  onChange={() => {}}
  error={undefined}
/>

// Test ConfirmationDialog
<ConfirmationDialog
  isOpen={true}
  title="Delete"
  confirmText="DELETE"
  onConfirm={async () => {}}
  onCancel={() => {}}
/>

// Test useForm hook
const { values, errors, handleSubmit } = useForm({
  initialValues: { email: '' },
  validationSchema: loginSchema,
  onSubmit: async () => {},
});

// Test API client
const profile = await apiClient.get('/api/profiles/me');
```

**Estimated Time:** 2-3 days (12-15 hours)
**Sign-off:** Lead developer review

---

# PHASE 1: LOGIN / REGISTRATION (FOUNDATION)

**Duration:** 2-3 days (16-20 hours)
**Team:** 1 developer (can be same or different from Phase 0)
**Dependencies:** Phase 0 complete
**Blocks:** Phase 2 (Dashboard)

## Overview

Build complete authentication flow:
- Login form page
- Registration form page
- Auth stores + Nano integration
- Session persistence
- Middleware auth checks
- Redirect logic (auth → /app, /app → /login)

## Deliverables

```
src/
├── pages/
│   └── auth/
│       └── index.astro                 (handles /login and /register)
├── components/
│   └── auth/
│       ├── AuthLayout.tsx              (container)
│       ├── AuthCard.tsx                (card wrapper with tabs)
│       ├── LoginForm.tsx               (login form)
│       ├── RegistrationForm.tsx        (registration form)
│       ├── PasswordStrengthIndicator.tsx
│       └── FormInput.tsx               (← use from shared)
├── components/
│   └── hooks/
│       └── useAuthForm.ts              (← NEW: auth-specific form logic)
└── middleware/
    └── index.ts                         (← UPDATE: add auth checks)
```

## Tasks (in order)

### Task 1.1: Create Auth Page Structure (2 hours)

#### 1.1.1 Create `src/pages/auth/index.astro`
**Purpose:** Main authentication page (handles both /login and /register)

**Features:**
- Dynamic route handling (detect /login vs /register from URL)
- SSR with no prerendering
- Pass route to React component
- View Transitions API for smooth navigation
- Metadata (title, description)

**Implementation Skeleton:**
```astro
---
export const prerender = false;

// Get current route
const { pathname } = Astro.url;
const mode = pathname.includes('register') ? 'register' : 'login';

// Redirect if already authenticated
const session = Astro.locals.session;
if (session?.user) {
  return Astro.redirect('/app');
}
---

<Layout title={mode === 'login' ? 'Login' : 'Register'}>
  <AuthPage client:load mode={mode} />
</Layout>
```

---

#### 1.1.2 Create `src/components/auth/AuthLayout.tsx`
**Purpose:** Main container managing auth state and layout

**Features:**
- Responsive container (centered card)
- Logo/branding section
- AuthCard + forms
- Global error banner
- Loading state overlay
- Footer with links

**Props:**
```typescript
interface AuthLayoutProps {
  initialMode?: 'login' | 'register';
}
```

---

#### 1.1.3 Create `src/components/auth/AuthCard.tsx`
**Purpose:** Card with tab switcher between login/register

**Features:**
- Two tabs: "Login" / "Register"
- Tab switch clears form errors
- Conditional form rendering
- Maintains form state when switching tabs (optional)

**Props:**
```typescript
interface AuthCardProps {
  activeMode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  children: React.ReactNode;
}
```

---

### Task 1.2: Create Form Components (6-8 hours)

#### 1.2.1 Create `src/components/auth/LoginForm.tsx`
**Purpose:** Login form with email/password

**Features:**
- Use shared FormInput component
- Use useAuthForm hook for state
- Submit via Supabase Auth
- Loading state on button
- Error display (ErrorAlert)
- Links: "Forgot Password?" (disabled in MVP), "Create account"

**Flow:**
1. User enters email + password
2. Click Login
3. Call supabaseClient.auth.signInWithPassword(email, password)
4. On success: Fetch profile + workspaces → store in auth store → redirect to /app
5. On error: Display error message

**Implementation Notes:**
```typescript
async function handleLogin(values: LoginFormData) {
  setIsLoading(true);
  setError(null);

  try {
    // 1. Sign in with Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) throw new Error(error.message);

    // 2. Get JWT token
    const token = data.session?.access_token;

    // 3. Fetch profile
    const profile = await apiClient.profiles.getMe();

    // 4. Fetch workspaces
    const workspaces = await apiClient.workspaces.list();

    // 5. Store in auth store
    setAuthSuccess(profile, workspaces[0], token);

    // 6. Redirect to /app
    window.location.href = '/app';
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Login failed');
  } finally {
    setIsLoading(false);
  }
}
```

---

#### 1.2.2 Create `src/components/auth/RegistrationForm.tsx`
**Purpose:** Registration form with email/password/confirm

**Features:**
- Use shared FormInput
- Use useAuthForm hook
- Password strength indicator
- Password confirmation validation
- Checkbox: "I understand password recovery is not available"
- Submit via Supabase Auth
- Create default workspace on success
- Error display

**Flow:**
1. User enters email + password + confirm + checkbox
2. Click Register
3. Call supabaseClient.auth.signUp(email, password)
4. On success: Create default workspace → fetch profile → redirect to /app
5. On error: Display error (email exists, weak password, etc.)

**Implementation Notes:**
- Use PasswordStrengthIndicator component
- Must check agreeToPasswordLimitation before submit
- Create workspace via POST /api/workspaces

---

#### 1.2.3 Create `src/components/auth/PasswordStrengthIndicator.tsx`
**Purpose:** Visual feedback on password strength

**Features:**
- Progress bar with color (red → yellow → green)
- Text: "Weak" / "Medium" / "Strong"
- Optional requirements list
- Update in real-time as user types

**Algorithm:**
```typescript
function evaluatePasswordStrength(password: string): {
  level: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
  feedback: string;
} {
  let score = 0;

  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[a-z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;

  const level = score < 50 ? 'weak' : score < 75 ? 'medium' : 'strong';

  return { level, score: Math.min(score, 100), feedback: '...' };
}
```

---

### Task 1.3: Create Auth Hook (3-4 hours)

#### 1.3.1 Create `src/components/hooks/useAuthForm.ts`
**Purpose:** Specialized form hook for auth with Supabase integration

**Features:**
- Manage email, password, confirmPassword, agreeToPasswordLimitation
- Validate with Zod schema
- Handle Supabase auth errors (translate to user messages)
- Manage isLoading state
- Handle both login and registration modes
- Automatic token storage in localStorage
- Session restoration on mount

**Implementation Skeleton:**
```typescript
export interface UseAuthFormOptions {
  mode: 'login' | 'register';
  onSuccess?: (user: ProfileDto, workspace: WorkspaceDto) => void;
  onError?: (error: string) => void;
}

export function useAuthForm(options: UseAuthFormOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    initialValues: mode === 'login'
      ? { email: '', password: '' }
      : { email: '', password: '', confirmPassword: '', agreeToPasswordLimitation: false },
    validationSchema: mode === 'login' ? loginSchema : registrationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);

      try {
        if (mode === 'login') {
          await handleLogin(values as LoginFormData);
        } else {
          await handleRegister(values as RegistrationFormData);
        }
        options.onSuccess?.(...);
      } catch (err) {
        const message = translateAuthError(err);
        setError(message);
        options.onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return { ...form, isLoading, error };
}
```

---

### Task 1.4: Update Middleware (1-2 hours)

#### 1.4.1 Update `src/middleware/index.ts`
**Purpose:** Add authentication checks for protected routes

**Features:**
- Check JWT token in cookies
- Redirect unauthenticated users from /app to /login
- Redirect authenticated users from /login to /app
- Restore session from token
- Attach user to context.locals

**Implementation Skeleton:**
```typescript
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Get token from cookies
  const token = context.cookies.get('auth_token')?.value;

  // Check if route requires auth
  const isProtectedRoute = pathname.startsWith('/app');
  const isAuthRoute = pathname.startsWith('/auth') || pathname === '/login' || pathname === '/register';

  if (isProtectedRoute && !token) {
    // Redirect to login
    return context.redirect('/login');
  }

  if (isAuthRoute && token) {
    // Redirect to app
    return context.redirect('/app');
  }

  // Restore session if token exists
  if (token) {
    // Validate token + restore user from store
    context.locals.session = { user: {...}, token };
  }

  return next();
});
```

---

### Task 1.5: Error Handling & Edge Cases (2-3 hours)

#### 1.5.1 Handle Supabase Auth Errors
**Translate to user-friendly messages:**
```typescript
function translateAuthError(error: any): string {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('invalid')) {
    return 'Invalid email or password';
  }
  if (message.includes('exists')) {
    return 'Email already registered';
  }
  if (message.includes('weak')) {
    return 'Password is too weak';
  }
  if (message.includes('network')) {
    return 'Network error. Please try again.';
  }

  return 'Authentication failed. Please try again.';
}
```

---

#### 1.5.2 Handle Session Persistence
**Store token in localStorage + cookies:**
- After successful login: localStorage.setItem('auth_token', token)
- On page load: Check localStorage → restore auth store
- On logout: Clear both localStorage and cookies

---

## Quality Gate 1: Phase 1 Completion

✅ **Before moving to Phase 2:**

- [ ] /login page loads and renders login form
- [ ] /register page loads and renders registration form
- [ ] Login flow works end-to-end
  - [ ] Valid credentials → success + redirect to /app
  - [ ] Invalid credentials → error message shown
  - [ ] Network error → error message shown
- [ ] Registration flow works
  - [ ] Valid data → success + workspace created + redirect to /app
  - [ ] Email already exists → error shown
  - [ ] Passwords don't match → error shown
- [ ] Password strength indicator works
- [ ] Tab switching works (login ↔ register)
- [ ] Form validation errors show properly
- [ ] Middleware redirects work
  - [ ] Unauthenticated user → /login
  - [ ] Authenticated user → /app allowed
- [ ] Session persists on page reload
- [ ] Logout works (clears session + redirects to /login)
- [ ] npm run lint passes
- [ ] No TypeScript errors

**Test Checklist:**
1. Create account with valid email/password
2. Try to create with existing email (should fail)
3. Try to login with valid credentials
4. Try to login with invalid password
5. Logout and verify redirect
6. Refresh page and verify session persists

**Estimated Time:** 2-3 days (16-20 hours)
**Sign-off:** QA + lead developer

---

# PHASE 2: MAIN DASHBOARD

**Duration:** 3-4 days (20-25 hours)
**Team:** 1-2 developers (recommended: dedicated to this complex view)
**Dependencies:** Phase 1 complete
**Blocks:** Phase 3 (modals), Phase 4 (box management)

## Overview

Build the central hub of the app:
- Hierarchical location tree with expand/collapse
- Real-time box search with debounce
- Virtual list for 100+ boxes
- Workspace selector
- User menu + logout
- Multiple modals (location/box editor, delete confirmation)
- Complex state management (Nano store + React context)

## Key Challenges

1. **Complex nested state** (locations, boxes, search, selected items)
2. **Performance** (virtualized list, lazy loading children)
3. **Accessibility** (tree keyboard navigation)
4. **API integration** (multiple endpoints, batched requests)

## Deliverables

```
src/
├── pages/
│   └── app.astro                        (main dashboard page)
├── components/
│   └── dashboard/
│       ├── DashboardContainer.tsx       (state management)
│       ├── DashboardHeader.tsx          (workspace selector + user menu)
│       ├── SearchInput.tsx              (search box with debounce)
│       ├── LocationTree.tsx             (recursive location nodes)
│       ├── LocationTreeNode.tsx
│       ├── LocationContextMenu.tsx
│       ├── BoxListContainer.tsx         (virtualized list)
│       ├── BoxList.tsx
│       ├── BoxListItem.tsx
│       ├── BoxContextMenu.tsx
│       ├── EmptyState.tsx               (no boxes message)
│       ├── LocationEditorModal.tsx      (← in Phase 3)
│       ├── BoxEditorModal.tsx           (← in Phase 3)
│       └── DeleteConfirmationDialog.tsx (← use shared)
└── lib/
    └── stores/
        ├── dashboard.store.ts           (Nano store)
        └── context/
            └── DashboardContext.tsx     (React context for actions)
```

## Tasks (in order)

### Task 2.1: Setup Stores & Context (2-3 hours)

#### 2.1.1 Create `src/lib/stores/dashboard.store.ts`
**Purpose:** Global dashboard state (Nano)

**State:**
```typescript
import { atom } from 'nanostores';

export const currentWorkspaceId = atom<string | null>(null);
export const selectedLocationId = atom<string | null>(null);
export const searchQuery = atom<string>('');
export const expandedLocationIds = atom<Set<string>>(new Set());
export const isLoadingBoxes = atom<boolean>(false);
export const isLoadingLocations = atom<boolean>(false);
```

---

#### 2.1.2 Create `src/contexts/DashboardContext.tsx`
**Purpose:** Action functions for dashboard

**Type:**
```typescript
export interface DashboardContextType {
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

---

### Task 2.2: Setup Custom Hooks (4-5 hours)

#### 2.2.1 Create `src/components/hooks/useWorkspaces.ts`
**Purpose:** Fetch user's workspaces

**Implementation:**
```typescript
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await apiClient.workspaces.list();
        setWorkspaces(data);
        if (data.length > 0) {
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

---

#### 2.2.2 Create `src/components/hooks/useLocations.ts`
**Purpose:** Fetch locations with caching + refetch

**Implementation:**
```typescript
export function useLocations(workspaceId: string, parentId?: string | null) {
  const [locations, setLocations] = useState<LocationTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.locations.list(workspaceId, parentId);

      // Transform to LocationTreeNode
      const nodes: LocationTreeNode[] = data.map(loc => ({
        ...loc,
        boxCount: 0,
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

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { locations, isLoading, error, refetch: fetch };
}
```

---

#### 2.2.3 Create `src/components/hooks/useBoxes.ts`
**Purpose:** Fetch boxes with search + location filtering

**Implementation:**
```typescript
export function useBoxes(
  workspaceId: string,
  locationId?: string | null,
  searchQuery?: string
) {
  const [boxes, setBoxes] = useState<BoxListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 300);

  const fetch = useCallback(async () => {
    if (debouncedQuery && debouncedQuery.length < 3) return;

    try {
      setIsLoading(true);
      const data = await apiClient.boxes.list(
        workspaceId,
        locationId,
        debouncedQuery
      );
      setBoxes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boxes');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, locationId, debouncedQuery]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { boxes, isLoading, error, refetch: fetch };
}
```

---

### Task 2.3: Layout Components (3-4 hours)

#### 2.3.1 Create `src/pages/app.astro`
**Purpose:** Main app page

**Implementation:**
```astro
---
export const prerender = false;

// Check auth in middleware
const session = Astro.locals.session;
if (!session?.user) {
  return Astro.redirect('/login');
}
---

<MainLayout title="Dashboard">
  <DashboardContainer client:load />
</MainLayout>
```

---

#### 2.3.2 Create `src/components/dashboard/DashboardContainer.tsx`
**Purpose:** Main orchestrator of dashboard state

**Responsibilities:**
- Fetch initial data (workspaces, locations, boxes)
- Setup Nano store listeners
- Manage modal open/close states
- Coordinate between child components
- Error handling + display

**Implementation Skeleton:**
```typescript
export function DashboardContainer() {
  // Fetch data
  const { workspaces } = useWorkspaces();
  const { locations, refetch: refetchLocations } = useLocations(currentWorkspaceId.get() || '');
  const { boxes, refetch: refetchBoxes } = useBoxes(currentWorkspaceId.get() || '');

  // Modal states
  const [activeModal, setActiveModal] = useState<'location' | 'box' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Setup context value with actions
  const contextValue: DashboardContextType = {
    state: { /* ... */ },
    actions: {
      selectLocation: (id) => selectedLocationId.set(id),
      setSearchQuery: (q) => searchQuery.set(q),
      // ... other actions
    },
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex flex-col h-screen">
        <DashboardHeader />
        <DashboardContent />
      </div>
    </DashboardContext.Provider>
  );
}
```

---

#### 2.3.3 Create `src/components/dashboard/DashboardHeader.tsx`
**Purpose:** Top bar with workspace selector + user menu

**Components:**
- WorkspaceSelector (dropdown)
- UserMenu (avatar + dropdown)
- Logo/title

---

#### 2.3.4 Create `src/components/dashboard/SearchInput.tsx`
**Purpose:** Search box with debounce

**Features:**
- Placeholder: "Search boxes..."
- X button to clear
- Loading spinner
- Min 3 chars message
- useDebounce hook

---

### Task 2.4: Location Tree (3-4 hours)

#### 2.4.1 Create `src/components/dashboard/LocationTree.tsx`
**Purpose:** Root location tree component

**Features:**
- Render "Unassigned" node first
- Map through locations
- Render LocationTreeNode for each
- Handle expand/collapse
- Calculate box counts

---

#### 2.4.2 Create `src/components/dashboard/LocationTreeNode.tsx`
**Purpose:** Recursive location node

**Features:**
- Expand/collapse arrow
- Location name
- Box count badge
- Context menu button
- Indentation based on level
- Loading state when expanding

**Implementation Challenge:** Recursive rendering with proper key management

---

#### 2.4.3 Create `src/components/dashboard/LocationContextMenu.tsx`
**Purpose:** Right-click menu for location

**Options:**
- Add sublocation
- Edit
- Delete (with confirmation)

---

### Task 2.5: Box List (3-4 hours)

#### 2.5.1 Create `src/components/dashboard/BoxListContainer.tsx`
**Purpose:** Container for virtualized box list

**Responsibilities:**
- Show loading state
- Show empty state
- Pass to BoxList component
- Handle refresh

---

#### 2.5.2 Create `src/components/dashboard/BoxList.tsx`
**Purpose:** Virtualized box list (using react-window)

**Features:**
- Virtual scrolling (only render visible items)
- 50-100 boxes per page (performance)
- Loading skeleton
- Empty state

**Installation:**
```bash
npm install react-window
npm install --save-dev @types/react-window
```

---

#### 2.5.3 Create `src/components/dashboard/BoxListItem.tsx`
**Purpose:** Single box in list

**Shows:**
- Box name
- Location breadcrumb
- Description (truncated)
- Tags (max 3)
- QR code ID
- Context menu button

---

#### 2.5.4 Create `src/components/dashboard/BoxContextMenu.tsx`
**Purpose:** Right-click menu for box

**Options:**
- View details (navigate)
- Edit
- Move (future)
- Delete

---

#### 2.5.5 Create `src/components/dashboard/EmptyState.tsx`
**Purpose:** Welcome screen for new users

**Shows:**
- Illustration / icon
- "Create your first location"
- Buttons:
  - Create location
  - Add box manually
  - Scan QR

---

## Quality Gate 2: Phase 2 Completion

✅ **Before moving to Phase 3:**

- [ ] Dashboard page loads
- [ ] Workspace list fetches and displays
- [ ] Location tree renders (root locations)
- [ ] Locations expand/collapse work
- [ ] Box list shows boxes
- [ ] Search works (debounce, min 3 chars)
- [ ] Workspace switcher changes workspace context
- [ ] All boxes refetch when workspace/location/search changes
- [ ] Box counts are accurate
- [ ] LoadingState and EmptyState show correctly
- [ ] Error messages display
- [ ] Styling is consistent (Tailwind)
- [ ] Responsive design (desktop/tablet/mobile)
- [ ] Accessibility (keyboard navigation, ARIA)
- [ ] npm run lint passes
- [ ] No TypeScript errors

**Test Checklist:**
1. Navigate to /app (should work if logged in)
2. Verify workspace list loaded
3. Click location to expand → children load
4. Select location → box list updates
5. Type in search (≥3 chars) → boxes filter
6. Switch workspace → all data refreshes
7. Scroll box list (virtual scrolling works)
8. Error state: disconnect internet → error shown

**Estimated Time:** 3-4 days (20-25 hours)
**Sign-off:** QA + lead developer + designer (UI review)

---

# PHASE 3: DASHBOARD MODALS & UTILITIES

**Duration:** 1-2 days (8-10 hours)
**Team:** 1 developer
**Dependencies:** Phase 2 complete
**Blocks:** Phase 4 (box management)

## Overview

Complete the dashboard with missing modals:
- LocationEditorModal (create/edit location)
- BoxEditorModal (create/edit box)
- DeleteConfirmationDialog (reuse from shared)
- Integrate modals into dashboard

## Deliverables

```
src/
├── components/
│   └── dashboard/
│       ├── LocationEditorModal.tsx
│       ├── BoxEditorModal.tsx
│       ├── LocationSelector.tsx  (tree picker)
│       └── QRCodeSelector.tsx    (dropdown)
```

## Tasks

### Task 3.1: LocationEditorModal (3 hours)

**Features:**
- Form with Name + Description fields
- Parent location selector
- Validation (name required, unique siblings)
- Max depth check (level < 5)
- Submit → POST /locations or PATCH /locations/:id
- Error handling + display

**Use shared components:**
- FormInput (name, description)
- Modal wrapper
- ErrorAlert

---

### Task 3.2: BoxEditorModal (3 hours)

**Features:**
- Form with Name, Description, Tags, Location, QR Code
- Character counter for description (10k limit)
- Tag input with suggestions
- Location selector (tree picker)
- QR code dropdown
- Submit → POST /boxes or PATCH /boxes/:id
- Error handling

---

### Task 3.3: Utility Components (2 hours)

**LocationSelector.tsx** - Tree picker for modals
**QRCodeSelector.tsx** - Dropdown for available QR codes

---

## Quality Gate 3: Phase 3 Completion

✅ **Before moving to Phase 4:**

- [ ] LocationEditorModal opens/closes correctly
- [ ] Create location flow works (POST /locations)
- [ ] Edit location flow works (PATCH /locations/:id)
- [ ] Delete location works (DELETE /locations/:id + confirmation)
- [ ] BoxEditorModal opens/closes correctly
- [ ] Create box flow works
- [ ] Edit box flow works
- [ ] Delete box works with confirmation
- [ ] Validation errors show correctly
- [ ] Box list updates after create/edit/delete
- [ ] Location tree updates after location changes
- [ ] Error handling works
- [ ] npm run lint passes

**Estimated Time:** 1-2 days (8-10 hours)

---

# PHASE 4: BOX MANAGEMENT

**Duration:** 2-3 days (14-18 hours)
**Team:** 1 developer
**Dependencies:** Phase 3 complete
**Blocks:** None (Phase 5 can run in parallel after Phase 2)

## Overview

Complete box CRUD:
- Box Details view (`/app/boxes/[id]`)
- Box Form view (create/edit at `/app/boxes/new` and `/app/boxes/[id]/edit`)
- Full forms with validation
- API integration

## Deliverables

```
src/
├── pages/
│   ├── app/
│   │   └── boxes/
│   │       ├── new.astro                (create page)
│   │       ├── [id]/
│   │       │   ├── index.astro          (details page)
│   │       │   └── edit.astro           (edit page)
├── components/
│   └── box/
│       ├── BoxDetailsContent.tsx        (details view)
│       ├── BoxForm.tsx                  (universal form)
│       ├── NameInput.tsx
│       ├── DescriptionTextarea.tsx
│       ├── TagInput.tsx
│       ├── LocationSelector.tsx
│       └── QRCodeSelector.tsx
```

## Tasks

### Task 4.1: Box Details View (4-5 hours)

**Pages:**
- `src/pages/app/boxes/[id].astro` - Dynamic route
- `src/components/box/BoxDetailsContent.tsx` - Main component

**Features:**
- Fetch box via GET /api/boxes/:id
- Display all box information
- Edit button → navigate to edit page
- Delete button → confirmation → DELETE /api/boxes/:id
- Loading/error states
- Breadcrumbs showing location
- QR code display (react-qr-code)
- Print QR button

**Use shared components:**
- ConfirmationDialog (delete)
- LoadingSpinner
- ErrorAlert

---

### Task 4.2: Box Form View (6-8 hours)

**Pages:**
- `src/pages/app/boxes/new.astro` - Create
- `src/pages/app/boxes/[id]/edit.astro` - Edit

**Features:**
- Universal BoxForm component (create/edit mode)
- All box fields
- Validation with Zod
- Character counter
- Tag suggestions from workspace history
- Location picker
- QR code selector
- Submit → POST (create) or PATCH (edit)
- Delete button (edit only)
- Error handling

**Use shared components:**
- FormInput
- Modal (if modal view)
- ErrorAlert
- LoadingSpinner

---

### Task 4.3: Form Components (4-5 hours)

**Create reusable form fields:**
- NameInput.tsx
- DescriptionTextarea.tsx
- TagInput.tsx (with autocomplete)
- LocationSelector.tsx (tree picker)
- QRCodeSelector.tsx (dropdown)

**All should integrate with useForm hook**

---

## Quality Gate 4: Phase 4 Completion

✅ **Before moving to Phase 5:**

- [ ] Box Details page loads (/app/boxes/:id)
- [ ] Box data displays correctly
- [ ] Edit button navigates to edit page
- [ ] Delete flow works (confirmation + API call + redirect)
- [ ] Box Create page loads (/app/boxes/new)
- [ ] Create form works end-to-end
- [ ] Box Edit page loads (/app/boxes/:id/edit)
- [ ] Edit form pre-fills and updates
- [ ] All form validation works
- [ ] Character counter works (description)
- [ ] Tag autocomplete works
- [ ] Location picker works
- [ ] QR code selector works
- [ ] Errors display correctly
- [ ] Navigation back to dashboard works
- [ ] npm run lint passes

**Estimated Time:** 2-3 days (14-18 hours)

---

# PHASE 5: SECONDARY VIEWS (PARALLEL)

**Duration:** 3-4 days (22-27 hours)
**Team:** 2 developers (one per view - can run parallel)
**Dependencies:** Phase 2 complete (Phase 4 not needed)
**Blocks:** None (Phase 6 starts after)

## View 5A: QR CODE GENERATOR

**Duration:** 10-12 hours (1.5-2 days)
**Estimated Dev Time:** 1-2 days

### Overview
- Form to specify quantity (1-100)
- Generate batch via POST /api/qr-codes/batch
- Create PDF with A4 layout (4x5 grid = 20 per page)
- Auto-download PDF

### Deliverables
```
src/
├── pages/
│   └── app/
│       └── qr-generator.astro
├── components/
│   └── qr-generator/
│       ├── QRGeneratorView.tsx
│       ├── QRGeneratorForm.tsx
│       ├── NumberInput.tsx
│       ├── GenerateButton.tsx
│       ├── InstructionsPanel.tsx
│       ├── LoadingState.tsx
│       └── ErrorAlert.tsx (shared)
└── components/
    └── hooks/
        ├── useQRCodeGeneration.ts
        └── usePDFGeneration.ts
```

### Tasks

#### Task 5A.1: QR Generator Form Components (3-4 hours)
- NumberInput (1-100)
- GenerateButton
- InstructionsPanel
- LoadingState
- Form layout

#### Task 5A.2: QR Generation Hooks (3-4 hours)
- useQRCodeGeneration → POST /api/qr-codes/batch
- usePDFGeneration → jsPDF + qrcode library

#### Task 5A.3: Integration & Polish (2-3 hours)
- Setup page
- Error handling
- Loading states
- Styling

### Libraries to install
```bash
npm install jspdf qrcode
```

---

## View 5B: SETTINGS

**Duration:** 12-15 hours (2-3 days)
**Estimated Dev Time:** 2-3 days

### Overview
- Workspace management (create, edit, delete)
- Theme toggle (light/dark/system)
- Data export (CSV)
- Account deletion
- Logout

### Deliverables
```
src/
├── pages/
│   └── app/
│       └── settings.astro
├── components/
│   └── settings/
│       ├── SettingsView.tsx
│       ├── ProfileHeader.tsx
│       ├── WorkspaceManagementSection.tsx
│       ├── WorkspaceCard.tsx
│       ├── WorkspaceCreateModal.tsx
│       ├── WorkspaceEditModal.tsx
│       ├── ThemeToggle.tsx
│       ├── ExportDataButton.tsx
│       ├── DangerZoneSection.tsx
│       └── LogoutButton.tsx
└── components/
    └── hooks/
        ├── useSettingsView.ts
        ├── useTheme.ts
        └── useConfirmationDialog.ts
```

### Tasks

#### Task 5B.1: Workspace Management (5-6 hours)
- WorkspaceManagementSection
- WorkspaceCard
- WorkspaceCreateModal
- WorkspaceEditModal
- Delete workspace with confirmation

#### Task 5B.2: Theme & Account (3-4 hours)
- ThemeToggle with localStorage
- LogoutButton
- Account deletion with confirmation

#### Task 5B.3: Integration & Polish (3-4 hours)
- Page layout
- Error handling
- Data export
- Styling

---

## Quality Gate 5: Phase 5 Completion

✅ **QR Generator:**
- [ ] Form loads
- [ ] Number input validation (1-100)
- [ ] Generate button works
- [ ] PDF downloads automatically
- [ ] Instructions display correctly
- [ ] Loading state shows
- [ ] Errors handled

✅ **Settings:**
- [ ] Page loads
- [ ] Workspace list displays
- [ ] Create workspace works
- [ ] Edit workspace works
- [ ] Delete workspace works (owner only)
- [ ] Theme toggle works + persists
- [ ] Logout works
- [ ] Export data works (if implemented)
- [ ] Account deletion works (if implemented)

**Estimated Time:** 3-4 days (22-27 hours) for BOTH views

---

# PHASE 6: TESTING & POLISH

**Duration:** 2-3 days (10-15 hours)
**Team:** 1-2 developers + QA
**Dependencies:** All phases complete

## Tasks

### Task 6.1: Manual Testing (5-6 hours)
- All user flows end-to-end
- Error scenarios
- Edge cases
- Different devices (desktop, tablet, mobile)
- Different browsers (Chrome, Firefox, Safari)
- Accessibility (keyboard, screen reader)

### Task 6.2: Bug Fixes (3-4 hours)
- Fix issues found in testing
- Performance optimization
- Code cleanup

### Task 6.3: Code Quality (2-3 hours)
- npm run lint --fix
- npm run format
- TypeScript strict mode check
- Remove console.logs
- JSDoc comments

### Task 6.4: Final Deployment (1-2 hours)
- Build: npm run build
- Preview: npm run preview
- Deploy to staging
- Final QA
- Deploy to production

---

## Quality Gate 6: FINAL

✅ **Before going to production:**

- [ ] All 6 phases complete
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] No ESLint warnings
- [ ] 0 critical bugs
- [ ] All user flows tested
- [ ] Accessibility compliant
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Code reviewed

---

# QUALITY GATES (Summary)

## Gate 0 → Gate 1
**Prerequisite:** Phase 0 complete (shared infrastructure)
**Checklist:**
- [x] All shared components created
- [x] All shared hooks working
- [x] Validation schemas complete
- [x] API client functional
- [x] Nano stores initialized
- [x] No TypeScript errors
- [x] Components can be imported

**Sign-off:** Lead developer

---

## Gate 1 → Gate 2
**Prerequisite:** Phase 1 complete (login/registration)
**Checklist:**
- [x] Login flow end-to-end
- [x] Registration flow end-to-end
- [x] Session persistence
- [x] Middleware working
- [x] Password validation
- [x] Error handling
- [x] All auth flows tested

**Sign-off:** QA + product owner

---

## Gate 2 → Gate 3
**Prerequisite:** Phase 2 complete (dashboard)
**Checklist:**
- [x] Dashboard loads
- [x] Location tree renders
- [x] Search works
- [x] Box list displays
- [x] Data fetching works
- [x] Responsive design
- [x] Accessibility basic

**Sign-off:** Lead developer + designer

---

## Gate 3 → Gate 4
**Prerequisite:** Phase 3 complete (modals)
**Checklist:**
- [x] All modals open/close
- [x] Create/edit/delete flows work
- [x] Validation displays
- [x] API calls succeed
- [x] Error handling works

**Sign-off:** QA

---

## Gate 4 → Gate 5
**Prerequisite:** Phase 4 complete (box management)
**Checklist:**
- [x] All box CRUD works
- [x] Details view displays correctly
- [x] Form validation works
- [x] Navigation works

**Sign-off:** QA + product owner

---

## Gate 5 → Production
**Prerequisite:** All phases complete
**Checklist:**
- [x] All features tested
- [x] Zero critical bugs
- [x] Performance acceptable
- [x] Accessibility compliant
- [x] No TypeScript errors
- [x] ESLint passing
- [x] Code reviewed
- [x] Documentation updated

**Sign-off:** Tech lead + product owner

---

# API ENDPOINTS STATUS

## Critical Endpoints (NOW FULLY IMPLEMENTED! ✅)

### 1. `PATCH /api/workspaces/:workspace_id`
**Status:** ✅ FULLY IMPLEMENTED
**Implementation File:** `src/pages/api/workspaces/[workspace_id].ts` (lines 22-162)
**Service Layer:** `src/lib/services/workspace.service.ts::updateWorkspace()`
**Used by:** Settings (edit workspace name)
**Endpoint:**
```http
PATCH /api/workspaces/{workspace_id}
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "name": "Updated Workspace Name"
}

Response (200 OK):
{
  "id": "uuid",
  "name": "Updated Workspace Name",
  "updated_at": "2025-12-28T..."
}

Error Responses:
- 400: Invalid data
- 401: Not authenticated
- 403: Not owner
- 404: Not found
- 500: Server error
```

**Implementation Notes:**
- Validate name (1-255 chars)
- Check user is owner (RLS)
- Update workspace row
- Return updated workspace

---

### 2. `DELETE /api/workspaces/:workspace_id`
**Status:** ✅ FULLY IMPLEMENTED (8/8 tests passed)
**Implementation File:** `src/pages/api/workspaces/[workspace_id].ts` (lines 181-297)
**Service Layer:** `src/lib/services/workspace.service.ts::deleteWorkspace()`
**Used by:** Settings (delete workspace)
**Endpoint:**
```http
DELETE /api/workspaces/{workspace_id}
Authorization: Bearer <JWT>

Response (200 OK):
{
  "message": "Workspace deleted successfully"
}

Error Responses:
- 401: Not authenticated
- 403: Not owner
- 404: Not found
- 500: Server error
```

**Implementation Notes:**
- Check user is owner
- Delete workspace + cascade (locations, boxes, qr_codes)
- Return success message

---

## Optional Features (SURPRISE: ALSO FULLY IMPLEMENTED! ✅)

### 3. `DELETE /api/auth/delete-account`
**Status:** ✅ FULLY IMPLEMENTED
**Implementation File:** `src/pages/api/auth/delete-account.ts`
**Service Layer:** `src/lib/services/auth.service.ts::deleteUserAccount()`
**Used by:** Settings (delete account)
**Endpoint:**
```http
DELETE /api/auth/delete-account
Authorization: Bearer <JWT>

Response (200 OK):
{
  "message": "Account successfully deleted"
}
```

---

### 4. `GET /api/export/inventory`
**Status:** ✅ FULLY IMPLEMENTED
**Implementation File:** `src/pages/api/export/inventory.ts`
**Service Layer:** `src/lib/services/exportService.ts::exportInventory()`
**Used by:** Settings (export CSV)
**Endpoint:**
```http
GET /api/export/inventory?workspace_id={workspace_id}
Authorization: Bearer <JWT>

Response (200 OK):
Content-Type: text/csv

CSV file content (boxes with locations, tags, etc.)
```

---

# RISK ASSESSMENT

## High Risk

### 1. Login/Auth Complexity (Phase 1)
**Risk:** Session management, token storage, Supabase integration
**Mitigation:**
- Use Supabase Auth SDK (battle-tested)
- Store token in localStorage + HTTP-only cookies
- Validate token on every page load
- Implement automatic token refresh

---

### 2. Dashboard State Management (Phase 2)
**Risk:** Complex nested state (locations, boxes, search, selections)
**Mitigation:**
- Use Nano Store for global state
- Use React Context for actions
- Clear separation of concerns
- Implement useCallback to prevent unnecessary re-renders

---

### 3. API Integration Consistency (Phase 0)
**Risk:** Different error handling per view
**Mitigation:**
- Centralize in apiClient + endpoints
- Single error handler
- Test API layer before views

---

## Medium Risk

### 1. Performance (Phase 2, 4)
**Risk:** Large datasets (100+ boxes, deep location trees)
**Mitigation:**
- Virtual list for boxes (react-window)
- Lazy load location children
- Memoize components (React.memo)
- useCallback for handlers

---

### 2. TypeScript Type Safety
**Risk:** Bugs from type mismatches
**Mitigation:**
- Strict mode enabled
- Generate types from Supabase schema
- Use Zod for runtime validation
- Test TS compilation in CI

---

### 3. Accessibility (All Phases)
**Risk:** Not compliant with WCAG 2.1
**Mitigation:**
- Semantic HTML (nav, main, etc.)
- ARIA labels on interactive elements
- Keyboard navigation for all flows
- Test with screen reader (NVDA)

---

## Low Risk

### 1. Styling/CSS
**Risk:** Inconsistent design
**Mitigation:**
- Use Tailwind CSS (consistent utilities)
- Use Shadcn/ui components (pre-styled)
- Design system + component library

---

### 2. Browser Compatibility
**Risk:** Not work in older browsers
**Mitigation:**
- Target modern browsers (Chrome, Firefox, Safari 14+)
- Use CSS Grid/Flexbox (no IE 11)
- Test in latest versions

---

# TEAM STRUCTURE & TIMELINE

## Recommended Team

```
Role                    | Person        | Phases      | Time
Senior Backend Dev      | Dev A         | 0-1         | 4-6 days
Full-Stack Dev (Lead)   | Dev B         | 2-3         | 4-6 days
Frontend Dev #1         | Dev C         | 4           | 2-3 days
Frontend Dev #2         | Dev D         | 5A (QR Gen) | 1-2 days
Frontend Dev #3         | Dev E         | 5B (Settings)| 2-3 days
QA / Tester             | QA Person     | All         | 2-3 days
```

## Timeline (with Parallelization)

```
Week 1:
│ Mon | Dev A: Phase 0 (shared infra)
│ Tue | Dev A: Phase 0 → Dev B: Phase 1 (login) starts
│ Wed | Dev A: Phase 0 complete; Dev B: Phase 1 continues
│ Thu | Dev B: Phase 1 → Dev C: Phase 2 (dashboard) starts
│ Fri | Dev B: Phase 1 complete; Dev C: Phase 2 continues

Week 2:
│ Mon | Dev C: Phase 2 continues
│ Tue | Dev C: Phase 2 complete; Dev D: Phase 3 starts
│ Wed | Dev D: Phase 3 → Dev E: Phase 4 (box mgmt) starts
│ Thu | Dev D: Phase 3 complete; Dev E: Phase 4 continues
│ Fri | Dev E: Phase 4 complete

Week 3:
│ Mon | Dev C & E: Phase 5A (QR) + 5B (Settings) in parallel
│ Tue | Dev C & E: Phase 5 continues
│ Wed | Dev C & E: Phase 5 complete
│ Thu | QA + All: Phase 6 (testing + polish)
│ Fri | QA + All: Phase 6 complete → Deploy to production
```

**Total Duration:** 2-3 weeks (15-22 calendar days)

---

# NEXT STEPS

## Immediate (Today)

1. [ ] Review this roadmap with team
2. [ ] Assign developers to phases
3. [ ] Create GitHub issues per task (with phase labels)
4. [ ] Setup CI/CD pipeline (GitHub Actions)
5. [ ] Create feature branches (one per phase)

## Phase 0 (Starting Tomorrow)

1. [ ] Create all shared component files (empty)
2. [ ] Create all shared hook files (empty)
3. [ ] Create validation schema files
4. [ ] Create API client skeleton
5. [ ] Create Nano store skeletons
6. [ ] Implement one component at a time
7. [ ] Test with each addition

## Communication

- **Daily stand-ups:** 15 min (sync on blockers)
- **Phase completion reviews:** 30 min (QA checklist)
- **Slack channel:** #storage-app-dev (for quick questions)
- **Documentation:** This roadmap + GitHub wiki

---

# RESOURCES

## Documentation Links (from this project)

- [API Specification](.ai_docs/api-plan.md)
- [Database Schema](.ai_docs/db-plan.md)
- [Product Requirements](.ai_docs/prd.md)
- [Tech Stack](.ai_docs/tech-stack.md)
- [UI Plan](.ai_docs/ui-plan.md)

## View Implementation Plans

- [Login/Registration Plan](.ai_docs/login-registration-view-implementation-plan.md)
- [Main Dashboard Plan](.ai_docs/main-dashboard-view-implementation-plan.md)
- [Box Form Plan](.ai_docs/box-form-view-implementation-plan.md)
- [Box Details Plan](.ai_docs/box-details-view-implementation-plan.md)
- [QR Generator Plan](.ai_docs/qr-generator-view-implementation-plan.md)
- [Settings Plan](.ai_docs/settings-view-implementation-plan.md)

## External Resources

- [Astro Documentation](https://docs.astro.build/)
- [React 19 Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Zod Validation](https://zod.dev/)
- [Nano Stores](https://nanostores.github.io/)
- [Supabase Documentation](https://supabase.com/docs/)

---

# APPENDIX: IMPLEMENTATION CHECKLIST

## Phase 0 Checklist
- [ ] FormInput.tsx created + styled
- [ ] ConfirmationDialog.tsx created
- [ ] ErrorAlert.tsx created
- [ ] LoadingSpinner.tsx created
- [ ] Modal.tsx wrapper created
- [ ] useForm.ts hook implemented
- [ ] useFetch.ts hook implemented
- [ ] useDebounce.ts hook implemented
- [ ] useLocalStorage.ts hook implemented
- [ ] Validation schemas created (auth, workspace, box, location, common)
- [ ] API client (apiClient.ts) implemented
- [ ] API endpoints defined (profilesApi, workspacesApi, locationsApi, boxesApi, qrCodesApi)
- [ ] Nano stores created (auth, workspace, theme)
- [ ] Types extended in src/types.ts
- [ ] No TypeScript errors
- [ ] npm run lint passes
- [ ] All shared components can be imported

## Phase 1 Checklist
- [ ] src/pages/auth/index.astro created
- [ ] AuthLayout.tsx created
- [ ] AuthCard.tsx created
- [ ] LoginForm.tsx created + integrated
- [ ] RegistrationForm.tsx created + integrated
- [ ] PasswordStrengthIndicator.tsx created
- [ ] useAuthForm.ts hook implemented
- [ ] Middleware updated (auth checks)
- [ ] Login flow tested end-to-end
- [ ] Registration flow tested end-to-end
- [ ] Session persistence working
- [ ] Password validation working
- [ ] Error handling for auth errors
- [ ] Logout functionality working
- [ ] Redirect logic correct (/login → /app, /app → /login)
- [ ] Mobile responsive
- [ ] Accessibility compliant
- [ ] npm run lint passes

## Phase 2 Checklist
- [ ] src/pages/app.astro created
- [ ] DashboardContainer.tsx created
- [ ] DashboardHeader.tsx created
- [ ] SearchInput.tsx created
- [ ] LocationTree.tsx created
- [ ] LocationTreeNode.tsx created
- [ ] LocationContextMenu.tsx created
- [ ] BoxListContainer.tsx created
- [ ] BoxList.tsx created (virtualized with react-window)
- [ ] BoxListItem.tsx created
- [ ] BoxContextMenu.tsx created
- [ ] EmptyState.tsx created
- [ ] Dashboard stores created (currentWorkspaceId, selectedLocationId, etc.)
- [ ] Dashboard context created (actions)
- [ ] useWorkspaces hook implemented
- [ ] useLocations hook implemented
- [ ] useBoxes hook implemented
- [ ] Workspace list fetches and displays
- [ ] Location tree renders and expands
- [ ] Search works with debounce
- [ ] Box list displays (virtualized)
- [ ] Loading/error states show
- [ ] Responsive design
- [ ] Accessibility (keyboard navigation)
- [ ] npm run lint passes

## Phase 3 Checklist
- [ ] LocationEditorModal.tsx created
- [ ] LocationSelector.tsx created (tree picker)
- [ ] BoxEditorModal.tsx created
- [ ] QRCodeSelector.tsx created
- [ ] Create location flow works
- [ ] Edit location flow works
- [ ] Delete location flow works
- [ ] Create box flow works
- [ ] Edit box flow works
- [ ] Delete box flow works
- [ ] Validation works
- [ ] Error handling works
- [ ] List updates after CRUD operations
- [ ] npm run lint passes

## Phase 4 Checklist
- [ ] src/pages/app/boxes/new.astro created
- [ ] src/pages/app/boxes/[id].astro created
- [ ] src/pages/app/boxes/[id]/edit.astro created
- [ ] BoxDetailsContent.tsx created
- [ ] BoxForm.tsx created (universal for create/edit)
- [ ] NameInput.tsx created
- [ ] DescriptionTextarea.tsx created
- [ ] TagInput.tsx created
- [ ] LocationSelector.tsx created (reuse from Phase 3)
- [ ] QRCodeSelector.tsx created (reuse from Phase 3)
- [ ] Box Details page loads
- [ ] Box data displays correctly
- [ ] Edit button navigates to edit page
- [ ] Delete button + confirmation works
- [ ] Create box page works
- [ ] Edit box page works
- [ ] All form validation works
- [ ] Character counter works
- [ ] Tag autocomplete works
- [ ] Navigation works
- [ ] Error handling works
- [ ] npm run lint passes

## Phase 5A (QR Generator) Checklist
- [ ] src/pages/app/qr-generator.astro created
- [ ] QRGeneratorView.tsx created
- [ ] QRGeneratorForm.tsx created
- [ ] NumberInput.tsx created (1-100)
- [ ] GenerateButton.tsx created
- [ ] InstructionsPanel.tsx created
- [ ] LoadingState.tsx created (or reuse shared)
- [ ] useQRCodeGeneration hook implemented
- [ ] usePDFGeneration hook implemented
- [ ] Form validation works (1-100)
- [ ] Generate button calls API
- [ ] PDF generates with A4 layout (4x5 grid)
- [ ] PDF downloads automatically
- [ ] Loading state shows
- [ ] Error handling works
- [ ] jsPDF + qrcode libraries installed
- [ ] npm run lint passes

## Phase 5B (Settings) Checklist
- [ ] src/pages/app/settings.astro created
- [ ] SettingsView.tsx created
- [ ] ProfileHeader.tsx created
- [ ] WorkspaceManagementSection.tsx created
- [ ] WorkspaceCard.tsx created
- [ ] WorkspaceCreateModal.tsx created
- [ ] WorkspaceEditModal.tsx created
- [ ] ThemeToggle.tsx created
- [ ] ExportDataButton.tsx created
- [ ] DangerZoneSection.tsx created
- [ ] LogoutButton.tsx created
- [ ] useSettingsView hook implemented
- [ ] useTheme hook implemented
- [ ] Workspace list displays
- [ ] Create workspace works
- [ ] Edit workspace works
- [ ] Delete workspace works (owner only)
- [ ] Theme toggle works + persists
- [ ] Logout works
- [ ] Export data works (if implemented)
- [ ] Account deletion works (if implemented)
- [ ] np run lint passes

## Phase 6 Checklist
- [ ] All user flows tested end-to-end
- [ ] Error scenarios tested
- [ ] Edge cases tested
- [ ] Desktop responsive
- [ ] Tablet responsive
- [ ] Mobile responsive
- [ ] Chrome tested
- [ ] Firefox tested
- [ ] Safari tested
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] No critical bugs
- [ ] npm run lint passes
- [ ] npm run build succeeds
- [ ] npm run preview works
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Ready for production

---

# END OF ROADMAP

**Last Updated:** 2025-12-28
**Version:** 1.0
**Next Review:** After Phase 2 completion

---

**For questions or updates, contact the Development Team Lead.**