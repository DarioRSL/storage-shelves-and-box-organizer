# Product Requirements Document (PRD) - Storage & Box Organizer

**Version:** 1.0 (MVP)
**Date:** 2025-11-30
**Status:** Approved for Implementation

## 1. Introduction

### 1.1 Problem Statement
Households and small businesses struggle with managing items stored in boxes, basements, garages, and storage units. Users often forget what is inside a specific box without opening it, leading to wasted time searching ("where are the Christmas ornaments?", "which box has the 2020 documents?").

### 1.2 Product Goal
Create a web application (PWA) that enables cataloging box contents and assigning them to locations using QR codes. The system allows for quick item retrieval via a search engine or by scanning a box's QR code to view its contents without physical opening.

---

## 2. Target Audience and Personas

### 2.1 Primary Persona: "Home Organizer"
- **Goal:** Wants to organize the basement/attic and quickly find seasonal items.
- **Pain Point:** Has to open 10 boxes to find one specific item.
- **Devices:** Smartphone (during organizing), Laptop (planning/management).

### 2.2 Secondary Persona: "Small Business / Warehouse Keeper"
- **Goal:** Tracking document archives or rarely used equipment.
- **Requirements:** Potential for shared access (future consideration).

---

## 3. MVP Scope (Minimum Viable Product)

### 3.1 Key Features
1.  **Account & Organization System (Workspace):**
    *   Registration/Login (Google Auth, Apple Auth, Basic Login/Password - no recovery in MVP).
    *   Automatic creation of a private Workspace for each user.
2.  **Storage Structure Management:**
    *   Define hierarchical locations (e.g., Basement > Rack A > Shelf 1).
    *   Depth limit: up to 5 levels.
    *   Full path visibility (breadcrumbs) during browsing.
3.  **Box Management:**
    *   Create boxes with unique IDs.
    *   Edit name, description (limit ~10000 chars), and tags.
    *   Assign box to a location (or "Unassigned" status).
    *   "Soft Delete" handling - deleting a location moves boxes to "Unassigned".
4.  **QR Code System:**
    *   Generate QR codes in-app (single or batch to PDF/image for printing).
    *   Code structure: URL directing to specific resource (e.g., `app.domain.com/box/{uuid}`).
    *   Label content: QR Code, Short Identifier (e.g., `X7K-9P2`) readable by humans, space for custom user text.
    *   Workflow support: "Print empty codes -> Stick -> Scan -> Assign content".
5.  **Search & Scanning:**
    *   Scan using native phone camera app (redirects to browser).
    *   "Live" search (real-time filtering): by name, description, tags, location.

### 3.2 Out of Scope for MVP
*   Offline Mode (requires internet access).
*   Add photo of contents to box.
*   Dedicated mobile app (Web/PWA only).
*   Email sending (verification, password reset) - "lost password = lost account" for basic auth (unless OAuth used).
*   Advanced permissions and sharing (DB structure prepared, but feature disabled in UI).
*   Payments and subscriptions.

---

## 4. Technical Requirements

### 4.1 Tech Stack
*   **Frontend:** Astro 5, React 19, Tailwind CSS 4, Shadcn/ui.
*   **Backend:** Astro (SSR API routes) or Supabase Edge Functions.
*   **Database / Auth:** Supabase (PostgreSQL).
*   **Hosting:** Vercel (Recommended) or VPS.

### 4.2 Non-Functional Requirements
*   **RWD:** "Mobile-First" interface for scanning/editing views; Desktop for structure management.
*   **Language:** Code and DB in English. User Interface: Polish (for MVP).
*   **Design:** Dark Mode support.
*   **Performance:** Image optimization (client-side compression before upload).

### 4.3 Data Model (Simplified)
*   `profiles` (id, user_id, email, ...)
*   `workspaces` (id, owner_id, name)
*   `locations` (id, workspace_id, parent_id, name, type)
*   `boxes` (id, workspace_id, location_id, name, description, tags, photo_url, qr_uuid, short_id)

---

## 5. User Stories (Examples)

1.  **US-01 Label Generation:** *As a user, I want to generate a sheet of 20 empty QR codes so I can print them and take them to the basement before starting to organize.*
2.  **US-02 Adding a Box:** *As a user, after scanning an empty QR code with my phone, I want to be automatically redirected to the "New Box" form with the ID pre-filled, so I can quickly add a description.*
3.  **US-03 Finding Items:** *As a user, I want to type "Christmas lights" into the search bar and immediately see which box and on which shelf they are located.*
4.  **US-04 Moving Items:** *As a user, I want to change a box's location in the system by selecting a new shelf from a list when I physically move it.*

---

## 6. Schedule and Milestones

1.  **Setup & Auth:** Repository setup, Supabase, Vercel, Login.
2.  **Core Logic:** CRUD for Locations and Boxes.
3.  **QR System:** PDF generation, QR code link handling.
4.  **UI/UX Polish:** Search, RWD, Dark Mode, Photo upload.
5.  **Testing & Launch:** Mobile device testing, Production deployment.

