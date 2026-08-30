#!/usr/bin/env python3
"""
Test script to verify admin panel 401 fix:
- /api/auth/me now accepts any authenticated user (not just admin)
- Admin endpoints still gate correctly (require admin role)
- Regular users cannot access admin endpoints
"""

import requests
import json
import sys

# Backend URL
BASE_URL = "https://go-live-check-14.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@indifunded.com"
ADMIN_PASSWORD = "Admin@12345"
TEST_USER_EMAIL = "regular2@test.com"
TEST_USER_PASSWORD = "secret123"
TEST_USER_NAME = "Regular User"
TEST_USER_PHONE = "9999999999"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def log_pass(msg):
    print(f"{GREEN}✓ PASS{RESET}: {msg}")

def log_fail(msg, details=""):
    print(f"{RED}✗ FAIL{RESET}: {msg}")
    if details:
        print(f"  Details: {details}")

def log_info(msg):
    print(f"{YELLOW}ℹ INFO{RESET}: {msg}")

# Test results tracking
results = {
    "passed": 0,
    "failed": 0,
    "failures": []
}

def test_case(name, condition, details=""):
    """Track test results"""
    if condition:
        results["passed"] += 1
        log_pass(name)
        return True
    else:
        results["failed"] += 1
        results["failures"].append({"name": name, "details": details})
        log_fail(name, details)
        return False

print("=" * 80)
print("ADMIN PANEL 401 FIX VERIFICATION TEST")
print("=" * 80)
print()

# ===== 1. ADMIN LOGIN AND ADMIN ENDPOINTS =====
print("=" * 80)
print("1. ADMIN LOGIN AND ADMIN ENDPOINTS")
print("=" * 80)

# 1.1 Admin login
log_info("Testing admin login...")
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD
})
test_case(
    "POST /api/auth/login (admin) returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

if resp.status_code != 200:
    print(f"\n{RED}CRITICAL: Admin login failed. Cannot continue tests.{RESET}")
    sys.exit(1)

admin_data = resp.json()
test_case(
    "Admin login returns role='admin'",
    admin_data.get("role") == "admin",
    f"Role: {admin_data.get('role')}"
)
test_case(
    "Admin login returns token",
    "token" in admin_data,
    f"Keys: {list(admin_data.keys())}"
)

ADMIN_TOKEN = admin_data.get("token")
admin_headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

# 1.2 GET /api/auth/me with admin token
log_info("Testing GET /api/auth/me with admin token...")
resp = requests.get(f"{BASE_URL}/auth/me", headers=admin_headers)
test_case(
    "GET /api/auth/me with admin token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)
if resp.status_code == 200:
    me_data = resp.json()
    test_case(
        "GET /api/auth/me returns role='admin'",
        me_data.get("role") == "admin",
        f"Role: {me_data.get('role')}"
    )

# 1.3 GET /api/admin/stats with admin token
log_info("Testing GET /api/admin/stats with admin token...")
resp = requests.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
test_case(
    "GET /api/admin/stats with admin token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 1.4 GET /api/admin/users with admin token
log_info("Testing GET /api/admin/users with admin token...")
resp = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers)
test_case(
    "GET /api/admin/users with admin token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)
if resp.status_code == 200:
    users = resp.json()
    test_case(
        "GET /api/admin/users returns array",
        isinstance(users, list),
        f"Type: {type(users)}"
    )

# 1.5 GET /api/orders with admin token
log_info("Testing GET /api/orders with admin token...")
resp = requests.get(f"{BASE_URL}/orders", headers=admin_headers)
test_case(
    "GET /api/orders with admin token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)
if resp.status_code == 200:
    orders = resp.json()
    test_case(
        "GET /api/orders returns array",
        isinstance(orders, list),
        f"Type: {type(orders)}"
    )

# 1.6 GET /api/leads with admin token
log_info("Testing GET /api/leads with admin token...")
resp = requests.get(f"{BASE_URL}/leads", headers=admin_headers)
test_case(
    "GET /api/leads with admin token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)
if resp.status_code == 200:
    leads = resp.json()
    test_case(
        "GET /api/leads returns array",
        isinstance(leads, list),
        f"Type: {type(leads)}"
    )

# 1.7 GET /api/certificates/all with admin token (admin endpoint - returns all including invisible)
log_info("Testing GET /api/certificates/all with admin token...")
resp = requests.get(f"{BASE_URL}/certificates/all", headers=admin_headers)
test_case(
    "GET /api/certificates/all with admin token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

print()

# ===== 2. REGULAR USER SIGNUP AND CANNOT ACCESS ADMIN ENDPOINTS =====
print("=" * 80)
print("2. REGULAR USER CANNOT ACCESS ADMIN ENDPOINTS")
print("=" * 80)

# 2.1 Regular user signup
log_info("Testing regular user signup...")
resp = requests.post(f"{BASE_URL}/auth/signup", json={
    "email": TEST_USER_EMAIL,
    "password": TEST_USER_PASSWORD,
    "name": TEST_USER_NAME,
    "phone": TEST_USER_PHONE
})
test_case(
    "POST /api/auth/signup returns 200 or 409 (if already exists)",
    resp.status_code in [200, 409],
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# If user already exists, login instead
if resp.status_code == 409:
    log_info("User already exists, logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    test_case(
        "POST /api/auth/login (regular user) returns 200",
        resp.status_code == 200,
        f"Status: {resp.status_code}, Body: {resp.text[:200]}"
    )

if resp.status_code != 200:
    print(f"\n{RED}CRITICAL: Regular user signup/login failed. Cannot continue tests.{RESET}")
    sys.exit(1)

user_data = resp.json()
test_case(
    "Regular user has role='user'",
    user_data.get("role") == "user",
    f"Role: {user_data.get('role')}"
)

USER_TOKEN = user_data.get("token")
user_headers = {"Authorization": f"Bearer {USER_TOKEN}"}
USER_ID = user_data.get("id")

# 2.2 GET /api/auth/me with user token (THIS IS THE KEY FIX - should now return 200)
log_info("Testing GET /api/auth/me with user token...")
resp = requests.get(f"{BASE_URL}/auth/me", headers=user_headers)
test_case(
    "GET /api/auth/me with user token returns 200 (NEW BEHAVIOR)",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)
if resp.status_code == 200:
    me_data = resp.json()
    test_case(
        "GET /api/auth/me returns role='user'",
        me_data.get("role") == "user",
        f"Role: {me_data.get('role')}"
    )

# 2.3 GET /api/admin/stats with user token - MUST return 401
log_info("Testing GET /api/admin/stats with user token (should be 401)...")
resp = requests.get(f"{BASE_URL}/admin/stats", headers=user_headers)
test_case(
    "GET /api/admin/stats with user token returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 2.4 GET /api/admin/users with user token - MUST return 401
log_info("Testing GET /api/admin/users with user token (should be 401)...")
resp = requests.get(f"{BASE_URL}/admin/users", headers=user_headers)
test_case(
    "GET /api/admin/users with user token returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 2.5 GET /api/orders with user token - MUST return 401
log_info("Testing GET /api/orders with user token (should be 401)...")
resp = requests.get(f"{BASE_URL}/orders", headers=user_headers)
test_case(
    "GET /api/orders with user token returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 2.6 GET /api/leads with user token - MUST return 401
log_info("Testing GET /api/leads with user token (should be 401)...")
resp = requests.get(f"{BASE_URL}/leads", headers=user_headers)
test_case(
    "GET /api/leads with user token returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 2.7 PUT /api/plans/{any_plan_id} with user token - MUST return 401
log_info("Testing PUT /api/plans/{plan_id} with user token (should be 401)...")
# First get a plan ID
resp = requests.get(f"{BASE_URL}/plans")
if resp.status_code == 200:
    plans = resp.json()
    if plans:
        plan_id = plans[0]["id"]
        resp = requests.put(f"{BASE_URL}/plans/{plan_id}", 
                           headers=user_headers,
                           json={"name": "Test", "account_size": 10000, "challenge_fee": 1000})
        test_case(
            "PUT /api/plans/{plan_id} with user token returns 401",
            resp.status_code == 401,
            f"Status: {resp.status_code}, Body: {resp.text[:200]}"
        )
    else:
        log_info("No plans available to test PUT /api/plans")
else:
    log_info("Could not fetch plans to test PUT /api/plans")

# 2.8 PUT /api/league/config with user token - MUST return 401
log_info("Testing PUT /api/league/config with user token (should be 401)...")
resp = requests.put(f"{BASE_URL}/league/config", 
                    headers=user_headers,
                    json={"enabled": True})
test_case(
    "PUT /api/league/config with user token returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

print()

# ===== 3. USER DASHBOARD ENDPOINTS WORK FOR REGULAR USER =====
print("=" * 80)
print("3. USER DASHBOARD ENDPOINTS WORK FOR REGULAR USER (REGRESSION)")
print("=" * 80)

# 3.1 GET /api/me/dashboard with user token
log_info("Testing GET /api/me/dashboard with user token...")
resp = requests.get(f"{BASE_URL}/me/dashboard", headers=user_headers)
test_case(
    "GET /api/me/dashboard with user token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 3.2 GET /api/me/accounts with user token
log_info("Testing GET /api/me/accounts with user token...")
resp = requests.get(f"{BASE_URL}/me/accounts", headers=user_headers)
test_case(
    "GET /api/me/accounts with user token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 3.3 GET /api/me/payouts with user token
log_info("Testing GET /api/me/payouts with user token...")
resp = requests.get(f"{BASE_URL}/me/payouts", headers=user_headers)
test_case(
    "GET /api/me/payouts with user token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 3.4 GET /api/me/certificates with user token
log_info("Testing GET /api/me/certificates with user token...")
resp = requests.get(f"{BASE_URL}/me/certificates", headers=user_headers)
test_case(
    "GET /api/me/certificates with user token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 3.5 GET /api/me/billing with user token
log_info("Testing GET /api/me/billing with user token...")
resp = requests.get(f"{BASE_URL}/me/billing", headers=user_headers)
test_case(
    "GET /api/me/billing with user token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 3.6 GET /api/me/dashboard with admin token (admin is also a valid authenticated user)
log_info("Testing GET /api/me/dashboard with admin token...")
resp = requests.get(f"{BASE_URL}/me/dashboard", headers=admin_headers)
test_case(
    "GET /api/me/dashboard with admin token returns 200",
    resp.status_code == 200,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

print()

# ===== 4. NO AUTH = 401 =====
print("=" * 80)
print("4. NO AUTH = 401")
print("=" * 80)

# 4.1 GET /api/auth/me with no auth
log_info("Testing GET /api/auth/me with no auth (should be 401)...")
resp = requests.get(f"{BASE_URL}/auth/me")
test_case(
    "GET /api/auth/me with no auth returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 4.2 GET /api/admin/stats with no auth
log_info("Testing GET /api/admin/stats with no auth (should be 401)...")
resp = requests.get(f"{BASE_URL}/admin/stats")
test_case(
    "GET /api/admin/stats with no auth returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

# 4.3 GET /api/me/dashboard with no auth
log_info("Testing GET /api/me/dashboard with no auth (should be 401)...")
resp = requests.get(f"{BASE_URL}/me/dashboard")
test_case(
    "GET /api/me/dashboard with no auth returns 401",
    resp.status_code == 401,
    f"Status: {resp.status_code}, Body: {resp.text[:200]}"
)

print()

# ===== 5. CLEANUP =====
print("=" * 80)
print("5. CLEANUP")
print("=" * 80)

# 5.1 Delete the test user
if USER_ID:
    log_info(f"Deleting test user {USER_ID}...")
    resp = requests.delete(f"{BASE_URL}/admin/users/{USER_ID}", headers=admin_headers)
    test_case(
        f"DELETE /api/admin/users/{USER_ID} with admin token returns 200",
        resp.status_code == 200,
        f"Status: {resp.status_code}, Body: {resp.text[:200]}"
    )

print()

# ===== SUMMARY =====
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total tests: {results['passed'] + results['failed']}")
print(f"{GREEN}Passed: {results['passed']}{RESET}")
print(f"{RED}Failed: {results['failed']}{RESET}")

if results['failed'] > 0:
    print()
    print("=" * 80)
    print("FAILED TESTS:")
    print("=" * 80)
    for failure in results['failures']:
        print(f"{RED}✗{RESET} {failure['name']}")
        if failure['details']:
            print(f"  {failure['details']}")
    print()
    sys.exit(1)
else:
    print()
    print(f"{GREEN}✓ ALL TESTS PASSED!{RESET}")
    print()
    sys.exit(0)
