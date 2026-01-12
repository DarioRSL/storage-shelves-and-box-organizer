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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAllTestData, seedTable } from '../../../helpers/db-setup';
import { createAuthenticatedUser } from '../../../helpers/auth-helper';
import { seedInitialDataset } from '../../../fixtures/initial-dataset';
import { createWorkspaceFixture } from '../../../helpers/factory';
import {
  authenticatedGet,
  authenticatedPost,
  assertSuccess,
  assertError,
  extractId,
} from '../../../helpers/api-client';
import { getAdminSupabaseClient } from '../../../helpers/supabase-test-client';

describe('GET /api/workspaces', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should list all workspaces user is a member of', async () => {
      // Arrange: Create dataset with multiple workspaces
      const dataset = await seedInitialDataset();
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
      // Arrange: Create user without workspaces
      const testUser = await createAuthenticatedUser({
        email: 'no-workspaces@example.com',
        password: 'SecurePass123!',
        full_name: 'No Workspaces User',
      });

      // Act
      const response = await authenticatedGet('/api/workspaces', testUser.token);

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return only workspaces user has access to', async () => {
      // Arrange: Create dataset
      const dataset = await seedInitialDataset();
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

    it('should include workspace metadata in response', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
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
      // Arrange: Create two separate users with their own workspaces
      const dataset = await seedInitialDataset();
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

  describe('Authentication Errors (401)', () => {
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

describe('POST /api/workspaces', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should create workspace with valid data', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'create-workspace@example.com',
        password: 'SecurePass123!',
        full_name: 'Create Workspace User',
      });

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
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'auto-owner@example.com',
        password: 'SecurePass123!',
        full_name: 'Auto Owner User',
      });

      const adminClient = getAdminSupabaseClient();

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

    it('should create workspace without description', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'no-desc@example.com',
        password: 'SecurePass123!',
        full_name: 'No Description User',
      });

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
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'multi-workspace@example.com',
        password: 'SecurePass123!',
        full_name: 'Multi Workspace User',
      });

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

  describe('Validation Errors (400)', () => {
    it('should reject workspace with empty name', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'empty-name@example.com',
        password: 'SecurePass123!',
        full_name: 'Empty Name User',
      });

      // Act: Try to create workspace with empty name
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        name: '',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject workspace with missing name', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'missing-name@example.com',
        password: 'SecurePass123!',
        full_name: 'Missing Name User',
      });

      // Act: Try to create workspace without name
      const response = await authenticatedPost('/api/workspaces', testUser.token, {
        description: 'Workspace without name',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject workspace with name exceeding max length', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'long-name@example.com',
        password: 'SecurePass123!',
        full_name: 'Long Name User',
      });

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
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'long-desc@example.com',
        password: 'SecurePass123!',
        full_name: 'Long Description User',
      });

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

  describe('Authentication Errors (401)', () => {
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
