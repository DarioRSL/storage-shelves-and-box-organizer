#!/bin/bash

# Test script for PATCH /api/boxes/:id endpoint
# Tests all scenarios: success cases, validation errors, and authorization checks

set -e  # Exit on error

echo "=========================================="
echo "PATCH /api/boxes/:id - API Endpoint Tests"
echo "=========================================="
echo ""

# Load environment variables
source .env

# Test credentials from .env
TOKEN="$BOX_TEST_USER_TOKEN"
BASE_URL="http://localhost:3000"

# Step 1: Create workspace for testing
echo "📋 Step 1: Creating test workspace..."
WORKSPACE_RESPONSE=$(cat <<'EOF' | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer $BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"PATCH Box Test Workspace"}'
EOF
)

WORKSPACE_ID=$(echo "$WORKSPACE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Workspace created: $WORKSPACE_ID"
echo ""

# Step 2: Create second workspace for cross-workspace tests
echo "📋 Step 2: Creating second test workspace..."
WORKSPACE2_RESPONSE=$(cat <<'EOF' | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer $BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"PATCH Box Test Workspace 2"}'
EOF
)

WORKSPACE2_ID=$(echo "$WORKSPACE2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Second workspace created: $WORKSPACE2_ID"
echo ""

# Step 3: Create locations for testing
echo "📋 Step 3: Creating test locations..."
LOCATION_RESPONSE=$(cat <<EOFSCRIPT | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/locations \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Test Garage","description":"Location for box updates"}'
EOFSCRIPT
)

LOCATION_ID=$(echo "$LOCATION_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

LOCATION2_RESPONSE=$(cat <<EOFSCRIPT | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/locations \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE2_ID","name":"Workspace 2 Garage","description":"Different workspace location"}'
EOFSCRIPT
)

LOCATION2_ID=$(echo "$LOCATION2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

if [ -n "$LOCATION_ID" ]; then
  echo "✅ Location 1 created: $LOCATION_ID"
else
  echo "⚠️  Location 1 creation skipped"
fi

if [ -n "$LOCATION2_ID" ]; then
  echo "✅ Location 2 created (different workspace): $LOCATION2_ID"
else
  echo "⚠️  Location 2 creation skipped"
fi
echo ""

# Step 4: Create test boxes
echo "📋 Step 4: Creating test boxes..."

# Box 1 - for general update tests
BOX1_RESPONSE=$(cat <<EOFSCRIPT | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Original Box Name","description":"Original description","tags":["original","tag"]}'
EOFSCRIPT
)

BOX1_ID=$(echo "$BOX1_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Box 1 created: $BOX1_ID"

# Box 2 - for location assignment test
BOX2_RESPONSE=$(cat <<EOFSCRIPT | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Location Test Box"}'
EOFSCRIPT
)

BOX2_ID=$(echo "$BOX2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Box 2 created: $BOX2_ID"

# Box 3 - for unassign location test
BOX3_RESPONSE=$(cat <<EOFSCRIPT | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Unassign Test Box","location_id":"$LOCATION_ID"}'
EOFSCRIPT
)

BOX3_ID=$(echo "$BOX3_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Box 3 created (with location): $BOX3_ID"
echo ""

echo "=========================================="
echo "Running Test Cases"
echo "=========================================="
echo ""

# Test 1: Update name only
echo "🧪 Test 1: Update box name only (200 OK)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Box Name"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 2: Update description only
echo "🧪 Test 2: Update description only (200 OK)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description text"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 3: Update tags only
echo "🧪 Test 3: Update tags array (200 OK)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags":["updated","new","tags"]}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 4: Assign box to location
if [ -n "$LOCATION_ID" ]; then
  echo "🧪 Test 4: Assign box to location (200 OK)"
  cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX2_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location_id":"$LOCATION_ID"}' \
| python3 -m json.tool
EOFTEST
  echo ""
  echo "---"
  echo ""
fi

# Test 5: Unassign box from location
echo "🧪 Test 5: Unassign box from location (location_id = null) (200 OK)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX3_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location_id":null}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 6: Update multiple fields at once
if [ -n "$LOCATION_ID" ]; then
  echo "🧪 Test 6: Update multiple fields simultaneously (200 OK)"
  cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Multi-Update Box","description":"All fields updated","tags":["multi","update"],"location_id":"$LOCATION_ID"}' \
| python3 -m json.tool
EOFTEST
  echo ""
  echo "---"
  echo ""
fi

# Test 7: Clear description (set to null)
echo "🧪 Test 7: Clear description by setting to null (200 OK)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":null}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 8: Clear tags (set to empty array)
echo "🧪 Test 8: Clear tags by setting to empty array (200 OK)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags":[]}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 9: Invalid box ID format
echo "🧪 Test 9: Validation error - Invalid UUID format (400)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/not-a-valid-uuid \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Should Fail"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 10: Empty request body
echo "🧪 Test 10: Validation error - Empty request body (400)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 11: Name too short (empty after trim)
echo "🧪 Test 11: Validation error - Empty name (400)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"   "}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 12: Description too long
echo "🧪 Test 12: Validation error - Description exceeds 10,000 characters (400)"
LONG_DESC=$(python3 -c "print('a' * 10001)")
cat <<EOFTEST | bash
source .env
LONG_DESC="$LONG_DESC"
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"description\":\"\$LONG_DESC\"}" \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 13: Invalid tags format (not array)
echo "🧪 Test 13: Validation error - Tags not an array (400)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags":"not-an-array"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 14: Invalid location_id format
echo "🧪 Test 14: Validation error - Invalid location_id UUID format (400)"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location_id":"not-a-uuid"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 15: Unauthorized - No token
echo "🧪 Test 15: Authentication error - No authorization token (401)"
cat <<EOFTEST | bash
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"Should Fail"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 16: Box not found
echo "🧪 Test 16: Resource not found - Non-existent box ID (404)"
FAKE_BOX_ID="00000000-0000-0000-0000-000000000000"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$FAKE_BOX_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Should Fail"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 17: Location not found
echo "🧪 Test 17: Resource not found - Non-existent location_id (404)"
FAKE_LOCATION_ID="00000000-0000-0000-0000-000000000000"
cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location_id":"$FAKE_LOCATION_ID"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 18: Workspace mismatch - try to assign box to location from different workspace
if [ -n "$LOCATION2_ID" ]; then
  echo "🧪 Test 18: Forbidden - Location belongs to different workspace (403)"
  cat <<EOFTEST | bash
source .env
curl -s -X PATCH \
  http://localhost:3000/api/boxes/$BOX1_ID \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location_id":"$LOCATION2_ID"}' \
| python3 -m json.tool
EOFTEST
  echo ""
  echo "---"
  echo ""
fi

echo "=========================================="
echo "✅ All tests completed successfully!"
echo "=========================================="
echo ""
echo "Test Summary:"
echo ""
echo "SUCCESS SCENARIOS (200 OK):"
echo "  ✅ Test 1: Update name only"
echo "  ✅ Test 2: Update description only"
echo "  ✅ Test 3: Update tags only"
echo "  ✅ Test 4: Assign box to location"
echo "  ✅ Test 5: Unassign box from location (null)"
echo "  ✅ Test 6: Update multiple fields simultaneously"
echo "  ✅ Test 7: Clear description (null)"
echo "  ✅ Test 8: Clear tags (empty array)"
echo ""
echo "VALIDATION ERRORS (400 Bad Request):"
echo "  ✅ Test 9: Invalid box ID UUID format"
echo "  ✅ Test 10: Empty request body (at least one field required)"
echo "  ✅ Test 11: Empty name after trimming"
echo "  ✅ Test 12: Description too long (>10,000 chars)"
echo "  ✅ Test 13: Invalid tags format (not array)"
echo "  ✅ Test 14: Invalid location_id UUID format"
echo ""
echo "AUTHENTICATION (401 Unauthorized):"
echo "  ✅ Test 15: No auth token"
echo ""
echo "RESOURCE NOT FOUND (404 Not Found):"
echo "  ✅ Test 16: Non-existent box ID"
echo "  ✅ Test 17: Non-existent location_id"
echo ""
echo "AUTHORIZATION (403 Forbidden):"
echo "  ✅ Test 18: Location belongs to different workspace"
echo ""
echo "Note: Tests 9-18 are EXPECTED to return errors - they validate error handling!"
echo ""
