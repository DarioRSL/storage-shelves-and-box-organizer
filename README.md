# Storage & Box Organizer

![Astro](https://img.shields.io/badge/astro-5.13.7-orange?style=flat&logo=astro)
![React](https://img.shields.io/badge/react-19.1.1-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue?style=flat&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-4.1-38b2ac?style=flat&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/supabase-backend-green?style=flat&logo=supabase)

**Storage & Box Organizer** is a Progressive Web App (PWA) designed to help home users and small businesses manage items stored in boxes. It solves the common problem of forgetting box contents by utilizing a QR code system. Users can print labels, scan them with their phone, and digitally manage contents, locations, and search for items without physically opening boxes.

## Table of Contents

- [Storage \& Box Organizer](#storage--box-organizer)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Getting Started Locally](#getting-started-locally)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Available Scripts](#available-scripts)
  - [Project Scope](#project-scope)
    - [In Scope (MVP)](#in-scope-mvp)
    - [Out of Scope](#out-of-scope)
  - [Project Status](#project-status)
  - [License](#license)

## Features

- **QR Code System:** Batch generate QR labels for printing and scan to view/edit box contents.
- **Hierarchical Structure:** Manage storage locations up to 5 levels deep (e.g., Garage > Metal Rack > Top Shelf).
- **Box Management:** Assign descriptions, tags, and locations to boxes.
- **Live Search:** Instantly find items by name, tag, or description.
- **Authentication:** Secure login via Google Auth, Apple Auth, or email (powered by Supabase).
- **Mobile First:** Optimized for mobile scanning and management.

## Tech Stack

**Frontend:**

- **Framework:** Astro 5 (SSR with `@astrojs/node`)
- **UI Library:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 & Shadcn/ui
- **State Management:** Nano Stores
- **QR Generation:** react-qr-code / qrcode.react

**Backend:**

- **BaaS:** Supabase (PostgreSQL, Auth, Row Level Security, Realtime)

**DevOps & Infrastructure:**

- **Hosting:** DigitalOcean
- **CI/CD:** GitHub Actions
- **Linting/Formatting:** ESLint, Prettier, Husky, Lint-staged

## Getting Started Locally

Follow these steps to set up the project locally.

### Prerequisites

- **Node.js:** Version `22.14.0` (as specified in `.nvmrc`).
- **NPM:** Installed with Node.js.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd storage-shelves-and-box-organizer
    ```

2.  **Use the correct Node version:**

    ```bash
    nvm use
    ```

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Environment Setup:**
    Create a `.env` file in the root directory. You will need to connect a Supabase project.

    ```bash
    cp .env.example .env
    ```

    _Note: Ensure you add your `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`._

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Available Scripts

In the project directory, you can run:

| Script             | Description                                               |
| :----------------- | :-------------------------------------------------------- |
| `npm run dev`      | Starts the local development server.                      |
| `npm run build`    | Builds the production-ready app to the `dist/` directory. |
| `npm run preview`  | Previews the built application locally.                   |
| `npm run lint`     | Runs ESLint to check for code quality issues.             |
| `npm run lint:fix` | Runs ESLint and automatically fixes fixable issues.       |
| `npm run format`   | Formats code using Prettier.                              |

## Project Scope

### In Scope (MVP)

- Web Application / PWA accessible via browser.
- Internet connection requirement.
- Polish language interface.
- Dark Mode support.
- Hierarchical location management.
- Box CRUD operations and QR code linkage.
- Data export (CSV/Excel).

### Out of Scope

- Offline mode.
- Photo uploads for box contents (MVP limitation).
- Native mobile applications (iOS/Android store apps).
- Advanced permission management (sharing accounts).

## Project Status

🚧 **Status: In Development (MVP Phase)**

This project is currently being developed according to the MVP (Minimum Viable Product) specifications. Features are being implemented iteratively.

## License

[MIT](https://choosealicense.com/licenses/mit/)
