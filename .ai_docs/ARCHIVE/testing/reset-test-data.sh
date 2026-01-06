#!/bin/bash

# Reset test data for PATCH endpoint tests
# This script cleans up test data and recreates it from scratch

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}=== Resetting Test Data for PATCH Endpoint ===${NC}\n"

# Configuration
WORKSPACE_ID="67b47c38-73a5-4265-a9c1-466f113cb8b9"
USER_ID="be317af7-1ceb-4d93-af84-ff4588004b43"
USER_EMAIL="testpatch@example.com"

echo -e "${BLUE}Step 1: Cleaning up existing test data...${NC}"

# Delete locations first (due to foreign key)
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
DELETE FROM locations WHERE workspace_id = '${WORKSPACE_ID}';
" > /dev/null 2>&1

# Delete workspace (cascade will handle workspace_members)
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
DELETE FROM workspaces WHERE id = '${WORKSPACE_ID}';
" > /dev/null 2>&1

# Delete profile (will cascade to workspaces if needed)
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
DELETE FROM profiles WHERE id = '${USER_ID}';
" > /dev/null 2>&1

# Delete auth user (will cascade to profiles)
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
DELETE FROM auth.users WHERE id = '${USER_ID}';
" > /dev/null 2>&1

echo -e "${GREEN}✓ Cleanup complete${NC}\n"

echo -e "${BLUE}Step 2: Creating new test user and workspace...${NC}"

# Create new user via Supabase Auth API
SIGNUP_RESPONSE=$(curl -s -X POST "http://127.0.0.1:54321/auth/v1/signup" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"testpass123\"}")

NEW_USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -z "$NEW_USER_ID" ]; then
  echo -e "${RED}✗ Failed to create user${NC}"
  echo "Response: $SIGNUP_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Created user: ${USER_EMAIL}${NC}"
echo -e "${GREEN}  User ID: ${NEW_USER_ID}${NC}"

# Extract token
NEW_TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')
echo -e "${GREEN}  Token: ${NEW_TOKEN:0:50}...${NC}\n"

# Create profile
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
INSERT INTO profiles (id, email, full_name)
VALUES ('${NEW_USER_ID}', '${USER_EMAIL}', 'Test Patch User')
ON CONFLICT (id) DO NOTHING;
" > /dev/null 2>&1

# Create workspace
NEW_WORKSPACE_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
INSERT INTO workspaces (owner_id, name)
VALUES ('${NEW_USER_ID}', 'Test Workspace PATCH')
RETURNING id;
" | tr -d ' \n')

echo -e "${GREEN}✓ Created workspace: Test Workspace PATCH${NC}"
echo -e "${GREEN}  Workspace ID: ${NEW_WORKSPACE_ID}${NC}\n"

echo -e "${BLUE}Step 3: Creating test locations...${NC}"

# Create test locations
podman exec supabase_db_supabase psql -U postgres -d postgres -c "
INSERT INTO locations (workspace_id, path, name, description)
VALUES
  ('${NEW_WORKSPACE_ID}', 'root.test_garage', 'Test Garage', 'Garaż testowy do aktualizacji'),
  ('${NEW_WORKSPACE_ID}', 'root.test_garage.shelf_a', 'Shelf A', 'Pierwsza półka'),
  ('${NEW_WORKSPACE_ID}', 'root.test_garage.shelf_b', 'Shelf B', 'Druga półka - rodzeństwo dla Shelf A')
RETURNING id, name, path;
"

echo -e "${GREEN}✓ Created test locations${NC}\n"

# Get location IDs
SHELF_A_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
SELECT id FROM locations WHERE workspace_id = '${NEW_WORKSPACE_ID}' AND name = 'Shelf A';
" | tr -d ' \n')

SHELF_B_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
SELECT id FROM locations WHERE workspace_id = '${NEW_WORKSPACE_ID}' AND name = 'Shelf B';
" | tr -d ' \n')

GARAGE_ID=$(podman exec supabase_db_supabase psql -U postgres -d postgres -t -c "
SELECT id FROM locations WHERE workspace_id = '${NEW_WORKSPACE_ID}' AND name = 'Test Garage';
" | tr -d ' \n')

echo -e "${YELLOW}=== Test Data Ready! ===${NC}\n"

echo -e "${BLUE}Update run-patch-tests.sh with these values:${NC}"
echo -e "${GREEN}TOKEN=\"${NEW_TOKEN}\"${NC}"
echo -e "${GREEN}LOCATION_ID=\"${SHELF_A_ID}\"  # Shelf A${NC}"
echo -e "${GREEN}SHELF_B_ID=\"${SHELF_B_ID}\"   # Shelf B${NC}"
echo -e "${GREEN}GARAGE_ID=\"${GARAGE_ID}\"     # Test Garage${NC}"
echo ""

echo -e "${BLUE}Or run tests directly:${NC}"
echo -e "${YELLOW}./run-patch-tests.sh${NC}"
echo ""

# Update the test script automatically
if [ -f "run-patch-tests.sh" ]; then
  echo -e "${BLUE}Updating run-patch-tests.sh automatically...${NC}"

  # Backup original
  cp run-patch-tests.sh run-patch-tests.sh.backup

  # Update values
  sed -i '' "s/TOKEN=\"[^\"]*\"/TOKEN=\"${NEW_TOKEN}\"/" run-patch-tests.sh
  sed -i '' "s/LOCATION_ID=\"[^\"]*\"/LOCATION_ID=\"${SHELF_A_ID}\"/" run-patch-tests.sh
  sed -i '' "s/SHELF_B_ID=\"[^\"]*\"/SHELF_B_ID=\"${SHELF_B_ID}\"/" run-patch-tests.sh
  sed -i '' "s/GARAGE_ID=\"[^\"]*\"/GARAGE_ID=\"${GARAGE_ID}\"/" run-patch-tests.sh

  echo -e "${GREEN}✓ Updated run-patch-tests.sh${NC}"
  echo -e "${YELLOW}Backup saved as: run-patch-tests.sh.backup${NC}"
  echo ""
fi

echo -e "${GREEN}✓✓✓ Reset complete! Ready to run tests. ✓✓✓${NC}"
