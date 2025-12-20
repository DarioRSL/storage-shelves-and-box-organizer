#!/bin/bash

# Test script for PATCH /api/locations/:id endpoint
# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
API_BASE="http://localhost:3000"

# Test user credentials
EMAIL="apitest@example.com"
PASSWORD="password123"

# Test data
WORKSPACE_ID="6bddc985-69e4-48d2-b37b-2dbb118577e2"
LOCATION_ID="5dde4924-4adf-415a-ac8c-b63c52d1ca48"  # Top Shelf

echo -e "${YELLOW}=== PATCH /api/locations/:id Test Suite ===${NC}\n"

# Step 1: Login to get JWT token
echo -e "${YELLOW}Step 1: Logging in to get JWT token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token. Response: ${LOGIN_RESPONSE}${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo -e "Token: ${TOKEN:0:50}...\n"

# Function to run test
run_test() {
  local test_name=$1
  local expected_status=$2
  local payload=$3
  local location_id=${4:-$LOCATION_ID}

  echo -e "${YELLOW}Test: ${test_name}${NC}"

  RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
    "${API_BASE}/api/locations/${location_id}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${payload}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Got expected status: ${HTTP_CODE}"
    echo "Response: ${BODY}" | head -c 200
    echo -e "\n"
  else
    echo -e "${RED}✗ FAIL${NC} - Expected ${expected_status}, got ${HTTP_CODE}"
    echo "Response: ${BODY}"
    echo -e "\n"
  fi
}

# TEST 1: Update name only (200 OK)
run_test "Update name only" "200" '{"name":"Updated Top Shelf"}'

# TEST 2: Update description only (200 OK)
run_test "Update description only" "200" '{"description":"Zaktualizowany opis górnej półki"}'

# TEST 3: Update both fields (200 OK)
run_test "Update both name and description" "200" '{"name":"Completely New Name","description":"I nowy opis też"}'

# TEST 4: Clear description (200 OK)
run_test "Clear description to null" "200" '{"description":null}'

# TEST 5: Empty body (400 Bad Request)
run_test "Empty body validation" "400" '{}'

# TEST 6: Empty name (400 Bad Request)
run_test "Empty name validation" "400" '{"name":""}'

# TEST 7: Invalid UUID (400 Bad Request)
run_test "Invalid UUID format" "400" '{"name":"Test"}' "invalid-uuid"

# TEST 8: Non-existent location (404 Not Found)
run_test "Non-existent location" "404" '{"name":"Test"}' "00000000-0000-0000-0000-000000000000"

echo -e "${YELLOW}=== Test Suite Complete ===${NC}"
echo -e "\nCheck database to verify path regeneration:"
echo "podman exec supabase_db_supabase psql -U postgres -d postgres -c \"SELECT id, name, path, updated_at FROM locations WHERE id = '${LOCATION_ID}';\""
