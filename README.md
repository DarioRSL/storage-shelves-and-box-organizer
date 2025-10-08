# Shelves Organizer

A modern web application for cataloging and locating items stored in boxes within a hierarchical location system: building → room → rack → shelf. Each box can have descriptions, tags, public links, and QR codes for quick access without authentication.

[![Node.js Version](https://img.shields.io/badge/node-22.14.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Astro](https://img.shields.io/badge/Astro-5-orange.svg)](https://astro.build/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [Project Structure](#project-structure)
- [AI Development Support](#ai-development-support)
- [Contributing](#contributing)
- [License](#license)

## Project Description

**Shelves Organizer** is a comprehensive web application designed to solve the common problem of disorganized storage. It provides a systematic approach to cataloging, locating, and managing items stored in boxes across multiple locations.

### Key Features

- **📍 Hierarchical Location System**: Organize your storage with a four-level hierarchy (Building → Room → Rack → Shelf)
- **📦 Box Management**: Create, edit, and manage boxes with descriptions, tags, and location assignments
- **🏷️ Smart Tagging**: Use hashtags to categorize boxes (up to 10 tags per box, max 30 characters each)
- **📸 AI-Powered Categorization**: Upload photos and get automatic content suggestions using Vision Language Models via OpenRouter
- **🔗 Public Sharing**: Generate public links and QR codes for boxes, accessible without authentication
- **🔍 Advanced Search**: Filter and search boxes by location hierarchy and tags with pagination and sorting
- **👥 Role-Based Access**: Three user roles (Read-only, Full Access, Administrator) with granular permissions
- **📊 Admin Panel**: System logs for monitoring user activities and resource changes
- **🔐 Secure Authentication**: User registration with CAPTCHA protection via Supabase Auth

### Target Audience

- Households and DIY enthusiasts looking to organize their storage
- Small workshops and makerspaces needing inventory tracking
- Small-to-medium businesses (SMB) with basic warehouse needs (without complex WMS requirements)

### Value Proposition

Instantly find the right box through consistent hierarchy, tags, public QR codes, and a simple AI-assisted labeling process. No more wasted time searching through multiple storage areas!

## Tech Stack

### Frontend

- **[Astro v5.5.5](https://astro.build/)** - Modern web framework for building fast, optimized websites with minimal JavaScript
- **[React v19.0.0](https://react.dev/)** - Interactive UI components where needed
- **[TypeScript v5](https://www.typescriptlang.org/)** - Type-safe development with excellent IDE support
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework for rapid UI development
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible, customizable React component library

### Backend

- **[Supabase](https://supabase.com/)** - Complete backend-as-a-service solution
  - PostgreSQL database with Row Level Security (RLS)
  - Built-in authentication and authorization
  - Real-time capabilities
  - Open-source and self-hostable

### AI Integration

- **[OpenRouter.ai](https://openrouter.ai/)** - Gateway to multiple AI models
  - Access to OpenAI, Anthropic, Google, and other providers
  - Vision Language Models (VLM) for image analysis
  - Built-in API key spending limits
  - Cost-effective model selection

### Development Tools

- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files

### Deployment & CI/CD

- **GitHub Actions** - Automated CI/CD pipelines
- **DigitalOcean** - Production hosting via Docker containers

## Getting Started Locally

### Prerequisites

- **Node.js** v22.14.0 (use [nvm](https://github.com/nvm-sh/nvm) to install the correct version)
- **npm** (comes with Node.js)
- **Supabase account** (for backend services)
- **OpenRouter API key** (for AI image analysis)

### Installation

1. **Clone the repository**:

```bash
git clone https://github.com/YOUR_USERNAME/storage-shelves-and-box-organizer.git
cd storage-shelves-and-box-organizer
```

> **Note**: Replace `YOUR_USERNAME` with your actual GitHub username.

2. **Use the correct Node.js version**:

```bash
nvm use
```

3. **Install dependencies**:

```bash
npm install
```

4. **Configure environment variables**:

Create a `.env` file in the project root with the following variables:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key

# Application Configuration
PUBLIC_APP_URL=http://localhost:4321
```

5. **Set up Supabase**:

   - Create a new Supabase project
   - Run the database migrations (to be provided)
   - Configure Row Level Security (RLS) policies
   - Enable Email authentication

6. **Start the development server**:

```bash
npm run dev
```

The application will be available at `http://localhost:4321`.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Available Scripts

| Script         | Description                                      |
| -------------- | ------------------------------------------------ |
| `npm run dev`  | Start development server at `http://localhost:4321` |
| `npm run build`| Build the application for production             |
| `npm run preview` | Preview the production build locally          |
| `npm run astro` | Run Astro CLI commands                          |
| `npm run lint` | Run ESLint to check code quality                 |
| `npm run lint:fix` | Automatically fix ESLint issues              |
| `npm run format` | Format code with Prettier                      |

## Project Scope

### MVP Features (In Scope)

#### Core Functionality

1. **User Management**
   - User registration with CAPTCHA protection
   - Login/logout via Supabase Auth
   - Password reset via email (one-time, time-limited reset links)
   - Three role types: Read-only, Full Access, Administrator

2. **Location Hierarchy (CRUD)**
   - Four-level hierarchy: Building → Room → Rack → Shelf
   - Each level uses UUID v4 identifiers (backend-generated)
   - Optional friendly names for each level
   - Deletion protection (cannot delete items with children or assigned boxes)
   - Breadcrumb navigation showing full location path

3. **Box Management (CRUD)**
   - UUID v4 identifiers for all boxes
   - Optional friendly names
   - Mandatory shelf assignment
   - Description field (plain text/markdown, up to 10,000 characters)
   - Move boxes between shelves
   - Search and filter by location and tags

4. **Tagging System**
   - User-defined hashtags
   - Maximum 10 tags per box
   - Tag length limit: 30 characters
   - Format validation and duplicate prevention
   - Autocomplete for existing tags

5. **Image Upload & AI Analysis**
   - Supported formats: JPG, PNG, HEIC
   - Maximum file size: 3 MB
   - Maximum resolution: 1200×1200 pixels (auto-scaling or rejection)
   - AI-powered content categorization via OpenRouter
   - Manual correction of AI suggestions
   - Images deleted after analysis (not stored permanently)

6. **Public Links & QR Codes**
   - One-time generation of public links (UUID v4 only, no personal data)
   - QR code display for easy scanning
   - Public box view accessible without authentication
   - No link history or regeneration in MVP
   - Pages marked as non-indexable (robots noindex)
   - Basic rate limiting on public endpoints

7. **Search & Browse**
   - Filter boxes by location (any hierarchy level)
   - Multi-select tag filtering
   - Pagination with configurable page size
   - Sorting by creation date and name
   - Empty state with helpful suggestions

8. **Admin Panel**
   - System event logs (create, edit, delete actions)
   - Includes: action type, resource type, identifier, user, timestamp
   - Filtering by action type and date range
   - Read-only access
   - Accessible only to Administrator role

#### Quality & Security

- All resources use UUID v4 identifiers (generated server-side)
- Public URLs contain no personal/identifying data
- Clear validation messages for all user inputs
- Breadcrumb navigation throughout the application
- Responsive design for mobile and desktop
- Basic accessibility features

### Out of Scope (Future Enhancements)

- Multi-user collaboration and cross-account permissions
- Individual item tracking within boxes
- Storage optimization and packing recommendations
- Native mobile applications (PWA may be considered later)
- Advanced backup/disaster recovery beyond provider defaults
- Public link revocation and regeneration
- Extended audit logging and data retention policies
- Legacy browser support and advanced accessibility features
- Advanced analytics and reporting

### Assumptions & Dependencies

- Supabase provides authentication, PostgreSQL, and RLS/RBAC enforcement
- OpenRouter provides access to Vision Language Models within budget constraints
- Public views are marked as non-indexable with basic rate limiting
- User discipline in labeling and updating data

### Open Questions

- Detailed RLS policy mapping in Supabase
- Specific accessibility requirements and browser support matrix
- OpenRouter budget limits and model selection criteria
- Admin panel scope beyond logs
- Log retention periods and privacy considerations
- Advanced search parameters (multi-criteria filtering, custom sorting)

## Project Status

**Current Status**: 🚧 **In Active Development (MVP Phase)**

### Completed

- ✅ Initial project setup with Astro 5, React 19, TypeScript 5, Tailwind 4
- ✅ Development environment configuration
- ✅ Tech stack selection and architecture design
- ✅ Comprehensive PRD documentation

### In Progress

- 🔨 Database schema design
- 🔨 Supabase configuration and RLS policies
- 🔨 Authentication flow implementation
- 🔨 Core UI components with shadcn/ui

### Upcoming

- 📋 Location hierarchy CRUD operations
- 📋 Box management functionality
- 📋 Tagging system implementation
- 📋 Image upload and AI integration
- 📋 QR code generation
- 📋 Search and filtering
- 📋 Admin panel and logging
- 📋 Public link sharing
- 📋 Production deployment setup

### Success Metrics (MVP)

The MVP will be considered successful when:

- ✅ All core user flows operational in production (registration, login, CRUD, QR generation, public view, search)
- ✅ Median time to add new box: ≤ 60 seconds
- ✅ Median time to find box via QR or search: ≤ 10 seconds
- ✅ QR code success rate: ≥ 95% of scans lead to correct view
- ✅ Search performance: ≤ 1.5s response time for 95th percentile
- ✅ AI acceptance: ≥ 70% of users accept at least one AI suggestion or correct within ≤ 30 seconds
- ✅ Security: Public views have noindex, no data leaks, no abuse incidents
- ✅ Admin logs: Track all create/edit/delete operations with user and timestamp data


## Project Structure

```md
.
├── src/
│   ├── layouts/    # Astro layouts
│   ├── pages/      # Astro pages
│   │   └── api/    # API endpoints
│   ├── components/ # UI components (Astro & React)
│   └── assets/     # Static assets
├── public/         # Public assets
```

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### Code Quality

This project uses:
- ESLint for code quality
- Prettier for formatting
- Husky for pre-commit hooks
- lint-staged for staged file linting

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## License

MIT

**Built with ❤️ using Astro, React, TypeScript, and Tailwind CSS**