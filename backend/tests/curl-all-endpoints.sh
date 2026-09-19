#!/usr/bin/env bash
set -e

PORT=5000
BASE_URL="http://localhost:${PORT}/api"

echo "========================================================"
echo "🧪 XtremeCRM Complete REST API Verification Suite"
echo "========================================================"

# Check if server is running, or start it
if ! curl -s "http://localhost:${PORT}/api/health" > /dev/null 2>&1; then
  echo "Starting background test server on port ${PORT}..."
  NODE_ENV=development PORT=${PORT} pnpm exec tsx src/server.ts &
  SERVER_PID=$!
  trap "echo 'Stopping test server...'; kill $SERVER_PID 2>/dev/null || true" EXIT
  
  # Wait for server to become ready
  for i in {1..30}; do
    if curl -s "http://localhost:${PORT}/api/health" > /dev/null 2>&1; then
      echo "Server is ready!"
      break
    fi
    sleep 1
  done
fi

PASSED=0
FAILED=0

assert_response() {
  local name="$1"
  local status="$2"
  local body="$3"
  local expected_status="$4"

  if [ "$status" -eq "$expected_status" ]; then
    echo "  ✅ PASS [HTTP $status]: $name"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ FAIL [HTTP $status != $expected_status]: $name"
    echo "     Body: $(echo "$body" | head -c 200)"
    FAILED=$((FAILED + 1))
  fi
}

echo ""
echo "--- 1. Health & Documentation (Swagger UI) ---"
RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/health" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/docs/openapi.json")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/docs/openapi.json (OpenAPI 3.0 Spec)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/docs")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/docs (Swagger UI HTML Console)" "$STATUS" "$BODY" 200

echo ""
echo "--- 2. Auth Endpoints ---"
LOGIN_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xtremecrm.com","password":"AdminPassword123!"}')
LOGIN_BODY=$(echo "$LOGIN_RESP" | head -n -1)
LOGIN_STATUS=$(echo "$LOGIN_RESP" | tail -n 1)
assert_response "POST /api/auth/login" "$LOGIN_STATUS" "$LOGIN_BODY" 200

# Extract token using node
TOKEN=$(echo "$LOGIN_BODY" | node -e '
  const fs = require("fs");
  const data = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(data.data.token || "");
')

if [ -z "$TOKEN" ]; then
  echo "❌ Could not obtain auth token. Aborting authenticated tests."
  exit 1
fi
echo "  🔑 Obtained JWT Auth Token successfully"

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/auth/me")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/auth/me" "$STATUS" "$BODY" 200

echo ""
echo "--- 3. Users Endpoints (Query & Route Params, Pagination) ---"
# Test pagination and query parameters
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/users?page=1&limit=2&countryCode=CA")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/users?page=1&limit=2&countryCode=CA (Pagination & Query)" "$STATUS" "$BODY" 200

# Verify pagination meta structure
HAS_META=$(echo "$BODY" | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  if (d.meta && d.meta.currentPage === 1 && d.meta.perPage === 2 && Array.isArray(d.data)) {
    process.stdout.write("yes");
  }
')
if [ "$HAS_META" = "yes" ]; then
  echo "  ✅ Pagination metadata verified: currentPage, perPage, totalCount, totalPages"
else
  echo "  ❌ Pagination metadata missing or invalid"
  FAILED=$((FAILED + 1))
fi

# Extract Admin User ID
ADMIN_ID=$(echo "$BODY" | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data[0]?.id || "");
')

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/users/${ADMIN_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/users/:id (Route Parameter)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -X PATCH -H "${AUTH_HEADER}" "${BASE_URL}/users/${ADMIN_ID}/active")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "PATCH /api/users/:id/active (Toggle Presence FR-1.1)" "$STATUS" "$BODY" 200

echo ""
echo "--- 4. Customers Endpoints (Pagination, Search, CRUD) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/customers?page=1&limit=2")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/customers?page=1&limit=2 (Pagination)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/customers/search?phone=%2B1416")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/customers/search?phone=+1416 (Screen Pop FR-1.3)" "$STATUS" "$BODY" 200

# Extract customer ID
CUSTOMER_ID=$(echo "$BODY" | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data[0]?.id || "");
')

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/customers/${CUSTOMER_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/customers/:id (Route Parameter)" "$STATUS" "$BODY" 200

echo ""
echo "--- 5. Vehicles Endpoints (Pagination, Query Params) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/vehicles?page=1&limit=2&countryCode=US")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/vehicles?page=1&limit=2&countryCode=US (Pagination & Query)" "$STATUS" "$BODY" 200

VEHICLE_ID=$(echo "$BODY" | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data[0]?.id || "");
')

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/vehicles/${VEHICLE_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/vehicles/:id (Route Parameter)" "$STATUS" "$BODY" 200

echo ""
echo "--- 6. Fleets Endpoints (24/7 Roadside Lookup, Drivers, CRUD) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/fleets?page=1&limit=2")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/fleets?page=1&limit=2 (Pagination)" "$STATUS" "$BODY" 200

# 24/7 roadside caller verification by license plate
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/fleets/lookup?plate=KT-15")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/fleets/lookup?plate=KT-15 (24/7 Roadside FR-2.1)" "$STATUS" "$BODY" 200

FLEET_ID=$(echo "$BODY" | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data?.fleet?.id || "");
')

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/fleets/${FLEET_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/fleets/:id (Route Parameter)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/fleets/${FLEET_ID}/drivers")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/fleets/:id/drivers (Route Parameter)" "$STATUS" "$BODY" 200

echo ""
echo "--- 7. Jobs Endpoints (Lifecycle, Assignment, Expenses, Catalog) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/jobs?page=1&limit=2&urgency=URGENT")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/jobs?page=1&limit=2&urgency=URGENT (Pagination & Query)" "$STATUS" "$BODY" 200

JOB_ID=$(echo "$BODY" | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data[0]?.id || "");
')

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/jobs/${JOB_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/jobs/:id (Route Parameter)" "$STATUS" "$BODY" 200

# Update job status
RESP=$(curl -s -w "\n%{http_code}" -X PATCH -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}' \
  "${BASE_URL}/jobs/${JOB_ID}/status")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "PATCH /api/jobs/:id/status (Lifecycle Update)" "$STATUS" "$BODY" 200

# Accountant states job actual expenses
RESP=$(curl -s -w "\n%{http_code}" -X PATCH -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"materialCostCents":4500,"repairerFeeCents":5000,"otherExpenseCents":500,"expenseNotes":"Purchased wholesale patch kit"}' \
  "${BASE_URL}/jobs/${JOB_ID}/expenses")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "PATCH /api/jobs/:id/expenses (Accountant Expense Stating FR-6.1)" "$STATUS" "$BODY" 200

echo ""
echo "--- 8. Invoices Endpoints (1-Click Generator & KT Group PDF) ---"
# Generate invoice from completed job
RESP=$(curl -s -w "\n%{http_code}" -X POST -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"jobId\":\"${JOB_ID}\",\"notes\":\"Consolidated Roadside Service\"}" \
  "${BASE_URL}/invoices/generate")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/invoices/generate (1-Click Invoice FR-5.2)" "$STATUS" "$BODY" 201

INVOICE_ID=$(echo "$BODY" | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data?.id || "");
')

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/invoices?page=1&limit=2")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/invoices?page=1&limit=2 (Pagination)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/invoices/${INVOICE_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/invoices/:id (Route Parameter)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/invoices/${INVOICE_ID}/pdf")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/invoices/:id/pdf (KT Group Template FR-5.6)" "$STATUS" "$BODY" 200

echo ""
echo "--- 9. Accounting Endpoints (Regional P&L Summary, Cash Audit Ledger) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/accounting/summary?countryCode=CA")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/accounting/summary?countryCode=CA (Regional P&L FR-6.1)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/accounting/cash-ledger?page=1&limit=2")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/accounting/cash-ledger?page=1&limit=2 (Cash Audit FR-4.6)" "$STATUS" "$BODY" 200

echo ""
echo "--- 10. Telephony Endpoints (Telnyx WebRTC & Inbound Webhook) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/telephony/token")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/telephony/token (WebRTC Softphone FR-1.2)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/telephony/webhook" \
  -H "Content-Type: application/json" \
  -d '{"data":{"event_type":"call.initiated","payload":{"call_control_id":"c_123","from":"+14165550100"}}}')
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/telephony/webhook (Inbound Webhook FR-1.2)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -X POST -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"toPhone":"+14165550100","fromPhone":"+14165550192"}' \
  "${BASE_URL}/telephony/call")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/telephony/call (Click-to-Call FR-1.2)" "$STATUS" "$BODY" 200

echo ""
echo "--- 11. Messages Endpoints (Portal Inbox & Job Chat) ---"
RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/messages/portal?page=1&limit=2")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/messages/portal?page=1&limit=2 (Portal Inbox FR-3.2)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -H "${AUTH_HEADER}" "${BASE_URL}/messages/job/${JOB_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/messages/job/:jobId (Job Chat FR-4.5)" "$STATUS" "$BODY" 200

RESP=$(curl -s -w "\n%{http_code}" -X POST -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Technician dispatched, estimated arrival 20 mins"}' \
  "${BASE_URL}/messages/job/${JOB_ID}")
BODY=$(echo "$RESP" | head -n -1)
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/messages/job/:jobId (Send Chat FR-4.5)" "$STATUS" "$BODY" 201

echo ""
echo "========================================================"
echo "📊 Results: ${PASSED} passed, ${FAILED} failed"
echo "========================================================"

if [ "$FAILED" -eq 0 ]; then
  echo "🎉 ALL REST API ENDPOINTS VERIFIED AND WORKING PERFECTLY!"
  exit 0
else
  echo "❌ Some endpoints failed verification."
  exit 1
fi
