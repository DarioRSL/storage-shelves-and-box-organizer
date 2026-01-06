# Contributing to Storage & Box Organizer

Welcome! This guide will help you understand the project structure and contribution workflow.

## Quick Start

### Prerequisites
- Node.js 22.14.0 (use `nvm use`)
- npm 10.x
- Supabase CLI (for local development)

### Setup
```bash
# Clone and install
git clone <repo-url>
cd storage-shelves-and-box-organizer
nvm use
npm install

# Start local Supabase (optional)
npx supabase start

# Start dev server
npm run dev
```

## Project Structure

See `CLAUDE.md` for complete project structure. Key directories:

- `src/pages/` - Astro pages (file-based routing)
- `src/pages/api/` - API endpoints (SSR)
- `src/components/` - React UI components
- `src/lib/services/` - Business logic layer
- `supabase/migrations/` - Database migrations

## Development Workflow

### 1. Find an Issue
- Browse [GitHub Issues](https://github.com/DarioRSL/storage-shelves-and-box-organizer/issues)
- Look for `good-first-issue` label for beginner-friendly tasks
- Check issue is not already assigned

### 2. Create Branch
```bash
git checkout -b feature/issue-123-short-description
```

### 3. Make Changes
- Follow existing code patterns
- Use TypeScript strict mode
- Add Polish translations for UI strings
- Test changes locally

### 4. Code Quality
```bash
# Lint and format
npm run lint:fix
npm run format

# Check TypeScript
npx tsc --noEmit

# Test build
npm run build
```

### 5. Commit
```bash
git add .
git commit -m "feat: add password reset functionality (#123)

- Implement email reset flow
- Add reset token validation
- Update UI with reset form

Closes #123"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 6. Push & Create PR
```bash
git push origin feature/issue-123-short-description
```

Then create Pull Request on GitHub:
- Reference issue number in description
- Add screenshots if UI change
- Request review from maintainers

## Code Standards

### TypeScript
- Use strict mode
- Avoid `any` types (use `unknown` if necessary)
- Define types in `src/types.ts` for shared types

### React Components
- Use functional components with hooks
- Prefer `React.memo()` for optimization
- Use `useCallback()` and `useMemo()` where appropriate
- Custom hooks in `src/components/hooks/`

### API Endpoints
- Validate input with Zod schemas
- Use `context.locals.supabase` for database access
- Return proper HTTP status codes
- Handle errors with Polish messages

### Accessibility
- Use semantic HTML first
- Add ARIA attributes where needed
- Test with keyboard only
- Test with screen reader (VoiceOver/NVDA)

### Localization
- All UI text in Polish
- Use translation keys (not hardcoded strings)
- Consistent terminology

## Database Migrations

### Creating Migrations
```bash
# Generate timestamp
date -u +"%Y%m%d%H%M%S"

# Create file
touch supabase/migrations/20260106120000_your_description.sql
```

**Migration Guidelines:**
- Use lowercase SQL
- Add header comments explaining purpose
- Enable RLS on new tables
- Create granular RLS policies
- Add `updated_at` trigger with moddatetime
- Test migration locally before committing

## Testing

### Manual Testing
- Test happy path
- Test error cases
- Test with different user roles
- Test on Chrome, Firefox, Safari
- Test keyboard navigation

### Future: Automated Tests
(Coming soon - Jest + React Testing Library)

## Documentation

### When to Update Docs
- New API endpoint → Update `.ai_docs/api-plan.md`
- Database change → Update `.ai_docs/db-plan.md`
- New feature → Update `.ai_docs/ROADMAP.md` backlog
- Architecture change → Update `CLAUDE.md`

### Documentation Style
- Use Polish for user-facing content
- Use English for technical documentation
- Include code examples
- Link to related issues/PRs

## Getting Help

- **Questions:** Open a GitHub Discussion
- **Bugs:** Create issue with `bug_report` template
- **Features:** Create issue with `feature_request` template
- **Security:** Email security@example.com (do not open public issue)

## Code Review Process

### As Author
- Self-review your PR before requesting review
- Respond to feedback promptly
- Update PR based on review comments
- Notify reviewer when ready for re-review

### As Reviewer
- Review within 48 hours
- Check code style, logic, tests
- Be constructive and specific
- Approve when all concerns addressed

## Resources

- [Astro Documentation](https://docs.astro.build)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WAI-ARIA Patterns](https://www.w3.org/WAI/ARIA/apg/)

---

Thank you for contributing! 🎉
