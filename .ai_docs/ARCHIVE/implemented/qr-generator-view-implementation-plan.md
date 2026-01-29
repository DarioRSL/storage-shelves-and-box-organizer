# QR Code Generator View - Implementation Plan

## 1. Overview

The **QR Code Generator** view (`/app/qr-generator`) enables users to generate a sheet of QR codes ready for printing. The user specifies the number of codes (1-100), and the application:

1. Generates a batch of QR codes on the backend (POST /api/qr-codes/batch)
2. Generates a printable PDF file with labels (QR code + text ID) on the client
3. Enables the user to download the file

This view is a key part of the MVP (US-005) and supports the box cataloging process using QR codes.

## 2. View Routing

- **Path**: `/app/qr-generator`
- **Component Type**: Astro page with React component
- **File Location**: `src/pages/app/qr-generator.astro`
- **React Component**: `src/components/qr-generator/QRGeneratorView.tsx`
- **Authentication Required**: YES (current user must be logged in)
- **Workspace Required**: YES (current workspace must be available)

## 3. Component Structure

```
QRGeneratorView (React, main container)
├── Header / PageTitle (static, Astro or React)
├── InstructionsPanel (React)
│   └── Static content with instructions
├── QRGeneratorForm (React)
│   ├── NumberInput (React)
│   │   ├── label HTML
│   │   ├── input[type="number"]
│   │   └── validation error message
│   ├── GenerateButton (React)
│   │   ├── button HTML
│   │   └── loading spinner (conditional)
│   └── validation error summary (conditional)
├── LoadingState (React, conditional render)
│   ├── spinner/loader animation
│   └── loading message text
└── ErrorAlert (React, conditional render)
    ├── alert container
    ├── error icon
    ├── error message
    └── dismiss button
```

## 4. Component Details

### QRGeneratorView

**Description**: Main container of the view, manages all state and logic for QR code generation and PDF creation. Responsible for coordinating between the form and API, error handling, and managing loading states.

**Key Elements**:

- Container div (main wrapper with styling)
- Header with view title
- InstructionsPanel (instructions for user)
- QRGeneratorForm (generation form)
- LoadingState (overlay during generation)
- ErrorAlert (error display)

**Supported Interactions**:

- onGenerateQRCodes(quantity: number) - trigger generation
- onDismissError() - close error alert
- Automatic PDF generation and download on success

**Validation**:

- workspace_id available from Nano Store
- user logged in (from auth context)
- quantity between 1-100 (delegated to form)

**Types**:

- `BatchGenerateQrCodesRequest` (from types.ts)
- `BatchGenerateQrCodesResponse` (from types.ts)
- `QRGeneratorViewModel` (custom, for state management)

**Props**: No props (top-level component), all data from context/stores

### QRGeneratorForm

**Description**: Interactive form to specify the number of codes to generate. Manages quantity value and validation, delegates generation to parent component.

**Key Elements**:

- Form HTML element
- NumberInput component (for input)
- GenerateButton component (button)
- Conditional error message display
- Optional helper text / description

**Supported Interactions**:

- onChange on NumberInput (updates quantity state)
- onSubmit on form (triggers parent's onGenerateQRCodes)
- Keyboard support (Enter to submit)

**Validation**:

- quantity >= 1
- quantity <= 100
- quantity is valid number
- Disable form when parent isLoading = true
- Disable button when validation fails

**Types**:

- `GenerateQRCodesFormState` (local component state model)

**Props**:

- `onSubmit: (quantity: number) => Promise<void>` - callback for generation
- `isLoading: boolean` - whether API call is in progress
- `error: string | null` - error message from parent

### NumberInput

**Description**: Input field for entering the number of codes. Enforces constraints (1-100) and shows validation feedback.

**Key Elements**:

- label HTML element
- input[type="number"] element
- Error message container (conditional)
- Helper text (optional, shows min/max)

**Supported Interactions**:

- onChange - parses value, validates, calls parent onChange
- onBlur - optional: trigger validation display
- Keyboard: arrows increase/decrease, enter submits form

**Validation**:

- min="1" attribute on HTML input
- max="100" attribute on HTML input
- step="1" attribute (integers only)
- Custom validation: show error if value < 1 or > 100
- Show error if value is not a valid number

**Types**: No custom types

**Props**:

- `value: number` - current value
- `onChange: (value: number) => void` - value change callback
- `onBlur?: () => void` - optional blur callback
- `disabled?: boolean` - disable input when loading
- `error?: string` - validation error message
- `min?: number = 1` - minimum value (default 1)
- `max?: number = 100` - maximum value (default 100)

### GenerateButton

**Description**: Button to trigger code generation. Shows loading state and handles disabled state.

**Key Elements**:

- button HTML element
- Button text ("Generate and Download PDF" or "Generating...")
- Loading spinner/loader (conditional, when isLoading=true)
- Tooltip/aria-label with instruction

**Supported Interactions**:

- onClick - calls parent onSubmit
- Disabled state when isLoading or quantity invalid

**Validation**:

- disabled={isLoading || !isFormValid}
- aria-busy={isLoading} for accessibility

**Types**: No custom types

**Props**:

- `onClick: () => void` - click callback
- `isLoading?: boolean = false` - showing loading state
- `disabled?: boolean = false` - is button disabled
- `label?: string = "Generate and Download PDF"` - button text

### InstructionsPanel

**Description**: Static panel with instructions and information for the user. Explains the generation process and what will happen after clicking the button.

**Key Elements**:

- Container div with styling (background color, border, padding)
- Title/heading
- Instruction text (paragraphs and list)
- Information callout (max quantity, expected time, etc.)

**Supported Interactions**: None (static content)

**Validation**: None

**Types**: No custom types

**Props**: No props

**Instructions Content**:

```
Title: "How to Generate QR Codes"

1. Specify the number of codes to generate (1-100)
2. Click the "Generate and Download PDF" button
3. Wait for the sheet to be generated
4. The PDF file will download automatically
5. Print the sheet on your home printer (A4 format)
6. Cut out the labels and attach them to boxes

Information: Each code is unique and can be assigned to a box.
Limit: Maximum 100 codes at once.
```

### LoadingState

**Description**: Fullscreen overlay or modal shown during code generation and PDF creation. Provides visual feedback that the operation is in progress.

**Key Elements**:

- Semi-transparent backdrop/overlay
- Centered content container
- Spinner/loader animation (SVG or CSS animation)
- Loading message text
- Optional progress indicator (how many codes generated)

**Supported Interactions**: None (user cannot do anything during loading)

**Validation**: None

**Types**: No custom types

**Props**:

- `message?: string = "Generating QR codes and creating PDF..."` - Loading message
- `visible?: boolean = true` - Show/hide overlay
- `progress?: number` - Optional: percentage progress (0-100)

### ErrorAlert

**Description**: Alert component for displaying error messages from API or client-side errors. Includes dismiss button and optionally technical details.

**Key Elements**:

- Alert container div (styled as error state)
- Error icon
- Error title/heading
- Error message text
- Dismiss/close button (X icon)
- Optional details/technical info (collapsed)

**Supported Interactions**:

- onClick dismiss button - calls parent onDismiss
- Optional: click alert background to dismiss

**Validation**: None

**Types**: No custom types

**Props**:

- `error: string` - Error message to display
- `onDismiss: () => void` - Callback on dismiss
- `title?: string = "Error"` - Error title
- `details?: string` - Optional technical details
- `role?: string = "alert"` - ARIA role

## 5. Types

### Existing Types from types.ts (used as-is)

```typescript
// Batch generation request
interface BatchGenerateQrCodesRequest {
  workspace_id: string;
  quantity: number;
}

// Batch generation response
interface BatchGenerateQrCodesResponse {
  data: {
    id: string;
    short_id: string;
    status: QrStatus; // "generated" | "printed" | "assigned"
    workspace_id: string;
    created_at: string | null;
  }[];
}

// Validation rules
const ValidationRules = {
  qrCodes: {
    MIN_BATCH_QUANTITY: 1,
    MAX_BATCH_QUANTITY: 100,
  },
} as const;
```

### New Types for QR Generator View

```typescript
/**
 * ViewModel for QRGeneratorView
 * Represents the entire view state
 */
interface QRGeneratorViewModel {
  // Form state
  quantity: number;
  isQuantityValid: boolean;

  // API/loading state
  isLoading: boolean;
  error: string | null;

  // Generated codes (for reuse/cache)
  lastGeneratedCodes: QrCodeGeneratedItem[];

  // Context
  workspaceId: string;
  userId: string;
}

/**
 * Item in response from /api/qr-codes/batch
 * Represents a single generated QR code
 */
interface QrCodeGeneratedItem {
  id: string;
  short_id: string;
  status: "generated";
  workspace_id: string;
  created_at: string | null;
}

/**
 * State for QRGeneratorForm component
 * Local UI state of the form
 */
interface GenerateQRCodesFormState {
  // Form field
  quantity: number;

  // Validation state
  isQuantityValid: boolean;
  quantityError: string | null;
  isDirty: boolean;

  // Touch state (user interaction)
  touched: {
    quantity: boolean;
  };
}

/**
 * Props for NumberInput component
 */
interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  min?: number;
  max?: number;
  label?: string;
  helpText?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Props for GenerateButton component
 */
interface GenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  ariaBusy?: boolean;
}

/**
 * Props for LoadingState component
 */
interface LoadingStateProps {
  visible?: boolean;
  message?: string;
  progress?: number;
  ariaLive?: "polite" | "assertive";
}

/**
 * Props for ErrorAlert component
 */
interface ErrorAlertProps {
  error: string;
  onDismiss: () => void;
  title?: string;
  details?: string;
  role?: string; // "alert"
}

/**
 * Props for InstructionsPanel component
 */
interface InstructionsPanelProps {
  maxQuantity?: number;
}

/**
 * Props for QRGeneratorForm component
 */
interface QRGeneratorFormProps {
  onSubmit: (quantity: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  defaultQuantity?: number;
  maxQuantity?: number;
}

/**
 * Props for main QRGeneratorView component
 */
interface QRGeneratorViewProps {
  // Can be empty - takes from context
  // But define interface for future extensions
}
```

## 6. State Management

### Workspace and User Context

```typescript
// From Nano Stores (assuming existing stores)
import { workspaceStore } from "@/lib/stores/workspace.store";
import { userStore } from "@/lib/stores/user.store"; // or auth context

const currentWorkspace = useStore(workspaceStore);
const currentUser = useStore(userStore);
```

### QRGeneratorView - Local State

```typescript
const [quantity, setQuantity] = useState<number>(20); // Default 20 codes
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [lastGeneratedCodes, setLastGeneratedCodes] = useState<QrCodeGeneratedItem[]>([]);

// Derived state (computed)
const isQuantityValid = quantity >= 1 && quantity <= 100;
```

### QRGeneratorForm - Local State

```typescript
const [formState, setFormState] = useState<GenerateQRCodesFormState>({
  quantity: 20,
  isQuantityValid: true,
  quantityError: null,
  isDirty: false,
  touched: {
    quantity: false,
  },
});
```

### Custom Hook - useQRCodeGeneration

**Purpose**: Encapsulation of all API call + PDF generation logic

```typescript
/**
 * Hook for generating QR codes and downloading PDF
 */
function useQRCodeGeneration(workspaceId: string) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<QrCodeGeneratedItem[]>([]);

  const generateAndDownloadPDF = useCallback(
    async (quantity: number) => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Call API to generate QR codes
        const response = await fetch("/api/qr-codes/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaceId,
            quantity,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate QR codes");
        }

        const data: BatchGenerateQrCodesResponse = await response.json();
        setGeneratedCodes(data.data);

        // 2. Generate PDF with the codes
        await generatePDF(data.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("QR Code generation error:", err);
        throw err; // Re-throw for caller to handle
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    generatedCodes,
    generateAndDownloadPDF,
    clearError,
  };
}
```

### Custom Hook - usePDFGeneration

**Purpose**: Encapsulation of PDF generation logic from QR codes

```typescript
/**
 * Hook for generating and downloading PDF with QR codes
 * Creates an A4 PDF with labels (QR + text ID)
 */
function usePDFGeneration() {
  const generatePDF = useCallback(async (codes: QrCodeGeneratedItem[]) => {
    try {
      // Import dynamically to reduce bundle size
      const { jsPDF } = await import("jspdf");
      const QRCode = await import("qrcode");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // A4 dimensions: 210 x 297 mm
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const usableWidth = pageWidth - 2 * margin;

      // Layout: 4 columns x 5 rows = 20 codes per page
      const cols = 4;
      const rows = 5;
      const codeWidth = usableWidth / cols;
      const codeHeight = (pageHeight - 2 * margin) / rows;
      const qrSize = codeWidth * 0.7; // 70% of width
      const labelFontSize = 8;

      let pageNumber = 1;
      let codeIndex = 0;

      while (codeIndex < codes.length) {
        for (let row = 0; row < rows && codeIndex < codes.length; row++) {
          for (let col = 0; col < cols && codeIndex < codes.length; col++) {
            const code = codes[codeIndex];
            const x = margin + col * codeWidth + (codeWidth - qrSize) / 2;
            const y = margin + row * codeHeight + 5;

            // Generate QR code as data URL
            const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/app/qr-scanner?code=${code.short_id}`, {
              errorCorrectionLevel: "H",
              type: "image/png",
              width: 200,
            });

            // Add QR code image
            doc.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);

            // Add label text below QR code
            const labelY = y + qrSize + 2;
            doc.setFontSize(labelFontSize);
            doc.text(code.short_id, x + qrSize / 2, labelY, {
              align: "center",
            });

            codeIndex++;
          }
        }

        // Add new page if more codes to print
        if (codeIndex < codes.length) {
          doc.addPage();
        }
      }

      // Trigger download
      const filename = `qr-codes-${codes.length}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      throw new Error("Failed to generate PDF file");
    }
  }, []);

  return { generatePDF };
}
```

## 7. API Integration

### Endpoint: POST /api/qr-codes/batch

**Purpose**: Generate a batch of new QR codes in the database

**Request Type**:

```typescript
interface BatchGenerateQrCodesRequest {
  workspace_id: string; // UUID
  quantity: number; // 1-100
}
```

**Response Type**:

```typescript
interface BatchGenerateQrCodesResponse {
  data: Array<{
    id: string; // UUID
    short_id: string; // Format: QR-XXXXXX
    status: "generated";
    workspace_id: string;
    created_at: string | null; // ISO 8601 timestamp
  }>;
}
```

**Status Codes**:

- `201 Created` - Success, codes generated
- `400 Bad Request` - Invalid quantity (< 1 or > 100)
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not member of workspace
- `500 Internal Server Error` - Database error

**Implementation of call in component**:

```typescript
const response = await fetch("/api/qr-codes/batch", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    workspace_id: workspaceId,
    quantity: quantity,
  }),
});

if (!response.ok) {
  const errorData = await response.json();
  // errorData shape: { error: string }
  throw new Error(errorData.error);
}

const data: BatchGenerateQrCodesResponse = await response.json();
// data.data is array of generated codes
```

**Error Handling**:

```typescript
try {
  const data = await generateAndDownloadPDF(quantity);
  // Success handling
} catch (err) {
  if (err instanceof Error) {
    if (err.message.includes("No access")) {
      // Handle 403 - redirect or show permission error
    } else if (err.message.includes("Session expired")) {
      // Handle 401 - redirect to login
    } else {
      // Show generic error
      setError(err.message);
    }
  }
}
```

## 8. User Interactions

### Scenario 1: Happy Path - Successful Generation

1. **User opens `/app/qr-generator`**
   - Expected result:
     - View loads (page transition)
     - Shows header "Generate QR Codes"
     - InstructionsPanel visible
     - NumberInput shows default value 20
     - GenerateButton enabled
     - No error alert

2. **User reads instructions**
   - Expected result: Instructions clearly explain the process

3. **User changes value in NumberInput to 50**
   - Expected result:
     - Input shows "50"
     - isQuantityValid = true
     - GenerateButton remains enabled
     - No error message

4. **User clicks "Generate and Download PDF"**
   - Expected result:
     - Form submit triggered
     - GenerateButton changes to loading state (spinner, disabled)
     - NumberInput disabled
     - LoadingState appears (fullscreen)
     - POST request sent to /api/qr-codes/batch with quantity=50

5. **API returns 201 Created (success)**
   - Expected result:
     - Hook generates PDF with 50 QR codes
     - PDF downloads automatically
     - LoadingState disappears
     - GenerateButton returns to normal state
     - NumberInput enabled
     - Input value = 50 (may stay or reset)
     - Success message (optional)

### Scenario 2: User enters invalid quantity

1. **User types "0" in NumberInput**
   - Expected result:
     - isQuantityValid = false
     - Error message below input: "Number of codes must be at least 1"
     - GenerateButton disabled

2. **User types "150" in NumberInput**
   - Expected result:
     - isQuantityValid = false
     - Error message: "Number of codes cannot exceed 100"
     - GenerateButton disabled

3. **User changes to "50"**
   - Expected result:
     - isQuantityValid = true
     - Error message disappears
     - GenerateButton enabled

### Scenario 3: API error

1. **User clicks generate, API returns 403 (no permission)**
   - Expected result:
     - LoadingState disappears
     - GenerateButton enabled
     - ErrorAlert shows: "You do not have access to this workspace"
     - Error message disappears after clicking X

2. **User clicks generate, API returns 500**
   - Expected result:
     - LoadingState disappears
     - ErrorAlert shows: "Server error. Please try again later."
     - Form ready for retry

### Scenario 4: Network error

1. **User clicks generate, network fails**
   - Expected result:
     - LoadingState disappears after timeout
     - ErrorAlert shows: "Connection failed. Please try again."

### Scenario 5: User dismisses error and retries

1. **ErrorAlert visible with error message**
   - Expected result: Alert visible with dismiss button

2. **User clicks X on alert**
   - Expected result:
     - ErrorAlert disappears
     - error state = null
     - Form ready for new attempt

3. **User changes quantity and retries**
   - Expected result: New request sent, process repeats

## 9. Conditions and Validation

### Conditions from API Specification

| Condition                   | Verification Location  | Component           | How to Handle                            |
| --------------------------- | ---------------------- | ------------------- | ---------------------------------------- |
| `workspace_id` must be UUID | Frontend (context)     | QRGeneratorView     | Get from workspace store, handle if null |
| `quantity` >= 1             | Frontend               | NumberInput         | min="1" attribute, validation onChange   |
| `quantity` <= 100           | Frontend               | NumberInput         | max="100" attribute, validation onChange |
| `quantity` integer only     | Frontend               | NumberInput         | HTML input[type="number"], step="1"      |
| User authenticated          | Frontend (pre-route)   | Layout/middleware   | Check auth context before showing view   |
| User is workspace member    | Backend (API response) | useQRCodeGeneration | Handle 403 error, show error message     |

### Conditions from PRD

| Condition                 | Action                                            |
| ------------------------- | ------------------------------------------------- |
| Number of codes 1-100     | NumberInput validates, button disabled if invalid |
| PDF format A4             | usePDFGeneration generates A4 (210x297mm)         |
| Label: QR + ID            | PDF generator embeds QR image + short_id text     |
| Auto-download PDF         | Trigger download after successful PDF generation  |
| User instructions visible | InstructionsPanel shown at top of view            |

### Touch Points Where Conditions Meet UI

1. **Input validation (1-100)**
   - Where: NumberInput component onChange handler
   - State: isQuantityValid computed state
   - Effect: GenerateButton disabled if invalid, error message shown

2. **API request validation**
   - Where: useQRCodeGeneration hook (pre-request check)
   - Conditions: workspace_id not null, quantity valid
   - Effect: Log warning if condition fails, throw error

3. **API response validation**
   - Where: API response handling in useQRCodeGeneration
   - Conditions: response.ok, data.data is array
   - Effect: Show error if response has invalid structure

4. **PDF generation validation**
   - Where: usePDFGeneration hook try-catch
   - Conditions: codes array not empty, jsPDF library available
   - Effect: Throw error if generation fails

## 10. Error Handling

### API Errors

| Code | Cause                   | User-facing Message                         | Action                               |
| ---- | ----------------------- | ------------------------------------------- | ------------------------------------ |
| 400  | Invalid quantity        | "Number of codes must be between 1 and 100" | Highlight invalid input, enable form |
| 401  | Not authenticated       | "Session expired. Please log in again."     | Redirect to login                    |
| 403  | No workspace permission | "You do not have access to this workspace"  | Show error, suggest contact admin    |
| 500  | Server error            | "Server error. Please try again later."     | Show error, log to Sentry            |

### Client Errors

| Type                | Cause                  | User-facing Message                         | Action                          |
| ------------------- | ---------------------- | ------------------------------------------- | ------------------------------- |
| Network error       | Fetch failed           | "Connection failed. Please try again."      | Retry button in alert           |
| PDF generation fail | jsPDF/QRCode error     | "Failed to generate PDF. Please try again." | Show error, retry               |
| Missing workspace   | workspace store null   | "No active workspace found"                 | Redirect to workspace select    |
| Invalid data        | API response structure | "Failed to process server response"         | Log error, show generic message |

### Handling in Component

```typescript
try {
  await generateAndDownloadPDF(quantity);
  // Success: PDF downloaded, form ready for next batch
} catch (err) {
  // Catch all errors and set error state
  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError("Unknown error. Please try again.");
  }
  console.error("QR generation failed:", err);
}
```

### Edge Case Scenarios

1. **Empty response from API**
   - Handle: Check data.data is array, length > 0
   - User message: "Failed to generate codes. Please try again."

2. **Partial PDF generation**
   - Handle: All codes or nothing (transaction-like behavior)
   - User message: If some codes fail, show "Some codes generated" + retry

3. **User closes browser during generation**
   - Handle: Cleanup in useEffect return (abort fetch)
   - Result: Request cancelled, LoadingState eventually times out

4. **Very large batch (100 codes)**
   - Handle: Show progress indicator (optional)
   - User message: "Generating 100 codes... (this may take a moment)"

## 11. Implementation Steps

### Phase 1: Setup and File Structure

1. **Create file structure**

   ```
   src/pages/app/qr-generator.astro
   src/components/qr-generator/
   ├── QRGeneratorView.tsx
   ├── QRGeneratorForm.tsx
   ├── NumberInput.tsx
   ├── GenerateButton.tsx
   ├── InstructionsPanel.tsx
   ├── LoadingState.tsx
   ├── ErrorAlert.tsx
   └── hooks/
       ├── useQRCodeGeneration.ts
       └── usePDFGeneration.ts
   src/types/qr-generator.ts (optional: new type definitions)
   ```

2. **Add types to `src/types.ts`**
   - Add new interfaces: `QRGeneratorViewModel`, `QrCodeGeneratedItem`, `GenerateQRCodesFormState`
   - Export propTypes for each component

3. **Setup Astro page** (`src/pages/app/qr-generator.astro`)
   - Import QRGeneratorView React component
   - Set up layout and metadata
   - Ensure authentication redirect if not logged in

### Phase 2: Implementation of Custom Hooks

4. **Implement `useQRCodeGeneration` hook**
   - Setup fetch to `/api/qr-codes/batch`
   - Error handling with proper messages
   - State management for isLoading, error, generatedCodes
   - Return: isLoading, error, generatedCodes, generateAndDownloadPDF, clearError

5. **Implement `usePDFGeneration` hook**
   - Install dependencies: `jspdf`, `qrcode`
   - Implement PDF generation logic (A4 layout, 4x5 grid)
   - Generate QR code data URLs
   - Return: generatePDF function

### Phase 3: Implementation of Leaf Components (no state)

6. **Implement `NumberInput` component**
   - HTML input[type="number"] with min/max
   - onChange handler with validation
   - Error message display
   - Aria labels and accessibility

7. **Implement `GenerateButton` component**
   - Button HTML element
   - Conditional loading spinner
   - Disabled state handling
   - Aria-busy attribute

8. **Implement `InstructionsPanel` component**
   - Static content div
   - Instructions list
   - Information callout

9. **Implement `LoadingState` component**
   - Fullscreen overlay/modal
   - Spinner animation
   - Loading message
   - Aria-live region

10. **Implement `ErrorAlert` component**
    - Alert container styled
    - Error icon + message
    - Dismiss button
    - Aria-label role="alert"

### Phase 4: Implementation of Composite Components

11. **Implement `QRGeneratorForm` component**
    - Use NumberInput, GenerateButton
    - Local state: quantity, formState
    - Form submit handler
    - Error display
    - Validation logic

12. **Implement `QRGeneratorView` component**
    - Container with layout
    - Integrations: useQRCodeGeneration, usePDFGeneration
    - State: quantity, isLoading, error
    - Call hooks on form submit
    - Render: InstructionsPanel, QRGeneratorForm, LoadingState, ErrorAlert
    - Error dismiss handler

### Phase 5: Testing and Polish

13. **Test happy path**
    - Generate 20 codes
    - PDF downloads
    - Form resets or stays at value

14. **Test error scenarios**
    - Invalid quantity (0, 101)
    - API 403 error
    - API 500 error
    - Network error

15. **Test accessibility**
    - Keyboard navigation (Tab, Enter)
    - Screen reader announcements (aria-live)
    - Labels and descriptions
    - Color contrast

16. **Test performance**
    - Large batch (100 codes) - PDF generation time
    - Loading states smooth
    - No unnecessary re-renders

17. **Merge to main**
    - Create PR
    - Code review
    - Run CI/CD checks
    - Merge after approval
