#!/bin/bash

# Complete test suite for DELETE /api/auth/delete-account
# Run this after starting dev server with: npm run dev

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_BASE="http://localhost:3000"
SUPABASE_AUTH_BASE="http://127.0.0.1:54321"
TEST_USER_EMAIL="deletetest@example.com"
TEST_USER_PASSWORD="TestPass123!"

PASS_COUNT=0
FAIL_COUNT=0

echo -e "${YELLOW}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  DELETE /api/auth/delete-account - Test Suite     ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════╝${NC}\n"

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$API_BASE" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running on port 3000!${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}\n"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Step 1: Get test user token via login
echo -e "${BLUE}Step 1: Authenticating test user...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_AUTH_BASE}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

TEST_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('access_token', '') if isinstance(data, dict) else '')" 2>/dev/null)

if [ -z "$TEST_TOKEN" ]; then
  echo -e "${RED}✗ Failed to authenticate test user${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Extract user ID from token
TEST_USER_ID=$(echo "$TEST_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('sub', ''))" 2>/dev/null)

if [ -z "$TEST_USER_ID" ]; then
  echo -e "${RED}✗ Failed to extract user ID from token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test user authenticated${NC}"
echo -e "  User ID: ${TEST_USER_ID}"
echo -e "  Email: ${TEST_USER_EMAIL}\n"

# Step 2: Create test workspace and data
echo -e "${BLUE}Step 2: Creating test workspace and data for user...${NC}"

# Create workspace via API
WORKSPACE_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/workspaces" \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Delete Account Test Workspace"}')

TEST_WORKSPACE_ID=$(echo "$WORKSPACE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('id', '') if isinstance(data, dict) else '')" 2>/dev/null)

if [ -z "$TEST_WORKSPACE_ID" ]; then
  echo -e "${YELLOW}⊘ Could not create workspace via API, attempting database insert${NC}"
  TEST_WORKSPACE_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
  INSERT INTO workspaces (owner_id, name)
  VALUES ('${TEST_USER_ID}', 'Delete Account Test Workspace')
  RETURNING id;
  " 2>/dev/null | tr -d ' \n')
fi

echo -e "${GREEN}✓ Test workspace created${NC}"
echo -e "  Workspace ID: ${TEST_WORKSPACE_ID}\n"

# Step 3: Add workspace member entry (in case it wasn't auto-added)
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('${TEST_WORKSPACE_ID}', '${TEST_USER_ID}', 'owner')
ON CONFLICT DO NOTHING;
" 2>/dev/null

# Step 4: Create test boxes and locations
echo -e "${BLUE}Step 3: Creating test boxes and locations...${NC}"

# Create test location
TEST_LOCATION_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
INSERT INTO locations (workspace_id, path, name)
VALUES ('${TEST_WORKSPACE_ID}', 'root.test_area', 'Test Area')
RETURNING id;
" 2>/dev/null | tr -d ' \n')

# Create test boxes
BOX1_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
INSERT INTO boxes (workspace_id, name, location_id)
VALUES ('${TEST_WORKSPACE_ID}', 'Test Box 1', '${TEST_LOCATION_ID}')
RETURNING id;
" 2>/dev/null | tr -d ' \n')

BOX2_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
INSERT INTO boxes (workspace_id, name, location_id)
VALUES ('${TEST_WORKSPACE_ID}', 'Test Box 2', '${TEST_LOCATION_ID}')
RETURNING id;
" 2>/dev/null | tr -d ' \n')

echo -e "${GREEN}✓ Test data created${NC}"
echo -e "  Location ID: ${TEST_LOCATION_ID}"
echo -e "  Box 1 ID: ${BOX1_ID}"
echo -e "  Box 2 ID: ${BOX2_ID}\n"

# Step 5: Verify data exists before deletion
echo -e "${BLUE}Step 4: Verifying data exists before deletion...${NC}"

PROFILE_COUNT=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
SELECT COUNT(*) FROM profiles WHERE id = '${TEST_USER_ID}';
" 2>/dev/null | tr -d ' \n')

WORKSPACE_COUNT=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
SELECT COUNT(*) FROM workspaces WHERE id = '${TEST_WORKSPACE_ID}';
" 2>/dev/null | tr -d ' \n')

BOX_COUNT=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
SELECT COUNT(*) FROM boxes WHERE workspace_id = '${TEST_WORKSPACE_ID}';
" 2>/dev/null | tr -d ' \n')

LOCATION_COUNT=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
SELECT COUNT(*) FROM locations WHERE workspace_id = '${TEST_WORKSPACE_ID}';
" 2>/dev/null | tr -d ' \n')

echo -e "${GREEN}Data before deletion:${NC}"
echo -e "  Profiles: ${PROFILE_COUNT}"
echo -e "  Workspaces: ${WORKSPACE_COUNT}"
echo -e "  Boxes: ${BOX_COUNT}"
echo -e "  Locations: ${LOCATION_COUNT}\n"

# Function to run a test
run_test() {
    local test_num=$1
    local test_name=$2
    local method=$3
    local endpoint=$4
    local expected_status=$5
    local auth_token=${6:-"valid"}

    echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
    echo -e "${YELLOW}TEST $test_num: $test_name${NC}"
    echo -e "${BLUE}Method: $method ${endpoint}${NC}"
    echo -e "${BLUE}Expected: HTTP $expected_status${NC}"

    if [ "$auth_token" = "none" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
            "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" 2>/dev/null)
    elif [ "$auth_token" = "invalid" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
            "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer invalid.malformed.token" \
            -H "Content-Type: application/json" 2>/dev/null)
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
            "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer ${TEST_TOKEN}" \
            -H "Content-Type: application/json" 2>/dev/null)
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Got HTTP $HTTP_CODE"
        ((PASS_COUNT++))
    else
        echo -e "${RED}✗ FAIL${NC} - Expected $expected_status, got $HTTP_CODE"
        ((FAIL_COUNT++))
    fi

    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════
# AUTHENTICATION ERROR TESTS (401 Unauthorized)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ AUTHENTICATION ERROR TESTS ═══${NC}\n"

run_test 1 "Missing Authorization header" DELETE "/api/auth/delete-account" 401 "none"

run_test 2 "Invalid JWT token format" DELETE "/api/auth/delete-account" 401 "invalid"

# ═══════════════════════════════════════════════════════════════════
# SUCCESS TEST (200 OK)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ SUCCESS TEST ═══${NC}\n"

run_test 3 "Successfully delete account with valid token" DELETE "/api/auth/delete-account" 200 "valid"

# ═══════════════════════════════════════════════════════════════════
# DATABASE VERIFICATION
# ═══════════════════════════════════════════════════════════════════

echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}═══ DATABASE VERIFICATION ═══${NC}\n"

if command -v podman &> /dev/null; then
    echo "Checking if all user data was properly deleted..."
    
    PROFILE_COUNT_AFTER=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
    SELECT COUNT(*) FROM profiles WHERE id = '${TEST_USER_ID}';
    " 2>/dev/null | tr -d ' \n')

    WORKSPACE_COUNT_AFTER=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
    SELECT COUNT(*) FROM workspaces WHERE id = '${TEST_WORKSPACE_ID}';
    " 2>/dev/null | tr -d ' \n')

    BOX_COUNT_AFTER=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
    SELECT COUNT(*) FROM boxes WHERE workspace_id = '${TEST_WORKSPACE_ID}';
    " 2>/dev/null | tr -d ' \n')

    LOCATION_COUNT_AFTER=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
    SELECT COUNT(*) FROM locations WHERE workspace_id = '${TEST_WORKSPACE_ID}';
    " 2>/dev/null | tr -d ' \n')

    MEMBER_COUNT_AFTER=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
    SELECT COUNT(*) FROM workspace_members WHERE workspace_id = '${TEST_WORKSPACE_ID}';
    " 2>/dev/null | tr -d ' \n')

    echo -e "${GREEN}Data after deletion:${NC}"
    echo -e "  Profiles: ${PROFILE_COUNT_AFTER}"
    echo -e "  Workspaces: ${WORKSPACE_COUNT_AFTER}"
    echo -e "  Boxes: ${BOX_COUNT_AFTER}"
    echo -e "  Locations: ${LOCATION_COUNT_AFTER}"
    echo -e "  Members: ${MEMBER_COUNT_AFTER}\n"

    if [ "$PROFILE_COUNT_AFTER" = "0" ] && [ "$WORKSPACE_COUNT_AFTER" = "0" ] && [ "$BOX_COUNT_AFTER" = "0" ] && [ "$LOCATION_COUNT_AFTER" = "0" ]; then
        echo -e "${GREEN}✓ CASCADE DELETION VERIFIED - All data properly deleted${NC}\n"
    else
        echo -e "${RED}✗ CASCADE DELETION FAILED - Data still exists${NC}\n"
        ((FAIL_COUNT++))
    fi
else
    echo -e "${YELLOW}Note: podman not found, skipping database verification${NC}"
fi

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════

echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                  TEST SUMMARY                      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "  ${RED}Failed: $FAIL_COUNT${NC}"
echo -e "  Total:  $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ ALL TESTS PASSED! ✓✓✓${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗✗✗ SOME TESTS FAILED ✗✗✗${NC}"
    echo ""
    exit 1
fi
