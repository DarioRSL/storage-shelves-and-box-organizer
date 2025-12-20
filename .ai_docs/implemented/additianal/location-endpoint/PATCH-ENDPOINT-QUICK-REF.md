# PATCH /api/locations/:id - Quick Reference

## 🚀 Quick Start

```bash
# Run all tests
./run-patch-tests.sh

# Reset test data
./reset-test-data.sh
```

## 📋 Endpoint Summary

**URL:** `PATCH /api/locations/:id`

**Auth:** Required (JWT Bearer token)

**Request:**
```json
{
  "name": "New Name",        // optional
  "description": "New desc"  // optional (can be null)
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "New Name",
  "description": "New desc",
  "updated_at": "2025-12-20T10:30:00Z"
}
```

## ⚡ Key Features

- ✅ Partial updates (name and/or description)
- ✅ Automatic ltree path regeneration
- ✅ Sibling conflict detection (409)
- ✅ Soft-delete awareness
- ✅ RLS security

## 🎯 Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Location updated |
| 400 | Bad Request | Empty name, invalid UUID |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Location doesn't exist |
| 409 | Conflict | Duplicate sibling name |
| 500 | Server Error | Database failure |

## 📁 Files

| File | Purpose |
|------|---------|
| `src/pages/api/locations/[id].ts` | API endpoint |
| `src/lib/services/location.service.ts` | Business logic |
| `run-patch-tests.sh` | Automated tests |
| `reset-test-data.sh` | Reset test data |
| `test-patch-location.http` | Manual HTTP tests |

## 🧪 Testing

```bash
# Automated (9 tests)
./run-patch-tests.sh

# Manual (VS Code REST Client)
# Open: test-patch-location.http
# Click: "Send Request"

# Reset data
./reset-test-data.sh
```

## 🔧 Implementation

**Service Function:**
```typescript
updateLocation(
  supabase: SupabaseClient,
  locationId: string,
  userId: string,
  data: UpdateLocationRequest
): Promise<UpdateLocationResponse>
```

**Zod Schemas:**
```typescript
// Path param
paramsSchema = z.object({
  id: z.string().uuid()
})

// Request body
updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional()
}).refine(data => name || description)
```

## 💡 Examples

### Update Name
```bash
curl -X PATCH http://localhost:3000/api/locations/UUID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}'
```

### Update Description
```bash
curl -X PATCH http://localhost:3000/api/locations/UUID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"New description"}'
```

### Clear Description
```bash
curl -X PATCH http://localhost:3000/api/locations/UUID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":null}'
```

### Update Both
```bash
curl -X PATCH http://localhost:3000/api/locations/UUID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name","description":"New desc"}'
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Server not running | `npm run dev` |
| Token expired | Run `./reset-test-data.sh` |
| Tests fail after reruns | Data modified, run `./reset-test-data.sh` |
| Port 3000 in use | `lsof -ti:3000 \| xargs kill` |

## 📚 Documentation

- **Full Guide:** [TESTING-PATCH-ENDPOINT.md](TESTING-PATCH-ENDPOINT.md)
- **Test Scenarios:** [.ai_docs/location-patch-testing-guide.md](.ai_docs/location-patch-testing-guide.md)
- **Implementation:** [.ai_docs/location-patch-implementation-summary.md](.ai_docs/location-patch-implementation-summary.md)
- **Original Plan:** [.ai_docs/location-patch-implementation-plan.md](.ai_docs/location-patch-implementation-plan.md)

---

**Status:** ✅ Fully Implemented & Tested (9/9 tests passing)
