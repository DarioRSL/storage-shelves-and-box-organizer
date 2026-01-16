#!/bin/bash

# Complete test suite for DELETE /api/workspaces/:workspace_id
# Run this after starting dev server with: npm run dev

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - Using TEST_USER token from .env
API_BASE="http://localhost:3001"
SUPABASE_AUTH_BASE="http://127.0.0.1:54321"
TEST_WORKSPACE_ID="4d5a1187-e805-4a53-845d-f118945b0dd0"  # From TEST_USER_WORKSPACE_ID in .env
TEST_USER_EMAIL="testuser@example.com"
TEST_USER_PASSWORD="TestPass123!"

# Get fresh token by authenticating with Supabase
echo -e "${BLUE}Fetching fresh authentication token...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_AUTH_BASE}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('access_token', '') if isinstance(data, dict) else '')" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to fetch authentication token${NC}"
  echo "Response: $AUTH_RESPONSE"
  echo ""
  exit 1
fi
echo -e "${GREEN}✓ Token fetched successfully${NC}\n"

PASS_COUNT=0
FAIL_COUNT=0

echo -e "${YELLOW}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  DELETE /api/workspaces/:id - Complete Test Suite ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}Test Environment:${NC}"
echo -e "  User: testuser@example.com (ID: 7ca310e0-7da1-44c8-ae2a-f7069712dcdd)"
echo -e "  Workspace: Test Workspace (ID: 4d5a1187-e805-4a53-845d-f118945b0dd0)"
echo -e "  API: $API_BASE"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$API_BASE" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running on port 3001!${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}\n"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Function to run a test
run_test() {
    local test_num=$1
    local test_name=$2
    local method=$3
    local endpoint=$4
    local expected_status=$5
    local auth_token=${6:-"valid"}  # "valid", "invalid", or "none"

    echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
    echo -e "${YELLOW}TEST $test_num: $test_name${NC}"
    echo -e "${BLUE}Method: $method ${endpoint}${NC}"
    echo -e "${BLUE}Expected: HTTP $expected_status${NC}"

    # Make request
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
        # "valid" - use real TOKEN
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
            "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" 2>/dev/null)
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    # Check result
    if [ "$HTTP_CODE" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Got HTTP $HTTP_CODE"
        ((PASS_COUNT++))
    else
        echo -e "${RED}✗ FAIL${NC} - Expected $expected_status, got $HTTP_CODE"
        ((FAIL_COUNT++))
    fi

    # Show response
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════
# AUTHENTICATION ERROR TESTS (401 Unauthorized)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ AUTHENTICATION ERROR TESTS ═══${NC}\n"

run_test 1 "Missing Authorization header" DELETE "/api/workspaces/${TEST_WORKSPACE_ID}" 401 "none"

run_test 2 "Invalid JWT token format" DELETE "/api/workspaces/${TEST_WORKSPACE_ID}" 401 "invalid"

# ═══════════════════════════════════════════════════════════════════
# VALIDATION ERROR TESTS (400 Bad Request)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ VALIDATION ERROR TESTS ═══${NC}\n"

run_test 3 "Invalid UUID format - random string" DELETE "/api/workspaces/not-a-uuid" 400 "valid"

run_test 4 "Invalid UUID format - partial UUID" DELETE "/api/workspaces/4d5a1187-e805" 400 "valid"

run_test 5 "Invalid UUID format - too many parts" DELETE "/api/workspaces/4d5a1187-e805-4a53-845d-f118945b0dd0-extra" 400 "valid"

# ═══════════════════════════════════════════════════════════════════
# NOT FOUND TESTS (404 Not Found)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ NOT FOUND TESTS ═══${NC}\n"

run_test 6 "Non-existent workspace (all zeros)" DELETE "/api/workspaces/00000000-0000-0000-0000-000000000000" 404 "valid"

run_test 7 "Non-existent workspace (random UUID)" DELETE "/api/workspaces/f47ac10b-58cc-4372-a567-0e02b2c3d479" 404 "valid"

# ═══════════════════════════════════════════════════════════════════
# SUCCESS TEST (200 OK) - if workspace exists
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ SUCCESS TEST ═══${NC}\n"

echo -e "${BLUE}Checking if test workspace exists...${NC}"
VERIFY=$(curl -s -X GET \
    "${API_BASE}/api/workspaces" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" 2>/dev/null)

if echo "$VERIFY" | grep -q "4d5a1187-e805-4a53-845d-f118945b0dd0"; then
    echo -e "${GREEN}✓ Test workspace exists, proceeding with deletion test${NC}\n"

    run_test 8 "Successfully delete workspace (with valid token)" DELETE "/api/workspaces/${TEST_WORKSPACE_ID}" 200

    # Verify deletion
    echo -e "${BLUE}Verifying workspace was deleted...${NC}"
    VERIFY_DELETE=$(curl -s -X DELETE \
        "${API_BASE}/api/workspaces/${TEST_WORKSPACE_ID}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" 2>/dev/null)

    if echo "$VERIFY_DELETE" | grep -q "404\|Not Found"; then
        echo -e "${GREEN}✓ Workspace confirmed deleted (second delete returns 404)${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Test workspace does not exist or not accessible, skipping deletion test${NC}\n"
fi

# ═══════════════════════════════════════════════════════════════════
# DATABASE VERIFICATION (if podman/supabase available)
# ═══════════════════════════════════════════════════════════════════

echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}═══ DATABASE VERIFICATION (if Supabase available) ═══${NC}\n"

if command -v podman &> /dev/null; then
    echo "Checking if workspace data was properly cascaded..."
    podman exec supabase_db_supabase psql -U postgres -d postgres -c "
    SELECT 'workspaces' as table_name, COUNT(*) as count FROM workspaces WHERE id = '${TEST_WORKSPACE_ID}'
    UNION ALL
    SELECT 'boxes', COUNT(*) FROM boxes WHERE workspace_id = '${TEST_WORKSPACE_ID}'
    UNION ALL
    SELECT 'locations', COUNT(*) FROM locations WHERE workspace_id = '${TEST_WORKSPACE_ID}'
    UNION ALL
    SELECT 'workspace_members', COUNT(*) FROM workspace_members WHERE workspace_id = '${TEST_WORKSPACE_ID}'
    UNION ALL
    SELECT 'qr_codes', COUNT(*) FROM qr_codes WHERE workspace_id = '${TEST_WORKSPACE_ID}';" 2>/dev/null || echo "Podman/Supabase not available for DB verification"
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
