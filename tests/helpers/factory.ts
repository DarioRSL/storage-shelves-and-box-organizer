/**
 * Factory Functions
 *
 * Generate realistic test data with sensible defaults.
 * Factory functions create fixture data WITHOUT database IDs or timestamps,
 * allowing the database to generate these fields via triggers.
 */

import type {
  CreateWorkspaceRequest,
  CreateLocationRequest,
  CreateBoxRequest,
  WorkspaceMemberDto,
  ProfileDto,
} from '@/types';
import type { Database } from '@/db/database.types';
import { seedTable } from './db-setup';
import type { TestUser } from './auth-helper';

type QRCodeInsert = Database['public']['Tables']['qr_codes']['Insert'];
type LocationInsert = Database['public']['Tables']['locations']['Insert'];

/**
 * Generate unique identifier for test data
 * Uses timestamp + random string to avoid collisions
 */
function uniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create workspace fixture with optional overrides
 *
 * @param overrides - Optional field overrides
 * @returns Workspace data for insertion
 */
export function createWorkspaceFixture(
  overrides?: Partial<CreateWorkspaceRequest & { owner_id: string }>
): CreateWorkspaceRequest & { owner_id: string } {
  const id = uniqueId();

  return {
    name: `Test Workspace ${id}`,
    owner_id: overrides?.owner_id || '',
    ...overrides,
  };
}

/**
 * Create location fixture with ltree path
 *
 * Supports hierarchical structure up to 5 levels deep.
 * The path must be provided as locations use ltree for hierarchy.
 *
 * @param workspaceId - Workspace ID
 * @param overrides - Optional field overrides
 * @returns Location data for insertion
 */
export function createLocationFixture(
  workspaceId: string,
  overrides?: Partial<{
    name: string;
    description: string | null;
    path: string;
  }>
): Omit<CreateLocationRequest, 'parent_id'> & { path: string } {
  const id = uniqueId();
  const name = overrides?.name || `Location ${id}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');

  return {
    workspace_id: workspaceId,
    name,
    description: overrides?.description !== undefined ? overrides.description : `Test location ${id}`,
    path: overrides?.path || `root.${slug}`,
  };
}

/**
 * Create root location (no parent)
 *
 * @param workspaceId - Workspace ID
 * @param name - Location name
 * @returns Root location data
 */
export function createRootLocationFixture(
  workspaceId: string,
  name?: string
): CreateLocationRequest & { path: string } {
  const locationName = name || `Root Location ${uniqueId()}`;
  const slug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, '');

  return {
    workspace_id: workspaceId,
    name: locationName,
    description: `Root level location`,
    path: `root.${slug}`,
  };
}

/**
 * Create child location under parent
 *
 * @param workspaceId - Workspace ID
 * @param parentPath - Parent ltree path
 * @param name - Location name (optional)
 * @returns Child location data with path
 */
export function createChildLocationFixture(
  workspaceId: string,
  parentPath: string,
  name?: string
): LocationInsert {
  const locationName = name || `Child Location ${uniqueId()}`;
  const slug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, '');

  return {
    workspace_id: workspaceId,
    name: locationName,
    description: `Child location under ${parentPath}`,
    path: `${parentPath}.${slug}`,
  };
}

/**
 * Create box fixture
 *
 * Note: QR codes reference boxes, not the other way around.
 * To assign a QR code to a box, update the QR code record after creating the box.
 *
 * @param workspaceId - Workspace ID
 * @param locationId - Location ID (optional)
 * @param overrides - Optional field overrides
 * @returns Box data for insertion
 */
export function createBoxFixture(
  workspaceId: string,
  locationId?: string | null,
  overrides?: Partial<Omit<CreateBoxRequest, 'qr_code_id'>>
): Omit<CreateBoxRequest, 'qr_code_id'> {
  const id = uniqueId();

  return {
    workspace_id: workspaceId,
    name: overrides?.name || `Test Box ${id}`,
    description: overrides?.description !== undefined
      ? overrides.description
      : `Test box description ${id}`,
    tags: overrides?.tags || ['test', 'fixture'],
    location_id: overrides?.location_id !== undefined ? overrides.location_id : locationId || null,
  };
}

/**
 * Create QR code fixture
 *
 * @param workspaceId - Workspace ID
 * @param overrides - Optional field overrides
 * @returns QR code data for insertion
 */
export function createQRCodeFixture(
  workspaceId: string,
  overrides?: Partial<QRCodeInsert>
): QRCodeInsert {
  // Generate QR code in format QR-XXXXXX (6 uppercase alphanumeric)
  const generateQRCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'QR-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  return {
    workspace_id: workspaceId,
    short_id: overrides?.short_id || generateQRCode(),
    status: overrides?.status || 'generated',
    box_id: overrides?.box_id !== undefined ? overrides.box_id : null,
    ...overrides,
  };
}

/**
 * Create profile fixture
 *
 * @param userId - User ID from auth.users
 * @param overrides - Optional field overrides
 * @returns Profile data for insertion
 */
export function createProfileFixture(
  userId: string,
  overrides?: Partial<Omit<ProfileDto, 'id' | 'created_at' | 'updated_at'>>
): Omit<ProfileDto, 'id' | 'created_at' | 'updated_at'> {
  const id = uniqueId();

  return {
    email: overrides?.email || `test-${id}@test.com`,
    full_name: overrides?.full_name || `Test User ${id}`,
    avatar_url: overrides?.avatar_url || null,
    theme_preference: overrides?.theme_preference || 'system',
  };
}

/**
 * Create workspace member fixture
 *
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @param role - Member role (default: 'member')
 * @returns Workspace member data for insertion
 */
export function createWorkspaceMemberFixture(
  workspaceId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' | 'read_only' = 'member'
): Omit<WorkspaceMemberDto, 'joined_at'> {
  return {
    workspace_id: workspaceId,
    user_id: userId,
    role,
  };
}

/**
 * Test Scenario Result
 * Complete test setup with related entities
 */
export interface TestScenario {
  users: TestUser[];
  workspaces: Array<{ id: string; name: string; owner_id: string }>;
  locations: Array<{ id: string; name: string; workspace_id: string; path: string }>;
  boxes: Array<{ id: string; name: string; workspace_id: string; location_id: string | null }>;
  qrCodes: Array<{ id: string; short_id: string; workspace_id: string; status: string }>;
}

/**
 * Test Scenario Configuration
 */
export interface TestScenarioConfig {
  /** Number of users to create (default: 1) */
  users?: number;
  /** Number of workspaces per user (default: 1) */
  workspaces?: number;
  /** Number of locations per workspace (default: 3) */
  locationsPerWorkspace?: number;
  /** Number of boxes per workspace (default: 5) */
  boxesPerWorkspace?: number;
  /** Number of QR codes per workspace (default: 10) */
  qrCodesPerWorkspace?: number;
  /** Create hierarchical locations (default: true) */
  hierarchicalLocations?: boolean;
}

/**
 * Create complete test scenario with related entities
 *
 * Generates a full test setup with users, workspaces, locations, boxes, and QR codes.
 * All entities are properly related with correct foreign keys.
 *
 * @example
 * ```typescript
 * const scenario = await createTestScenario({
 *   users: 2,
 *   workspaces: 1,
 *   locationsPerWorkspace: 5,
 *   boxesPerWorkspace: 10,
 *   qrCodesPerWorkspace: 15,
 * });
 *
 * // scenario.users[0] - first test user
 * // scenario.workspaces[0] - first workspace
 * // scenario.locations - all locations
 * // scenario.boxes - all boxes
 * // scenario.qrCodes - all QR codes
 * ```
 *
 * @param config - Scenario configuration
 * @returns Promise<TestScenario> - Complete test scenario
 */
export async function createTestScenario(
  config: TestScenarioConfig = {}
): Promise<TestScenario> {
  // Import here to avoid circular dependencies
  const { createAuthenticatedUser } = await import('./auth-helper');

  const {
    users: userCount = 1,
    workspaces: workspaceCount = 1,
    locationsPerWorkspace = 3,
    boxesPerWorkspace = 5,
    qrCodesPerWorkspace = 10,
    hierarchicalLocations = true,
  } = config;

  const users: TestUser[] = [];
  const workspaces: TestScenario['workspaces'] = [];
  const locations: TestScenario['locations'] = [];
  const boxes: TestScenario['boxes'] = [];
  const qrCodes: TestScenario['qrCodes'] = [];

  // Create users
  for (let i = 0; i < userCount; i++) {
    const user = await createAuthenticatedUser({
      email: `scenario-user-${i}-${uniqueId()}@test.com`,
      full_name: `Scenario User ${i + 1}`,
    });
    users.push(user);

    // Create workspaces for each user
    for (let j = 0; j < workspaceCount; j++) {
      const workspaceData = createWorkspaceFixture({
        name: `User ${i + 1} Workspace ${j + 1}`,
        owner_id: user.id,
      });

      const [workspace] = await seedTable('workspaces', [workspaceData]);
      workspaces.push(workspace);

      // Add user as owner in workspace_members
      await seedTable('workspace_members', [
        createWorkspaceMemberFixture(workspace.id, user.id, 'owner'),
      ]);

      // Create locations for workspace
      const workspaceLocations: typeof locations = [];

      if (hierarchicalLocations && locationsPerWorkspace >= 2) {
        // Create hierarchical structure: root → child → grandchild
        const root = createRootLocationFixture(workspace.id, 'Garage');
        const [rootLocation] = await seedTable('locations', [root]);
        workspaceLocations.push(rootLocation);

        // Create child under root
        if (locationsPerWorkspace >= 2) {
          const child = createChildLocationFixture(workspace.id, rootLocation.path, 'Metal Rack');
          const [childLocation] = await seedTable('locations', [child]);
          workspaceLocations.push(childLocation);

          // Create grandchild if requested
          if (locationsPerWorkspace >= 3) {
            const grandchild = createChildLocationFixture(
              workspace.id,
              childLocation.path,
              'Top Shelf'
            );
            const [grandchildLocation] = await seedTable('locations', [grandchild]);
            workspaceLocations.push(grandchildLocation);
          }

          // Create remaining locations as siblings of root
          for (let k = 3; k < locationsPerWorkspace; k++) {
            const sibling = createRootLocationFixture(workspace.id, `Location ${k + 1}`);
            const [siblingLocation] = await seedTable('locations', [sibling]);
            workspaceLocations.push(siblingLocation);
          }
        }
      } else {
        // Create flat locations (all root level)
        for (let k = 0; k < locationsPerWorkspace; k++) {
          const location = createRootLocationFixture(workspace.id, `Location ${k + 1}`);
          const [createdLocation] = await seedTable('locations', [location]);
          workspaceLocations.push(createdLocation);
        }
      }

      locations.push(...workspaceLocations);

      // Create boxes for workspace
      const workspaceBoxes: typeof boxes = [];
      for (let k = 0; k < boxesPerWorkspace; k++) {
        // Assign some boxes to locations, leave some unassigned
        const locationId =
          k < workspaceLocations.length ? workspaceLocations[k % workspaceLocations.length].id : null;

        const boxData = createBoxFixture(workspace.id, locationId, {
          name: `Box ${k + 1}`,
          description: `Test box ${k + 1} in ${workspace.name}`,
          tags: ['test', `box-${k + 1}`],
        });

        const [box] = await seedTable('boxes', [boxData]);
        workspaceBoxes.push(box);
      }

      boxes.push(...workspaceBoxes);

      // Create QR codes for workspace
      const workspaceQRCodes: typeof qrCodes = [];
      for (let k = 0; k < qrCodesPerWorkspace; k++) {
        // Assign half the QR codes to boxes
        const assignToBox = k < Math.floor(qrCodesPerWorkspace / 2);
        const boxId = assignToBox ? workspaceBoxes[k % workspaceBoxes.length]?.id : null;
        const status = assignToBox ? 'assigned' : 'generated';

        const qrData = createQRCodeFixture(workspace.id, {
          short_id: `QR-${String(k).padStart(6, '0')}`,
          box_id: boxId,
          status,
        });

        const [qrCode] = await seedTable('qr_codes', [qrData]);
        workspaceQRCodes.push(qrCode);
      }

      qrCodes.push(...workspaceQRCodes);
    }
  }

  return {
    users,
    workspaces,
    locations,
    boxes,
    qrCodes,
  };
}
