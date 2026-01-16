#!/bin/bash

# Complete test suite for PATCH /api/locations/:id
# Run this after starting dev server with: npm run dev

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjU0MzIxL2F1dGgvdjEiLCJzdWIiOiJiZTMxN2FmNy0xY2ViLTRkOTMtYWY4NC1mZjQ1ODgwMDRiNDMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY2MjU2NTM3LCJpYXQiOjE3NjYyNTI5MzcsImVtYWlsIjoidGVzdHBhdGNoQGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc3RwYXRjaEBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImJlMzE3YWY3LTFjZWItNGQ5My1hZjg0LWZmNDU4ODAwNGI0MyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY2MjUyOTM3fV0sInNlc3Npb25faWQiOiIwNjM1YTMzNC03YmNjLTQ0NjEtOGJjNC1jN2QyNjYzODgzZGYiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.g4EPPXUVRdHMv2dtBT1iL35naQ_CmQWVST5GlWNHVj8"
API_BASE="http://localhost:3000"
LOCATION_ID="d5903dfc-ae32-4d48-8e6a-b8e13ca0a310"  # Shelf A (will be renamed in tests)
SHELF_B_ID="76c480fd-f456-4e60-9d20-e0a84840396e"   # Shelf B (sibling for conflict test)
GARAGE_ID="8a4c3080-b73e-4333-8361-75e005269ebe"   # Test Garage

PASS_COUNT=0
FAIL_COUNT=0

echo -e "${YELLOW}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  PATCH /api/locations/:id - Complete Test Suite   ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}Test Environment:${NC}"
echo -e "  User: testpatch@example.com"
echo -e "  Workspace: Test Workspace PATCH"
echo -e "  Test Locations:"
echo -e "    - Test Garage (root)"
echo -e "    - Shelf A (will be modified)"
echo -e "    - Shelf B (sibling for conflict test)"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running on port 3000!${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}\n"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Function to run a test
run_test() {
    local test_num=$1
    local test_name=$2
    local expected_status=$3
    local payload=$4
    local location_id=${5:-$LOCATION_ID}

    echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
    echo -e "${YELLOW}TEST $test_num: $test_name${NC}"
    echo -e "${BLUE}Expected: HTTP $expected_status${NC}"

    # Make request
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
        "${API_BASE}/api/locations/${location_id}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null)

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

    # Show response (truncated)
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null | head -10 || echo "$BODY" | head -c 200
    echo ""
}

# ═══════════════════════════════════════════════════════════════════
# HAPPY PATH TESTS (200 OK)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ HAPPY PATH TESTS ═══${NC}\n"

run_test 1 "Update name only" 200 '{
  "name": "Updated Shelf Name"
}'

run_test 2 "Update description only" 200 '{
  "description": "Zaktualizowany opis półki testowej"
}'

run_test 3 "Update both name and description" 200 '{
  "name": "Completely New Shelf",
  "description": "Całkowicie nowy opis półki"
}'

run_test 4 "Clear description (set to null)" 200 '{
  "description": null
}'

# ═══════════════════════════════════════════════════════════════════
# VALIDATION ERROR TESTS (400 Bad Request)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ VALIDATION ERROR TESTS ═══${NC}\n"

run_test 5 "Empty request body" 400 '{}'

run_test 6 "Empty name string" 400 '{
  "name": ""
}'

run_test 7 "Invalid UUID format" 400 '{
  "name": "Test"
}' "invalid-uuid-format"

# ═══════════════════════════════════════════════════════════════════
# NOT FOUND TESTS (404 Not Found)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ NOT FOUND TESTS ═══${NC}\n"

run_test 8 "Non-existent location ID" 404 '{
  "name": "Test"
}' "00000000-0000-0000-0000-000000000000"

# ═══════════════════════════════════════════════════════════════════
# CONFLICT TESTS (409 Conflict)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}═══ CONFLICT TESTS ═══${NC}\n"

# Test trying to rename Shelf A to "Shelf B" (which already exists as a sibling)
run_test 9 "Duplicate sibling name" 409 '{
  "name": "Shelf B"
}' "$LOCATION_ID"

# ═══════════════════════════════════════════════════════════════════
# DATABASE VERIFICATION
# ═══════════════════════════════════════════════════════════════════

echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}═══ DATABASE VERIFICATION ═══${NC}\n"

echo "Final state of updated location:"
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
SELECT id, name, description, path, updated_at
FROM locations
WHERE id = '${LOCATION_ID}';"

echo ""
echo "Verifying path regeneration (should be updated):"
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
SELECT name, path
FROM locations
WHERE id = '${LOCATION_ID}';"

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
    echo -e "${BLUE}Note: To reset test data and run again, use:${NC}"
    echo -e "${YELLOW}podman exec supabase_db_supabase psql -U postgres -d postgres -c \"DELETE FROM locations WHERE workspace_id = '67b47c38-73a5-4265-a9c1-466f113cb8b9'; DELETE FROM workspaces WHERE id = '67b47c38-73a5-4265-a9c1-466f113cb8b9';\"${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗✗✗ SOME TESTS FAILED ✗✗✗${NC}"
    echo ""
    exit 1
fi
