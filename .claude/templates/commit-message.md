# Commit Message Template

This template defines the standard format for all commit messages in this project. It uses variable placeholders that will be replaced during commit generation.

## Standard Format

```
{TYPE}({SCOPE}): {HEADLINE}

{SUMMARY}

{DETAILS}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Variable Descriptions

### {TYPE}
**Purpose:** Categorize the type of change

**Valid values:**
- `feat` - New feature or functionality
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code restructuring without behavior change
- `chore` - Maintenance and tooling
- `style` - Code style and formatting
- `i18n` - Internationalization and localization
- `test` - Adding or updating tests
- `perf` - Performance improvements
- `security` - Security improvements

**Selection criteria:**
- If files add new user-facing functionality → `feat`
- If files fix bugs or issues → `fix`
- If files only change documentation → `docs`
- If files restructure code without changing behavior → `refactor`
- If files change dependencies, config, or tooling → `chore`
- If files only change formatting/style → `style`
- If files add/update translations → `i18n`
- If files add/update tests → `test`
- If files improve performance → `perf`
- If files improve security → `security`

### {SCOPE}
**Purpose:** Specify the area of the codebase affected

**Selection criteria:**
1. Extract the most specific scope from file paths
2. Match against valid scopes in config.json for the selected type
3. Use the scope that best represents the primary area of change

**Examples:**
- `src/components/box-details/*.tsx` → scope: `box-details`
- `src/pages/api/boxes.ts` → scope: `api`
- `supabase/migrations/*.sql` → scope: `db`
- `.ai_docs/api-plan.md` → scope: `api-plan`
- `src/components/hooks/*.ts` → scope: `hooks`

**Multiple scopes:**
- If changes span multiple areas, choose the most significant scope
- Alternatively, create separate commits for each scope

### {HEADLINE}
**Purpose:** Concise description of what changed

**Format:**
- Start with lowercase action verb (imperative mood)
- Be specific about what component/feature/file
- Maximum length: 72 characters total for `{TYPE}({SCOPE}): {HEADLINE}`
- No period at end
- Use present tense

**Action verbs:**
- `add` - New files, features, or functionality
- `implement` - New implementation of planned feature
- `create` - New components, services, or modules
- `update` - Modifications to existing code
- `fix` - Bug fixes
- `remove` - Deletions
- `refactor` - Code restructuring
- `change` - Behavioral changes
- `improve` - Enhancements
- `migrate` - Moving to new patterns/libraries

**Examples:**
- `add BoxDetailsContent component with full CRUD`
- `implement useBoxForm hook for state management`
- `fix workspace ID propagation in location selector`
- `update Box Details endpoint documentation`
- `remove unused React imports from components`

### {SUMMARY}
**Purpose:** One-line explanation of WHY the change was made

**Format:**
- Single sentence explaining the motivation or purpose
- Maximum 100 characters
- Focus on business value or technical necessity
- Provide context that's not obvious from the headline

**Examples:**
- `Enables users to view complete box information with navigation breadcrumbs and QR codes.`
- `Centralizes box form state management and API communication for better maintainability.`
- `Fixes critical bug preventing location tree from loading due to wrong workspace store.`
- `Brings API documentation in sync with latest endpoint implementations.`

### {DETAILS}
**Purpose:** Bullet-point list of specific changes made

**Format:**
- Use `-` for bullet points
- Start each point with action verb (present tense, imperative mood)
- Be specific: include file names, component names, function names
- Explain WHAT changed and WHY (not just WHAT)
- Group related changes together
- Order from most to least important
- Include integration points with existing code

**Structure:**
```
- Add [component/file/feature] with [specific capability]
- Implement [functionality] using [approach/library]
- Fix [issue] by [solution]
- Update [existing code] to [new behavior]
- Remove [obsolete code/feature]
- Refactor [code] for [improvement]
- Change [behavior] from [old] to [new]
```

**Detail guidelines by type:**

**feat (Feature):**
- List new components/functions/endpoints created
- Explain how they integrate with existing system
- Describe user-facing benefits
- Note any new dependencies or patterns introduced
- Include example usage if complex

**fix (Bug Fix):**
- Describe the bug and its symptoms
- Explain root cause if known
- Detail the fix applied
- Note any related changes needed
- Mention testing done

**docs (Documentation):**
- List specific sections/files updated
- Explain what information was added/changed
- Reference related implementation if applicable
- Note any examples or diagrams added

**refactor (Refactoring):**
- Explain motivation for restructuring
- List specific improvements made
- Note that behavior is unchanged
- Mention any patterns or conventions introduced

**chore (Maintenance):**
- Explain why the change was needed
- Include version numbers for dependency updates
- Note any configuration changes
- Mention impact on development workflow

**i18n (Internationalization):**
- List components/pages translated
- Specify language (e.g., "Polish", "English")
- Show key text transformations (before → after)
- Note any pluralization or formatting considerations

## Type-Specific Examples

### Example 1: feat(box-details) - New Feature Component

```
feat(box-details): add BoxDetailsContent component with full CRUD

Enables users to view complete box information with navigation breadcrumbs and QR codes.

- Add BoxDetailsContent main container component
- Implement state management for box data loading
- Create BoxHeader with formatted creation/modification dates
- Add LocationBreadcrumbs for hierarchical navigation
- Implement DescriptionSection with whitespace preservation
- Create TagsDisplay using Badge components
- Add QrCodeDisplay with dynamic generation and print
- Implement ActionButtonsSection with Edit/Delete
- Add comprehensive error handling (404, 403, auth)
- Include loading states with LoadingSpinner
- Connect to GET /api/boxes/:id endpoint
- Add back navigation to dashboard

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Example 2: fix(hooks) - Critical Bug Fix

```
fix(hooks): correct workspace store reference and expose currentWorkspaceId

Fixes critical bug preventing location selector from loading (400 Bad Request error).

- Change import from unused workspace.store.ts to active @/stores/dashboard
- Use useStore hook from @nanostores/react for reactive state
- Expose currentWorkspaceId in hook's return interface
- Update BoxForm to use exposed currentWorkspaceId for child components
- Remove unused response variable from submitForm function
- Fix TypeScript return type from Promise<unknown> to Promise<void>

Root cause: Hook was using outdated workspace store instead of the active store used by dashboard, resulting in empty workspace_id being passed to API.

Impact: Location selector now loads correctly (200 OK instead of 400 Bad Request).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Example 3: feat(ui) - UX Enhancement with i18n

```
feat(ui): enhance Box Form UX with Polish localization and improved navigation

Implements user feedback for better navigation flow and complete Polish translation.

- Add complete Polish localization to all form text
- Translate form headers: "Utwórz nowe pudełko" / "Edytuj pudełko"
- Update button labels: Utwórz, Zapisz, Anuluj, Wyczyść, Usuń
- Translate error messages and dialog text
- Change Cancel button to redirect to /app dashboard
- Update Create/Save button to redirect to /app after success
- Add Reset button for create mode (clears form, stays on page)
- Add onReset prop to FormActions component
- Create handleReset callback in BoxForm
- Update delete confirmation dialog with Polish text

User feedback: "Cancel powinien przerwać dodawanie i wrócić do dashboardu" - implemented ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Example 4: docs(api-plan) - Documentation Update

```
docs(api-plan): update Box Details endpoint documentation

Brings API specification in sync with implemented Box Details endpoints.

- Add GET /api/boxes/:id endpoint specification
- Document BoxLocationSummary nested type definition
- Add hierarchical location breadcrumb format explanation
- Include QR code display field descriptions
- Document error responses (404, 403, 401)
- Add request/response examples with full payloads
- Reference Polish UI text for consistency
- Include authentication requirements (HttpOnly cookie)

Related implementation: PR #81 Box Details View

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Example 5: refactor(types) - Code Restructuring

```
refactor(types): consolidate box-related types into shared types.ts

Improves type consistency and reduces duplication across components.

- Move BoxDto interface from components to src/types.ts
- Add BoxFormState interface for form components
- Create BoxLocationSummary type for breadcrumb navigation
- Update all imports to reference centralized types
- Remove duplicate type definitions from individual files
- Add JSDoc comments for complex types
- Ensure consistency with API response types

No behavior changes - pure type reorganization for better maintainability.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Example 6: chore(deps) - Dependency Update

```
chore(deps): update Astro to v5.1.2 and related packages

Updates Astro and related packages for security fixes and performance improvements.

- Update @astrojs/node from 5.0.0 to 5.1.2
- Update astro from 5.0.0 to 5.1.2
- Update @astrojs/react from 4.0.0 to 4.1.0
- Lock file updated with new dependency versions
- No breaking changes in minor version updates
- Includes security patch for SSR middleware

Testing: Verified build and dev server still work correctly.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Example 7: i18n(settings) - Internationalization

```
i18n(settings): translate Settings page components to Polish

Completes Polish localization for entire Settings page.

Components translated:
- SettingsHeader: "Ustawienia" header, "Zarządzaj swoim kontem" subtitle
- ThemeToggle: "Motyw", "Jasny", "Ciemny", "Systemowy" options
- ProfileSection: "Profil użytkownika", "Email", "Data dołączenia" labels
- WorkspaceSelector: "Workspace", "Wybierz workspace" placeholder
- LogoutButton: "Wyloguj się" label

Translation principles:
- Formal Polish ("Ty" form)
- Consistent terminology (workspace → workspace, not "przestrzeń robocza")
- Preserve technical terms where appropriate
- Maintain UI compactness (short labels)

All 47 user-facing strings now in Polish ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Best Practices

### Be Specific
❌ Bad: `fix: update component`
✅ Good: `fix(box-details): correct QR code print styling in Safari`

### Explain WHY
❌ Bad: `feat(api): add new endpoint`
✅ Good: `feat(api): add POST /api/boxes endpoint for box creation`

### Include Context
❌ Bad: `refactor: change code`
✅ Good: `refactor(hooks): extract location tree logic into custom hook for reusability`

### Use Imperative Mood
❌ Bad: `Added new feature`
✅ Good: `add new feature`

### Reference Issues/PRs When Relevant
✅ Good: `fix(auth): correct session cookie expiration (fixes #123)`

### Group Related Changes
✅ Good: Commit all LocationTree changes together, not scattered across multiple commits

### One Logical Change Per Commit
❌ Bad: Commit that fixes bug AND adds new feature
✅ Good: Separate commits for bug fix and new feature

## Common Pitfalls to Avoid

1. **Too Vague:** "update files" - What files? What updates?
2. **Too Long:** Headline exceeds 72 characters
3. **Missing WHY:** Details only describe WHAT, not WHY
4. **Wrong Tense:** "Added feature" instead of "add feature"
5. **Missing Details:** Only headline, no bullet points
6. **Mixed Changes:** Unrelated changes in one commit
7. **No Context:** Details don't explain integration or impact

## Template Variables Reference

| Variable | Description | Max Length | Required |
|----------|-------------|------------|----------|
| {TYPE} | Commit type | N/A | Yes |
| {SCOPE} | Area of codebase | N/A | Yes |
| {HEADLINE} | Short description | 72 chars total | Yes |
| {SUMMARY} | One-line WHY | 100 chars | Yes |
| {DETAILS} | Bullet points | No limit | Yes |

## Footer (Always Include)

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

This footer:
- Credits Claude Code for commit generation
- Attributes co-authorship to Claude Sonnet 4.5
- Maintains consistency across all commits
- Is added automatically by the skill

## Usage in Skill

The `/commit-pr-issue` skill will:
1. Analyze changed files
2. Determine appropriate {TYPE} and {SCOPE}
3. Generate {HEADLINE} from diff analysis
4. Create {SUMMARY} explaining motivation
5. Build {DETAILS} from specific code changes
6. Apply this template with all variables filled
7. Add footer automatically

## Customization

To add new commit types or scopes:
1. Edit `.claude/templates/config.json`
2. Add to `commit.types` array for new type
3. Add to `scopes` array for new scope
4. Update this template with examples if needed

## Validation

Before committing, verify:
- [ ] Type is valid (from config.json)
- [ ] Scope is valid (from config.json)
- [ ] Headline is concise and specific
- [ ] Total first line ≤ 72 characters
- [ ] Summary explains WHY
- [ ] Details list specific changes
- [ ] Details explain integration/impact
- [ ] Footer is present
- [ ] No typos or grammatical errors