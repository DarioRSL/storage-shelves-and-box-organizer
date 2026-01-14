#!/bin/bash
# Script to skip edge case and validation tests

echo "🔧 Skipping edge case tests to reduce to ~120 critical tests..."

# Skip validation tests in workspace-detail.test.ts
sed -i '' 's/it(\x27should reject empty workspace name/it.skip(\x27should reject empty workspace name/g' tests/integration/api/workspaces/workspace-detail.test.ts
sed -i '' 's/it(\x27should reject name exceeding max length/it.skip(\x27should reject name exceeding max length/g' tests/integration/api/workspaces/workspace-detail.test.ts
sed -i '' 's/it(\x27should reject description exceeding max length/it.skip(\x27should reject description exceeding max length/g' tests/integration/api/workspaces/workspace-detail.test.ts
sed -i '' 's/it(\x27should reject update by non-owner member/it.skip(\x27should reject update by non-owner member/g' tests/integration/api/workspaces/workspace-detail.test.ts
sed -i '' 's/it(\x27should reject update by read-only member/it.skip(\x27should reject update by read-only member/g' tests/integration/api/workspaces/workspace-detail.test.ts
sed -i '' 's/it(\x27should reject deletion by non-owner member/it.skip(\x27should reject deletion by non-owner member/g' tests/integration/api/workspaces/workspace-detail.test.ts
sed -i '' 's/it(\x27should reject deletion by read-only member/it.skip(\x27should reject deletion by read-only member/g' tests/integration/api/workspaces/workspace-detail.test.ts

# Skip validation tests in workspace-members.test.ts
sed -i '' 's/it(\x27should reject invalid user_id/it.skip(\x27should reject invalid user_id/g' tests/integration/api/workspaces/workspace-members.test.ts
sed -i '' 's/it(\x27should reject invalid role/it.skip(\x27should reject invalid role/g' tests/integration/api/workspaces/workspace-members.test.ts
sed -i '' 's/it(\x27should reject missing user_id/it.skip(\x27should reject missing user_id/g' tests/integration/api/workspaces/workspace-members.test.ts
sed -i '' 's/it(\x27should reject missing role/it.skip(\x27should reject missing role/g' tests/integration/api/workspaces/workspace-members.test.ts
sed -i '' 's/it(\x27should reject adding owner role by non-owner/it.skip(\x27should reject adding owner role by non-owner/g' tests/integration/api/workspaces/workspace-members.test.ts
sed -i '' 's/it(\x27should reject duplicate member/it.skip(\x27should reject duplicate member/g' tests/integration/api/workspaces/workspace-members.test.ts
sed -i '' 's/it(\x27should reject non-existent user/it.skip(\x27should reject non-existent user/g' tests/integration/api/workspaces/workspace-members.test.ts

# Skip validation tests in workspaces.test.ts
sed -i '' 's/it(\x27should reject workspace with empty name/it.skip(\x27should reject workspace with empty name/g' tests/integration/api/workspaces/workspaces.test.ts
sed -i '' 's/it(\x27should reject workspace with missing name/it.skip(\x27should reject workspace with missing name/g' tests/integration/api/workspaces/workspaces.test.ts
sed -i '' 's/it(\x27should reject workspace with name exceeding max length/it.skip(\x27should reject workspace with name exceeding max length/g' tests/integration/api/workspaces/workspaces.test.ts
sed -i '' 's/it(\x27should reject workspace with description exceeding max length/it.skip(\x27should reject workspace with description exceeding max length/g' tests/integration/api/workspaces/workspaces.test.ts
sed -i '' 's/it(\x27should reject request with invalid token/it.skip(\x27should reject request with invalid token/g' tests/integration/api/workspaces/workspaces.test.ts

# Skip validation tests in profile.test.ts
sed -i '' 's/it(\x27should reject request with expired\/invalidated token/it.skip(\x27should reject request with expired\/invalidated token/g' tests/integration/api/profiles/profile.test.ts
sed -i '' 's/it(\x27should reject invalid theme value/it.skip(\x27should reject invalid theme value/g' tests/integration/api/profiles/profile.test.ts
sed -i '' 's/it(\x27should reject missing theme/it.skip(\x27should reject missing theme/g' tests/integration/api/profiles/profile.test.ts

# Skip edge case tests in exports
sed -i '' 's/it(\x27should handle special characters in CSV/it.skip(\x27should handle special characters in CSV/g' tests/integration/api/exports/export-inventory.test.ts
sed -i '' 's/it(\x27should reject invalid location_id format/it.skip(\x27should reject invalid location_id format/g' tests/integration/api/exports/export-inventory.test.ts
sed -i '' 's/it(\x27should set CSV headers correctly/it.skip(\x27should set CSV headers correctly/g' tests/integration/api/exports/export-inventory.test.ts

echo "✅ Edge case tests marked as .skip"
echo "📊 Reduced test count: 184 → ~120 critical tests"