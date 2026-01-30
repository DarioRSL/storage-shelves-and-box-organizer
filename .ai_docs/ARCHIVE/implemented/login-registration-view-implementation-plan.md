# Login / Registration View Implementation Plan

## 1. Overview

The Login / Registration view is a critical MVP feature that provides user authentication and account creation functionality. This view serves as the gateway to the application, allowing new users to register with email and password and existing users to log in. Upon successful authentication, users are automatically assigned a default workspace and redirected to the main dashboard. The implementation follows a single-page interface with tab-based switching between login and registration modes.

---

## 2. View Routing

**Paths:**

- `/login` - Login form (default entry point for unauthenticated users)
- `/register` - Registration form (accessible via link from login)

**Redirect Logic:**

- Unauthenticated visitors accessing `/app` should redirect to `/login`
- Authenticated users accessing `/login` should redirect to `/app`
- After successful authentication, redirect to `/app`
- After logout, redirect to `/login`

**Implementation Location:**

- Astro page: `src/pages/auth/index.astro` (handles both `/login` and `/register` routes)
- Middleware: Enhance `src/middleware/index.ts` to check authentication on protected routes

---

## 3. Component Structure

```
AuthPage (Astro)
├── AuthLayout (React)
│   ├── AuthCard (React)
│   │   ├── TabSwitcher (React) [Login/Register tabs]
│   │   └── FormContent (React)
│   │       ├── LoginForm (React)
│   │       │   ├── EmailInput (React/Shadcn)
│   │       │   ├── PasswordInput (React/Shadcn)
│   │       │   ├── SubmitButton (React/Shadcn)
│   │       │   └── RegistrationLink (React)
│   │       │
│   │       └── RegistrationForm (React)
│   │           ├── EmailInput (React/Shadcn)
│   │           ├── PasswordInput (React/Shadcn)
│   │           ├── ConfirmPasswordInput (React/Shadcn)
│   │           ├── PasswordStrengthIndicator (React)
│   │           ├── PasswordRecoveryNote (React)
│   │           ├── SubmitButton (React/Shadcn)
│   │           └── LoginLink (React)
│   │
│   └── ErrorBanner (React) [Global form errors]
```

---

## 4. Component Details

### AuthPage (Astro)

**Description:**
Root Astro page component that handles routing and initial page setup. Manages layout structure, metadata, and coordinates authentication flow. Serves as the SSR entry point for `/login` and `/register` routes.

**Main Elements:**

- Layout wrapper with HTML structure
- Head metadata (title, meta tags)
- AuthLayout component integration
- View transition setup for smooth navigation
- No prerendering (set `export const prerender = false`)

**Supported Interactions:**

- Page load with route detection
- Form submission events (delegated to child components)
- Navigation between login/registration tabs
- Redirect after successful authentication

**Validation:**

- Check if user is already authenticated (redirect to `/app`)
- Verify current route matches expected paths

**Types:**

- Uses imported types from `src/types.ts`

**Props:**

- Receives current route from Astro context
- Passes no props to child components (uses local state)

---

### AuthLayout (React)

**Description:**
Main React wrapper component that manages overall authentication page layout and styling. Provides responsive design container, handles page-wide state coordination, and manages error display across the entire authentication interface.

**Main Elements:**

- Responsive container (centered, with padding)
- Logo/branding section
- AuthCard wrapper
- Global error banner
- Footer with additional links (optional)

**Supported Interactions:**

- Display and dismiss error messages
- Handle form mode switching (login/registration)
- Coordinate between child form components

**Validation:**

- Validates that child components are properly mounted
- Ensures error state is properly managed

**Types:**

- `AuthLayoutProps` interface

**Props:**

- `initialMode?: 'login' | 'register'` - Starting form mode
- `onAuthSuccess?: (data: AuthSuccessData) => void` - Callback after successful auth

---

### AuthCard (React)

**Description:**
Card component serving as the main container for authentication forms. Houses tab switcher for form mode selection and form content area. Provides visual separation and styling consistency with the rest of the application.

**Main Elements:**

- Card container with shadow and border styling
- Tab switcher (Login/Register buttons)
- Form content area (LoginForm or RegistrationForm)
- Form-specific branding/title

**Supported Interactions:**

- Switch between login and registration forms
- Display active form based on selected tab
- Handle form submission delegation

**Validation:**

- Ensure only one form is visible at a time
- Validate tab selection state

**Types:**

- `AuthCardProps` interface

**Props:**

- `activeMode: 'login' | 'register'` - Current form mode
- `onModeChange: (mode: 'login' | 'register') => void` - Mode switching callback

---

### LoginForm (React)

**Description:**
Interactive form component for user authentication. Handles email and password input, client-side validation, form submission, and error display. Manages loading state during authentication request.

**Main Elements:**

- Email input field with validation feedback
- Password input field (hidden characters)
- Submit button with loading state
- "Forgot Password?" placeholder (disabled in MVP)
- Link to registration form
- Error message display area

**Supported Interactions:**

- Type in email field
- Type in password field
- Click submit button
- Click registration link
- Clear form on successful submission
- Display validation errors in real-time

**Validation:**

- Email format validation (must be valid email structure)
- Email must not be empty
- Password must not be empty
- Password minimum 8 characters
- Prevent form submission if validation fails
- Server-side validation via Supabase Auth

**Types:**

- `LoginFormProps` interface
- `LoginFormData` type for form values
- `LoginFormError` type for error states

**Props:**

- `onSubmit: (data: LoginFormData) => Promise<void>` - Form submission handler
- `isLoading?: boolean` - Loading state indicator
- `error?: string` - Error message from server
- `onRegistrationClick?: () => void` - Navigation callback

---

### RegistrationForm (React)

**Description:**
Interactive form component for new user account creation. Handles email, password, and password confirmation inputs with advanced validation including password strength indicator. Manages server-side errors and provides clear user guidance.

**Main Elements:**

- Email input field with validation feedback
- Password input field (hidden characters)
- Confirm password input field
- Password strength indicator (visual + text)
- Checkbox with password recovery notice (MVP limitation notice)
- Submit button with loading state
- Link to login form
- Error message display area

**Supported Interactions:**

- Type in email field
- Type in password field
- Type in confirm password field
- Watch password strength indicator update in real-time
- Check/uncheck password recovery notice checkbox (acknowledgment)
- Click submit button
- Click login link
- Display validation errors as user types

**Validation:**

- Email format validation (must be valid email structure)
- Email must not be empty
- Password must not be empty
- Password minimum 8 characters
- Confirm password must match password field
- Password strength feedback (weak/medium/strong)
- All fields required before submission
- Server-side validation via Supabase Auth (handles duplicate email)
- Server-side validation prevents existing email registration

**Types:**

- `RegistrationFormProps` interface
- `RegistrationFormData` type for form values
- `PasswordStrengthLevel` type ('weak' | 'medium' | 'strong')
- `RegistrationFormError` type for error states

**Props:**

- `onSubmit: (data: RegistrationFormData) => Promise<void>` - Form submission handler
- `isLoading?: boolean` - Loading state indicator
- `error?: string` - Error message from server
- `onLoginClick?: () => void` - Navigation callback

---

### PasswordStrengthIndicator (React)

**Description:**
Visual feedback component that evaluates and displays password strength in real-time. Shows progress bar with color coding and descriptive text to guide user toward a secure password.

**Main Elements:**

- Progress bar with color coding
- Strength level text ('Weak' / 'Medium' / 'Strong')
- Optional helper text with requirements

**Supported Interactions:**

- Update display based on password input
- Show/hide requirements list based on strength level

**Validation:**

- Validate password against strength criteria
- Minimum 8 characters
- Optional: Include uppercase, lowercase, numbers, special characters

**Types:**

- `PasswordStrengthIndicatorProps` interface
- `PasswordStrengthLevel` type

**Props:**

- `password: string` - Password to evaluate
- `showRequirements?: boolean` - Show detailed requirements

---

### FormInput (Shadcn-based Component)

**Description:**
Reusable input wrapper component based on Shadcn UI patterns. Provides consistent styling, error display, and label binding across all form inputs. Handles accessibility requirements.

**Main Elements:**

- Label element (associated via htmlFor)
- Input element (text or password type)
- Error message display area
- Validation indicator (optional visual feedback)

**Supported Interactions:**

- Focus/blur events
- Value change
- Display validation error on blur or after submission attempt

**Validation:**

- Display error message when provided
- Update styling based on error state
- Maintain proper label-input association for accessibility

**Types:**

- `FormInputProps` interface

**Props:**

- `label: string` - Input label text
- `name: string` - Input name attribute
- `type: 'text' | 'email' | 'password'` - Input type
- `value: string` - Current input value
- `onChange: (value: string) => void` - Value change handler
- `error?: string` - Error message to display
- `placeholder?: string` - Placeholder text
- `disabled?: boolean` - Disabled state
- `required?: boolean` - Required field indicator

---

### ErrorBanner (React)

**Description:**
Global error message display component shown at the top of the form area. Provides prominent error notification for authentication failures and other submission errors.

**Main Elements:**

- Alert/banner container with error styling
- Error message text
- Close/dismiss button
- Icon indicating error state

**Supported Interactions:**

- Display error message
- Dismiss error with close button
- Auto-dismiss after timeout (optional)

**Validation:**

- Only render when error message is present
- Ensure error text is readable and actionable

**Types:**

- `ErrorBannerProps` interface

**Props:**

- `message: string` - Error message to display
- `onDismiss?: () => void` - Dismiss callback
- `autoCloseDuration?: number` - Auto-close timeout in ms

---

## 5. Types

### Authentication-Specific Types

```typescript
/**
 * Login form input data
 */
interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Registration form input data
 */
interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  agreeToPasswordLimitation: boolean;
}

/**
 * Successful authentication response
 */
interface AuthSuccessData {
  user: ProfileDto;
  workspace: WorkspaceDto;
  token: string;
}

/**
 * Authentication error details
 */
interface AuthErrorDetails {
  code: string;
  message: string;
  field?: string;
}

/**
 * Password strength evaluation result
 */
interface PasswordStrengthResult {
  level: "weak" | "medium" | "strong";
  score: number; // 0-100
  feedback: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
}

/**
 * Form validation state
 */
interface FormValidationState {
  email: string | null; // Error message or null
  password: string | null;
  confirmPassword: string | null;
}

/**
 * Overall authentication state
 */
interface AuthState {
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  user: ProfileDto | null;
  workspace: WorkspaceDto | null;
}
```

### Existing Types (from src/types.ts)

**Already Available:**

- `ProfileDto` - User profile information
- `WorkspaceDto` - Workspace information
- `CreateWorkspaceRequest` - Workspace creation payload
- `ErrorResponse` - Standard error response

---

## 6. State Management

### Nano Stores Usage

**Auth Store** (`src/lib/stores/auth.store.ts` - to be created)

```typescript
// Store for global authentication state
export const authStore = atom<AuthState>({
  isLoading: false,
  error: null,
  isAuthenticated: false,
  user: null,
  workspace: null,
});

// Actions for auth store
export function setAuthLoading(loading: boolean) {
  /* ... */
}
export function setAuthError(error: string | null) {
  /* ... */
}
export function setAuthSuccess(data: AuthSuccessData) {
  /* ... */
}
export function clearAuth() {
  /* ... */
}
export function restoreSessionFromStorage() {
  /* ... */
}
```

### Component-Level State

**LoginForm State:**

- `email: string` - Current email value
- `password: string` - Current password value
- `fieldErrors: FormValidationState` - Field-level validation errors
- `isSubmitting: boolean` - Submission in progress flag

**RegistrationForm State:**

- `email: string` - Current email value
- `password: string` - Current password value
- `confirmPassword: string` - Confirmation password value
- `agreeToPasswordLimitation: boolean` - Checkbox state
- `passwordStrength: PasswordStrengthResult` - Password strength evaluation
- `fieldErrors: FormValidationState` - Field-level validation errors
- `isSubmitting: boolean` - Submission in progress flag

**AuthCard State:**

- `activeMode: 'login' | 'register'` - Currently displayed form
- `globalError: string | null` - Error to display in ErrorBanner

**AuthLayout State:**

- Manages coordination between child components
- Handles page-level redirect logic after auth success

### Custom Hooks

**useAuthForm** (for shared form logic)

```typescript
interface UseAuthFormOptions {
  onSuccess?: (data: AuthSuccessData) => void;
  onError?: (error: string) => void;
}

function useAuthForm(options?: UseAuthFormOptions) {
  return {
    isLoading: boolean;
    error: string | null;
    submit: (data: LoginFormData | RegistrationFormData) => Promise<void>;
    clearError: () => void;
  };
}
```

**usePasswordStrength** (for password validation)

```typescript
function usePasswordStrength(password: string): PasswordStrengthResult;
```

**useFormValidation** (for field validation)

```typescript
interface UseFormValidationOptions {
  onError?: (errors: FormValidationState) => void;
}

function useFormValidation(options?: UseFormValidationOptions) {
  return {
    validateEmail: (email: string) => string | null;
    validatePassword: (password: string) => string | null;
    validatePasswordMatch: (password: string, confirm: string) => string | null;
    validateForm: (data: LoginFormData | RegistrationFormData) => FormValidationState;
  };
}
```

---

## 7. API Integration

### Authentication Flow - API Calls

**Login Flow:**

1. **Supabase Auth SignIn** (client-side, Supabase SDK)

   ```
   POST https://{project}.supabase.co/auth/v1/token?grant_type=password

   Request:
   {
     "email": "user@example.com",
     "password": "password123"
   }

   Response (200 OK):
   {
     "access_token": "eyJhbGc...",
     "refresh_token": "...",
     "expires_in": 3600,
     "user": { ... }
   }
   ```

2. **Fetch User Profile** (after successful sign-in)

   ```
   GET /api/profiles/me
   Authorization: Bearer {access_token}

   Response (200 OK):
   {
     "id": "uuid",
     "email": "user@example.com",
     "full_name": "John Doe",
     "avatar_url": "...",
     "created_at": "...",
     "updated_at": "..."
   }
   ```

3. **Fetch User Workspaces**

   ```
   GET /api/workspaces
   Authorization: Bearer {access_token}

   Response (200 OK):
   [
     {
       "id": "uuid",
       "owner_id": "uuid",
       "name": "My Home Storage",
       "created_at": "...",
       "updated_at": "..."
     }
   ]
   ```

**Registration Flow:**

1. **Supabase Auth SignUp** (client-side, Supabase SDK)

   ```
   POST https://{project}.supabase.co/auth/v1/signup

   Request:
   {
     "email": "newuser@example.com",
     "password": "password123"
   }

   Response (200 OK):
   {
     "access_token": "eyJhbGc...",
     "refresh_token": "...",
     "expires_in": 3600,
     "user": { ... }
   }
   ```

2. **Create Default Workspace**

   ```
   POST /api/workspaces
   Authorization: Bearer {access_token}
   Content-Type: application/json

   Request:
   {
     "name": "My Workspace"
   }

   Response (201 Created):
   {
     "id": "uuid",
     "owner_id": "uuid",
     "name": "My Workspace",
     "created_at": "...",
     "updated_at": "..."
   }
   ```

3. **Fetch User Profile** (same as login step 2)

4. **Fetch User Workspaces** (same as login step 3)

**Logout Flow:**

1. **Supabase Auth SignOut** (client-side, Supabase SDK)

   ```
   POST https://{project}.supabase.co/auth/v1/logout
   Authorization: Bearer {access_token}

   Response (200 OK):
   { "message": "OK" }
   ```

2. Clear local session storage and Nano Stores
3. Redirect to `/login`

### Error Handling

**Authentication Errors from Supabase:**

- `invalid_credentials` - Invalid email/password combination
- `email_exists` - Email already registered
- `invalid_email_format` - Malformed email
- `weak_password` - Password doesn't meet requirements

**API Errors from Backend:**

- `400 Bad Request` - Invalid input format
- `401 Unauthorized` - Invalid or expired token
- `409 Conflict` - Duplicate email or resource conflict
- `500 Internal Server Error` - Server error

**Network Errors:**

- Timeout
- Connection refused
- Network unreachable

---

## 8. User Interactions

### Login Form Interactions

| Interaction             | Trigger                         | Expected Behavior                                                                |
| ----------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| Page load               | User navigates to `/login`      | Display login form, check if already authenticated (redirect to `/app` if yes)   |
| Enter email             | Type in email field             | Show email field value, validate format in real-time                             |
| Enter password          | Type in password field          | Show masked password input, validate length in real-time                         |
| Click submit            | Click "Login" button            | Validate all fields, disable button, show loading state, submit to auth endpoint |
| Submit success          | Auth returns valid token        | Store token, fetch profile and workspaces, redirect to `/app`                    |
| Submit error            | Auth returns error              | Display error message in ErrorBanner, clear loading state, keep form values      |
| Click registration link | Click "Don't have an account?"  | Switch to registration form, clear previous errors                               |
| Press Enter in form     | Focus on password field + Enter | Submit form (same as click submit)                                               |
| Validation error        | Field has invalid value         | Show error message below field, disable submit button                            |

### Registration Form Interactions

| Interaction              | Trigger                                        | Expected Behavior                                                                |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Page load                | User navigates to `/register`                  | Display registration form                                                        |
| Enter email              | Type in email field                            | Show email field value, validate format in real-time                             |
| Enter password           | Type in password field                         | Show masked input, display password strength indicator, validate in real-time    |
| Enter confirm            | Type in confirm password field                 | Validate matches password field, show match indicator                            |
| Password change          | Update password field                          | Recalculate strength, update indicator, revalidate confirm password match        |
| Click checkbox           | Check password recovery notice                 | Acknowledge limitation (required before submit)                                  |
| Click submit             | Click "Register" button                        | Validate all fields, disable button, show loading state, submit to auth endpoint |
| Submit success           | Auth returns valid token and workspace created | Store token, navigate to `/app`, show welcome message (optional)                 |
| Submit error             | Auth returns error                             | Display error message in ErrorBanner, clear loading state, keep form values      |
| Password strength update | As password is typed                           | Show real-time strength indicator with color and text feedback                   |
| Click login link         | Click "Already have an account?"               | Switch to login form, clear previous errors                                      |
| Press Enter in form      | Focus on last field + Enter                    | Submit form (same as click submit)                                               |
| Field validation error   | Field has invalid value                        | Show error message below field, disable submit button                            |

### Form Mode Switching

| Interaction        | Trigger                                | Expected Behavior                                                       |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------- |
| Click Login tab    | User clicks "Login" tab in AuthCard    | Switch to login form, clear registration form errors, focus email field |
| Click Register tab | User clicks "Register" tab in AuthCard | Switch to registration form, clear login form errors, focus email field |
| Form submitted     | User submits form on either mode       | Disable mode switching during submission, clear previous mode errors    |

---

## 9. Conditions and Validation

### Email Validation

**Condition:** Email format is valid

- **Where:** LoginForm, RegistrationForm
- **Validation Rules:**
  - Must contain `@` symbol
  - Must have domain after `@`
  - Can use regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Supabase Auth provides additional server-side validation
- **Impact:** Cannot submit form if email is invalid, error message shown below field
- **User Feedback:** Real-time error message: "Please enter a valid email address"

**Condition:** Email is not empty

- **Where:** LoginForm, RegistrationForm
- **Validation Rules:**
  - Email field must have value
  - Trimmed string length > 0
- **Impact:** Prevent form submission if empty
- **User Feedback:** Error message: "Email is required"

**Condition:** Email not already registered (registration only)

- **Where:** RegistrationForm server-side validation
- **Validation Rules:**
  - Supabase Auth checks during signup
  - Returns error if email exists
- **Impact:** Prevent account creation, show server error
- **User Feedback:** Error message from server: "Email already registered"

### Password Validation

**Condition:** Password is not empty

- **Where:** LoginForm, RegistrationForm
- **Validation Rules:**
  - Password field must have value
  - Trimmed string length > 0
- **Impact:** Cannot submit form if empty
- **User Feedback:** Error message: "Password is required"

**Condition:** Password minimum 8 characters

- **Where:** LoginForm, RegistrationForm
- **Validation Rules:**
  - Password string length >= 8
- **Impact:** Prevent form submission, show error
- **User Feedback:** Error message: "Password must be at least 8 characters long"

**Condition:** Password and confirm password match (registration only)

- **Where:** RegistrationForm
- **Validation Rules:**
  - `password === confirmPassword`
  - Validate on every change
- **Impact:** Prevent form submission if mismatch
- **User Feedback:** Error message: "Passwords do not match"

**Condition:** Password strength (registration only, informational)

- **Where:** RegistrationForm
- **Validation Rules:**
  - Evaluate based on length, character variety
  - Weak: < 8 chars or only lowercase/numbers
  - Medium: 8+ chars with mixed case
  - Strong: 8+ chars with mixed case + numbers/special
- **Impact:** Informational only (does not block submission), shows in PasswordStrengthIndicator
- **User Feedback:** Visual indicator with color and text ("Weak", "Medium", "Strong")

### Form Submission Conditions

**Condition:** All required fields valid before submission

- **Where:** LoginForm, RegistrationForm
- **Validation Rules:**
  - Email valid and not empty
  - Password valid and not empty
  - Confirm password matches (registration only)
  - Agreement checkbox checked (registration only)
- **Impact:** Submit button disabled if any field invalid, enabled when all valid
- **User Feedback:** Button state (disabled/enabled), field-level error messages

**Condition:** No submission in progress

- **Where:** LoginForm, RegistrationForm
- **Validation Rules:**
  - `isSubmitting === false`
  - Check before allowing new submission
- **Impact:** Prevent double submission, button shows loading state
- **User Feedback:** Button text changes to "Loading..." or spinner icon, button disabled

**Condition:** Registration specific - agreement checkbox checked

- **Where:** RegistrationForm
- **Validation Rules:**
  - `agreeToPasswordLimitation === true`
- **Impact:** Cannot submit registration if unchecked
- **User Feedback:** Error message: "You must acknowledge the password limitation"

### API Response Conditions

**Condition:** Valid JWT token returned from auth

- **Where:** After auth endpoint responds
- **Validation Rules:**
  - Token is non-empty string
  - Token format matches JWT pattern
- **Impact:** Store token in session storage, proceed to fetch profile
- **User Feedback:** None (transparent to user)

**Condition:** Profile fetch successful

- **Where:** After token obtained
- **Validation Rules:**
  - API returns 200 OK
  - Response contains user id, email, etc.
- **Impact:** Store user profile in app state, proceed to workspace fetch
- **User Feedback:** None (transparent to user)

**Condition:** Workspace fetch successful

- **Where:** After profile fetch
- **Validation Rules:**
  - API returns 200 OK with array of workspaces
  - At least one workspace exists (auto-created during registration)
- **Impact:** Store workspace data, redirect to `/app`
- **User Feedback:** None (transparent to user)

**Condition:** Token is valid for subsequent requests

- **Where:** When making API calls (profile, workspaces)
- **Validation Rules:**
  - Token not expired
  - Token format valid
- **Impact:** API calls succeed with user data
- **User Feedback:** None on success; error message if expired/invalid

---

## 10. Error Handling

### Client-Side Validation Errors

**Invalid Email Format**

- **Trigger:** User enters invalid email format
- **Display:** Error message below email field in red
- **Message:** "Please enter a valid email address"
- **Resolution:** User corrects email format

**Empty Email Field**

- **Trigger:** User tries to submit with empty email
- **Display:** Error message below email field
- **Message:** "Email is required"
- **Resolution:** User enters email

**Empty Password Field**

- **Trigger:** User tries to submit with empty password
- **Display:** Error message below password field
- **Message:** "Password is required"
- **Resolution:** User enters password

**Password Too Short**

- **Trigger:** User enters password shorter than 8 characters
- **Display:** Error message below password field
- **Message:** "Password must be at least 8 characters long"
- **Resolution:** User enters longer password

**Passwords Don't Match (Registration)**

- **Trigger:** Password and confirm password fields don't match
- **Display:** Error message below confirm password field
- **Message:** "Passwords do not match"
- **Resolution:** User updates confirm password field to match

**Agreement Not Checked (Registration)**

- **Trigger:** User tries to submit without checking password limitation acknowledgment
- **Display:** Error message or visual highlight on checkbox
- **Message:** "You must acknowledge that password recovery is not available in this version"
- **Resolution:** User checks the checkbox

### Server-Side Authentication Errors

**Invalid Email or Password (Login)**

- **Trigger:** Supabase Auth returns invalid credentials error
- **Display:** Global error banner at top of form
- **Message:** "Invalid email or password"
- **Resolution:** User re-enters credentials or uses registration to create account
- **Error Code:** `invalid_credentials`

**Email Already Registered (Registration)**

- **Trigger:** Supabase Auth returns email exists error
- **Display:** Global error banner
- **Message:** "Email already registered. Please log in or use a different email."
- **Resolution:** User logs in with existing account or uses different email
- **Error Code:** `email_exists`

**Weak Password (Registration)**

- **Trigger:** Password doesn't meet Supabase Auth requirements
- **Display:** Global error banner
- **Message:** "Password is too weak. Please use a stronger password."
- **Resolution:** User increases password complexity
- **Error Code:** `weak_password`

**Invalid Email Format (Server)**

- **Trigger:** Email format validation fails server-side
- **Display:** Global error banner
- **Message:** "Please enter a valid email address"
- **Resolution:** User corrects email format
- **Error Code:** `invalid_email_format`

### Network and Server Errors

**Network Timeout**

- **Trigger:** Request takes longer than timeout threshold (e.g., 30 seconds)
- **Display:** Global error banner
- **Message:** "Connection timeout. Please check your internet and try again."
- **Resolution:** User retries submission

**Connection Error**

- **Trigger:** Network request fails (no internet, server unreachable)
- **Display:** Global error banner
- **Message:** "Unable to connect to the server. Please check your internet connection."
- **Resolution:** User checks connection and retries

**Server Error (500)**

- **Trigger:** Backend returns 500 Internal Server Error
- **Display:** Global error banner
- **Message:** "An unexpected error occurred. Please try again later."
- **Resolution:** User retries after some time, or contacts support

**Workspace Creation Failed (Registration)**

- **Trigger:** After successful auth, workspace creation fails
- **Display:** Global error banner
- **Message:** "Successfully registered but unable to create workspace. Please try again."
- **Resolution:** User retries, or workspace is created automatically on next login

### Error Recovery

**Form Clearing:**

- Error messages remain until user corrects field or submits again
- Form values are preserved (not cleared on error) to allow user to fix issues
- Global error banner can be dismissed by user

**Retry Logic:**

- User can retry submission immediately (no minimum wait)
- Error state cleared when user modifies form fields
- Global error banner remains visible until dismissed or new submission

**Session Recovery:**

- If session expires during use, redirect to login
- Store attempted action to retry after re-authentication
- Display informational message: "Your session expired. Please log in again."

---

## 11. Implementation Steps

### Phase 1: Setup and Foundation

1. **Create Astro page structure**
   - Create `src/pages/auth/index.astro`
   - Set up layout with `export const prerender = false`
   - Import necessary dependencies (React components, types)
   - Configure View Transitions for smooth navigation

2. **Create custom hooks** (`src/components/hooks/`)
   - `useAuthForm.ts` - Handles auth submission logic
   - `usePasswordStrength.ts` - Evaluates password strength
   - `useFormValidation.ts` - Centralizes validation logic

3. **Create Nano Stores** (`src/lib/stores/`)
   - `auth.store.ts` - Global authentication state
   - Export auth state atom and action functions

4. **Set up TypeScript types** (`src/types.ts`)
   - Add all authentication-specific types
   - Export from centralized location

### Phase 2: Core Components

5. **Build shared form components** (`src/components/`)
   - `FormInput.tsx` - Reusable input with validation display
   - `ErrorBanner.tsx` - Global error message display
   - `PasswordStrengthIndicator.tsx` - Password strength feedback

6. **Build authentication layout** (`src/components/`)
   - `AuthLayout.tsx` - Main container component
   - `AuthCard.tsx` - Card wrapper with tab switcher
   - Set up responsive styling with Tailwind 4

7. **Build login form** (`src/components/`)
   - `LoginForm.tsx` - Complete login form with validation
   - Integrate FormInput component
   - Handle form submission via useAuthForm hook
   - Display loading state and errors

8. **Build registration form** (`src/components/`)
   - `RegistrationForm.tsx` - Complete registration form
   - Integrate FormInput and PasswordStrengthIndicator components
   - Implement password confirmation validation
   - Add agreement checkbox with MVP notice

### Phase 3: Integration and Logic

9. **Implement form submission logic**
   - Connect LoginForm to Supabase Auth signIn
   - Connect RegistrationForm to Supabase Auth signUp
   - Handle token storage in session storage
   - Implement workspace auto-creation after registration

10. **Implement profile and workspace fetching**
    - After successful auth, call `GET /api/profiles/me`
    - After successful auth, call `GET /api/workspaces`
    - Store results in auth store
    - Handle fetch errors appropriately

11. **Implement navigation logic**
    - Redirect to `/app` on successful authentication
    - Redirect unauthenticated users from `/app` to `/login`
    - Update middleware to check authentication
    - Handle redirect after logout

12. **Implement form tab switching**
    - Handle login/register tab clicks
    - Clear form state when switching tabs
    - Maintain validation rules per form

### Phase 4: Testing and Polish

13. **Test client-side validation**
    - Email format validation
    - Password requirements validation
    - Form submission enabling/disabling
    - Error message display

14. **Test API integration**
    - Login flow (email + password)
    - Registration flow (email + password + confirmation)
    - Workspace auto-creation
    - Profile fetching
    - Error handling

15. **Test error scenarios**
    - Invalid credentials
    - Duplicate email
    - Network errors
    - Server errors
    - Session expiration

16. **Test accessibility**
    - Keyboard navigation (Tab, Enter, Escape)
    - Screen reader compatibility
    - Form label associations
    - ARIA attributes

17. **Test responsive design**
    - Desktop view (primary focus)
    - Mobile responsiveness (informational)
    - Touch interactions on mobile

18. **Polish UI/UX**
    - Loading state indicators
    - Error message clarity
    - Form field feedback
    - Password strength visualization
    - Button states (disabled, loading, enabled)

### Phase 5: Documentation and Cleanup

19. **Document component APIs**
    - JSDoc comments on all components
    - Document props and their types
    - Document expected behavior

20. **Test with Linting**
    - Run `npm run lint`
    - Fix any ESLint or formatting issues
    - Ensure TypeScript compilation succeeds

21. **Manual QA**
    - Create new account from scratch
    - Log in with created account
    - Test logout
    - Verify session persistence
    - Test error scenarios

22. **Code review preparation**
    - Ensure code follows project conventions
    - Remove console.logs and debug code
    - Verify all error handling is in place
    - Check for accessibility compliance

---

## Implementation Checklist

### Components

- [ ] AuthPage.astro
- [ ] AuthLayout.tsx
- [ ] AuthCard.tsx
- [ ] LoginForm.tsx
- [ ] RegistrationForm.tsx
- [ ] PasswordStrengthIndicator.tsx
- [ ] FormInput.tsx
- [ ] ErrorBanner.tsx

### Custom Hooks

- [ ] useAuthForm.ts
- [ ] usePasswordStrength.ts
- [ ] useFormValidation.ts

### State Management

- [ ] auth.store.ts (Nano Stores)
- [ ] Auth state actions

### Types

- [ ] LoginFormData
- [ ] RegistrationFormData
- [ ] AuthSuccessData
- [ ] PasswordStrengthResult
- [ ] FormValidationState
- [ ] AuthState

### API Integration

- [ ] Supabase Auth signIn
- [ ] Supabase Auth signUp
- [ ] GET /api/profiles/me integration
- [ ] POST /api/workspaces integration
- [ ] GET /api/workspaces integration
- [ ] Error handling for all endpoints

### Middleware

- [ ] Auth check middleware
- [ ] Redirect unauthenticated users
- [ ] Session restoration on page load

### Testing

- [ ] Client-side validation tests
- [ ] API integration tests
- [ ] Error scenario tests
- [ ] Accessibility tests
- [ ] Responsive design tests

### Styling

- [ ] Tailwind 4 styling
- [ ] Dark mode support (if applicable)
- [ ] Responsive design
- [ ] Form field styling
- [ ] Error message styling
- [ ] Loading state styling
