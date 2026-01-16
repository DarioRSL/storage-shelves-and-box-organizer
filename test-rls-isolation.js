/**
 * Multi-User Isolation Test Script
 * Tests that RLS policies prevent cross-workspace data access
 */

const BASE_URL = 'http://localhost:3000';

// Test users
const USER_A = {
  email: 'darek2@testy.usera',
  password: '12345678',
  userId: '5dced942-8b32-41af-9bbc-f1204cdfd8df',
  workspaceId: 'd67c6cf7-c21d-400d-8193-ee1f31580953'
};

const USER_B = {
  email: 'darek3@testy.usera',
  password: '12345678',
  userId: 'd72e3106-8435-4587-b54e-d5f6b53232eb',
  workspaceId: 'a95fb5b4-d309-442b-9fdf-802b7be27b20'
};

let testResults = {
  passed: [],
  failed: [],
  critical: []
};

// Helper to make authenticated requests
async function authenticatedFetch(url, options = {}, cookie) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
}

// Login and get session cookie
async function login(email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);

  // This would need to be implemented with proper Supabase client
  // For now, we'll test the API endpoints directly
  const response = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie received');
  }

  const cookie = setCookie.split(';')[0]; // Extract sb_session cookie
  console.log(`✅ Login successful`);
  return cookie;
}

// Test: Create box for User A
async function testCreateBoxUserA(cookie) {
  console.log(`\n📦 TEST: Create box for User A`);

  const response = await authenticatedFetch(`${BASE_URL}/api/boxes`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Box User A - RLS Test',
      description: 'This box belongs to User A workspace',
      tags: ['confidential', 'user-a-only'],
      workspace_id: USER_A.workspaceId
    })
  }, cookie);

  const data = await response.json();

  if (response.ok && data.id) {
    console.log(`✅ PASS: Box created successfully (ID: ${data.id})`);
    testResults.passed.push('User A can create boxes in their workspace');
    return data.id;
  } else {
    console.log(`❌ FAIL: Failed to create box`, data);
    testResults.failed.push('User A box creation failed');
    return null;
  }
}

// Test: User B tries to access User A's box (should fail)
async function testCrossWorkspaceAccess(boxId, cookieUserB) {
  console.log(`\n🚨 CRITICAL TEST: User B accessing User A's box`);
  console.log(`   Box ID: ${boxId}`);

  // Test 1: GET single box
  const response = await authenticatedFetch(`${BASE_URL}/api/boxes/${boxId}`, {}, cookieUserB);
  const data = await response.json();

  if (response.status === 403 || response.status === 404) {
    console.log(`✅ PASS: User B got ${response.status} when accessing User A's box`);
    testResults.passed.push(`Cross-workspace GET blocked (${response.status})`);
  } else if (response.ok && data.id) {
    console.log(`🚨 CRITICAL FAIL: User B can see User A's box data!`);
    console.log(`   Response:`, data);
    testResults.critical.push('RLS BROKEN: User B can read User A\'s box');
    return false;
  }

  // Test 2: Try to update User A's box
  const updateResponse = await authenticatedFetch(`${BASE_URL}/api/boxes/${boxId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'HACKED BY USER B' })
  }, cookieUserB);

  if (updateResponse.status === 403 || updateResponse.status === 404) {
    console.log(`✅ PASS: User B got ${updateResponse.status} when updating User A's box`);
    testResults.passed.push(`Cross-workspace UPDATE blocked (${updateResponse.status})`);
  } else if (updateResponse.ok) {
    console.log(`🚨 CRITICAL FAIL: User B can modify User A's box!`);
    testResults.critical.push('RLS BROKEN: User B can update User A\'s box');
    return false;
  }

  // Test 3: Try to delete User A's box
  const deleteResponse = await authenticatedFetch(`${BASE_URL}/api/boxes/${boxId}`, {
    method: 'DELETE'
  }, cookieUserB);

  if (deleteResponse.status === 403 || deleteResponse.status === 404) {
    console.log(`✅ PASS: User B got ${deleteResponse.status} when deleting User A's box`);
    testResults.passed.push(`Cross-workspace DELETE blocked (${deleteResponse.status})`);
  } else if (deleteResponse.ok) {
    console.log(`🚨 CRITICAL FAIL: User B can delete User A's box!`);
    testResults.critical.push('RLS BROKEN: User B can delete User A\'s box');
    return false;
  }

  return true;
}

// Test: User B lists boxes (should not see User A's box)
async function testBoxListIsolation(userABoxId, cookieUserB) {
  console.log(`\n📋 TEST: User B lists boxes in their workspace`);

  const response = await authenticatedFetch(
    `${BASE_URL}/api/boxes?workspace_id=${USER_B.workspaceId}`,
    {},
    cookieUserB
  );

  const data = await response.json();

  if (response.ok && Array.isArray(data)) {
    const foundUserABox = data.some(box => box.id === userABoxId);

    if (foundUserABox) {
      console.log(`🚨 CRITICAL FAIL: User A's box appears in User B's box list!`);
      testResults.critical.push('RLS BROKEN: Cross-workspace data in list endpoint');
      return false;
    } else {
      console.log(`✅ PASS: User A's box does not appear in User B's list`);
      testResults.passed.push('Box list properly isolated');
      return true;
    }
  } else {
    console.log(`❌ FAIL: Could not retrieve box list`, data);
    testResults.failed.push('Box list retrieval failed');
    return false;
  }
}

// Main test execution
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   MULTI-USER ISOLATION TEST - RLS VERIFICATION');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Note: This script requires manual login to get session cookies
    // We'll create a simpler version that tests the API directly

    console.log('\n⚠️  This test requires manual execution:');
    console.log('   1. Login as User A in browser 1');
    console.log('   2. Login as User B in browser 2');
    console.log('   3. Follow test procedures in MULTI_USER_ISOLATION_TEST.md');
    console.log('\n   This script demonstrates the test structure.');

  } catch (error) {
    console.error('Test execution error:', error);
  }
}

// Run tests
runTests();