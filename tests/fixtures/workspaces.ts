/**
 * Workspace Fixtures
 *
 * Predefined workspace data for testing multi-tenancy and isolation.
 */

export interface WorkspaceFixture {
  name: string;
  description?: string;
}

/**
 * Primary test workspace for most tests
 */
export const PRIMARY_WORKSPACE: WorkspaceFixture = {
  name: "Primary Test Workspace",
};

/**
 * Secondary workspace for testing isolation
 */
export const SECONDARY_WORKSPACE: WorkspaceFixture = {
  name: "Secondary Test Workspace",
};

/**
 * Workspace for testing deletion and cleanup
 */
export const DELETABLE_WORKSPACE: WorkspaceFixture = {
  name: "Deletable Workspace",
};

/**
 * Workspace with a long name for testing validation
 */
export const LONG_NAME_WORKSPACE: WorkspaceFixture = {
  name: "A".repeat(60), // Near the 64 character limit
};

/**
 * Empty workspace (no locations or boxes)
 */
export const EMPTY_WORKSPACE: WorkspaceFixture = {
  name: "Empty Test Workspace",
};

/**
 * All predefined workspaces
 */
export const ALL_WORKSPACES = [
  PRIMARY_WORKSPACE,
  SECONDARY_WORKSPACE,
  DELETABLE_WORKSPACE,
  LONG_NAME_WORKSPACE,
  EMPTY_WORKSPACE,
] as const;
