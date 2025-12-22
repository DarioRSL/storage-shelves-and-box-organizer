#!/bin/bash

# Integration Tests for PATCH /api/workspaces/:workspace_id/members/:user_id
#
# This script tests the workspace member role update endpoint.
# Run this after starting the dev server: npm run dev
#
# NOTE: RLS is currently disabled in the database. When RLS is enabled,
# some tests may behave differently (e.g., non-members won't see workspace data).

set -e  # Exit on error

BASE_URL="http://localhost:3000"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test result
print_result() {
    local test_name="$1"
    local expected_status="$2"
    local actual_status="$3"
    local response="$4"

    if [ "$expected_status" = "$actual_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (HTTP $actual_status)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo -e "  Expected: HTTP $expected_status"
        echo -e "  Got: HTTP $actual_status"
        echo -e "  Response: $response"
        ((TESTS_FAILED++))
    fi
}

# Helper function to make authenticated request
make_request() {
    local method="$1"
    local url="$2"
    local token="$3"
    local data="$4"

    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Authorization: Bearer $token"
        fi
    else
        if [ -n "$data" ]; then
            curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -w "\n%{http_code}" -X "$method" "$url"
        fi
    fi
}

# Get JWT token for a user
get_token() {
    local email="$1"
    local password="$2"

    local response=$(curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
        -H "apikey: $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\"}")

    echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo ""
}

echo "=========================================="
echo "PATCH /api/workspaces/:workspace_id/members/:user_id"
echo "Integration Test Suite"
echo "=========================================="
echo ""

# Setup: Get test data from database
echo -e "${YELLOW}Setting up test data...${NC}"

# Find a workspace with multiple members
WORKSPACE_DATA=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -A -c \
    "SELECT workspace_id FROM public.workspace_members GROUP BY workspace_id HAVING COUNT(*) > 1 LIMIT 1;")
WORKSPACE_ID=$(echo "$WORKSPACE_DATA" | tr -d '[:space:]')

if [ -z "$WORKSPACE_ID" ]; then
    echo -e "${RED}Error: No workspace with multiple members found${NC}"
    exit 1
fi

# Get members of this workspace
MEMBERS=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -A -F'|' -c \
    "SELECT user_id, role FROM public.workspace_members WHERE workspace_id = '$WORKSPACE_ID' ORDER BY role DESC LIMIT 2;")

OWNER_ID=$(echo "$MEMBERS" | grep '|owner' | cut -d'|' -f1 | tr -d '[:space:]')
MEMBER_ID=$(echo "$MEMBERS" | grep -v '|owner' | head -1 | cut -d'|' -f1 | tr -d '[:space:]')

if [ -z "$OWNER_ID" ] || [ -z "$MEMBER_ID" ]; then
    echo -e "${RED}Error: Could not find owner and member for testing${NC}"
    exit 1
fi

# Get owner email
OWNER_EMAIL=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -A -c \
    "SELECT email FROM auth.users WHERE id = '$OWNER_ID';")
OWNER_EMAIL=$(echo "$OWNER_EMAIL" | tr -d '[:space:]')

echo -e "Workspace ID: ${GREEN}$WORKSPACE_ID${NC}"
echo -e "Owner ID: ${GREEN}$OWNER_ID${NC}"
echo -e "Owner Email: ${GREEN}$OWNER_EMAIL${NC}"
echo -e "Member ID: ${GREEN}$MEMBER_ID${NC}"
echo ""

# Try to get token (may fail if user doesn't exist in auth or password is wrong)
OWNER_TOKEN=$(get_token "$OWNER_EMAIL" "password123")

if [ -z "$OWNER_TOKEN" ]; then
    echo -e "${YELLOW}Warning: Could not get auth token for owner. Auth-required tests will be skipped.${NC}"
    echo -e "${YELLOW}This is expected if user passwords are not set or RLS prevents access.${NC}"
    echo ""
fi

# ===========================================
# Test Suite
# ===========================================

echo -e "${YELLOW}Running tests...${NC}"
echo ""

# Test 1: Missing Authorization Header
echo "Test 1: Missing authorization header (401)"
RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members/$MEMBER_ID" "" '{"role": "admin"}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
print_result "Unauthorized request without token" "401" "$STATUS" "$BODY"
echo ""

# Test 2: Invalid workspace_id format
echo "Test 2: Invalid workspace_id format (400)"
if [ -n "$OWNER_TOKEN" ]; then
    RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/invalid-uuid/members/$MEMBER_ID" "$OWNER_TOKEN" '{"role": "admin"}')
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    print_result "Invalid workspace_id format" "400" "$STATUS" "$BODY"
else
    echo -e "${YELLOW}⊘ SKIP${NC}: Invalid workspace_id format (no token)"
fi
echo ""

# Test 3: Invalid user_id format
echo "Test 3: Invalid user_id format (400)"
if [ -n "$OWNER_TOKEN" ]; then
    RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members/not-a-uuid" "$OWNER_TOKEN" '{"role": "admin"}')
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    print_result "Invalid user_id format" "400" "$STATUS" "$BODY"
else
    echo -e "${YELLOW}⊘ SKIP${NC}: Invalid user_id format (no token)"
fi
echo ""

# Test 4: Invalid role value
echo "Test 4: Invalid role value (400)"
if [ -n "$OWNER_TOKEN" ]; then
    RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members/$MEMBER_ID" "$OWNER_TOKEN" '{"role": "superadmin"}')
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    print_result "Invalid role enum value" "400" "$STATUS" "$BODY"
else
    echo -e "${YELLOW}⊘ SKIP${NC}: Invalid role value (no token)"
fi
echo ""

# Test 5: Non-existent member (404)
echo "Test 5: Non-existent member (404)"
if [ -n "$OWNER_TOKEN" ]; then
    NON_EXISTENT_ID="00000000-0000-0000-0000-000000000000"
    RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members/$NON_EXISTENT_ID" "$OWNER_TOKEN" '{"role": "admin"}')
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    print_result "Non-existent member" "404" "$STATUS" "$BODY"
else
    echo -e "${YELLOW}⊘ SKIP${NC}: Non-existent member (no token)"
fi
echo ""

# Test 6: Success - Update member role to admin (200)
echo "Test 6: Success - Update member role to admin (200)"
if [ -n "$OWNER_TOKEN" ]; then
    RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members/$MEMBER_ID" "$OWNER_TOKEN" '{"role": "admin"}')
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    print_result "Update member to admin" "200" "$STATUS" "$BODY"

    # Verify the change in database
    NEW_ROLE=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -A -c \
        "SELECT role FROM public.workspace_members WHERE workspace_id = '$WORKSPACE_ID' AND user_id = '$MEMBER_ID';")
    NEW_ROLE=$(echo "$NEW_ROLE" | tr -d '[:space:]')

    if [ "$NEW_ROLE" = "admin" ]; then
        echo -e "  ${GREEN}✓${NC} Database verified: role is now 'admin'"
    else
        echo -e "  ${RED}✗${NC} Database mismatch: expected 'admin', got '$NEW_ROLE'"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC}: Update member to admin (no token)"
fi
echo ""

# Test 7: Success - Update admin role back to member (200)
echo "Test 7: Success - Update admin back to member (200)"
if [ -n "$OWNER_TOKEN" ]; then
    RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members/$MEMBER_ID" "$OWNER_TOKEN" '{"role": "member"}')
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    print_result "Update admin back to member" "200" "$STATUS" "$BODY"

    # Verify the change in database
    NEW_ROLE=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -A -c \
        "SELECT role FROM public.workspace_members WHERE workspace_id = '$WORKSPACE_ID' AND user_id = '$MEMBER_ID';")
    NEW_ROLE=$(echo "$NEW_ROLE" | tr -d '[:space:]')

    if [ "$NEW_ROLE" = "member" ]; then
        echo -e "  ${GREEN}✓${NC} Database verified: role is now 'member'"
    else
        echo -e "  ${RED}✗${NC} Database mismatch: expected 'member', got '$NEW_ROLE'"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC}: Update admin back to member (no token)"
fi
echo ""

# Test 8: Attempt to change last owner role (409)
echo "Test 8: Attempt to change last owner role (409)"
if [ -n "$OWNER_TOKEN" ]; then
    # Count owners
    OWNER_COUNT=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -A -c \
        "SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = '$WORKSPACE_ID' AND role = 'owner';")
    OWNER_COUNT=$(echo "$OWNER_COUNT" | tr -d '[:space:]')

    if [ "$OWNER_COUNT" = "1" ]; then
        RESPONSE=$(make_request "PATCH" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members/$OWNER_ID" "$OWNER_TOKEN" '{"role": "admin"}')
        STATUS=$(echo "$RESPONSE" | tail -1)
        BODY=$(echo "$RESPONSE" | head -n -1)
        print_result "Change last owner role (should fail)" "409" "$STATUS" "$BODY"
    else
        echo -e "${YELLOW}⊘ SKIP${NC}: Cannot test last owner protection (workspace has $OWNER_COUNT owners)"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC}: Last owner protection (no token)"
fi
echo ""

# ===========================================
# Test Summary
# ===========================================

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed ✗${NC}"
    exit 1
fi
