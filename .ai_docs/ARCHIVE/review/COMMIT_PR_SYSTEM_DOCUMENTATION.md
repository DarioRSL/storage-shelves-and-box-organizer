# Commit/PR/Issue System Documentation

**Version:** 1.0.0
**Last Updated:** January 4, 2026
**Author:** Claude Code Template System

## Overview

This document describes the **generic, reusable system** for automating Git workflows in this project. The system uses templates, configuration files, and a Claude Code skill to intelligently commit changes, link GitHub issues, and create comprehensive pull requests.

**Key Benefits:**

- **Consistency:** All commits and PRs follow the same high-quality format
- **Efficiency:** Single command handles entire workflow (commits → issues → PR)
- **Reusability:** Works on any branch, any feature type
- **Customizable:** Project-specific conventions via configuration
- **Intelligence:** Analyzes relationships and suggests logical groupings

## Quick Start

### Prerequisites

1. **GitHub CLI authenticated:**

   ```bash
   gh auth status
   # If not authenticated:
   gh auth login
   ```

2. **On a feature branch with uncommitted changes:**

   ```bash
   git status
   # Should show modified/new files
   ```

3. **Changes reviewed and ready to commit:**
   - Run `git diff` to review your changes
   - Ensure you're on the correct branch
   - Verify changes are logical and complete

### Run the Skill

```bash
/commit-pr-issue
```

### Workflow Steps

The skill will guide you through:

1. **Review suggested commit groups** (AI-generated based on file relationships)
2. **Approve or adjust grouping** (can move files between commits)
3. **Review commit messages** (detailed, following project conventions)
4. **Select related issues** (AI searches and scores relevance)
5. **Review and create PR** (comprehensive description with all sections)

**Estimated Time:** 5-10 minutes for typical feature branch

## System Architecture

### File Structure

```
.claude/
├── commands/
│   └── commit-pr-issue.md              # Skill implementation (workflow orchestration)
├── templates/
│   ├── commit-message.md               # Commit message template with variables
│   ├── pr-description.md               # PR description template with sections
│   └── config.json                     # Type/scope/pattern mappings
└── settings.local.json                 # Local settings (already exists)

.ai_docs/
└── review/
    └── COMMIT_PR_SYSTEM_DOCUMENTATION.md  # This file
```

### Components

#### 1. Configuration (`config.json`)

**Purpose:** Central configuration for project-specific conventions

**Contains:**

- Commit types (feat, fix, docs, refactor, chore, style, i18n, test, perf, security)
- Valid scopes for each type
- Scope categories (frontend, backend, database, documentation, tooling)
- File patterns for auto-categorization
- PR section definitions
- GitHub label mappings

**Example:**

```json
{
  "commit": {
    "types": [
      {
        "type": "feat",
        "description": "New feature",
        "emoji": "✨",
        "scopes": ["ui", "api", "db", "dashboard", "settings", ...]
      }
    ],
    "scopeCategories": {
      "frontend": ["ui", "dashboard", "settings", ...],
      "backend": ["api", "services", "middleware", ...]
    }
  },
  "filePatterns": {
    "frontend": ["src/components/**", "src/pages/**"],
    "backend": ["src/pages/api/**", "src/lib/services/**"]
  }
}
```

#### 2. Commit Message Template (`commit-message.md`)

**Purpose:** Define reusable commit message structure

**Format:**

```
{TYPE}({SCOPE}): {HEADLINE}

{SUMMARY}

{DETAILS}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Variables:**

- `{TYPE}` - Commit type (feat, fix, docs, etc.)
- `{SCOPE}` - Area of codebase (ui, api, db, etc.)
- `{HEADLINE}` - Short description (max 72 chars total)
- `{SUMMARY}` - One-line WHY explanation
- `{DETAILS}` - Bullet-point list of changes

**Type-Specific Guidelines:**

- **feat:** User benefits, integration points, new components
- **fix:** Bug description, root cause, solution, impact
- **docs:** Sections updated, related implementation
- **refactor:** Motivation, improvements, no behavior change
- **chore:** Why needed, version numbers, config changes
- **i18n:** Language, translated components, key transformations

#### 3. PR Description Template (`pr-description.md`)

**Purpose:** Define comprehensive PR structure

**Sections:**

1. **🎯 Summary** - High-level overview
2. **📊 Changes Overview** - Commits by category
3. **🏗️ Technical Architecture** - Design decisions
4. **🧪 Testing & User Feedback** - Test scenarios, results
5. **📁 Files Changed** - New/modified files with descriptions
6. **🚀 Deployment Readiness** - Production checklist
7. **📋 Related Issues** - Closes/partially addresses/references
8. **🎯 Next Steps** - Immediate/short-term/long-term tasks
9. **📚 Documentation** - New/updated docs
10. **✅ Checklist** - Pre-merge verification

**Footer:**

- Total commits
- Implementation date
- PR status
- Generation attribution

#### 4. Skill Implementation (`commit-pr-issue.md`)

**Purpose:** Orchestrate entire workflow with AI intelligence

**Phases:**

1. **Analyze Changes** - Parse git status/diff, categorize files
2. **Suggest Grouping** - Group files into logical commits
3. **Generate Commits** - Create detailed commit messages
4. **Search Issues** - Find and link related GitHub issues
5. **Generate PR** - Create comprehensive pull request

**Key Features:**

- User interaction at decision points
- Error handling with recovery options
- Progress updates throughout
- Configuration-driven (uses templates and config)
- Transparent (shows commands being executed)

## Workflow Phases in Detail

### Phase 1: Analyze Changes

**What it does:**

- Loads configuration from `config.json`
- Runs `git status`, `git diff`, `git log`
- Categorizes files by matching paths against `filePatterns`
- Extracts suggested scopes from file paths
- Analyzes diff content for change type hints
- Detects related files (imports, same directory)

**Output:**

```
📊 Analysis Complete:

Files changed: 9 (7 modified, 2 new)
Categories detected:
- Frontend: 6 files (hooks, forms, shared)
- Documentation: 3 files (ai_docs)

Suggested groupings: 4 commits
```

### Phase 2: Suggest Grouping

**What it does:**

- Groups files into logical commits
- Prioritizes: DB → Backend → Frontend → Docs
- Splits fixes from features
- Separates documentation by type (review vs planning)
- Presents groupings with file counts and suggested headlines

**Example Output:**

```
📦 Suggested Commit Groups (4 commits):

Commit 1: fix(hooks): correct workspace store reference
  Files (1):
  - src/components/hooks/useBoxForm.ts

Commit 2: feat(ui): enhance Box Form UX with Polish localization
  Files (2):
  - src/components/forms/BoxForm.tsx
  - src/components/forms/FormActions.tsx

Commit 3: fix(ui): fix location name display and remove duplicate modal close button
  Files (3):
  - src/components/forms/LocationTree.tsx
  - src/components/forms/LocationSelector.tsx
  - src/components/shared/Modal.tsx

Commit 4: docs(ai_docs): update documentation
  Files (3):
  - .ai_docs/project-TO-DO.md
  - .ai_docs/review/box-form-view-implementation-review.md
  - .ai_docs/duplicate-name-warning-feature-plan.md

Options:
1. ✅ Accept suggested grouping
2. ✏️ Adjust grouping manually
3. 🔍 Show detailed diff
4. ❌ Cancel
```

**Grouping Algorithm:**

1. Extract database migrations (always first, always separate)
2. Group backend files by scope
3. Group frontend files by feature/component
4. Split frontend into fixes and features
5. Group documentation files by type
6. Separate AI docs by subdirectory (review, planning, other)

### Phase 3: Generate Commits

**What it does:**

- For each group, generates commit components:
  - **TYPE:** From group metadata
  - **SCOPE:** From file paths and config
  - **HEADLINE:** Action verb + subject + key detail (max 72 chars)
  - **SUMMARY:** One-line WHY explanation
  - **DETAILS:** Bullet points from diff analysis
- Applies commit message template
- Shows preview to user
- Executes `git add` + `git commit`
- Verifies commit with `git log -1 --stat`

**Example Output:**

```
📝 Commit 1 Preview:

fix(hooks): correct workspace store reference and expose currentWorkspaceId

Fixes critical bug preventing location selector from loading (400 Bad Request error).

- Change import from unused workspace.store.ts to active @/stores/dashboard
- Use useStore hook from @nanostores/react for reactive state
- Expose currentWorkspaceId in hook's return interface
- Update BoxForm to use exposed currentWorkspaceId for child components
- Remove unused response variable from submitForm function
- Fix TypeScript return type from Promise<unknown> to Promise<void>

Root cause: Hook was using outdated workspace store.
Impact: Location selector now loads correctly (200 OK instead of 400).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

Options:
1. ✅ Accept and commit
2. ✏️ Edit message
3. ⏭️ Skip this commit
4. ❌ Cancel
```

**Commit Generation Details:**

**Headline Generation:**

- Infers action verb based on type:
  - `feat` + new files = "add"
  - `feat` + existing = "implement"
  - `fix` = "fix"
  - `docs` + new = "add"
  - `docs` + existing = "update"
- Identifies subject (component name, feature directory, or generic)
- Adds key detail if space permits (max 72 chars total)

**Summary Generation:**

- **feat:** "Enables [user benefit]"
- **fix:** "Fixes [issue] [impact]"
- **docs:** "Documents [coverage]"
- **refactor:** "Improves [improvement] without behavior changes"

**Details Generation:**

- Parses diff to detect:
  - New functions/components
  - Import changes
  - JSX/component modifications
  - Configuration updates
  - Type changes
- Groups related changes
- Adds context bullets (integration points, impact, root cause)

### Phase 4: Search Issues

**What it does:**

- Extracts keywords from branch name and commit messages
- Searches GitHub issues using `gh issue list`
- Scores issues by relevance:
  - Title match: +10 points
  - Label match: +5 points per label
  - Description match: +3 points
  - Open state: +2 points
  - Milestone match: +8 points
- Determines link action based on score:
  - Score > 15: Suggest "Closes" (high relevance, full coverage)
  - Score 8-15: Suggest "Partially addresses" (medium relevance)
  - Score 5-8: Suggest "Reference" (related context)
  - Score < 5: Don't link
- Presents top 3 results to user
- Offers to create new issue if none found

**Example Output:**

```
🔍 Found 3 related issues:

1. Issue #57: Box Management (CLOSED)
   Score: 18 (High relevance)
   Suggestion: Reference only (already closed by PR #81)
   Reason: Mentions box CRUD operations in title and body

2. Issue #75: MVP Launch Coordination (OPEN)
   Score: 12 (Medium relevance)
   Suggestion: Partially addresses (Box Form contribution)
   Reason: Box Form is part of MVP launch checklist

3. Issue #82: Polish Localization (OPEN)
   Score: 8 (Medium relevance)
   Suggestion: Reference (UI text in Polish)
   Reason: Polish language mentioned in description

No issues found matching "duplicate box name warning"

Options:
1. ✅ Accept suggestions
2. ✏️ Adjust issue links
3. ➕ Create new issue
4. ⏭️ Skip issue linking
```

### Phase 5: Generate PR

**What it does:**

- Pushes branch to remote (warns if force push needed)
- Gathers PR data:
  - All commits on branch
  - Diff statistics (`git diff --stat`)
  - File changes (`git diff --name-status`)
  - Issue links from Phase 4
- Generates each PR section using templates
- Applies PR description template with all variables
- Generates PR title with emoji
- Determines labels from file patterns
- Shows preview to user
- Creates PR using `gh pr create`

**Example Output:**

```
📋 Pull Request Preview:

Title: ✨ feat(ui): enhance Box Form UX with Polish localization

Labels: frontend, enhancement, i18n

Description (2,450 characters):
## 🎯 Summary
This PR enhances the Box Form View with critical bug fixes and complete Polish localization...

[Preview truncated - full description will be in PR]

Statistics:
- 6 commits
- 9 files changed (+1,450, -120)
- 2 issues linked

Options:
1. ✅ Create pull request
2. ✏️ Edit description
3. 🏷️ Adjust labels
4. ❌ Cancel
```

**After creation:**

```
✅ Pull Request Created Successfully!

PR #83: ✨ feat(ui): enhance Box Form UX with Polish localization
URL: https://github.com/DarioRSL/storage-shelves-and-box-organizer/pull/83

Summary:
- 6 commits pushed
- 2 issues linked (partially addresses #75, references #57)
- 9 files changed (+1,450, -120)
- Labels: frontend, enhancement, i18n

Next steps:
- Request review from team members
- Monitor CI/CD pipeline
- Address review feedback
```

## Configuration Guide

### Adding New Commit Types

**File:** `.claude/templates/config.json`

**Steps:**

1. Add type definition to `commit.types` array:

   ```json
   {
     "type": "perf",
     "description": "Performance improvements",
     "emoji": "⚡",
     "scopes": ["db", "api", "ui", "bundle", "render", "queries"]
   }
   ```

2. Update commit message template (`.claude/templates/commit-message.md`) with type-specific guidelines:

   ```markdown
   **perf (Performance):**

   - Describe performance issue and impact
   - Include before/after metrics (timing, memory, etc.)
   - Explain optimization technique used
   - Note any trade-offs
   ```

3. Update skill implementation (`commit-pr-issue.md`) if special handling needed

### Adding New Scopes

**File:** `.claude/templates/config.json`

**Steps:**

1. Add scope to relevant commit type(s):

   ```json
   {
     "type": "feat",
     "scopes": ["ui", "api", "db", "qr-scanner"] // Added qr-scanner
   }
   ```

2. Add to scope category if applicable:

   ```json
   {
     "scopeCategories": {
       "frontend": ["ui", "dashboard", "settings", "qr-scanner"]
     }
   }
   ```

3. Add file pattern for auto-detection:
   ```json
   {
     "filePatterns": {
       "frontend": [
         "src/components/**",
         "src/pages/**",
         "src/lib/qr-scanner/**" // Added pattern
       ]
     }
   }
   ```

### Adding PR Sections

**File:** `.claude/templates/pr-description.md`

**Steps:**

1. Add section to template:

   ```markdown
   ## 🔒 Security Considerations

   {SECURITY_CONSIDERATIONS}
   ```

2. Add variable description:

   ```markdown
   ### {SECURITY_CONSIDERATIONS}

   **Purpose:** Document security analysis and mitigations

   **Format:**

   - List security issues addressed
   - Note new security measures added
   - Explain authentication/authorization changes
   ```

3. Update config (`config.json`) with section metadata:

   ```json
   {
     "pr": {
       "sections": [
         {
           "id": "security",
           "title": "🔒 Security Considerations",
           "required": false,
           "order": 11
         }
       ]
     }
   }
   ```

4. Update skill implementation to generate section content

### Customizing File Patterns

**File:** `.claude/templates/config.json`

**Purpose:** Control how files are auto-categorized

**Examples:**

```json
{
  "filePatterns": {
    "frontend": [
      "src/components/**/*.{tsx,ts}",
      "src/pages/**/*.astro",
      "src/layouts/**/*.astro",
      "src/styles/**/*.css"
    ],
    "backend": ["src/pages/api/**/*.ts", "src/lib/services/**/*.ts", "src/middleware/**/*.ts"],
    "database": ["supabase/migrations/**/*.sql", "src/db/**/*.ts"],
    "testing": ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "tests/**/*"],
    "documentation": [".ai_docs/**/*.md", "*.md", "CLAUDE.md", "README.md"],
    "config": ["*.config.{js,ts,json}", ".prettierrc*", ".eslintrc*", "tsconfig.json"]
  }
}
```

**Glob Pattern Syntax:**

- `**` - Match any number of directories
- `*` - Match any characters except `/`
- `{a,b}` - Match `a` or `b`
- `!pattern` - Exclude pattern (not currently supported, but can be added)

## Templates in Detail

### Commit Message Template

**File:** `.claude/templates/commit-message.md`

**Structure:**

```markdown
# Commit Message Template

## Standard Format

{TYPE}({SCOPE}): {HEADLINE}

{SUMMARY}

{DETAILS}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

## Variable Descriptions

[Detailed explanations of each variable]

## Type-Specific Guidelines

[Guidelines for feat, fix, docs, refactor, etc.]

## Type-Specific Examples

[7+ complete examples from real commits]

## Best Practices

[Tips and anti-patterns]

## Validation Checklist

[Pre-commit verification items]
```

**Key Sections:**

1. **Variable Descriptions:**
   - `{TYPE}` - Selection criteria, valid values
   - `{SCOPE}` - How to extract from paths
   - `{HEADLINE}` - Action verbs, format rules
   - `{SUMMARY}` - WHY explanation patterns
   - `{DETAILS}` - Bullet point format, grouping

2. **Type-Specific Guidelines:**
   - **feat:** User benefits, integration, new dependencies
   - **fix:** Bug symptoms, root cause, solution, testing
   - **docs:** Sections updated, examples added
   - **refactor:** Motivation, improvements, no behavior change
   - **chore:** Version numbers, impact on workflow
   - **i18n:** Language, components translated, text transformations

3. **Examples:**
   - `feat(box-details): add BoxDetailsContent component with full CRUD`
   - `fix(hooks): correct workspace store reference and expose currentWorkspaceId`
   - `feat(ui): enhance Box Form UX with Polish localization and improved navigation`
   - `docs(api-plan): update Box Details endpoint documentation`
   - `refactor(types): consolidate box-related types into shared types.ts`
   - `chore(deps): update Astro to v5.1.2 and related packages`
   - `i18n(settings): translate Settings page components to Polish`

4. **Best Practices:**
   - Be specific (not generic)
   - Explain WHY (not just WHAT)
   - Include context
   - Use imperative mood
   - Reference issues/PRs when relevant
   - Group related changes
   - One logical change per commit

### PR Description Template

**File:** `.claude/templates/pr-description.md`

**Structure:**

```markdown
# Pull Request Description Template

## Standard Format

[10 sections with emojis]

## Variable Descriptions

[Detailed explanations for each section]

## Complete PR Example

[Full example with all sections filled]

## Best Practices

[Tips for comprehensive PRs]

## Validation Checklist

[Pre-submission verification]
```

**Section Details:**

1. **🎯 Summary ({PR_SUMMARY}, {KEY_FEATURES_LIST})**
   - High-level overview (1-3 sentences)
   - Bulleted key features (3-7 items)
   - References to related PRs

2. **📊 Changes Overview ({CHANGES_OVERVIEW})**
   - Commits grouped by category
   - Category headers with commit counts
   - Order: DB → Backend → Frontend → Docs

3. **🏗️ Technical Architecture ({TECHNICAL_ARCHITECTURE})**
   - State management patterns
   - Component hierarchy
   - API integration details
   - Performance optimizations
   - Error handling approach

4. **🧪 Testing & User Feedback ({TESTING_FEEDBACK})**
   - Manual test scenarios with checkboxes
   - User feedback quotes (original language)
   - Test results (before/after states)

5. **📁 Files Changed ({FILES_CHANGED})**
   - New files list with descriptions
   - Modified files list with changes
   - Statistics (lines added/removed/net)

6. **🚀 Deployment Readiness ({DEPLOYMENT_READINESS})**
   - Production ready checklist
   - Database migrations (if any)
   - Breaking changes (if any)
   - Rollback plan

7. **📋 Related Issues ({RELATED_ISSUES})**
   - Closes: Issues fully addressed
   - Partially addresses: Contributions
   - Related context: References

8. **🎯 Next Steps ({NEXT_STEPS})**
   - Immediate tasks (this week)
   - Short-term tasks (next 2 weeks)
   - Long-term tasks (future milestones)

9. **📚 Documentation ({DOCUMENTATION})**
   - New documentation files
   - Updated documentation files
   - Related documentation (reference only)

10. **✅ Checklist ({CHECKLIST})**
    - Standard items (code style, review, testing, etc.)
    - Type-specific items (accessibility, i18n, etc.)

**Footer Variables:**

- `{COMMIT_COUNT}` - Total number of commits
- `{IMPLEMENTATION_DATE}` - Date(s) of work
- `{PR_STATUS}` - Production ready, in progress, etc.
- `{LINES_ADDED}`, `{LINES_REMOVED}`, `{NET_CHANGE}` - Statistics

## Real-World Examples

### Example 1: Feature Implementation

**Branch:** `fb_ui-box-form-implementation`

**Changes:**

- 7 modified files (hooks, forms, components)
- 2 new documentation files

**Skill Execution:**

1. **Phase 1 (Analyze):**
   - Detected frontend changes (6 files)
   - Detected documentation changes (3 files)
   - Suggested 4 commit groups

2. **Phase 2 (Grouping):**
   - Commit 1: fix(hooks) - 1 file (workspace store bug)
   - Commit 2: feat(ui) - 2 files (localization + navigation)
   - Commit 3: fix(ui) - 3 files (location display + modal)
   - Commit 4: docs(ai_docs) - 3 files (review, planning, TODO)

3. **Phase 3 (Commits):**
   - Generated detailed messages for each
   - User accepted all 4 commits
   - Executed `git add` + `git commit` for each

4. **Phase 4 (Issues):**
   - Found Issue #75 (MVP Launch) - score 12
   - Found Issue #57 (Box Management) - score 18 (closed)
   - Suggested: Partially addresses #75, Reference #57
   - User accepted

5. **Phase 5 (PR):**
   - Title: `✨ feat(ui): enhance Box Form UX with Polish localization`
   - Labels: frontend, enhancement, i18n
   - Description: 2,450 characters, all 10 sections filled
   - User approved and created PR #83

**Result:**

- 6 commits total (4 from skill + 2 previous)
- Professional PR description
- Linked to 2 issues
- Ready for review in 8 minutes

### Example 2: Bug Fix

**Branch:** `fb_fix-location-selector-400`

**Changes:**

- 1 modified file (useBoxForm.ts)

**Skill Execution:**

1. **Phases 1-2:** Suggested 1 commit (fix(hooks))
2. **Phase 3:** Generated detailed commit message with root cause analysis
3. **Phase 4:** Found Issue #84 (Location Selector Bug) - suggested "Closes"
4. **Phase 5:** Created simple PR (mostly commit details)

**Result:**

- 1 focused commit
- Issue closed automatically when PR merged
- Clear bug description and fix in commit message

### Example 3: Documentation Update

**Branch:** `fb_docs-api-endpoints`

**Changes:**

- 3 modified `.ai_docs/*.md` files

**Skill Execution:**

1. **Phases 1-2:** Suggested 1 commit (docs(ai_docs))
2. **Phase 3:** Generated commit listing each file's updates
3. **Phase 4:** No related issues found
4. **Phase 5:** Simple docs PR with file list

**Result:**

- 1 commit
- No issue linking
- Clean documentation PR

## Troubleshooting

### Problem: Skill suggests wrong commit type

**Symptoms:**

- File changes are categorized as `feat` but should be `fix`
- Or vice versa

**Solutions:**

1. **Use "Adjust grouping manually" option:**
   - When presented with suggested groups
   - Select option 2 (✏️ Adjust grouping manually)
   - Change commit type for affected group

2. **Edit commit message directly:**
   - When shown commit preview
   - Select option 2 (✏️ Edit message)
   - Change `{TYPE}` to correct value

3. **Update diff analysis (for future):**
   - If pattern is consistent, update skill's `inferType()` function
   - Add keywords to detect specific types

### Problem: Generated commit message too generic

**Symptoms:**

- Headline says "update files" or "add component"
- Details list files but don't explain changes
- Summary doesn't explain WHY

**Solutions:**

1. **Edit message before committing:**
   - Select option 2 (✏️ Edit message) in preview
   - Add specific details from your knowledge of changes
   - Explain WHY changes were made

2. **Improve diff analysis (for future):**
   - Skill's `generateDetails()` function can be enhanced
   - Add patterns to detect specific code changes
   - Example: Detect state management changes, API calls, etc.

3. **Provide hints during workflow:**
   - When skill asks for grouping confirmation, add notes
   - Notes can inform commit message generation

### Problem: PR description missing key information

**Symptoms:**

- Technical Architecture section empty
- Testing section has only template
- Next Steps missing important tasks

**Solutions:**

1. **Edit PR after creation:**
   - GitHub PR can be edited directly
   - Add missing sections manually
   - Still benefits from template structure

2. **Add to commit messages:**
   - Skill extracts PR content from commits
   - Rich commit messages → rich PR descriptions
   - Add architecture notes to relevant commits

3. **Update template:**
   - Add default content for common scenarios
   - Customize `.claude/templates/pr-description.md`

### Problem: Issue linking suggestions irrelevant

**Symptoms:**

- Suggested issues don't relate to work
- Scoring algorithm finds wrong matches
- Missing relevant issues

**Solutions:**

1. **Use "Adjust issue links" option:**
   - Select option 2 (✏️ Adjust issue links)
   - Remove irrelevant suggestions
   - Manually search for correct issues

2. **Create new issue:**
   - If no relevant issue exists
   - Select option 3 (➕ Create new issue)
   - Skill will help generate issue content

3. **Improve search (for future):**
   - Update keyword extraction in skill
   - Adjust scoring weights in `scoreIssue()`
   - Add domain-specific patterns

### Problem: Skill takes too long to run

**Symptoms:**

- Waiting several minutes for analysis
- Large number of files to process
- Complex diff analysis

**Solutions:**

1. **Break work into smaller branches:**
   - Instead of 50 files in one branch
   - Create multiple feature branches with 5-10 files each
   - Each branch = focused PR

2. **Commit incrementally:**
   - Don't wait until end of feature
   - Run skill after each logical unit of work
   - Smaller commits = faster processing

3. **Optimize skill (for future):**
   - Cache configuration loading
   - Parallelize independent operations
   - Add timeout limits

### Problem: Git commit fails (pre-commit hook)

**Symptoms:**

- Linting errors prevent commit
- Type errors block commit
- Tests fail in pre-commit hook

**Solutions:**

1. **Fix issues and retry:**
   - Skill will show error output
   - Fix linting/type/test errors
   - Select option 1 (Fix and retry)

2. **Skip commit temporarily:**
   - Select option 2 (⏭️ Skip this commit)
   - Continue with other commits
   - Come back to fix later

3. **Run linter before skill:**
   ```bash
   npm run lint:fix
   npm run format
   # Then run skill
   /commit-pr-issue
   ```

### Problem: Remote branch already exists

**Symptoms:**

- Error when trying to push branch
- Warning about force push needed

**Solutions:**

1. **Force push (if safe):**
   - Verify no one else is working on branch
   - Select option 1 (Force push)
   - Be aware this rewrites history

2. **Rename local branch:**
   - Select option 2 (Rename branch)
   - Create PR with new branch name

3. **Delete remote branch first:**
   ```bash
   git push origin --delete <branch-name>
   # Then run skill again
   ```

## Best Practices

### 1. Review Changes Before Running

**Why:** Understanding your changes helps you guide the skill

**How:**

```bash
# Check what files changed
git status

# Review detailed changes
git diff

# Verify you're on correct branch
git branch

# Check diff stat
git diff --stat master..HEAD
```

**Benefit:** You can quickly spot if skill's suggestions don't match your intent

### 2. Use Meaningful Branch Names

**Why:** Branch name informs issue search keywords

**Format:** `fb_<feature-area>_<short-description>`

**Examples:**

- ✅ `fb_ui-box-form-implementation`
- ✅ `fb_api-duplicate-name-validation`
- ✅ `fb_db-workspace-permissions-rls`
- ❌ `fb_work` (too vague)
- ❌ `my-branch` (no context)

**Benefit:** Better issue matching, clearer PR context

### 3. Commit Frequently

**Why:** Smaller, focused commits are easier to review and revert

**Strategy:**

- Complete one logical unit of work
- Run skill to commit
- Move to next unit

**Example:**

```
Day 1: Implement Box Form component → commit
Day 1: Add form validation → commit
Day 2: Add location selector → commit
Day 2: Add Polish localization → commit
Day 2: Create PR
```

**vs. Bad:**

```
Day 1-2: Work on everything
Day 2: Run skill, get 50 files in one commit
```

**Benefit:** Clearer git history, easier code review, simpler rollback

### 4. Provide Context in Commits

**Why:** Future you (and team) will thank you

**What to include:**

- **WHY** changes were made (not just WHAT)
- Root cause of bugs
- User feedback that influenced decisions
- Integration points with existing code
- Trade-offs considered

**Example:**

✅ Good commit message:

```
fix(hooks): correct workspace store reference and expose currentWorkspaceId

Fixes critical bug preventing location selector from loading (400 Bad Request).

- Change import from unused workspace.store.ts to active @/stores/dashboard
- Use useStore hook from @nanostores/react for reactive state
- Expose currentWorkspaceId in hook's return interface

Root cause: Hook was using outdated workspace store instead of active dashboard store.
Impact: Location selector now loads correctly (200 OK instead of 400).
```

❌ Bad commit message:

```
fix: update useBoxForm

- Changed import
- Added export
```

### 5. Link Issues Correctly

**Why:** Proper linking closes issues automatically and provides traceability

**Guidelines:**

- **Use "Closes"** only for work that fully completes an issue

  ```markdown
  Closes #57 - Box Management CRUD complete
  ```

- **Use "Partially addresses"** for contributions to larger work

  ```markdown
  Partially addresses #75 - MVP Launch (Box Form contribution)
  ```

- **Use "Reference"** for context, no auto-close
  ```markdown
  Reference to #81 - Builds on Box Details View from this PR
  ```

**Benefits:**

- Issues auto-close when appropriate
- Issue timeline shows all related PRs
- Clear progress tracking

### 6. Review Generated Content

**Why:** AI is smart but not perfect

**What to review:**

1. **Commit groupings:**
   - Do files belong together?
   - Should any be split or merged?

2. **Commit messages:**
   - Are headlines accurate?
   - Does summary explain WHY?
   - Do details cover key changes?

3. **Issue links:**
   - Are suggested issues relevant?
   - Is link type correct (closes vs partially addresses)?

4. **PR description:**
   - Are all sections complete?
   - Is technical architecture accurate?
   - Are test scenarios comprehensive?

**Remember:** You can edit at every step!

### 7. Keep Templates Updated

**Why:** Templates should evolve with project

**When to update:**

- **New commit types needed:**
  - Add to `config.json`
  - Update `commit-message.md` with guidelines

- **New PR sections needed:**
  - Add to `pr-description.md`
  - Update `config.json` with metadata

- **File patterns change:**
  - Update `filePatterns` in `config.json`

- **Examples get stale:**
  - Replace with recent, better examples

**Process:**

1. Edit template/config files
2. Test on new branch
3. Document changes in this file
4. Commit template updates

## Maintenance

### Updating Templates

**Frequency:** As needed when conventions change

**Process:**

1. **Identify need for change:**
   - New commit type used frequently
   - PR section consistently missing content
   - File categorization wrong

2. **Update relevant files:**

   ```bash
   # Edit configuration
   nano .claude/templates/config.json

   # Edit commit template
   nano .claude/templates/commit-message.md

   # Edit PR template
   nano .claude/templates/pr-description.md

   # Edit skill if needed
   nano .claude/commands/commit-pr-issue.md
   ```

3. **Test changes:**
   - Create test branch
   - Run skill
   - Verify templates work correctly

4. **Document updates:**
   - Update this documentation
   - Note version change
   - Add to changelog

5. **Commit template changes:**
   ```bash
   git add .claude/templates/
   git commit -m "chore(templates): update commit types for [reason]"
   ```

### Version History

Track template changes:

```markdown
## Template Changelog

### v1.0.0 (2026-01-04)

- Initial implementation
- 10 commit types
- 10 PR sections
- File pattern auto-categorization
- Issue scoring algorithm

### v1.1.0 (Future)

- Added `perf` commit type
- Added Security Considerations PR section
- Updated file patterns for new directory structure
- Improved issue scoring for milestones
```

### Monitoring Quality

**Metrics to track:**

1. **Commit message quality:**
   - Average commit message length
   - % with detailed DETAILS section
   - % with clear WHY in SUMMARY

2. **PR description completeness:**
   - % of PRs with all required sections
   - Average PR description length
   - User feedback on PR clarity

3. **Issue linking accuracy:**
   - % of auto-closed issues correctly addressed
   - % of suggested issues accepted
   - % of manual overrides

4. **Time savings:**
   - Time to create PR before vs after skill
   - Code review time (clearer PRs = faster reviews)

**Review quarterly:**

- Analyze metrics
- Identify template improvements
- Update documentation

## Advanced Usage

### Customizing Workflow

**Skip issue linking:**

- When prompted in Phase 4, select "Skip"
- Useful for internal branches or WIP PRs

**Create multiple PRs from one branch:**

- Run skill for first set of commits
- Create PR
- Continue working on branch
- Run skill again for next set

**Rebase before PR:**

```bash
# Update master
git checkout master
git pull

# Rebase feature branch
git checkout fb_feature
git rebase master

# Then run skill
/commit-pr-issue
```

### Integration with CI/CD

**Validate commit messages:**

```yaml
# .github/workflows/validate-commits.yml
name: Validate Commits

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate commit format
        run: |
          # Check conventional commit format
          # Verify all commits have Claude Code footer
```

**Auto-label PRs:**

```yaml
# .github/workflows/auto-label.yml
name: Auto Label PRs

on:
  pull_request:
    types: [opened]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Add labels based on files
        # Read PR description, add labels
```

### Team Adoption

**Training:**

1. Share this documentation
2. Demo skill on sample branch
3. Pair program first few uses
4. Establish team conventions

**Code review checklist:**

- [ ] Commits follow conventional format
- [ ] Each commit is logical unit
- [ ] PR description complete
- [ ] Issues linked correctly
- [ ] All checklist items marked

**Continuous improvement:**

- Collect feedback on template quality
- Share best practices
- Update templates based on team input

## Frequently Asked Questions

### Q: Can I use this on any branch?

**A:** Yes, but recommended for feature branches only. The skill is designed for `fb_*` branches and will warn if you're on `master`.

### Q: What if I disagree with suggested grouping?

**A:** Use option 2 "Adjust grouping manually" to move files between commits, split commits, or merge commits. You have full control.

### Q: Can I edit commit messages after they're created?

**A:** Yes, with `git commit --amend` for the last commit, or `git rebase -i` for earlier commits. But it's better to edit during skill preview.

### Q: Does the skill work offline?

**A:** Partially. Phases 1-3 (analyze, group, commit) work offline. Phase 4 (issue search) requires internet. Phase 5 (PR creation) requires internet and GitHub authentication.

### Q: Can I customize the commit message format?

**A:** Yes! Edit `.claude/templates/commit-message.md` to change format. Just keep variable placeholders (`{TYPE}`, etc.) so skill can fill them.

### Q: What if my project uses different conventions?

**A:** Update `.claude/templates/config.json` with your types, scopes, and patterns. The system is fully customizable.

### Q: How do I add custom PR sections?

**A:** Edit `.claude/templates/pr-description.md` to add sections, then update the skill to generate content for them.

### Q: Can I run the skill in CI/CD?

**A:** Not directly (it requires user interaction). But you can validate that commits follow conventions using regex in CI.

### Q: What if issue search finds nothing?

**A:** The skill offers to create a new issue, skip issue linking, or let you manually search and link.

### Q: How do I update the skill itself?

**A:** Edit `.claude/commands/commit-pr-issue.md`. Be careful with the workflow phases - they're interdependent.

## Support and Contributions

**For help:**

- Review this documentation
- Check `.claude/templates/` for examples
- Review recent PRs created with the skill

**To improve the system:**

1. Identify limitation or improvement
2. Update relevant templates/config/skill
3. Test thoroughly
4. Document changes in this file
5. Create PR with template updates

**Report issues:**

- Open GitHub issue with "template" label
- Describe problem and expected behavior
- Include example branch/PR where issue occurred

## Conclusion

This commit/PR/issue system transforms Git workflows from time-consuming manual processes into efficient, consistent, high-quality automation. By combining:

- **Templates** for structure and consistency
- **Configuration** for project-specific customization
- **AI intelligence** for analysis and generation
- **User interaction** for oversight and adjustment

You get the best of both worlds: automation speed with human judgment.

**Key takeaways:**

1. **Templates are generic** - Work for any branch, any feature
2. **Configuration is project-specific** - Customize types, scopes, patterns
3. **Skill orchestrates workflow** - 5 phases from analysis to PR creation
4. **System evolves** - Update templates as project grows

**Start using it today:**

```bash
# From any feature branch with uncommitted changes:
/commit-pr-issue
```

**Happy committing! 🚀**

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-04
**Maintained By:** Project Team
**Related Files:**

- [Commit Template](../../.claude/templates/commit-message.md)
- [PR Template](../../.claude/templates/pr-description.md)
- [Configuration](../../.claude/templates/config.json)
- [Skill](../../.claude/commands/commit-pr-issue.md)
