#!/usr/bin/env bash

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ENV_FILE="${ENV_FILE:-.env}"

required_reading_fields=(
  created_by_user_id
  pressure_unit
  factor_used
  p1
  p2
  p3
  p4
  kg1
  kg2
  kg3
  kg4
  total_kg
  recorded_at
)

RESPONSE_CODE=""
RESPONSE_BODY=""
TOKEN=""
CREATED_READING_ID=""
SCHEMA_CHECK_COUNT=0

read_env_value() {
  local key="$1"
  if [[ ! -f "$ENV_FILE" ]]; then
    return 0
  fi

  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  printf "%s" "$line"
}

pretty_json_or_raw() {
  local body="$1"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
}

fail_test() {
  local test_name="$1"
  local reason="$2"
  local status="${3:-N/A}"
  local body="${4:-}"

  echo "${test_name} FAILED"
  echo "Reason: ${reason}"
  echo "HTTP Status: ${status}"
  if [[ -n "$body" ]]; then
    echo "Response Body:"
    pretty_json_or_raw "$body"
  fi
  exit 1
}

pass_test() {
  local test_name="$1"
  echo "${test_name} PASSED"
}

ensure_tools() {
  if ! command -v curl >/dev/null 2>&1; then
    fail_test "PREREQUISITE CHECK" "curl is not installed."
  fi

  if ! command -v jq >/dev/null 2>&1; then
    fail_test "PREREQUISITE CHECK" "jq is not installed."
  fi
}

http_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local bearer_token="${4:-}"
  local tmp_file
  tmp_file="$(mktemp)"

  local -a cmd
  cmd=(curl -sS -o "$tmp_file" -w "%{http_code}" -X "$method" "$url" -H "Accept: application/json")

  if [[ -n "$bearer_token" ]]; then
    cmd+=(-H "Authorization: Bearer ${bearer_token}")
  fi

  if [[ -n "$body" ]]; then
    cmd+=(-H "Content-Type: application/json" -d "$body")
  fi

  if ! RESPONSE_CODE="$("${cmd[@]}")"; then
    local curl_exit=$?
    RESPONSE_BODY="$(cat "$tmp_file" 2>/dev/null || true)"
    rm -f "$tmp_file"
    fail_test "HTTP REQUEST" "curl failed with exit code ${curl_exit} for ${method} ${url}" "N/A" "$RESPONSE_BODY"
  fi

  RESPONSE_BODY="$(cat "$tmp_file")"
  rm -f "$tmp_file"
}

assert_required_reading_fields() {
  local test_name="$1"
  local object_json="$2"
  local missing=()

  for field in "${required_reading_fields[@]}"; do
    if ! echo "$object_json" | jq -e "has(\"${field}\") and .${field} != null" >/dev/null 2>&1; then
      missing+=("$field")
    fi
  done

  if [[ "${#missing[@]}" -gt 0 ]]; then
    fail_test "$test_name" "Missing required field(s): ${missing[*]}" "$RESPONSE_CODE" "$object_json"
  fi

  SCHEMA_CHECK_COUNT=$((SCHEMA_CHECK_COUNT + 1))
}

LOGIN_USERNAME="${LOGIN_USERNAME:-$(read_env_value DEFAULT_OPERATOR_USERNAME)}"
LOGIN_EPF_NUMBER="${LOGIN_EPF_NUMBER:-$(read_env_value DEFAULT_OPERATOR_EPF)}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-$(read_env_value DEFAULT_OPERATOR_PASSWORD)}"

ensure_tools

echo "Running LPG API verification against ${BASE_URL}"
echo "6) DATABASE SCHEMA VALIDATION TEST (validated across create/latest/history responses)"

echo "1) LOGIN TEST"
if [[ -z "$LOGIN_USERNAME" || -z "$LOGIN_EPF_NUMBER" || -z "$LOGIN_PASSWORD" ]]; then
  fail_test "LOGIN TEST" "Credentials are missing. Set LOGIN_USERNAME, LOGIN_EPF_NUMBER, LOGIN_PASSWORD (or DEFAULT_OPERATOR_* in ${ENV_FILE})."
fi

login_payload="$(jq -nc \
  --arg username "$LOGIN_USERNAME" \
  --arg epf_number "$LOGIN_EPF_NUMBER" \
  --arg password "$LOGIN_PASSWORD" \
  '{username: $username, epf_number: $epf_number, password: $password}')"

http_json "POST" "${BASE_URL}/api/login" "$login_payload"

if [[ "$RESPONSE_CODE" != "200" ]]; then
  fail_test "LOGIN TEST" "Expected HTTP 200, got ${RESPONSE_CODE}." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

if ! echo "$RESPONSE_BODY" | jq -e '.token and (.token|type == "string") and (.token|length > 0) and .user and (.user|type == "object")' >/dev/null 2>&1; then
  fail_test "LOGIN TEST" "Response does not contain valid token and user object." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

TOKEN="$(echo "$RESPONSE_BODY" | jq -r '.token')"
pass_test "LOGIN TEST"

echo "2) UNAUTHORIZED ACCESS TEST"
http_json "GET" "${BASE_URL}/api/readings"
if [[ "$RESPONSE_CODE" != "401" ]]; then
  fail_test "UNAUTHORIZED ACCESS TEST" "Expected HTTP 401, got ${RESPONSE_CODE}." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi
pass_test "UNAUTHORIZED ACCESS TEST"

echo "3) CALCULATION TEST"
create_payload='{"p1":10,"p2":10,"p3":10,"p4":10}'
http_json "POST" "${BASE_URL}/api/readings" "$create_payload" "$TOKEN"

if [[ "$RESPONSE_CODE" != "201" ]]; then
  fail_test "CALCULATION TEST" "Expected HTTP 201, got ${RESPONSE_CODE}." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

if ! echo "$RESPONSE_BODY" | jq -e '
  .data
  and (.data | type == "object")
  and (.data.pressure_unit == "psi")
  and (.data.factor_used == 140)
  and (.data.kg1 == 1400)
  and (.data.kg2 == 1400)
  and (.data.kg3 == 1400)
  and (.data.kg4 == 1400)
  and (.data.total_kg == 5600)
' >/dev/null 2>&1; then
  fail_test "CALCULATION TEST" "Computed response values are incorrect." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

reading_object="$(echo "$RESPONSE_BODY" | jq -c '.data')"
assert_required_reading_fields "DATABASE SCHEMA VALIDATION (CREATE READING)" "$reading_object"

CREATED_READING_ID="$(echo "$RESPONSE_BODY" | jq -r '.data.id')"
pass_test "CALCULATION TEST"

echo "4) LATEST RECORD TEST"
http_json "GET" "${BASE_URL}/api/readings/latest" "" "$TOKEN"

if [[ "$RESPONSE_CODE" != "200" ]]; then
  fail_test "LATEST RECORD TEST" "Expected HTTP 200, got ${RESPONSE_CODE}." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

if ! echo "$RESPONSE_BODY" | jq -e --argjson created_id "$CREATED_READING_ID" '
  .data
  and (.data.id == $created_id)
  and (.data.pressure_unit == "psi")
  and (.data.factor_used == 140)
  and (.data.kg1 == 1400)
  and (.data.kg2 == 1400)
  and (.data.kg3 == 1400)
  and (.data.kg4 == 1400)
  and (.data.total_kg == 5600)
' >/dev/null 2>&1; then
  fail_test "LATEST RECORD TEST" "Latest record values do not match expected reading." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

latest_object="$(echo "$RESPONSE_BODY" | jq -c '.data')"
assert_required_reading_fields "DATABASE SCHEMA VALIDATION (LATEST READING)" "$latest_object"
pass_test "LATEST RECORD TEST"

echo "5) HISTORY TEST"
http_json "GET" "${BASE_URL}/api/readings?limit=20" "" "$TOKEN"

if [[ "$RESPONSE_CODE" != "200" ]]; then
  fail_test "HISTORY TEST" "Expected HTTP 200, got ${RESPONSE_CODE}." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

if ! echo "$RESPONSE_BODY" | jq -e '.data and (.data | type == "array") and (.data | length >= 1)' >/dev/null 2>&1; then
  fail_test "HISTORY TEST" "Expected a non-empty data array." "$RESPONSE_CODE" "$RESPONSE_BODY"
fi

history_count="$(echo "$RESPONSE_BODY" | jq -r '.data | length')"
for ((i=0; i<history_count; i++)); do
  item="$(echo "$RESPONSE_BODY" | jq -c ".data[${i}]")"

  if ! echo "$item" | jq -e '
    has("id")
    and has("p1")
    and has("p2")
    and has("p3")
    and has("p4")
    and has("kg1")
    and has("kg2")
    and has("kg3")
    and has("kg4")
    and has("total_kg")
  ' >/dev/null 2>&1; then
    fail_test "HISTORY TEST" "History item index ${i} is missing required core fields." "$RESPONSE_CODE" "$item"
  fi

  assert_required_reading_fields "DATABASE SCHEMA VALIDATION (HISTORY ITEM ${i})" "$item"
done

pass_test "HISTORY TEST"
if [[ "$SCHEMA_CHECK_COUNT" -gt 0 ]]; then
  pass_test "DATABASE SCHEMA VALIDATION TEST"
fi
echo "ALL TESTS PASSED"
