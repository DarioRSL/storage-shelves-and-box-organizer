/**
 * API Client Helper
 *
 * Provides Supertest wrappers for making authenticated API requests.
 * Simplifies integration testing of REST API endpoints.
 */

import request, { Response, SuperTest, Test } from 'supertest';

/**
 * Base API URL for tests
 * Uses the test environment APP_URL or defaults to localhost:4321
 */
const API_BASE_URL = process.env.APP_URL || 'http://localhost:4321';

/**
 * Create a Supertest agent for making API requests
 *
 * @example
 * ```typescript
 * const api = createAPIClient();
 * const response = await api.get('/api/workspaces');
 * ```
 *
 * @returns SuperTest agent
 */
export function createAPIClient(): SuperTest<Test> {
  return request(API_BASE_URL);
}

/**
 * Make an authenticated GET request
 *
 * @example
 * ```typescript
 * const response = await authenticatedGet('/api/workspaces', userToken);
 * expect(response.status).toBe(200);
 * ```
 *
 * @param path - API endpoint path
 * @param token - JWT access token
 * @returns Promise<Response>
 */
export async function authenticatedGet(path: string, token: string): Promise<Response> {
  return createAPIClient().get(path).set('Authorization', `Bearer ${token}`);
}

/**
 * Make an authenticated POST request
 *
 * @example
 * ```typescript
 * const response = await authenticatedPost('/api/workspaces', userToken, {
 *   name: 'New Workspace'
 * });
 * ```
 *
 * @param path - API endpoint path
 * @param token - JWT access token
 * @param body - Request body
 * @returns Promise<Response>
 */
export async function authenticatedPost(
  path: string,
  token: string,
  body: Record<string, unknown>
): Promise<Response> {
  return createAPIClient()
    .post(path)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

/**
 * Make an authenticated PATCH request
 *
 * @example
 * ```typescript
 * const response = await authenticatedPatch('/api/workspaces/123', userToken, {
 *   name: 'Updated Name'
 * });
 * ```
 *
 * @param path - API endpoint path
 * @param token - JWT access token
 * @param body - Request body
 * @returns Promise<Response>
 */
export async function authenticatedPatch(
  path: string,
  token: string,
  body: Record<string, unknown>
): Promise<Response> {
  return createAPIClient()
    .patch(path)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

/**
 * Make an authenticated DELETE request
 *
 * @example
 * ```typescript
 * const response = await authenticatedDelete('/api/workspaces/123', userToken);
 * expect(response.status).toBe(204);
 * ```
 *
 * @param path - API endpoint path
 * @param token - JWT access token
 * @returns Promise<Response>
 */
export async function authenticatedDelete(path: string, token: string): Promise<Response> {
  return createAPIClient().delete(path).set('Authorization', `Bearer ${token}`);
}

/**
 * Make an unauthenticated GET request
 *
 * @param path - API endpoint path
 * @returns Promise<Response>
 */
export async function unauthenticatedGet(path: string): Promise<Response> {
  return createAPIClient().get(path);
}

/**
 * Make an unauthenticated POST request
 *
 * @param path - API endpoint path
 * @param body - Request body
 * @returns Promise<Response>
 */
export async function unauthenticatedPost(
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  return createAPIClient().post(path).send(body);
}

/**
 * Assert that a response is successful (2xx status)
 *
 * @example
 * ```typescript
 * const response = await authenticatedGet('/api/workspaces', token);
 * assertSuccess(response);
 * ```
 *
 * @param response - Supertest response
 * @throws Error if response status is not 2xx
 */
export function assertSuccess(response: Response): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Expected successful response (2xx), got ${response.status}: ${JSON.stringify(response.body)}`
    );
  }
}

/**
 * Assert that a response has a specific error status
 *
 * @example
 * ```typescript
 * const response = await unauthenticatedGet('/api/workspaces');
 * assertError(response, 401);
 * ```
 *
 * @param response - Supertest response
 * @param expectedStatus - Expected HTTP status code
 * @param expectedMessage - Optional expected error message substring
 * @throws Error if response doesn't match expectations
 */
export function assertError(
  response: Response,
  expectedStatus: number,
  expectedMessage?: string
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(response.body)}`
    );
  }

  if (expectedMessage && !JSON.stringify(response.body).includes(expectedMessage)) {
    throw new Error(
      `Expected error message to contain "${expectedMessage}", got: ${JSON.stringify(response.body)}`
    );
  }
}

/**
 * Assert that a response contains specific data
 *
 * @example
 * ```typescript
 * const response = await authenticatedGet('/api/workspaces/123', token);
 * assertData(response, { name: 'Test Workspace' });
 * ```
 *
 * @param response - Supertest response
 * @param expectedData - Partial object to match against response body
 * @throws Error if response doesn't contain expected data
 */
export function assertData(response: Response, expectedData: Record<string, unknown>): void {
  assertSuccess(response);

  for (const [key, value] of Object.entries(expectedData)) {
    if (response.body[key] !== value) {
      throw new Error(
        `Expected response.body.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(response.body[key])}`
      );
    }
  }
}

/**
 * Assert that a response is paginated with correct structure
 *
 * @param response - Supertest response
 * @param expectedMinItems - Minimum number of items expected
 * @throws Error if response is not properly paginated
 */
export function assertPaginated(response: Response, expectedMinItems = 0): void {
  assertSuccess(response);

  if (!Array.isArray(response.body)) {
    throw new Error(`Expected response body to be an array, got ${typeof response.body}`);
  }

  if (response.body.length < expectedMinItems) {
    throw new Error(
      `Expected at least ${expectedMinItems} items, got ${response.body.length}`
    );
  }
}

/**
 * Extract ID from a successful create response
 *
 * @example
 * ```typescript
 * const response = await authenticatedPost('/api/workspaces', token, data);
 * const workspaceId = extractId(response);
 * ```
 *
 * @param response - Supertest response from a create operation
 * @returns The created resource ID
 * @throws Error if ID cannot be extracted
 */
export function extractId(response: Response): string {
  assertSuccess(response);

  const id = response.body?.id;
  if (!id || typeof id !== 'string') {
    throw new Error(`Cannot extract ID from response: ${JSON.stringify(response.body)}`);
  }

  return id;
}
