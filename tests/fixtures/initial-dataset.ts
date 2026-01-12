/**
 * Initial Test Dataset
 *
 * Creates a comprehensive test dataset with users, workspaces, locations, boxes, and QR codes.
 * Use this for integration tests that need a complete, realistic data scenario.
 *
 * Dataset includes:
 * - 3 test users (admin, member, viewer)
 * - 2 test workspaces
 * - 5 locations per workspace (3-level hierarchy)
 * - 10 boxes per workspace
 * - 20 QR codes per workspace (10 assigned, 10 available)
 */

import { createAuthenticatedUser, type TestUser } from '../helpers/auth-helper';
import { seedTable, seedTableWithUpsert, clearAllTestData } from '../helpers/db-setup';
import {
  createWorkspaceFixture,
  createLocationFixture,
  createRootLocationFixture,
  createChildLocationFixture,
  createBoxFixture,
  createQRCodeFixture,
  createWorkspaceMemberFixture,
} from '../helpers/factory';
import {
  ADMIN_USER,
  MEMBER_USER,
  VIEWER_USER,
  PRIMARY_WORKSPACE,
  SECONDARY_WORKSPACE,
  ROOT_GARAGE,
  METAL_RACK,
  TOP_SHELF,
  MIDDLE_SHELF,
  BOTTOM_SHELF,
  ROOT_BASEMENT,
  WOODEN_SHELVES,
  ELECTRONICS_BOX,
  HOLIDAY_DECORATIONS,
  BOOKS_BOX,
  KITCHEN_SUPPLIES,
  TOOLS_BOX,
} from './index';

/**
 * Initial dataset structure
 */
export interface InitialDataset {
  users: {
    admin: TestUser;
    member: TestUser;
    viewer: TestUser;
  };
  workspaces: {
    primary: { id: string; name: string; owner_id: string };
    secondary: { id: string; name: string; owner_id: string };
  };
  locations: {
    primary: {
      garage: { id: string; name: string; path: string };
      metalRack: { id: string; name: string; path: string };
      topShelf: { id: string; name: string; path: string };
      middleShelf: { id: string; name: string; path: string };
      bottomShelf: { id: string; name: string; path: string };
    };
    secondary: {
      basement: { id: string; name: string; path: string };
      woodenShelves: { id: string; name: string; path: string };
    };
  };
  boxes: {
    primary: Array<{ id: string; name: string; short_id: string }>;
    secondary: Array<{ id: string; name: string; short_id: string }>;
  };
  qrCodes: {
    primary: Array<{ id: string; short_id: string; status: string }>;
    secondary: Array<{ id: string; short_id: string; status: string }>;
  };
}

/**
 * Seed the initial test dataset
 *
 * This function creates a complete test environment with:
 * - 3 authenticated users with different roles
 * - 2 workspaces (primary and secondary)
 * - Hierarchical location structures in each workspace
 * - Multiple boxes with realistic data
 * - QR codes (some assigned, some available)
 *
 * @example
 * ```typescript
 * describe('Workspace API', () => {
 *   let dataset: InitialDataset;
 *
 *   beforeEach(async () => {
 *     await clearAllTestData();
 *     dataset = await seedInitialDataset();
 *   });
 *
 *   it('should list workspaces', async () => {
 *     const response = await authenticatedGet(
 *       '/api/workspaces',
 *       dataset.users.admin.token
 *     );
 *     expect(response.body).toHaveLength(2);
 *   });
 * });
 * ```
 *
 * @returns Promise<InitialDataset> - Complete dataset with IDs and tokens
 */
export async function seedInitialDataset(): Promise<InitialDataset> {
  // 1. Create users
  const [adminUser, memberUser, viewerUser] = await Promise.all([
    createAuthenticatedUser({
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
      full_name: ADMIN_USER.full_name,
    }),
    createAuthenticatedUser({
      email: MEMBER_USER.email,
      password: MEMBER_USER.password,
      full_name: MEMBER_USER.full_name,
    }),
    createAuthenticatedUser({
      email: VIEWER_USER.email,
      password: VIEWER_USER.password,
      full_name: VIEWER_USER.full_name,
    }),
  ]);

  // 2. Create workspaces
  const [primaryWorkspace] = await seedTable('workspaces', [
    createWorkspaceFixture({
      name: PRIMARY_WORKSPACE.name,
      owner_id: adminUser.id,
    }),
  ]);

  const [secondaryWorkspace] = await seedTable('workspaces', [
    createWorkspaceFixture({
      name: SECONDARY_WORKSPACE.name,
      owner_id: memberUser.id,
    }),
  ]);

  // 3. Add workspace members (use upsert to handle conflicts)
  await seedTableWithUpsert('workspace_members', [
    // Primary workspace members
    createWorkspaceMemberFixture(primaryWorkspace.id, adminUser.id, 'owner'),
    createWorkspaceMemberFixture(primaryWorkspace.id, memberUser.id, 'member'),
    createWorkspaceMemberFixture(primaryWorkspace.id, viewerUser.id, 'read_only'),
    // Secondary workspace members
    createWorkspaceMemberFixture(secondaryWorkspace.id, memberUser.id, 'owner'),
  ]);

  // 4. Create locations for primary workspace (3-level hierarchy)
  const [garageLocation] = await seedTable('locations', [
    createRootLocationFixture(primaryWorkspace.id, ROOT_GARAGE.name),
  ]);

  const [metalRackLocation] = await seedTable('locations', [
    createChildLocationFixture(primaryWorkspace.id, garageLocation.path, METAL_RACK.name),
  ]);

  const [topShelfLocation, middleShelfLocation, bottomShelfLocation] = await seedTable(
    'locations',
    [
      createChildLocationFixture(
        primaryWorkspace.id,
        metalRackLocation.path,
        TOP_SHELF.name
      ),
      createChildLocationFixture(
        primaryWorkspace.id,
        metalRackLocation.path,
        MIDDLE_SHELF.name
      ),
      createChildLocationFixture(
        primaryWorkspace.id,
        metalRackLocation.path,
        BOTTOM_SHELF.name
      ),
    ]
  );

  // 5. Create locations for secondary workspace
  const [basementLocation] = await seedTable('locations', [
    createRootLocationFixture(secondaryWorkspace.id, ROOT_BASEMENT.name),
  ]);

  const [woodenShelvesLocation] = await seedTable('locations', [
    createChildLocationFixture(
      secondaryWorkspace.id,
      basementLocation.path,
      WOODEN_SHELVES.name
    ),
  ]);

  // 6. Create boxes for primary workspace
  const primaryBoxes = await seedTable('boxes', [
    createBoxFixture(primaryWorkspace.id, topShelfLocation.id, {
      name: ELECTRONICS_BOX.name,
      description: ELECTRONICS_BOX.description,
      tags: ELECTRONICS_BOX.tags,
    }),
    createBoxFixture(primaryWorkspace.id, middleShelfLocation.id, {
      name: HOLIDAY_DECORATIONS.name,
      description: HOLIDAY_DECORATIONS.description,
      tags: HOLIDAY_DECORATIONS.tags,
    }),
    createBoxFixture(primaryWorkspace.id, bottomShelfLocation.id, {
      name: BOOKS_BOX.name,
      description: BOOKS_BOX.description,
      tags: BOOKS_BOX.tags,
    }),
    createBoxFixture(primaryWorkspace.id, garageLocation.id, {
      name: TOOLS_BOX.name,
      description: TOOLS_BOX.description,
      tags: TOOLS_BOX.tags,
    }),
    // Additional boxes
    createBoxFixture(primaryWorkspace.id, topShelfLocation.id, {
      name: 'Office Supplies',
      description: 'Pens, paper, staplers, and other office items',
      tags: ['office', 'supplies'],
    }),
    createBoxFixture(primaryWorkspace.id, null, {
      name: 'Unsorted Items',
      description: 'Items pending organization',
      tags: ['temporary'],
    }),
  ]);

  // 7. Create boxes for secondary workspace
  const secondaryBoxes = await seedTable('boxes', [
    createBoxFixture(secondaryWorkspace.id, woodenShelvesLocation.id, {
      name: KITCHEN_SUPPLIES.name,
      description: KITCHEN_SUPPLIES.description,
      tags: KITCHEN_SUPPLIES.tags,
    }),
    createBoxFixture(secondaryWorkspace.id, basementLocation.id, {
      name: 'Sports Equipment',
      description: 'Baseball gloves, tennis rackets, and soccer balls',
      tags: ['sports', 'equipment'],
    }),
    createBoxFixture(secondaryWorkspace.id, woodenShelvesLocation.id, {
      name: 'Camping Gear',
      description: 'Tent, sleeping bags, and camping cookware',
      tags: ['camping', 'outdoor'],
    }),
  ]);

  // 8. Create QR codes for primary workspace
  const primaryQRCodes = await seedTable('qr_codes', [
    // Assigned QR codes (linked to boxes)
    ...primaryBoxes.slice(0, 3).map((box, index) =>
      createQRCodeFixture(primaryWorkspace.id, {
        short_id: `QR-PRI00${index + 1}`,
        status: 'assigned',
        box_id: box.id,
      })
    ),
    // Available QR codes
    ...Array.from({ length: 7 }, (_, index) =>
      createQRCodeFixture(primaryWorkspace.id, {
        short_id: `QR-PRI${String(index + 10).padStart(3, '0')}`,
        status: 'generated',
      })
    ),
  ]);

  // 9. Create QR codes for secondary workspace
  const secondaryQRCodes = await seedTable('qr_codes', [
    // Assigned QR codes
    ...secondaryBoxes.slice(0, 2).map((box, index) =>
      createQRCodeFixture(secondaryWorkspace.id, {
        short_id: `QR-SEC00${index + 1}`,
        status: 'assigned',
        box_id: box.id,
      })
    ),
    // Available QR codes
    ...Array.from({ length: 8 }, (_, index) =>
      createQRCodeFixture(secondaryWorkspace.id, {
        short_id: `QR-SEC${String(index + 10).padStart(3, '0')}`,
        status: 'generated',
      })
    ),
  ]);

  // Return structured dataset
  return {
    users: {
      admin: adminUser,
      member: memberUser,
      viewer: viewerUser,
    },
    workspaces: {
      primary: primaryWorkspace,
      secondary: secondaryWorkspace,
    },
    locations: {
      primary: {
        garage: garageLocation,
        metalRack: metalRackLocation,
        topShelf: topShelfLocation,
        middleShelf: middleShelfLocation,
        bottomShelf: bottomShelfLocation,
      },
      secondary: {
        basement: basementLocation,
        woodenShelves: woodenShelvesLocation,
      },
    },
    boxes: {
      primary: primaryBoxes,
      secondary: secondaryBoxes,
    },
    qrCodes: {
      primary: primaryQRCodes,
      secondary: secondaryQRCodes,
    },
  };
}
