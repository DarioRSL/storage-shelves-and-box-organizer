# Storage & Box Organizer

![Astro](https://img.shields.io/badge/astro-5.13.7-orange?style=flat&logo=astro)
![React](https://img.shields.io/badge/react-19.1.1-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue?style=flat&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-4.1-38b2ac?style=flat&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/supabase-backend-green?style=flat&logo=supabase)
![Node](https://img.shields.io/badge/node-22.14.0-green?style=flat&logo=node.js)
![MVP Status](https://img.shields.io/badge/MVP-100%25%20Complete-brightgreen?style=flat)

A Progressive Web App (PWA) for managing items stored in boxes using a QR code system. Users can generate QR labels, scan them with their phone, and digitally manage box contents, locations, and search for items without opening boxes physically.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

Storage & Box Organizer solves the common problem of not knowing what's inside storage boxes without physically opening them. Whether you're storing seasonal items, documents, or rarely used belongings in basements, garages, or attics, this application helps you:

- **Generate QR Labels** - Create printable QR code sheets to label your boxes
- **Scan & Catalog** - Scan a QR code with your phone's camera to view or add box contents
- **Organize Hierarchically** - Create up to 5 levels of location structure (e.g., Garage > Metal Rack > Top Shelf)
- **Search Instantly** - Find items with real-time full-text search across box names, descriptions, and tags
- **Manage Workspaces** - Multi-tenant workspace system with role-based access

### Key Features

| Feature | Description |
|---------|-------------|
| QR Code System | Generate batch QR codes, print labels, scan with phone camera |
| Hierarchical Locations | Up to 5 levels deep (Room > Rack > Shelf > Section > Area) |
| Full-Text Search | Live search across names, descriptions, tags, and locations |
| Multi-Tenant Workspaces | Isolated data with role-based access control |
| Desktop-First UI | Optimized for desktop with mobile QR scanning support |

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | Astro | 5.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Component Library | Shadcn/ui (Radix UI) | Latest |
| State Management | Nano Stores | Latest |
| Backend | Supabase (PostgreSQL + Auth) | Latest |
| Database | PostgreSQL with RLS | 15.x |
| Validation | Zod | Latest |
| Unit Testing | Vitest | 1.x |
| E2E Testing | Playwright | 1.x |
| API Testing | Supertest | Latest |

### Architecture Highlights

- **Server-Side Rendering (SSR)** via `@astrojs/node` adapter
- **HttpOnly Cookie-Based Sessions** for secure authentication
- **Row Level Security (RLS)** for database-level access control
- **PostgreSQL Extensions**: `uuid-ossp`, `ltree`, `moddatetime`

## Getting Started Locally

### Prerequisites

- Node.js 22.14.0 (use [nvm](https://github.com/nvm-sh/nvm) for version management)
- npm 10.x
- Supabase account (for database and authentication)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd storage-shelves-and-box-organizer
   ```

2. Set up the correct Node.js version:
   ```bash
   nvm use
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Fill in the required Supabase credentials in `.env`:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser at [http://localhost:3000](http://localhost:3000)

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at http://localhost:3000 |
| `npm run dev:remote` | Start dev server with remote test environment |
| `npm run dev:e2e` | Start dev server in test mode for E2E tests |

### Build & Preview

| Command | Description |
|---------|-------------|
| `npm run build` | Build for production to `dist/` |
| `npm run build:remote` | Build with remote test environment |
| `npm run preview` | Preview production build locally |
| `npm run preview:remote` | Preview with remote test environment |

### Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Check for code quality issues with ESLint |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test` | Run all unit/integration tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:watch` | Watch mode for TDD |
| `npm run test:ui` | Open Vitest UI |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:e2e` | Run E2E tests with Playwright |
| `npm run test:e2e:ui` | Open Playwright UI |
| `npm run test:e2e:headed` | Run E2E tests in headed mode |
| `npm run test:e2e:debug` | Debug E2E tests |
| `npm run test:all` | Run all tests (unit + integration + E2E) |

## Project Scope

### In Scope (MVP)

- Web application accessible via browser
- Internet connection required
- User interface in Polish
- Desktop-first design
- Email/password authentication
- Workspace and location management
- Box CRUD operations with name, description (up to 10,000 characters), and tags
- QR code generation and batch printing (PDF)
- Live search functionality
- Box filtering by location

### Post-MVP (Future Releases)

- Account deletion with GDPR compliance
- Export to CSV/Excel
- OAuth (Google, Apple Auth)
- Dark mode
- Full mobile optimization
- Password recovery via email
- Advanced sorting and filtering
- Drag & drop box organization
- Box templates

### Out of Scope

- Offline mode
- Photo attachments for boxes
- Native mobile applications (iOS/Android)
- Email notifications
- Advanced permission management
- Payment/subscription features
- Activity history logs

## Project Status

| Category | Status | Details |
|----------|--------|---------|
| **MVP Stories** | 100% Complete | 24/24 user stories implemented |
| **Post-MVP Stories** | In Progress | 10 stories deferred to future releases |
| **Total Completion** | 71% | 25/35 total stories implemented |

### MVP Features Completed

- Email/Password authentication
- Workspace and location management
- Box management (create, read, update, delete)
- QR code generation (desktop)
- Live search functionality
- Box filtering by location
- Desktop-first UI design

## License

[MIT](https://choosealicense.com/licenses/mit/)

---

For additional documentation, see:

- [CLAUDE.md](CLAUDE.md) - Development guidelines and project overview
- [.ai_docs/deployment.md](.ai_docs/deployment.md) - Deployment & environment documentation
- [.ai_docs/prd.md](.ai_docs/prd.md) - Product requirements document
- [.ai_docs/tech-stack.md](.ai_docs/tech-stack.md) - Detailed technology stack
- [.ai_docs/api-plan.md](.ai_docs/api-plan.md) - API specification
- [.ai_docs/db-plan.md](.ai_docs/db-plan.md) - Database schema documentation