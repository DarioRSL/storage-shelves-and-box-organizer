# Shared Project Guidelines - Extensions

**Purpose:** Complement to `guidelines.md`. Shared insights, patterns, and best practices for consistent development.

**See Also:** `guidelines.md` for project-specific tech stack and patterns

---

## Architecture Principles

### Folder structure
When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/lib` - Services and helpers 
- `./src/assets` - static internal assets
- `./public` - public assets

When modifying the directory structure, always update this section.

### Separation of Concerns
- UI components handle only display and user interaction
- Business logic isolated in hooks, services, or stores
- API communication centralized in client/endpoints
- Validation as separate layer, reusable across frontend/backend

### Composition Over Inheritance
- Build complex features from small, reusable pieces
- Small, single-purpose components compose together
- Avoid large monolithic components
- Use context/slots for flexibility

### Data Flow
- Unidirectional: Input → Validation → API → State → Render
- Never update state directly from child components
- Use callbacks or store actions for state changes
- Prevent circular dependencies

### Phase-Based Development
- Build infrastructure first, features second
- Enforce strict phase sequencing
- Identify critical path dependencies
- Document what blocks what phase
- Quality gates between phases (not optional)

---

## Implementation Patterns

### Custom Hooks
- Extract stateful logic into reusable hooks
- Use for logic shared across 2+ components
- Handle side effects and cleanup properly
- Name hooks with `use` prefix

### Form Handling
- Centralize form state, validation, and submission
- Validate before API call (UX) and on server (security)
- Track touched fields (show errors only after interaction)
- Reset form after successful submission
- Show loading state during submission

### API Client Abstraction
- Single place for auth, error handling, retries
- Consistent error handling across all endpoints
- Auto-inject JWT tokens
- Type-safe API calls with interfaces
- Easy to mock for testing

### Global State Management
- Use for truly global state (auth, theme, user workspace)
- Avoid for local component state
- Choose tool based on complexity (atom vs reducer vs context)
- Persist critical state to localStorage when needed

### Error Handling
- Handle errors at API layer first (centralize)
- Show user-friendly messages (not raw errors)
- Provide retry options for network errors
- Log errors for debugging (but not sensitive data)
- Distinguish between validation errors and system errors

---

## Code Quality Standards

### Type Safety
- ✅ All function parameters typed
- ✅ All function returns typed
- ✅ No implicit `any` types
- ✅ Strict mode enabled
- ✅ Component props have interfaces
- ✅ Extract types: `type Foo = z.infer<typeof fooSchema>`

### Validation
- Validate at boundaries: user input, API responses
- Define schemas once, reuse everywhere
- Frontend validation for UX, backend for security
- Use Zod or similar for runtime type checking

### Testing
- Test behavior from user perspective (not implementation)
- Prioritize user flows over unit tests
- Test error scenarios and edge cases
- Check accessibility in tests
- Mock API responses consistently

### Performance
- Profile with tools before optimizing
- Memoize expensive components when needed
- Use debounce/throttle for frequent updates
- Lazy load heavy components
- Virtual scroll for long lists (100+ items)

### Accessibility
- ✅ Keyboard navigation (Tab through all interactive)
- ✅ Focus visible (outline on all buttons/inputs)
- ✅ Semantic HTML (`<button>`, `<label>`, `<input>`)
- ✅ Screen reader (labels on unlabeled elements)
- ✅ Color contrast ≥ 4.5:1
- ✅ Error messages announced (`aria-live="polite"`)

---

## Common Mistakes

### Never Use `any`
```typescript
// ❌ any defeats TypeScript
const data: any = response;

// ✅ Define proper types
interface ApiResponse { /* ... */ }
const data: ApiResponse = response;
```

### Never Miss useEffect Dependencies
```typescript
// ❌ Missing 'count' → stale closure
useEffect(() => { console.log(count); }, []);

// ✅ Include all dependencies
useEffect(() => { console.log(count); }, [count]);
```

### Always Clean Up Effects
```typescript
// ❌ Memory leak
useEffect(() => {
  window.addEventListener('resize', fn);
}, []);

// ✅ Cleanup
useEffect(() => {
  window.addEventListener('resize', fn);
  return () => window.removeEventListener('resize', fn);
}, [fn]);
```

### Never Hardcode Config
```typescript
// ❌ Breaks in production
const API_URL = 'http://localhost:3000';

// ✅ Use environment variables
const API_URL = process.env.API_URL || 'http://localhost:3000';
```

### Always Validate User Input
```typescript
// ❌ Trust input
function save(data) { db.save(data); }

// ✅ Validate first
function save(data: unknown) {
  const valid = schema.parse(data);
  db.save(valid);
}
```

### Never Drill Props Deeply
```typescript
// ❌ Props hell
<Parent user={u} theme={t}>
  <Child user={u} theme={t}>
    <GrandChild user={u} theme={t} />
  </Child>
</Parent>

// ✅ Use context/store
<Provider value={state}>
  <Parent>
    <Child>
      <GrandChild /> {/* reads from context */}
    </Child>
  </Parent>
</Provider>
```

### Always Use Keys in Lists
```typescript
// ❌ No key or index as key
items.map(item => <Item item={item} />)
items.map((item, i) => <Item key={i} item={item} />)

// ✅ Stable unique key
items.map(item => <Item key={item.id} item={item} />)
```

### Never Leave Console.logs
```typescript
// ❌ Bad for production
console.log('Token:', token);

// ✅ Safe logging
console.log('User authenticated');
```

### Always Handle Errors in Forms
```typescript
// ❌ Silent failure
const handleSubmit = async (v) => await api.post(url, v);

// ✅ Show errors
const handleSubmit = async (v) => {
  try {
    await api.post(url, v);
  } catch (err) {
    setError(err.message);
  }
};
```

---

## Development Workflow

### Git Practices
- Create feature branch per feature/phase
- Make small, focused commits (easier review)
- Push frequently (backup)
- Clear commit messages: `feat: description` or `fix: description`
- Request review when ready, respond to feedback quickly

### Pre-Commit Checklist
- [ ] Code works locally
- [ ] Linting passes: `npm run lint`
- [ ] Types check: `npx tsc --noEmit`
- [ ] Tests pass (if applicable)
- [ ] Code formatted: `npm run format`
- [ ] No console.logs left
- [ ] No commented code
- [ ] Commit message is clear

### Code Review Checklist
- [ ] Solves the problem clearly
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] Code readable/maintainable
- [ ] No security issues
- [ ] Types correct
- [ ] Follows project standards
- [ ] Tests sufficient
- [ ] Performance acceptable

---

## Security Best Practices

### Authentication & Authorization
- Check permissions on frontend for UX
- **Always** verify on backend (never trust client)
- Validate JWT token before using it
- Clear sensitive data from memory on logout

### Input Validation
- Validate all user input at API boundary
- Use parameterized queries (never string concatenation for SQL)
- Sanitize HTML input to prevent XSS
- Check user role/workspace before returning data

### Sensitive Data
- Never log tokens, passwords, API keys
- Use environment variables for secrets
- Don't commit `.env` files
- Mask sensitive fields in logs
- Clear sensitive data from state on logout

### API Security
- Use HTTPS (not HTTP)
- Validate request body with schema
- Check Content-Type headers
- Implement rate limiting
- Log suspicious requests

---

## Documentation Standards

### Self-Documenting Code
- Use clear variable/function names (no abbreviated names)
- Name constants for magic numbers
- Structure code logically (happy path last)
- Use type names that explain intent

### Comments - When to Write
- ✅ **Why** it works this way (business logic)
- ✅ **Non-obvious** decisions (browser compatibility)
- ✅ **Warnings** about gotchas (race conditions)
- ❌ **What** the code does (code shows this)
- ❌ **Obvious** from variable names
- ❌ **Outdated** comments (worse than no comments)

### JSDoc for Public APIs
```typescript
/**
 * Process user data
 * @param user - User to process
 * @param options - Optional settings
 * @returns Formatted profile
 * @throws {ValidationError} If invalid
 */
export function formatUser(user: User, options?: Options): Profile
```

### Commit Messages
```
feat: add login form validation

- Validate email with regex pattern
- Show inline error messages
- Prevent submit with invalid data
- Add unit tests

Closes #123
```

### Status Updates
- List completed items
- List in-progress items with %%
- Document blockers with impact/mitigation
- List what's next

---

## Performance Optimization

### Measure First
- Profile with DevTools/Lighthouse
- Identify real bottlenecks
- Measure improvement after optimization
- Don't optimize prematurely

### Common Optimizations
- **Memoization:** Prevent re-renders of expensive components
- **useCallback:** Memoize callbacks passed to children
- **useMemo:** Cache expensive calculations
- **Debounce:** Delay rapid function calls (search, resize)
- **Throttle:** Limit execution rate (scroll, mousemove)
- **Code splitting:** Lazy load heavy components
- **Virtual scroll:** Render only visible items in long lists

### Performance Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

---

## Naming Conventions

### Variables & Functions
- **camelCase** for variables and functions
- **Descriptive names** (not abbreviated)
- **is/has prefix** for booleans: `isLoading`, `hasError`
- **Verb prefix** for functions: `getUser`, `createBox`, `updateLocation`

### Types & Interfaces
- **PascalCase** for types and interfaces
- **Dto suffix** for API DTOs: `UserDto`, `BoxDto`
- **Input suffix** for request schemas: `CreateUserInput`
- **Response suffix** for response types: `ApiResponse`

### Constants
- **UPPERCASE_SNAKE_CASE** for compile-time constants
- **camelCase** for runtime constants

### Files
- **PascalCase** for components: `FormInput.tsx`
- **camelCase** for utilities/hooks: `useForm.ts`, `validation.ts`
- **lowercase** for pages: `auth/`, `dashboard/`

---

## Async & State Management

### useEffect Rules
- ✅ Add cleanup function
- ✅ Include all dependencies
- ✅ Don't make effect async (use IIFE instead)
- ✅ Prevent infinite loops
- ❌ Don't omit dependencies
- ❌ Don't ignore warnings

### Async Patterns
```typescript
// IIFE pattern
useEffect(() => {
  (async () => {
    const data = await fetch(url);
    setState(data);
  })();
}, [url]);

// Separate async function
useEffect(() => {
  const loadData = async () => {
    const data = await fetch(url);
    setState(data);
  };

  loadData();
}, [url]);
```

### State Update Patterns
- Batch related state into objects
- Use reducer for complex state
- Update state based on previous state with callback
- Use key in lists to maintain state identity

---

## Testing Guidelines

### Test Organization
- Group tests by feature/component
- Clear test names describing behavior
- Arrange → Act → Assert pattern
- One assertion (or related assertions)

### What to Test
- ✅ User flows end-to-end
- ✅ Error scenarios
- ✅ Edge cases
- ✅ Form validation
- ✅ API integration
- ❌ Implementation details
- ❌ Internal state changes
- ❌ Component internals

### Mocking
- Mock external APIs consistently
- Provide realistic mock data
- Test both success and error paths
- Don't mock internal functions

---

## Accessibility Checklist

### Keyboard
- [ ] Tab through all interactive elements
- [ ] Escape closes modals/dropdowns
- [ ] Enter/Space activates buttons
- [ ] Arrow keys for lists/navigation
- [ ] Focus order logical and visible

### Screen Reader
- [ ] Form inputs have labels
- [ ] Buttons have descriptive text
- [ ] Error messages announce
- [ ] Loading states announce
- [ ] Headings hierarchy correct
- [ ] Images have alt text

### Visual
- [ ] Text contrast ≥ 4.5:1
- [ ] Don't use color alone (add icons/text)
- [ ] Focus visible on all interactive
- [ ] Touch targets ≥ 48px mobile

### Semantic HTML
- Use `<button>` not `<div onClick>`
- Use `<a>` for navigation
- Use `<label>` for form inputs
- Use headings hierarchy correctly
- Use `<nav>`, `<main>`, `<footer>` landmarks

---

## Environment & Configuration

### Environment Variables
- Store in `.env` file (don't commit)
- Prefix with project name: `REACT_APP_API_URL`
- Use `.env.example` in git with placeholders
- Never commit actual secrets

### Configuration Patterns
```typescript
// Config file
export const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  isDev: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
};

// Usage
const apiUrl = config.apiUrl;
```

---

## Debugging Tips

### Console Logging
```typescript
// Use labels for clarity
console.log('[AuthService]', 'User logged in:', user);

// Use groups to organize
console.group('Form Submission');
console.log('Values:', values);
console.log('Errors:', errors);
console.groupEnd();

// Use tables for data
console.table(users);
```

### Browser DevTools
- **Elements:** Inspect HTML/CSS
- **Console:** Check errors, log messages
- **Network:** Check API calls/headers
- **Performance:** Profile rendering
- **Components:** React DevTools for state/props
- **Application:** Check localStorage/cookies

### TypeScript
```bash
# Check types without building
npx tsc --noEmit

# Find type errors
npx tsc --strict --noEmit
```

### Performance Profiling
```bash
# Lighthouse
lighthouse https://yoursite.com --view

# Bundle size
npm run build && npx webpack-bundle-analyzer dist/stats.json
```

---

## Review Reminders

**Before committing:**
- Tests pass locally
- Linting passes
- TypeScript compiles
- Code formatted
- No console.logs
- Accessible (keyboard, screen reader)

**Before merging:**
- Code reviewed
- CI/CD passes
- Tests pass
- No TypeScript errors
- No merge conflicts
- Ready for production

**Before deploying:**
- All gates passed
- Security reviewed
- Performance acceptable
- Documentation updated
- Rollback plan ready

---

**Created:** 2025-12-28
**Version:** 1.0
