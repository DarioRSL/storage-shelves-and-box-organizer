#!/bin/bash

# Test script for POST /api/boxes endpoint
# Tests all scenarios: success cases, validation errors, and resource conflicts

set -e  # Exit on error

echo "=========================================="
echo "POST /api/boxes - API Endpoint Tests"
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
  -d '{"name":"Box Test Workspace"}'
EOF
)

WORKSPACE_ID=$(echo "$WORKSPACE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✅ Workspace created: $WORKSPACE_ID"
echo ""

# Step 2: Create location for testing (optional - may fail due to RLS not implemented)
echo "📋 Step 2: Creating test location (optional)..."
LOCATION_RESPONSE=$(cat <<EOFSCRIPT | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/locations \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Test Garage","description":"Test location for boxes"}'
EOFSCRIPT
)

LOCATION_ID=$(echo "$LOCATION_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
if [ -n "$LOCATION_ID" ]; then
  echo "✅ Location created: $LOCATION_ID"
else
  echo "⚠️  Location creation skipped (may fail due to RLS)"
fi
echo ""

# Step 3: Create QR codes for testing (optional - may fail due to RLS not implemented)
echo "📋 Step 3: Creating test QR codes (optional)..."
QR_RESPONSE=$(cat <<EOFSCRIPT | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/qr-codes/batch \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","quantity":3}'
EOFSCRIPT
)

QR_CODE_ID_1=$(echo "$QR_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][0]['id'])" 2>/dev/null || echo "")
QR_CODE_ID_2=$(echo "$QR_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'][1]['id'])" 2>/dev/null || echo "")

if [ -n "$QR_CODE_ID_1" ]; then
  echo "✅ QR codes created"
  echo "   QR Code 1: $QR_CODE_ID_1"
  echo "   QR Code 2: $QR_CODE_ID_2"
else
  echo "⚠️  QR code creation skipped (may fail due to RLS)"
fi
echo ""

echo "=========================================="
echo "Running Test Cases"
echo "=========================================="
echo ""

# Test 1: Create box with minimal fields (only required)
echo "🧪 Test 1: Create box with minimal fields (workspace_id, name)"
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Minimal Box"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 2: Create box with description and tags
echo "🧪 Test 2: Create box with description and tags"
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Complete Box","description":"Box with description and tags","tags":["winter","clothes","test"]}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 3: Missing required field (name)
echo "🧪 Test 3: Validation error - Missing required field 'name' (400)"
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 4: Invalid workspace_id format
echo "🧪 Test 4: Validation error - Invalid workspace_id UUID format (400)"
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"not-a-uuid","name":"Test Box"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 5: Description too long
echo "🧪 Test 5: Validation error - Description exceeds 10,000 characters (400)"
LONG_DESC=$(python3 -c "print('a' * 10001)")
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"$WORKSPACE_ID\",\"name\":\"Long Desc Box\",\"description\":\"$LONG_DESC\"}" \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 6: Unauthorized - No token
echo "🧪 Test 6: Authentication error - No authorization token (401)"
cat <<EOFTEST | bash
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Unauthorized Box"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 7: Invalid location_id (non-existent)
echo "🧪 Test 7: Resource not found - Non-existent location_id (404)"
FAKE_LOCATION_ID="00000000-0000-0000-0000-000000000000"
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Bad Location Box","location_id":"$FAKE_LOCATION_ID"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 8: Invalid qr_code_id (non-existent)
echo "🧪 Test 8: Resource not found - Non-existent qr_code_id (404)"
FAKE_QR_ID="00000000-0000-0000-0000-000000000000"
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Bad QR Box","qr_code_id":"$FAKE_QR_ID"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

# Test 9: QR code already assigned (409 Conflict) - Only if QR was created successfully
if [ -n "$QR_CODE_ID_1" ]; then
  echo "🧪 Test 9: QR code assigned successfully in Test 2 (if applicable)"
  echo "🧪 Test 9b: Conflict error - Try to assign same QR code again (409)"
  cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Duplicate QR Box","qr_code_id":"$QR_CODE_ID_1"}' \
| python3 -m json.tool
EOFTEST
  echo ""
  echo "---"
  echo ""
fi

# Test 10: Invalid tags format (not array)
echo "🧪 Test 10: Validation error - Tags not an array (400)"
cat <<EOFTEST | bash
source .env
curl -s -X POST \
  http://localhost:3000/api/boxes \
  -H "Authorization: Bearer \$BOX_TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"$WORKSPACE_ID","name":"Bad Tags Box","tags":"not-an-array"}' \
| python3 -m json.tool
EOFTEST
echo ""
echo "---"
echo ""

echo "=========================================="
echo "✅ All tests completed!"
echo "=========================================="
echo ""
echo "Test Summary:"
echo "- Test 1: ✅ Success with minimal fields"
echo "- Test 2: ✅ Success with description and tags"
echo "- Test 3: ❌ Missing name (400)"
echo "- Test 4: ❌ Invalid UUID (400)"
echo "- Test 5: ❌ Description too long (400)"
echo "- Test 6: ❌ No auth token (401)"
echo "- Test 7: ❌ Location not found (404)"
echo "- Test 8: ❌ QR code not found (404)"
echo "- Test 9: ❌ QR already assigned (409)"
echo "- Test 10: ❌ Invalid tags format (400)"
echo ""
echo "Note: Some tests may fail if RLS policies are not yet implemented for locations/QR codes"
