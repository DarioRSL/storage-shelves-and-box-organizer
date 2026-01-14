/**
 * Integration Tests: Workspace Management
 *
 * Tests for:
 * - GET /api/workspaces - List user workspaces
 * - POST /api/workspaces - Create workspace
 *
 * Coverage:
 * - Multi-tenant workspace listing
 * - Workspace creation with auto-owner assignment
 * - RLS policy enforcement
 * - Input validation
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { clearAllTestData } from '../../../helpers/db-setup';
import { createAuthenticatedUser, type TestUser } from '../../../helpers/auth-helper';
import { seedInitialDataset, type InitialDataset } from '../../../fixtures/initial-dataset';
import {
  authenticatedGet,
  authenticatedPost,
  assertSuccess,
  assertError,
  extractId,
} from '../../../helpers/api-client';
import { getAdminSupabaseClient } from '../../../helpers/supabase-test-client';

describe.skip('GET /api/workspaces', () => {
  // SHARED USER - created once, reused across all tests
  let testUser: TestUser;
  let dataset: InitialDataset;
  const adminClient = getAdminSupabaseClient();

  beforeAll(async () => {
    await clearAllTestData();
    // Create user ONCE for tests that need a user without workspaces
    testUser = await createAuthenticatedUser({
      email: 'workspaces-list-test@example.com',
      password: 'SecurePass123!',
      full_name: 'Workspaces List Test User',
    });
    // Seed dataset for tests that need workspaces
    dataset = await seedInitialDataset();
  });

  afterAll(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should list all workspaces user is a member of', async () => {
      // Arrange: Use admin user from dataset
      const adminUser = dataset.users.admin;

      // Act: Get workspaces
      const response = await authenticatedGet('/api/workspaces', adminUser.token);

      // Assert: Should return workspaces where user is a member
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Admin is member of primary workspace
      const primaryWorkspace = response.body.find(
        (w: any) => w.id === dataset.workspaces.primary.id
      );
      expect(primaryWorkspace).toBeTruthy();
      expect(primaryWorkspace.name).toBe('Primary Test Workspace');
    });

    it('should return empty array if user has no workspaces', async () => {
      // Arrange: Use testUser (created without workspaces)
      // Act
      const response = await authenticatedGet('/api/workspaces', testUser.token);

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return only workspaces user has access to', async () => {
      // Arrange: Use member user from dataset
      const memberUser = dataset.users.member;

      // Act: Get workspaces for member (has access to both primary and secondary)
      const response = await authenticatedGet('/api/workspaces', memberUser.token);

      // Assert: Should return both workspaces
      assertSuccess(response);
      expect(response.body.length).toBe(2);

      const workspaceIds = response.body.map((w: any) => w.id);
      expect(workspaceIds).toContain(dataset.workspaces.primary.id);
      expect(workspaceIds).toContain(dataset.workspaces.secondary.id);
    });

    it.skip('should include workspace metadata in response', async () => {
      // Arrange: Use admin user from dataset
      const adminUser = dataset.users.admin;

      // Act
      const response = await authenticatedGet('/api/workspaces', adminUser.token);

      // Assert: Check response structure
      assertSuccess(response);
      const workspace = response.body[0];
      expect(workspace).toHaveProperty('id');
      expect(workspace).toHaveProperty('name');
      expect(workspace).toHaveProperty('description');
      expect(workspace).toHaveProperty('owner_id');
      expect(workspace).toHaveProperty('created_at');
      expect(workspace).toHaveProperty('updated_at');
    });

    it('should not return workspaces user is not a member of', async () => {
      // Arrange: Use viewer user from dataset
      const viewerUser = dataset.users.viewer;

      // Viewer is only member of primary workspace
      // Act
      const response = await authenticatedGet('/api/workspaces', viewerUser.token);

      // Assert: Should only return primary workspace
      assertSuccess(response);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(dataset.workspaces.primary.id);
    });
  });

  describe.skip('Authentication Errors (401)', () => {
    it('should reject request without authentication', async () => {
      // Act: Try to get workspaces without token
      const response = await authenticatedGet('/api/workspaces', '');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      // Act
      const response = await authenticatedGet('/api/workspaces', 'invalid.jwt.token');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe.skip('POST /api/workspaces', () => {
  // SHARED USER - created once, reused across all tests
  let testUser: TestUser;
  const adminClient = getAdminSupabaseClient();

  beforeAll(async () => {
    await clearAllTestData();
    // Create user ONCE for all tests in this describe block
    testUser = await createAuthenticatedUser({
      email: 'workspaces-create-test@example.com',
      password: 'SecurePass123!',
      full_name: 'Workspaces Create Test User',
    });
  });

  // Reset data state before each test (remove workspaces created by previous tests)
  beforeEach(async () => {
    // Delete any workspaces created by testUser (except we keep the user)
    await adminClient.from('workspace_members').delete().eq('user_id', testUser.id);
    await adminClient.from('workspaces').delete().eq('owner_id', testUser.id);
  });

  afterAll(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it.skip('should create workspace with valid data', async () => {
      // Act: Create workspace
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        name: 'My New Workspace',
        description: 'Test workspace description',
      });

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('My New Workspace');
      expect(response.body.description).toBe('Test workspace description');
      expect(response.body.owner_id).toBe(testUser.id);
    });

    it('should automatically add creator as owner', async () => {
      // Act: Create workspace
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        name: 'Auto Owner Workspace',
      });

      assertSuccess(response);
      const workspaceId = extractId(response);

      // Assert: Verify workspace_members entry was created
      const { data: members } = await adminClient
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', testUser.id);

      expect(members).toBeTruthy();
      expect(members!.length).toBe(1);
      expect(members![0].role).toBe('owner');
    });

    it.skip('should create workspace without description', async () => {
      // Act: Create workspace without description
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        name: 'Workspace Without Description',
      });

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Workspace Without Description');
      expect(response.body.description).toBeNull();
    });

    it('should allow user to create multiple workspaces', async () => {
      // Act: Create two workspaces
      const response1 = await authenticatedPost('/api/workspaces', testUser.token, {
        name: 'First Workspace',
      });
      const response2 = await authenticatedPost('/api/workspaces', testUser.token, {
        name: 'Second Workspace',
      });

      // Assert: Both should succeed
      assertSuccess(response1);
      assertSuccess(response2);
      expect(response1.body.id).not.toBe(response2.body.id);

      // Verify user can see both workspaces
      const listResponse = await authenticatedGet('/api/workspaces', testUser.token);
      assertSuccess(listResponse);
      expect(listResponse.body.length).toBe(2);
    });
  });

  describe.skip('Validation Errors (400)', () => {
    it('should reject workspace with empty name', async () => {
      // Act: Try to create workspace with empty name
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        name: '',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject workspace with missing name', async () => {
      // Act: Try to create workspace without name
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        description: 'Workspace without name',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject workspace with name exceeding max length', async () => {
      // Act: Try to create workspace with very long name (>100 chars)
      const longName = 'A'.repeat(101);
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        name: longName,
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject workspace with description exceeding max length', async () => {
      // Act: Try to create workspace with very long description (>500 chars)
      const longDescription = 'A'.repeat(501);
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        name: 'Valid Name',
        description: longDescription,
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe.skip('Authentication Errors (401)', () => {
    it('should reject workspace creation without authentication', async () => {
      // Act: Try to create without token
      const response = await authenticatedPost('/api/workspaces', '', {
        name: 'Unauthenticated Workspace',
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject workspace creation with invalid token', async () => {
      // Act: Try with fake token
      const response = await authenticatedPost(
        '/api/workspaces',
        'invalid.jwt.token',
        {
          name: 'Invalid Token Workspace',
        }
      );

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
