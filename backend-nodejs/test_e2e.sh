#!/bin/bash

echo "🧪 اختبار شامل End-to-End لـ Node.js Backend"
echo "================================================"
echo ""

BASE_URL="http://localhost:8002"
RESULTS_FILE="/tmp/node_backend_test_results.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test function
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local headers=$5
    local expected_status=$6
    
    echo -n "Testing: $test_name... "
    
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        $headers \
        ${data:+-d "$data"})
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        ((PASSED++))
        echo "✓ $test_name - PASSED" >> $RESULTS_FILE
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        ((FAILED++))
        echo "✗ $test_name - FAILED (Expected: $expected_status, Got: $status_code)" >> $RESULTS_FILE
    fi
}

# Clear results file
> $RESULTS_FILE

echo "=== Phase 1: Authentication Tests ===" | tee -a $RESULTS_FILE
echo ""

# Register user
test_api "User Registration" "POST" "/api/auth/register" \
    '{"username":"e2etest","email":"e2etest@test.com","password":"test123"}' \
    "" "201"

# Login user
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"e2etest","password":"test123"}')
USER_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

test_api "User Login" "POST" "/api/auth/login" \
    '{"username":"e2etest","password":"test123"}' \
    "" "200"

test_api "Get Current User" "GET" "/api/auth/me" \
    "" "-H 'Authorization: Bearer $USER_TOKEN'" "200"

echo ""
echo "=== Phase 2: Design Management Tests ===" | tee -a $RESULTS_FILE
echo ""

test_api "Get Showcase Designs" "GET" "/api/designs/showcase" \
    "" "" "200"

test_api "Preview Design" "POST" "/api/designs/preview" \
    '{"prompt":"test design","clothing_type":"shirt"}' \
    "-H 'Authorization: Bearer $USER_TOKEN'" "200"

test_api "Get Designs Quota" "GET" "/api/user/designs-quota" \
    "" "-H 'Authorization: Bearer $USER_TOKEN'" "200"

SAVE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/designs/save" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"prompt":"e2e test design","image_base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","clothing_type":"shirt","color":"blue","phone_number":"+123456789"}')
DESIGN_ID=$(echo $SAVE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")

test_api "Save Design" "POST" "/api/designs/save" \
    '{"prompt":"test","image_base64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","clothing_type":"shirt","color":"blue","phone_number":"+123"}' \
    "-H 'Authorization: Bearer $USER_TOKEN'" "201"

test_api "Get User Designs" "GET" "/api/user/designs" \
    "" "-H 'Authorization: Bearer $USER_TOKEN'" "200"

if [ ! -z "$DESIGN_ID" ]; then
    test_api "Toggle Favorite" "PUT" "/api/designs/$DESIGN_ID/favorite" \
        "" "-H 'Authorization: Bearer $USER_TOKEN'" "200"
fi

echo ""
echo "=== Phase 3: Notification Tests ===" | tee -a $RESULTS_FILE
echo ""

test_api "Get Notifications" "GET" "/api/notifications" \
    "" "-H 'Authorization: Bearer $USER_TOKEN'" "200"

echo ""
echo "=== Phase 4: Admin Tests ===" | tee -a $RESULTS_FILE
echo ""

# Login as admin
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"adminnode","password":"admin123"}')
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

test_api "Get Admin Stats" "GET" "/api/admin/stats" \
    "" "-H 'Authorization: Bearer $ADMIN_TOKEN'" "200"

test_api "Get All Users" "GET" "/api/admin/users" \
    "" "-H 'Authorization: Bearer $ADMIN_TOKEN'" "200"

test_api "Get All Orders" "GET" "/api/admin/orders" \
    "" "-H 'Authorization: Bearer $ADMIN_TOKEN'" "200"

test_api "Get All Designs" "GET" "/api/admin/designs" \
    "" "-H 'Authorization: Bearer $ADMIN_TOKEN'" "200"

test_api "Get Showcase Designs (Admin)" "GET" "/api/admin/showcase-designs" \
    "" "-H 'Authorization: Bearer $ADMIN_TOKEN'" "200"

echo ""
echo "=== Phase 5: Coupon Tests ===" | tee -a $RESULTS_FILE
echo ""

test_api "Get Coupons" "GET" "/api/coupons" \
    "" "-H 'Authorization: Bearer $ADMIN_TOKEN'" "200"

test_api "Validate Coupon" "POST" "/api/coupons/validate" \
    '{"code":"WELCOME50"}' \
    "-H 'Authorization: Bearer $USER_TOKEN'" "200"

echo ""
echo "=== Phase 6: OAuth Tests ===" | tee -a $RESULTS_FILE
echo ""

test_api "Google OAuth (Invalid Token)" "POST" "/api/oauth/google" \
    '{"credential":"invalid_token"}' \
    "" "500"

echo ""
echo "================================================"
echo -e "${YELLOW}Test Summary:${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo "RESULT: ALL TESTS PASSED ✓" >> $RESULTS_FILE
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "RESULT: $FAILED TESTS FAILED ✗" >> $RESULTS_FILE
    exit 1
fi
