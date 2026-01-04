# Commit-PR-Issue Workflow Automation

**Skill Name:** `commit-pr-issue`

**Purpose:** Automate the complete Git workflow from staging changes to creating a comprehensive pull request with linked issues. This skill analyzes modified files, suggests logical commit groupings, generates detailed commit messages following project conventions, searches for related GitHub issues, and creates a comprehensive PR description.

**Author:** Claude Code Template System v1.0.0

**Last Updated:** 2026-01-04

## Overview

This skill implements a 5-phase workflow that transforms uncommitted changes into a production-ready pull request:

1. **Phase 1: Analyze Changes** - Inspect git status, diff, and categorize files
2. **Phase 2: Suggest Grouping** - Intelligently group files into logical commits
3. **Phase 3: Generate Commits** - Create detailed, conventional commits for each group
4. **Phase 4: Search Issues** - Find and link related GitHub issues
5. **Phase 5: Generate PR** - Create comprehensive pull request with full documentation

## Prerequisites

Before running this skill, ensure:
- [x] You are on a feature branch (not `master` or `main`)
- [x] You have uncommitted changes to commit
- [x] GitHub CLI (`gh`) is authenticated (`gh auth status`)
- [x] You have reviewed your changes and are ready to commit
- [x] Remote branch does not exist yet OR you have permission to force push

## Quick Start

```bash
# From any feature branch with uncommitted changes:
/commit-pr-issue

# The skill will guide you through:
# 1. Review suggested commit groups
# 2. Confirm or adjust grouping
# 3. Review and approve commit messages
# 4. Select related issues
# 5. Review and create PR
```

## Detailed Workflow

### Phase 1: Analyze Changes

**Goal:** Understand what files changed and how they should be categorized.

**Steps:**

1. **Load Configuration**
   - Read `.claude/templates/config.json`
   - Parse commit types, scopes, file patterns
   - Store for later use

2. **Execute Git Commands** (in parallel)
   ```bash
   git status --short
   git diff --stat master..HEAD
   git diff master..HEAD
   git log --oneline master..HEAD
   ```

3. **Categorize Files**
   - For each modified/new file:
     - Match path against `filePatterns` in config
     - Assign category (frontend, backend, database, documentation, tooling)
     - Extract scope from path (e.g., `src/components/hooks/` → scope: `hooks`)
     - Analyze diff content for change type hints

4. **Detect Related Files**
   - Parse import statements to find dependencies
   - Group files that import each other
   - Note if files are in same component/feature directory

**Output:**
```typescript
interface FileAnalysis {
  path: string;
  status: 'M' | 'A' | 'D';  // Modified, Added, Deleted
  category: 'frontend' | 'backend' | 'database' | 'documentation' | 'tooling';
  suggestedScope: string;
  suggestedType: string;
  relatedFiles: string[];
  linesAdded: number;
  linesRemoved: number;
}
```

### Phase 2: Suggest Grouping

**Goal:** Present intelligent commit groupings to user for approval.

**Grouping Algorithm:**

```typescript
function groupFiles(files: FileAnalysis[], config: Config): CommitGroup[] {
  const groups: CommitGroup[] = [];

  // 1. Group database migrations (always separate, always first)
  const dbMigrations = files.filter(f => f.category === 'database');
  if (dbMigrations.length > 0) {
    groups.push({
      type: 'feat',
      scope: 'db',
      files: dbMigrations,
      suggestedHeadline: 'add database migration for [feature]'
    });
  }

  // 2. Group backend changes by scope
  const backendFiles = files.filter(f => f.category === 'backend');
  const backendByScope = groupByScope(backendFiles);
  for (const [scope, scopeFiles] of Object.entries(backendByScope)) {
    groups.push({
      type: inferType(scopeFiles),
      scope,
      files: scopeFiles,
      suggestedHeadline: generateHeadline(scopeFiles)
    });
  }

  // 3. Group frontend changes by feature/component
  const frontendFiles = files.filter(f => f.category === 'frontend');
  const frontendGroups = groupByFeature(frontendFiles);
  for (const group of frontendGroups) {
    // If group has both bug fixes and features, split them
    const fixes = group.filter(f => f.suggestedType === 'fix');
    const features = group.filter(f => f.suggestedType === 'feat');

    if (fixes.length > 0) {
      groups.push({
        type: 'fix',
        scope: group[0].suggestedScope,
        files: fixes,
        suggestedHeadline: generateHeadline(fixes)
      });
    }

    if (features.length > 0) {
      groups.push({
        type: 'feat',
        scope: group[0].suggestedScope,
        files: features,
        suggestedHeadline: generateHeadline(features)
      });
    }
  }

  // 4. Group documentation files (always last, always separate)
  const docFiles = files.filter(f => f.category === 'documentation');
  const aiDocs = docFiles.filter(f => f.path.includes('.ai_docs/'));
  const otherDocs = docFiles.filter(f => !f.path.includes('.ai_docs/'));

  // Separate AI docs by type (review vs planning vs other)
  const reviewDocs = aiDocs.filter(f => f.path.includes('review/'));
  const planningDocs = aiDocs.filter(f => f.path.includes('plan'));
  const otherAiDocs = aiDocs.filter(f => !f.path.includes('review/') && !f.path.includes('plan'));

  if (reviewDocs.length > 0) {
    groups.push({
      type: 'docs',
      scope: 'review',
      files: reviewDocs,
      suggestedHeadline: generateHeadline(reviewDocs)
    });
  }

  if (planningDocs.length > 0) {
    groups.push({
      type: 'docs',
      scope: 'planning',
      files: planningDocs,
      suggestedHeadline: generateHeadline(planningDocs)
    });
  }

  if (otherAiDocs.length > 0) {
    groups.push({
      type: 'docs',
      scope: 'ai_docs',
      files: otherAiDocs,
      suggestedHeadline: generateHeadline(otherAiDocs)
    });
  }

  if (otherDocs.length > 0) {
    groups.push({
      type: 'docs',
      scope: inferScope(otherDocs),
      files: otherDocs,
      suggestedHeadline: generateHeadline(otherDocs)
    });
  }

  return groups;
}

function inferType(files: FileAnalysis[]): CommitType {
  // Check diff content for clues
  const hasNewFiles = files.some(f => f.status === 'A');
  const hasFixKeywords = files.some(f =>
    f.diffContent?.match(/fix|bug|error|issue|correct|resolve/i)
  );

  if (hasFixKeywords) return 'fix';
  if (hasNewFiles) return 'feat';

  // Check for refactor patterns
  const hasRefactorKeywords = files.some(f =>
    f.diffContent?.match(/refactor|restructure|reorganize|extract/i)
  );
  if (hasRefactorKeywords) return 'refactor';

  // Default to feat for new functionality
  return 'feat';
}

function groupByFeature(files: FileAnalysis[]): FileAnalysis[][] {
  // Group files that:
  // 1. Are in same directory
  // 2. Import each other
  // 3. Have related names (e.g., BoxForm.tsx and useBoxForm.ts)

  const groups: FileAnalysis[][] = [];
  const grouped = new Set<string>();

  for (const file of files) {
    if (grouped.has(file.path)) continue;

    const relatedFiles = files.filter(f =>
      !grouped.has(f.path) &&
      (f.relatedFiles.includes(file.path) ||
       file.relatedFiles.includes(f.path) ||
       areInSameFeature(file, f))
    );

    groups.push([file, ...relatedFiles]);
    grouped.add(file.path);
    relatedFiles.forEach(f => grouped.add(f.path));
  }

  return groups;
}
```

**User Interaction:**

Present groupings with file counts and suggested headlines:

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

Commit 4: docs(ai_docs): update documentation with implementation details
  Files (3):
  - .ai_docs/project-TO-DO.md
  - .ai_docs/review/box-form-view-implementation-review.md
  - .ai_docs/duplicate-name-warning-feature-plan.md

Options:
1. ✅ Accept suggested grouping
2. ✏️ Adjust grouping manually
3. 🔍 Show detailed diff for review
4. ❌ Cancel workflow

Your choice:
```

**If user chooses "Adjust grouping manually":**
- Allow user to move files between groups
- Allow user to split or merge groups
- Allow user to change commit types/scopes
- Re-present for confirmation

### Phase 3: Generate Commits

**Goal:** Create detailed commit messages and execute git commits.

**For Each Group:**

1. **Load Commit Template**
   - Read `.claude/templates/commit-message.md`
   - Parse variable placeholders

2. **Generate Commit Components**

   **{TYPE}:** From group metadata (already determined)

   **{SCOPE}:** From group metadata (already determined)

   **{HEADLINE}:** Generate action-based description
   ```typescript
   function generateHeadline(group: CommitGroup): string {
     const { type, files } = group;

     // Extract primary action
     const action = inferAction(files, type);

     // Identify main component/feature
     const subject = inferSubject(files);

     // Build headline: action + subject + key details
     let headline = `${action} ${subject}`;

     // Add key detail if space permits (max 72 chars total)
     const detail = inferKeyDetail(files);
     const prefix = `${type}(${group.scope}): `;
     const available = 72 - prefix.length - headline.length;

     if (detail && available > detail.length + 5) {
       headline += ` ${detail}`;
     }

     return headline;
   }

   function inferAction(files: FileAnalysis[], type: CommitType): string {
     const hasNewFiles = files.some(f => f.status === 'A');

     switch (type) {
       case 'feat':
         if (hasNewFiles) return 'add';
         return 'implement';
       case 'fix':
         return 'fix';
       case 'docs':
         if (hasNewFiles) return 'add';
         return 'update';
       case 'refactor':
         return 'refactor';
       case 'chore':
         return 'update';
       case 'style':
         return 'format';
       case 'i18n':
         return 'translate';
       default:
         return 'update';
     }
   }

   function inferSubject(files: FileAnalysis[]): string {
     // Extract common component/feature name
     const paths = files.map(f => f.path);

     // Check for common component name
     const componentNames = paths
       .map(p => p.match(/\/([A-Z][a-zA-Z]+)\.(tsx|ts|astro)$/)?.[1])
       .filter(Boolean);

     if (componentNames.length === 1) {
       return `${componentNames[0]} component`;
     }

     // Check for common feature directory
     const featureDirs = paths
       .map(p => p.match(/components\/([^/]+)\//)?.[1])
       .filter(Boolean);

     const uniqueDirs = [...new Set(featureDirs)];
     if (uniqueDirs.length === 1) {
       return uniqueDirs[0];
     }

     // Generic description based on file types
     const hasComponents = paths.some(p => p.includes('/components/'));
     const hasHooks = paths.some(p => p.includes('/hooks/'));
     const hasDocs = paths.some(p => p.includes('.md'));

     if (hasComponents) return 'components';
     if (hasHooks) return 'hooks';
     if (hasDocs) return 'documentation';

     return 'files';
   }
   ```

   **{SUMMARY}:** One-line WHY explanation
   ```typescript
   function generateSummary(group: CommitGroup): string {
     const { type, files, diffAnalysis } = group;

     // For fixes: explain what was broken
     if (type === 'fix') {
       const issue = diffAnalysis.issueDescription;
       const impact = diffAnalysis.impactDescription;
       return `Fixes ${issue} ${impact}.`;
     }

     // For features: explain user benefit
     if (type === 'feat') {
       const benefit = diffAnalysis.userBenefit;
       return `Enables ${benefit}.`;
     }

     // For docs: explain what documentation covers
     if (type === 'docs') {
       const coverage = diffAnalysis.documentationCoverage;
       return `Documents ${coverage}.`;
     }

     // For refactor: explain improvement
     if (type === 'refactor') {
       const improvement = diffAnalysis.improvementDescription;
       return `Improves ${improvement} without behavior changes.`;
     }

     // Generic
     return `Updates ${inferSubject(files)} for better maintainability.`;
   }
   ```

   **{DETAILS}:** Bullet-point list from diff analysis
   ```typescript
   function generateDetails(group: CommitGroup): string {
     const { files, diffAnalysis } = group;
     const bullets: string[] = [];

     // Analyze each file's changes
     for (const file of files) {
       const changes = analyzeDiff(file);

       // Group changes by type
       const additions = changes.filter(c => c.type === 'add');
       const modifications = changes.filter(c => c.type === 'modify');
       const deletions = changes.filter(c => c.type === 'delete');

       // Generate bullets for additions
       for (const add of additions) {
         bullets.push(`Add ${add.description} in ${file.path}`);
       }

       // Generate bullets for modifications
       for (const mod of modifications) {
         bullets.push(`Update ${mod.description} in ${file.path}`);
       }

       // Generate bullets for deletions
       for (const del of deletions) {
         bullets.push(`Remove ${del.description} from ${file.path}`);
       }
     }

     // Add integration/context bullets
     if (diffAnalysis.integrationPoints.length > 0) {
       bullets.push(...diffAnalysis.integrationPoints.map(i =>
         `Integrate with ${i.component} via ${i.method}`
       ));
     }

     // Add impact bullets for fixes
     if (group.type === 'fix' && diffAnalysis.impact) {
       bullets.push(`Impact: ${diffAnalysis.impact}`);
     }

     return bullets.map(b => `- ${b}`).join('\n');
   }

   function analyzeDiff(file: FileAnalysis): Change[] {
     const changes: Change[] = [];
     const diff = file.diffContent;

     // Parse diff for specific changes
     const addedLines = diff.split('\n').filter(l => l.startsWith('+'));
     const removedLines = diff.split('\n').filter(l => l.startsWith('-'));

     // Detect new functions/components
     const newFunctions = addedLines
       .filter(l => l.match(/^(\+\s*)?(function|const \w+ = |export (async )?function)/))
       .map(l => ({
         type: 'add',
         description: extractFunctionName(l)
       }));

     changes.push(...newFunctions);

     // Detect modified imports
     const importChanges = detectImportChanges(addedLines, removedLines);
     changes.push(...importChanges);

     // Detect JSX/component changes
     const componentChanges = detectComponentChanges(addedLines, removedLines);
     changes.push(...componentChanges);

     return changes;
   }
   ```

3. **Apply Template**
   ```typescript
   function applyCommitTemplate(
     template: string,
     type: string,
     scope: string,
     headline: string,
     summary: string,
     details: string
   ): string {
     return template
       .replace('{TYPE}', type)
       .replace('{SCOPE}', scope)
       .replace('{HEADLINE}', headline)
       .replace('{SUMMARY}', summary)
       .replace('{DETAILS}', details);
   }
   ```

4. **Show Preview to User**
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

   Root cause: Hook was using outdated workspace store instead of the active store used by dashboard.

   Impact: Location selector now loads correctly (200 OK instead of 400 Bad Request).

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

   Options:
   1. ✅ Accept and commit
   2. ✏️ Edit message
   3. ⏭️ Skip this commit
   4. ❌ Cancel workflow

   Your choice:
   ```

5. **Execute Git Commit**
   ```bash
   git add <files in group>
   git commit -m "$(cat <<'EOF'
   <commit message>
   EOF
   )"
   ```

6. **Verify Commit**
   ```bash
   git log -1 --stat
   ```

**Repeat for all groups.**

### Phase 4: Search Issues

**Goal:** Find related GitHub issues and suggest linking strategy.

**Steps:**

1. **Extract Keywords**
   ```typescript
   function extractKeywords(branchName: string, commits: Commit[]): string[] {
     const keywords: string[] = [];

     // Extract from branch name
     const branchWords = branchName
       .replace(/^fb_/, '')
       .replace(/-/g, ' ')
       .split('_');
     keywords.push(...branchWords);

     // Extract from commit subjects
     for (const commit of commits) {
       const subject = commit.subject;
       const words = subject
         .replace(/^(feat|fix|docs|refactor|chore|style|i18n)\([^)]+\):\s*/, '')
         .split(/\s+/)
         .filter(w => w.length > 3);
       keywords.push(...words);
     }

     // Extract scopes
     const scopes = commits.map(c =>
       c.subject.match(/\(([^)]+)\)/)?.[1]
     ).filter(Boolean);
     keywords.push(...scopes);

     return [...new Set(keywords)];
   }
   ```

2. **Search GitHub Issues**
   ```bash
   gh issue list \
     --repo DarioRSL/storage-shelves-and-box-organizer \
     --search "box form management CRUD" \
     --state all \
     --json number,title,state,labels,body \
     --limit 20
   ```

3. **Score Issues by Relevance**
   ```typescript
   function scoreIssue(issue: GitHubIssue, keywords: string[]): number {
     let score = 0;

     // Title match (highest weight)
     for (const keyword of keywords) {
       if (issue.title.toLowerCase().includes(keyword.toLowerCase())) {
         score += 10;
       }
     }

     // Label match
     for (const label of issue.labels) {
       for (const keyword of keywords) {
         if (label.name.toLowerCase().includes(keyword.toLowerCase())) {
           score += 5;
         }
       }
     }

     // Body match (lower weight)
     for (const keyword of keywords) {
       if (issue.body?.toLowerCase().includes(keyword.toLowerCase())) {
         score += 3;
       }
     }

     // State bonus (open issues more relevant)
     if (issue.state === 'open') {
       score += 2;
     }

     // Milestone match (if branch has milestone reference)
     if (issue.milestone && branchName.includes(issue.milestone)) {
       score += 8;
     }

     return score;
   }
   ```

4. **Determine Link Action**
   ```typescript
   function determineLinkAction(issue: GitHubIssue, score: number, commits: Commit[]): LinkAction {
     // High relevance: suggest closing
     if (score > 15) {
       // Check if commits fully address issue
       const issueKeywords = extractIssueKeywords(issue);
       const commitKeywords = extractCommitKeywords(commits);
       const coverage = calculateCoverage(issueKeywords, commitKeywords);

       if (coverage > 0.8) {
         return { type: 'closes', issue: issue.number, reason: 'High relevance, full coverage' };
       } else {
         return { type: 'partially_addresses', issue: issue.number, reason: 'High relevance, partial coverage' };
       }
     }

     // Medium relevance: suggest partial addressing
     if (score > 8) {
       return { type: 'partially_addresses', issue: issue.number, reason: 'Medium relevance' };
     }

     // Low relevance: suggest reference only
     if (score > 5) {
       return { type: 'reference', issue: issue.number, reason: 'Related context' };
     }

     // Too low: don't link
     return { type: 'none', issue: issue.number, reason: 'Low relevance' };
   }
   ```

5. **Present to User**
   ```
   🔍 Found 3 related issues:

   1. Issue #57: Box Management (CLOSED)
      Score: 18 (High relevance)
      Suggestion: Reference only (already closed by PR #81)

   2. Issue #75: MVP Launch Coordination (OPEN)
      Score: 12 (Medium relevance)
      Suggestion: Partially addresses (Box Form contribution)

   3. Issue #82: Polish Localization (OPEN)
      Score: 8 (Medium relevance)
      Suggestion: Reference (UI text in Polish)

   No new issues found matching "duplicate box name warning"

   Options:
   1. ✅ Accept suggestions
   2. ✏️ Adjust issue links
   3. ➕ Create new issue for unaddressed work
   4. ⏭️ Skip issue linking

   Your choice:
   ```

6. **If user chooses "Create new issue":**
   - Extract unaddressed work from commits
   - Generate issue title and body
   - Use `gh issue create` with template
   - Add to link list

### Phase 5: Generate PR

**Goal:** Create comprehensive pull request with all sections filled.

**Steps:**

1. **Push Branch to Remote**
   ```bash
   # Check if remote branch exists
   git ls-remote --heads origin <branch-name>

   # If exists, warn user about force push
   # If not, push normally
   git push -u origin <branch-name>
   ```

2. **Gather PR Data**
   ```typescript
   interface PRData {
     commits: Commit[];
     diffStat: DiffStat;
     filesChanged: FileChange[];
     issues: IssueLink[];
     branchName: string;
     baseBranch: string;
   }

   async function gatherPRData(): Promise<PRData> {
     // Get all commits on branch
     const commits = await execGit('log --oneline master..HEAD');

     // Get diff statistics
     const diffStat = await execGit('diff --stat master..HEAD');

     // Get file changes
     const filesChanged = await execGit('diff --name-status master..HEAD');

     // Get current branch name
     const branchName = await execGit('rev-parse --abbrev-ref HEAD');

     return {
       commits: parseCommits(commits),
       diffStat: parseDiffStat(diffStat),
       filesChanged: parseFileChanges(filesChanged),
       issues: issueLinks,  // from Phase 4
       branchName,
       baseBranch: 'master'
     };
   }
   ```

3. **Load PR Template**
   - Read `.claude/templates/pr-description.md`
   - Parse all variable placeholders

4. **Generate PR Sections**

   **{PR_SUMMARY}:**
   ```typescript
   function generatePRSummary(data: PRData): string {
     // Synthesize from commit messages
     const commitTypes = data.commits.map(c => c.type);
     const primaryType = mostFrequent(commitTypes);

     const scopes = data.commits.map(c => c.scope);
     const primaryScope = mostFrequent(scopes);

     // Extract key accomplishments
     const accomplishments = data.commits
       .map(c => c.headline)
       .slice(0, 3);

     // Build summary
     let summary = `This PR ${primaryType === 'feat' ? 'implements' : 'enhances'} `;
     summary += `the ${primaryScope} with ${accomplishments.length} key improvements. `;

     // Add context from branch name
     const featureName = data.branchName.replace(/^fb_/, '').replace(/_/g, ' ');
     summary += `It completes the ${featureName} work`;

     // Add related PR context
     const relatedPRs = detectRelatedPRs(data.commits);
     if (relatedPRs.length > 0) {
       summary += ` following ${relatedPRs.map(pr => `PR #${pr}`).join(', ')}`;
     }

     summary += '.';

     return summary;
   }
   ```

   **{KEY_FEATURES_LIST}:**
   ```typescript
   function generateKeyFeaturesList(data: PRData): string {
     const features: string[] = [];

     // Extract from commit headlines
     for (const commit of data.commits) {
       const emoji = getEmojiForType(commit.type);
       const feature = `${emoji} ${capitalize(commit.headline)}`;
       features.push(`- ${feature}`);
     }

     // Limit to top 7 most significant
     return features.slice(0, 7).join('\n');
   }
   ```

   **{CHANGES_OVERVIEW}:**
   ```typescript
   function generateChangesOverview(data: PRData): string {
     const categories = {
       'Database Changes': [] as Commit[],
       'Backend Changes': [] as Commit[],
       'Frontend Changes': [] as Commit[],
       'Frontend Bug Fixes': [] as Commit[],
       'Frontend Enhancements': [] as Commit[],
       'UI Bug Fixes': [] as Commit[],
       'Documentation Updates': [] as Commit[],
     };

     // Categorize commits
     for (const commit of data.commits) {
       if (commit.scope === 'db' || commit.scope === 'migrations') {
         categories['Database Changes'].push(commit);
       } else if (commit.category === 'backend') {
         categories['Backend Changes'].push(commit);
       } else if (commit.category === 'frontend') {
         if (commit.type === 'fix') {
           if (commit.scope === 'ui') {
             categories['UI Bug Fixes'].push(commit);
           } else {
             categories['Frontend Bug Fixes'].push(commit);
           }
         } else if (commit.type === 'feat') {
           categories['Frontend Enhancements'].push(commit);
         }
       } else if (commit.category === 'documentation') {
         categories['Documentation Updates'].push(commit);
       }
     }

     // Build markdown
     let output = '';
     for (const [category, commits] of Object.entries(categories)) {
       if (commits.length === 0) continue;

       output += `### ${category} (${commits.length} commit${commits.length > 1 ? 's' : ''})\n`;
       for (const commit of commits) {
         output += `- ${commit.type}(${commit.scope}): ${commit.headline}\n`;
       }
       output += '\n';
     }

     return output;
   }
   ```

   **{TECHNICAL_ARCHITECTURE}:**
   ```typescript
   function generateTechnicalArchitecture(data: PRData): string {
     // Extract technical details from commit bodies
     const technicalSections: string[] = [];

     // Look for architecture-related commits
     for (const commit of data.commits) {
       if (commit.body.includes('State Management') ||
           commit.body.includes('Component Hierarchy') ||
           commit.body.includes('API Integration')) {
         technicalSections.push(commit.body);
       }
     }

     // If no explicit architecture details, generate from analysis
     if (technicalSections.length === 0) {
       return generateDefaultArchitectureSection(data);
     }

     return technicalSections.join('\n\n');
   }
   ```

   **{TESTING_FEEDBACK}:**
   ```typescript
   function generateTestingFeedback(data: PRData): string {
     // Look for testing-related content in commits
     const testingInfo = data.commits
       .filter(c => c.body.includes('Test') || c.body.includes('Feedback'))
       .map(c => c.body)
       .join('\n\n');

     // If no testing info, provide template
     if (!testingInfo) {
       return `### Manual Testing Performed
- ✅ All core functionality tested
- ✅ Edge cases verified
- ✅ No console errors

### Test Results
- All tests passing in development environment`;
     }

     return testingInfo;
   }
   ```

   **{FILES_CHANGED}:**
   ```typescript
   function generateFilesChanged(data: PRData): string {
     const newFiles = data.filesChanged.filter(f => f.status === 'A');
     const modifiedFiles = data.filesChanged.filter(f => f.status === 'M');

     let output = `**New Files** (${newFiles.length}):\n`;
     newFiles.forEach((f, i) => {
       const desc = generateFileDescription(f, data);
       output += `${i + 1}. \`${f.path}\` - ${desc}\n`;
     });

     output += `\n**Modified Files** (${modifiedFiles.length}):\n`;
     modifiedFiles.forEach((f, i) => {
       const desc = generateFileDescription(f, data);
       output += `${i + 1}. \`${f.path}\` - ${desc}\n`;
     });

     output += `\n**Total Changes**:\n`;
     output += `- **Lines added:** +${data.diffStat.linesAdded}\n`;
     output += `- **Lines removed:** -${data.diffStat.linesRemoved}\n`;
     output += `- **Net change:** ${data.diffStat.netChange > 0 ? '+' : ''}${data.diffStat.netChange} lines\n`;

     return output;
   }
   ```

   **{DEPLOYMENT_READINESS}:**
   ```typescript
   function generateDeploymentReadiness(data: PRData): string {
     const hasMigrations = data.commits.some(c => c.scope === 'db');
     const hasBreakingChanges = detectBreakingChanges(data.commits);

     let output = '### Production Ready\n';
     output += '- ✅ All manual tests passed\n';
     output += '- ✅ No console errors or warnings\n';
     output += '- ✅ Responsive design verified\n';
     output += '- ✅ Accessibility checked\n';
     output += '- ✅ Performance acceptable\n';

     if (hasMigrations) {
       output += '\n### Database Migrations\n';
       const migrations = data.commits
         .filter(c => c.scope === 'db')
         .map(c => `- Migration: ${extractMigrationFile(c)}`);
       output += migrations.join('\n');
     } else {
       output += '\n### Database Migrations\n- None required\n';
     }

     if (hasBreakingChanges) {
       output += '\n### Breaking Changes\n';
       output += hasBreakingChanges.map(c => `- ${c}`).join('\n');
     } else {
       output += '\n### Breaking Changes\n- None\n';
     }

     output += '\n### Rollback Plan\n';
     output += 'Revert to previous commit on master if issues occur.';
     if (hasMigrations) {
       output += ' Note: Database migrations may need manual rollback.';
     }

     return output;
   }
   ```

   **{RELATED_ISSUES}:**
   ```typescript
   function generateRelatedIssues(issues: IssueLink[]): string {
     const closes = issues.filter(i => i.type === 'closes');
     const partiallyAddresses = issues.filter(i => i.type === 'partially_addresses');
     const references = issues.filter(i => i.type === 'reference');

     let output = '';

     if (closes.length > 0) {
       output += '### Closes\n';
       output += closes.map(i => `- Closes #${i.issue} - ${i.title}`).join('\n');
       output += '\n\n';
     }

     if (partiallyAddresses.length > 0) {
       output += '### Partially Addresses\n';
       output += partiallyAddresses.map(i => `- Partially addresses #${i.issue} - ${i.title}`).join('\n');
       output += '\n\n';
     }

     if (references.length > 0) {
       output += '### Related Context\n';
       output += references.map(i => `- Reference to #${i.issue} - ${i.title}`).join('\n');
     }

     return output || '### Related Issues\nNone';
   }
   ```

   **{NEXT_STEPS}:**
   ```typescript
   function generateNextSteps(data: PRData): string {
     // Look for TODO comments or future work mentions in commits
     const todos = extractTODOs(data);

     // Look for planning documents that mention next steps
     const planningDocs = data.filesChanged.filter(f =>
       f.path.includes('plan') && f.status === 'A'
     );

     if (todos.length === 0 && planningDocs.length === 0) {
       return ''; // Optional section, omit if empty
     }

     let output = '### Immediate (This Week)\n';
     todos.slice(0, 3).forEach(todo => {
       output += `- [ ] ${todo}\n`;
     });

     if (planningDocs.length > 0) {
       output += '\n### Short-term (Next 2 Weeks)\n';
       planningDocs.forEach(doc => {
         output += `- [ ] Implement features from ${doc.path}\n`;
       });
     }

     return output;
   }
   ```

   **{DOCUMENTATION}:**
   ```typescript
   function generateDocumentation(data: PRData): string {
     const docFiles = data.filesChanged.filter(f =>
       f.path.endsWith('.md') || f.path.includes('.ai_docs/')
     );

     if (docFiles.length === 0) return '';

     const newDocs = docFiles.filter(f => f.status === 'A');
     const updatedDocs = docFiles.filter(f => f.status === 'M');

     let output = '';

     if (newDocs.length > 0) {
       output += '### New Documentation\n';
       newDocs.forEach(f => {
         const desc = generateFileDescription(f, data);
         output += `- **\`${f.path}\`:** ${desc}\n`;
       });
       output += '\n';
     }

     if (updatedDocs.length > 0) {
       output += '### Updated Documentation\n';
       updatedDocs.forEach(f => {
         const desc = generateFileDescription(f, data);
         output += `- **\`${f.path}\`:** ${desc}\n`;
       });
     }

     return output;
   }
   ```

   **{CHECKLIST}:**
   ```typescript
   function generateChecklist(data: PRData): string {
     const items = [
       'Code follows project style guidelines',
       'Self-review completed',
       'Comments added for complex logic',
       'Documentation updated',
       'No new warnings introduced',
       'Tested in development environment',
       'Ready for production deployment'
     ];

     // Add type-specific items
     const hasFeat = data.commits.some(c => c.type === 'feat');
     const hasFix = data.commits.some(c => c.type === 'fix');
     const hasI18n = data.commits.some(c => c.type === 'i18n');

     if (hasFeat) {
       items.push('User-facing changes tested manually');
       items.push('Accessibility requirements met');
       items.push('Responsive design verified');
     }

     if (hasFix) {
       items.push('Root cause identified and documented');
       items.push('Fix tested with reproduction steps');
     }

     if (hasI18n) {
       items.push('Polish localization complete and verified');
     }

     return items.map(item => `- ✅ ${item}`).join('\n');
   }
   ```

5. **Generate PR Title**
   ```typescript
   function generatePRTitle(data: PRData): string {
     // Use primary commit as basis
     const primaryCommit = data.commits[0];

     // Add emoji based on type
     const emoji = getEmojiForType(primaryCommit.type);

     // Build title
     return `${emoji} ${primaryCommit.type}(${primaryCommit.scope}): ${primaryCommit.headline}`;
   }
   ```

6. **Determine Labels**
   ```typescript
   function determineLabels(data: PRData, config: Config): string[] {
     const labels = new Set<string>();

     // Add category labels
     for (const commit of data.commits) {
       if (config.pr.labels.frontend.includes(commit.scope)) {
         labels.add('frontend');
       }
       if (config.pr.labels.backend.includes(commit.scope)) {
         labels.add('backend');
       }
       if (config.pr.labels.database.includes(commit.scope)) {
         labels.add('database');
       }
       if (config.pr.labels.documentation.includes(commit.scope)) {
         labels.add('documentation');
       }
     }

     // Add type labels
     const hasFeat = data.commits.some(c => c.type === 'feat');
     const hasFix = data.commits.some(c => c.type === 'fix');
     const hasI18n = data.commits.some(c => c.type === 'i18n');

     if (hasFeat) labels.add('enhancement');
     if (hasFix) labels.add('bug');
     if (hasI18n) labels.add('i18n');

     return Array.from(labels);
   }
   ```

7. **Apply PR Template**
   ```typescript
   function applyPRTemplate(template: string, variables: Record<string, string>): string {
     let result = template;

     for (const [key, value] of Object.entries(variables)) {
       result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
     }

     return result;
   }
   ```

8. **Show Preview to User**
   ```
   📋 Pull Request Preview:

   Title: ✨ feat(ui): enhance Box Form UX with Polish localization

   Labels: frontend, enhancement, i18n

   Description (first 500 chars):
   ## 🎯 Summary
   This PR enhances the Box Form View with critical bug fixes and complete Polish localization...

   [Full description: 2,450 characters]

   Options:
   1. ✅ Create pull request
   2. ✏️ Edit PR description
   3. 🏷️ Adjust labels
   4. ❌ Cancel

   Your choice:
   ```

9. **Create Pull Request**
   ```bash
   gh pr create \
     --title "✨ feat(ui): enhance Box Form UX with Polish localization" \
     --body "$(cat <<'EOF'
   <PR description>
   EOF
   )" \
     --base master \
     --head <branch-name> \
     --label "frontend,enhancement,i18n"
   ```

10. **Confirm Success**
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

## Error Handling

**Common Errors and Recovery:**

1. **Not on feature branch**
   ```
   ❌ Error: You are on branch 'master'

   This skill should only be run on feature branches.

   Options:
   1. Create new feature branch
   2. Switch to existing feature branch
   3. Cancel
   ```

2. **No uncommitted changes**
   ```
   ❌ Error: No changes to commit

   Your working directory is clean.

   Suggestions:
   - Make changes to files
   - Run this skill after you have work to commit
   ```

3. **GitHub CLI not authenticated**
   ```
   ❌ Error: GitHub CLI not authenticated

   Please authenticate with GitHub:

   gh auth login

   Then run this skill again.
   ```

4. **Merge conflicts with master**
   ```
   ⚠️ Warning: Your branch has diverged from master

   You may have merge conflicts. Rebase recommended before creating PR.

   Options:
   1. Rebase onto master now (git rebase master)
   2. Continue anyway (may have conflicts)
   3. Cancel and rebase manually
   ```

5. **Remote branch already exists**
   ```
   ⚠️ Warning: Remote branch already exists

   Pushing will require force push (git push -f).

   Options:
   1. Force push and continue
   2. Rename local branch
   3. Cancel
   ```

6. **Issue search returns no results**
   ```
   ℹ️ No related issues found

   Options:
   1. Create new issue for this work
   2. Skip issue linking
   3. Manually search and link later
   ```

7. **Commit fails (pre-commit hook)**
   ```
   ❌ Error: Commit failed

   Pre-commit hook rejected the commit:
   <error output>

   Options:
   1. Fix issues and retry commit
   2. Skip this commit group
   3. Cancel workflow
   ```

## Configuration

The skill reads from `.claude/templates/config.json`:

```json
{
  "commit": {
    "types": [...],
    "scopeCategories": {...},
    "maxHeadlineLength": 72,
    "maxSummaryLength": 100
  },
  "pr": {
    "sections": [...],
    "labels": {...}
  },
  "filePatterns": {...}
}
```

## Customization

### Adding New Commit Types

Edit `.claude/templates/config.json`:

```json
{
  "commit": {
    "types": [
      {
        "type": "perf",
        "description": "Performance improvements",
        "emoji": "⚡",
        "scopes": ["db", "api", "ui", "bundle"]
      }
    ]
  }
}
```

### Adding New PR Sections

Edit `.claude/templates/pr-description.md` and add section template.

Edit `.claude/templates/config.json`:

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

### Customizing File Patterns

Edit `.claude/templates/config.json`:

```json
{
  "filePatterns": {
    "testing": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.test.tsx"
    ]
  }
}
```

## Best Practices

1. **Review Changes Before Running**
   - Run `git status` and `git diff` to understand your changes
   - Ensure you're on the correct branch
   - Commit frequently to avoid giant PRs

2. **Use Meaningful Branch Names**
   - Format: `fb_<feature-area>_<short-description>`
   - Example: `fb_ui-box-form-implementation`
   - Branch name informs issue search keywords

3. **Keep Commits Logical**
   - If skill suggests grouping that doesn't make sense, adjust it
   - Each commit should be a logical unit of work
   - Order commits: DB → Backend → Frontend → Docs

4. **Link Issues Correctly**
   - Only use "Closes" for work that fully completes an issue
   - Use "Partially addresses" for contributions to larger work
   - Reference related PRs for context

5. **Verify PR Before Creating**
   - Review the preview carefully
   - Check that all sections are complete
   - Ensure checklist items are accurate

## Troubleshooting

**Problem:** Skill suggests wrong commit type

**Solution:** Use "Adjust grouping manually" option to change type

---

**Problem:** Generated commit message too generic

**Solution:** Edit the message to add more specific details from diff

---

**Problem:** PR description missing key information

**Solution:** After PR creation, edit on GitHub to add missing content

---

**Problem:** Issue linking suggestions irrelevant

**Solution:** Use "Adjust issue links" to remove or add different issues

---

**Problem:** Skill takes too long to run

**Solution:** Break work into smaller feature branches with fewer files

## Version History

- **v1.0.0** (2026-01-04): Initial implementation with 5-phase workflow

## Support

For issues or questions:
- Check `.ai_docs/review/COMMIT_PR_SYSTEM_DOCUMENTATION.md`
- Review examples in `.claude/templates/`
- Open issue on GitHub repository