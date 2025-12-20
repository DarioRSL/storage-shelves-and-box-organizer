#!/bin/bash

# Simple PATCH endpoint test using Supabase session
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://localhost:3000"
LOCATION_ID="5dde4924-4adf-415a-ac8c-b63c52d1ca48"  # Top Shelf

echo -e "${YELLOW}=== PATCH /api/locations/:id Simple Test ===${NC}\n"

# You need to provide a valid JWT token
# Get it by logging into the app and copying from browser DevTools
echo -e "${BLUE}Please provide your JWT token:${NC}"
echo -e "${BLUE}(Login to app → DevTools → Application → Cookies → copy 'sb-access-token')${NC}"
read -p "JWT Token: " TOKEN

if [ -z "$TOKEN" ]; then
  echo -e "${RED}No token provided. Exiting.${NC}"
  exit 1
fi

echo -e "\n${YELLOW}Running tests with Location ID: ${LOCATION_ID}${NC}\n"

# Show current state
echo -e "${BLUE}Current location state in database:${NC}"
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
SELECT id, name, description, path, updated_at
FROM locations
WHERE id = '${LOCATION_ID}';"

echo ""

# TEST 1: Update name only
echo -e "${YELLOW}TEST 1: Update name only${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "${API_BASE}/api/locations/${LOCATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Top Shelf"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS (200 OK)${NC}"
  echo "Response: $BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}✗ FAIL (Expected 200, got ${HTTP_CODE})${NC}"
  echo "Response: $BODY"
fi

echo ""
echo -e "${BLUE}Database state after update:${NC}"
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
SELECT id, name, description, path, updated_at
FROM locations
WHERE id = '${LOCATION_ID}';"

echo -e "\n${GREEN}Test complete!${NC}"
echo -e "\n${YELLOW}To run more tests, edit this script or use test-patch-location.http in VS Code${NC}"
