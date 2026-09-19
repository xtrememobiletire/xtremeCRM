#!/usr/bin/env bash
set -e

PORT=5000
BASE_URL="http://localhost:${PORT}/api"

echo "========================================================"
echo "🛡️  XtremeCRM Negative API & Security Verification Suite"
echo "========================================================"

# Check if server is running, or start it
if ! curl -s "http://localhost:${PORT}/api/health" > /dev/null 2>&1; then
  echo "Starting background test server on port ${PORT}..."
  NODE_ENV=development PORT=${PORT} pnpm exec tsx src/server.ts &
  SERVER_PID=$!
  trap "echo 'Stopping test server...'; kill $SERVER_PID 2>/dev/null || true" EXIT
  
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
echo "--- 1. Unauthenticated Requests (Expected 401) ---"
RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/auth/me")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/auth/me without token -> 401" "$STATUS" "" 401

RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/users")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/users without token -> 401" "$STATUS" "" 401

RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/jobs")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/jobs without token -> 401" "$STATUS" "" 401

RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/invoices")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/invoices without token -> 401" "$STATUS" "" 401

echo ""
echo "--- 2. Invalid Credentials & Auth Failure (Expected 400/401) ---"
RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xtremecrm.com","password":"WRONG_PASSWORD_123"}')
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/auth/login with wrong password -> 401" "$STATUS" "" 401

RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent_user@example.com","password":"Password123!"}')
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/auth/login with non-existent email -> 401" "$STATUS" "" 401

RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"1"}')
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/auth/login with invalid email format -> 400" "$STATUS" "" 400

# Obtain tokens for role tests (Admin and Driver)
ADMIN_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xtremecrm.com","password":"AdminPassword123!"}' | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data?.token || "");
')

DRIVER_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@xtremecrm.com","password":"AdminPassword123!"}' | node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(0, "utf-8"));
  process.stdout.write(d.data?.token || "");
')

ADMIN_AUTH="Authorization: Bearer ${ADMIN_TOKEN}"
DRIVER_AUTH="Authorization: Bearer ${DRIVER_TOKEN}"

echo ""
echo "--- 3. Role-Based Authorization Guards (Expected 403) ---"
# Driver role attempting to list all staff users (requires ADMIN or DISPATCHER)
RESP=$(curl -s -w "\n%{http_code}" -H "${DRIVER_AUTH}" "${BASE_URL}/users")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/users with DRIVER role -> 403 Forbidden" "$STATUS" "" 403

# Driver role attempting to access accounting financial summary (requires ADMIN or ACCOUNTANT)
RESP=$(curl -s -w "\n%{http_code}" -H "${DRIVER_AUTH}" "${BASE_URL}/accounting/summary")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/accounting/summary with DRIVER role -> 403 Forbidden" "$STATUS" "" 403

echo ""
echo "--- 4. Schema & Validation Errors (Expected 400) ---"
# Create customer missing required fullName
RESP=$(curl -s -w "\n%{http_code}" -X POST -H "${ADMIN_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+14165550999"}' \
  "${BASE_URL}/customers")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/customers missing fullName -> 400" "$STATUS" "" 400

# Create vehicle missing tireSize
RESP=$(curl -s -w "\n%{http_code}" -X POST -H "${ADMIN_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{"year":2022,"make":"Ford","model":"F-150"}' \
  "${BASE_URL}/vehicles")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/vehicles missing tireSize -> 400" "$STATUS" "" 400

# Create job with invalid short address
RESP=$(curl -s -w "\n%{http_code}" -X POST -H "${ADMIN_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{"serviceAddress":"a"}' \
  "${BASE_URL}/jobs")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/jobs with invalid 1-char serviceAddress -> 400" "$STATUS" "" 400

# Telephony outbound call with invalid phone format
RESP=$(curl -s -w "\n%{http_code}" -X POST -H "${ADMIN_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{"toPhone":"invalid_phone_number"}' \
  "${BASE_URL}/telephony/call")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "POST /api/telephony/call with bad phone -> 400" "$STATUS" "" 400

echo ""
echo "--- 5. Non-Existent Entities & 404 Routing (Expected 404) ---"
NON_EXISTENT_UUID="00000000-0000-0000-0000-000000000000"

RESP=$(curl -s -w "\n%{http_code}" -H "${ADMIN_AUTH}" "${BASE_URL}/users/${NON_EXISTENT_UUID}")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/users/:nonExistentId -> 404" "$STATUS" "" 404

RESP=$(curl -s -w "\n%{http_code}" -H "${ADMIN_AUTH}" "${BASE_URL}/customers/${NON_EXISTENT_UUID}")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/customers/:nonExistentId -> 404" "$STATUS" "" 404

RESP=$(curl -s -w "\n%{http_code}" -H "${ADMIN_AUTH}" "${BASE_URL}/vehicles/${NON_EXISTENT_UUID}")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/vehicles/:nonExistentId -> 404" "$STATUS" "" 404

RESP=$(curl -s -w "\n%{http_code}" -H "${ADMIN_AUTH}" "${BASE_URL}/fleets/${NON_EXISTENT_UUID}")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/fleets/:nonExistentId -> 404" "$STATUS" "" 404

RESP=$(curl -s -w "\n%{http_code}" -H "${ADMIN_AUTH}" "${BASE_URL}/jobs/${NON_EXISTENT_UUID}")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/jobs/:nonExistentId -> 404" "$STATUS" "" 404

RESP=$(curl -s -w "\n%{http_code}" -H "${ADMIN_AUTH}" "${BASE_URL}/invoices/${NON_EXISTENT_UUID}")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/invoices/:nonExistentId -> 404" "$STATUS" "" 404

RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/nonexistent-route-xyz")
STATUS=$(echo "$RESP" | tail -n 1)
assert_response "GET /api/nonexistent-route-xyz -> 404" "$STATUS" "" 404

echo ""
echo "========================================================"
echo "📊 Negative Test Results: ${PASSED} passed, ${FAILED} failed"
echo "========================================================"

if [ "$FAILED" -eq 0 ]; then
  echo "🎉 ALL NEGATIVE AND SECURITY API TESTS PASSED PERFECTLY!"
  exit 0
else
  echo "❌ Some negative tests failed."
  exit 1
fi
