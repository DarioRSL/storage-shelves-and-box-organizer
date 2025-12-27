# UI Architecture for Storage & Box Organizer

## 1. UI Structure Overview

The User Interface (UI) architecture for the "Storage & Box Organizer" application is designed as a responsive Progressive Web App (PWA) with a "Mobile-First" approach. The goal is to provide an intuitive and fast experience for key operations (browsing, adding boxes) on mobile devices, while offering advanced tools for structure management on desktop devices.

The structure is based on several main views: a central **Dashboard** for searching and browsing, **details** and **form** views for data management, and dedicated pages for special features like the **QR Code Generator** and **Account Settings**. Navigation is simple and contextual, using a persistent navigation bar and elements like breadcrumbs for orientation within the hierarchy.

Application state management will be handled globally (using `Nano Stores`), and communication with the backend will be handled asynchronously, with clear signaling of loading and error states, ensuring a smooth and predictable user experience.

## 2. View List

### Login / Registration View
- **View Name**: Login / Registration
- **View Path**: `/login`, `/register`
- **Main Purpose**: To authenticate the user or create a new account.
- **Key Information to Display**: Forms with fields for email and password.
- **Key View Components**:
    - Login/Registration form.
    - Links to switch between login and registration.
    - In the registration form: a checkbox with information about the inability to recover the password in the MVP version.
- **UX, Accessibility, and Security Considerations**:
    - **UX**: Clear validation error messages (e.g., "Invalid email format").
    - **Accessibility**: Correct labels for form fields, support for keyboard navigation.
    - **Security**: Form data submission via HTTPS.

### Main Dashboard
- **View Name**: Main Dashboard
- **View Path**: `/app`
- **Main Purpose**: To browse, search, and manage locations and boxes. The central navigation point of the application.
- **Key Information to Display**:
    - "Live Search" search bar.
    - Hierarchical location structure (tree view on desktop, "drill-down" navigation on mobile).
    - List of boxes (filtered by the selected location or search results).
    - "Empty states" with call-to-action (CTA) buttons for new users.
- **Key View Components**:
    - `SearchInput`: A search field with "debounce" logic.
    - `LocationTree`: An interactive location tree with a context menu (add, edit, delete).
    - `BoxList`: A virtualized list of boxes with `SkeletonLoader` components for loading states.
    - `EmptyState`: A welcome component for new users.
- **UX, Accessibility, and Security Considerations**:
    - **UX**: A responsive layout that adapts to the screen size (two columns vs. one). Instant search results improve workflow speed.
    - **Accessibility**: The location tree must be fully accessible via keyboard and for screen readers (ARIA attributes).
    - **Security**: All data is fetched within the context of the logged-in user and their `workspace_id` (enforced by RLS in the API).

### Box Details View
- **View Name**: Box Details
- **View Path**: `/app/boxes/[id]`
- **Main Purpose**: To display all information about a specific box.
- **Key Information to Display**:
    - Name, description, tags.
    - Full location path in the form of breadcrumbs (e.g., `Garage > Metal Shelf > Top Shelf`).
    - Associated QR code (if it exists).
- **Key View Components**:
    - `Breadcrumbs`: Breadcrumb navigation showing the location.
    - `TagList`: A list of tags.
    - Action buttons: "Edit" (navigates to the form view) and "Delete".
- **UX, Accessibility, and Security Considerations**:
    - **UX**: Clear presentation of all data. The "Delete" button should trigger a `ConfirmationDialog` to prevent accidental data loss.
    - **Accessibility**: All information presented as text to be accessible to screen readers. All action buttons should have clear labels.

### Box Form View (Create/Edit)
- **View Name**: Box Form
- **View Path**: `/app/boxes/new` (as a page or modal), `/app/boxes/[id]/edit` (as a page or modal)
- **Main Purpose**: To create a new box or modify an existing one.
- **Key Information to Display**: A form with fields for editing.
- **Key View Components**:
    - `Input`, `Textarea` for name and description.
    - `TagInput`: A "Combobox" type component for managing tags.
    - `LocationSelector`: A tree or dropdown list to select a location.
    - "Save" and "Cancel" buttons.
    - "Delete" button (visible only in edit mode), which triggers a confirmation modal.
- **UX, Accessibility, and Security Considerations**:
    - **UX**: Client-side and server-side form validation with clear error messages next to the fields. For the delete action, use a `ConfirmationDialog` to prevent accidental deletion.
    - **Accessibility**: All form fields must have associated labels.
    - **Security**: Server-side validation of input data to prevent malicious data injection. The delete action requires confirmation as it is a destructive operation.

### QR Code Generator View
- **View Name**: QR Code Generator
- **View Path**: `/app/qr-generator`
- **Main Purpose**: To allow the user to generate and download a printable sheet of QR codes.
- **Key Information to Display**:
    - A form to specify the number of codes.
    - Instructions for the user.
- **Key View Components**:
    - `NumberInput` for the number of codes (with a limit, e.g., up to 100).
    - "Generate and download PDF" button.
    - Loading state during file generation.
- **UX, Accessibility, and Security Considerations**:
    - **UX**: A simple, single-task interface. The user immediately knows what to do.
    - **Accessibility**: Accessibility of the form and buttons.

### Settings View
- **View Name**: Settings
- **View Path**: `/app/settings`
- **Main Purpose**: To manage account and application settings.
- **Key Information to Display**: Available configuration options.
- **Key View Components**:
    - **Workspace Management Section**:
        - `WorkspaceList`: A list of workspaces the user belongs to.
        - "Edit" button for each workspace (to change the name, opens a modal).
        - "Create New Workspace" button.
    - `ThemeToggle`: A switch for Light / Dark / System mode.
    - "Export data to CSV/Excel" button.
    - **Danger Zone Section**:
        - "Delete Workspace" button (visible if the user is the owner).
        - "Delete Account" button.
    - `ConfirmationDialog`: A modal to confirm account deletion, requiring the user to type text to unlock the action.
- **UX, Accessibility, and Security Considerations**:
    - **UX**: Grouping options into logical sections. Clear warnings before irreversible actions.
    - **Security**: Critical actions, like deleting a workspace or account, require extra confirmation (e.g., typing the name to confirm) to prevent accidental clicks.

## 3. User Journey Map

The main user workflow (from zero to finding an item) is as follows:

1.  **Registration and Login**: The user lands on the **Registration View**, creates an account, and logs in, landing on the **Main Dashboard**.
2.  **Onboarding**: On the dashboard, they see an "empty state" with a call to action.
3.  **Generating Labels**: They navigate to the **QR Generator View**, generate, and print a PDF with labels.
4.  **Creating Structure**: On the **Main Dashboard**, they create a location hierarchy (e.g., `Basement` -> `Shelf A`).
5.  **Scanning and Adding a Box**: The user scans a new label with their phone. They are redirected (via a page invisible to them, `/qr/[short_id]`) to the **Box Form View**.
6.  **Cataloging**: They fill in the box details (name, description, tags) and assign it to the previously created location. They save the changes.
7.  **Searching**: After some time, on the **Main Dashboard**, they use the search bar to find an item by a fragment of its description.
8.  **Finding and Verifying**: They click on the found box in the list, which takes them to the **Box Details View**, where they verify the contents and location.

## 4. Layout and Navigation Structure

Navigation is designed to be simple and consistent across different devices.

-   **Main Navigation**:
    -   **`WorkspaceSwitcher`**: A dropdown menu in the main navigation bar to display the current workspace and allow switching between available workspaces.
    -   **Desktop**: A vertical sidebar with links to: Dashboard, QR Generator, and Settings.
    -   **Mobile**: A Bottom Tab Bar with the same three main sections.
-   **Contextual Navigation**:
    -   **Breadcrumbs**: Displayed above lists and in detail views to show the current place in the location hierarchy.
    -   **"Back" Buttons**: A standard element in detail and form views, allowing a return to the previous screen.
-   **Modal Flows**: Actions like adding/editing locations or boxes can be performed in modal windows on the desktop to avoid losing the context of the dashboard view.

## 5. Key Components

Below is a list of key, reusable components that will form the foundation of the user interface:

-   **`SearchInput`**: A search field with built-in "debounce" logic to implement "Live Search" without excessively burdening the API.
-   **`LocationTree`**: An interactive tree component for displaying and managing the location hierarchy. It will support drag-and-drop operations in the future.
-   **`BoxList`**: A virtualized list for efficiently rendering a potentially large number of boxes.
-   **`TagInput`**: A component based on "Combobox" (`shadcn/ui`) that allows typing new tags and selecting existing ones from a list.
-   **`SkeletonLoader`**: A component that displays animated placeholders mimicking the content layout while it's loading, improving the perceived speed of the application.
-   **`Toast/Sonner`**: A global notification system to inform the user about the results of operations (e.g., "Box has been saved," "A network error occurred").
-   **`ConfirmationDialog`**: A reusable modal that forces the user to consciously confirm the execution of an irreversible action.
-   **`WorkspaceSwitcher`**: A dropdown component, placed in the navigation, for viewing and switching between the user's workspaces.
