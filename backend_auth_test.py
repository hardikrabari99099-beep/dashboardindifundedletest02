#!/usr/bin/env python3
"""
Backend API tests for IndiFunded User Authentication + Dashboard
Tests all user auth endpoints, dashboard endpoints, profile/KYC, and admin user management.
"""

import requests
import time
import json
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://hardik-web.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@indifunded.com"
ADMIN_PASSWORD = "Admin@12345"

# Global token storage
admin_token = None
user_token = None
user_id = None
user_email = None

def print_section(title: str):
    """Print a section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_test(name: str, passed: bool, details: str = ""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"    {details}")

def test_signup():
    """
    Test 1: POST /api/auth/signup
    
    Tests:
    - Success: valid signup with all fields returns 200 with id, email, name, phone, role='user', token, created_at
    - Duplicate email: repeat same signup returns 409
    - Missing name: signup without name returns 400
    - Short password: password < 6 chars returns 400
    - Invalid email: malformed email returns 400
    """
    global user_token, user_id, user_email
    print_section("TEST 1: POST /api/auth/signup")
    
    # Test 1.1: Success case
    user_email = f"newuser{int(time.time())}@test.com"
    resp = requests.post(
        f"{BASE_URL}/auth/signup",
        json={
            "email": user_email,
            "password": "secret123",
            "name": "New User",
            "phone": "9999999999"
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/auth/signup (success)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    # Verify required fields
    required_fields = ["id", "email", "name", "phone", "role", "token", "created_at"]
    missing = [f for f in required_fields if f not in data]
    
    if missing:
        print_test("POST /api/auth/signup (success) - fields", False, 
                  f"Missing fields: {missing}")
        return False
    
    # Verify role is 'user'
    if data.get("role") != "user":
        print_test("POST /api/auth/signup (success) - role='user'", False, 
                  f"Expected role='user', got role='{data.get('role')}'")
        return False
    
    # Store for later tests
    user_token = data.get("token")
    user_id = data.get("id")
    
    print_test("POST /api/auth/signup (success)", True, 
              f"id={user_id}, email={data.get('email')}, role={data.get('role')}, token={user_token[:20]}...")
    
    # Test 1.2: Duplicate email - should return 409
    resp = requests.post(
        f"{BASE_URL}/auth/signup",
        json={
            "email": user_email,
            "password": "secret123",
            "name": "Duplicate User",
            "phone": "8888888888"
        },
        timeout=10
    )
    
    if resp.status_code == 409:
        print_test("POST /api/auth/signup (duplicate email)", True, "Got 409 as expected")
    else:
        print_test("POST /api/auth/signup (duplicate email)", False, 
                  f"Expected 409, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 1.3: Missing name - should return 400
    resp = requests.post(
        f"{BASE_URL}/auth/signup",
        json={
            "email": "a@a.com",
            "password": "secret123"
        },
        timeout=10
    )
    
    if resp.status_code == 400:
        print_test("POST /api/auth/signup (missing name)", True, "Got 400 as expected")
    else:
        print_test("POST /api/auth/signup (missing name)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 1.4: Short password - should return 400
    resp = requests.post(
        f"{BASE_URL}/auth/signup",
        json={
            "email": "b@b.com",
            "password": "123",
            "name": "X"
        },
        timeout=10
    )
    
    if resp.status_code == 400:
        print_test("POST /api/auth/signup (short password)", True, "Got 400 as expected")
    else:
        print_test("POST /api/auth/signup (short password)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 1.5: Invalid email - should return 400
    resp = requests.post(
        f"{BASE_URL}/auth/signup",
        json={
            "email": "notanemail",
            "password": "secret123",
            "name": "X"
        },
        timeout=10
    )
    
    if resp.status_code == 400:
        print_test("POST /api/auth/signup (invalid email)", True, "Got 400 as expected")
    else:
        print_test("POST /api/auth/signup (invalid email)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    return True

def test_login():
    """
    Test 2: POST /api/auth/login
    
    Tests:
    - Login with newly created user credentials returns 200 with token and role='user'
    - Login with admin credentials returns 200 with role='admin'
    - Wrong password returns 401
    """
    global admin_token
    print_section("TEST 2: POST /api/auth/login")
    
    # Test 2.1: Login with user credentials
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": user_email,
            "password": "secret123"
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/auth/login (user)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if data.get("role") != "user":
        print_test("POST /api/auth/login (user) - role='user'", False, 
                  f"Expected role='user', got role='{data.get('role')}'")
        return False
    
    if not data.get("token"):
        print_test("POST /api/auth/login (user) - token present", False, "No token returned")
        return False
    
    print_test("POST /api/auth/login (user)", True, 
              f"email={data.get('email')}, role={data.get('role')}, token={data.get('token')[:20]}...")
    
    # Test 2.2: Login with admin credentials
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/auth/login (admin)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if data.get("role") != "admin":
        print_test("POST /api/auth/login (admin) - role='admin'", False, 
                  f"Expected role='admin', got role='{data.get('role')}'")
        return False
    
    # Store admin token for later tests
    admin_token = data.get("token")
    
    print_test("POST /api/auth/login (admin)", True, 
              f"email={data.get('email')}, role={data.get('role')}, token={admin_token[:20]}...")
    
    # Test 2.3: Wrong password - should return 401
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": user_email,
            "password": "wrongpassword"
        },
        timeout=10
    )
    
    if resp.status_code == 401:
        print_test("POST /api/auth/login (wrong password)", True, "Got 401 as expected")
    else:
        print_test("POST /api/auth/login (wrong password)", False, 
                  f"Expected 401, got {resp.status_code}, Body: {resp.text}")
        return False
    
    return True

def test_auth_me():
    """
    Test 3: GET /api/auth/me
    
    Tests:
    - With user's Bearer token returns user profile (no password_hash)
    - With no token returns 401
    - With admin token returns admin profile
    - Verify normal user token now works (previously this required admin role)
    """
    print_section("TEST 3: GET /api/auth/me")
    
    # Test 3.1: With user's Bearer token
    resp = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/auth/me (user token)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    # Verify no password_hash in response
    if "password_hash" in data:
        print_test("GET /api/auth/me (user token) - no password_hash", False, 
                  "password_hash present in response")
        return False
    
    # Verify user fields
    if data.get("id") != user_id or data.get("email") != user_email:
        print_test("GET /api/auth/me (user token) - correct user", False, 
                  f"Expected id={user_id}, email={user_email}, got id={data.get('id')}, email={data.get('email')}")
        return False
    
    print_test("GET /api/auth/me (user token)", True, 
              f"id={data.get('id')}, email={data.get('email')}, role={data.get('role')}")
    
    # Test 3.2: With no token - should return 401
    resp = requests.get(
        f"{BASE_URL}/auth/me",
        timeout=10
    )
    
    if resp.status_code == 401:
        print_test("GET /api/auth/me (no token)", True, "Got 401 as expected")
    else:
        print_test("GET /api/auth/me (no token)", False, 
                  f"Expected 401, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 3.3: With admin token
    resp = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/auth/me (admin token)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if data.get("role") != "admin":
        print_test("GET /api/auth/me (admin token) - role='admin'", False, 
                  f"Expected role='admin', got role='{data.get('role')}'")
        return False
    
    print_test("GET /api/auth/me (admin token)", True, 
              f"email={data.get('email')}, role={data.get('role')}")
    
    return True

def test_dashboard_endpoints():
    """
    Test 4: Dashboard endpoints (require user auth via Bearer token)
    
    Tests:
    - GET /api/me/dashboard returns 200 with user, simulated_capital, funded_accounts_active, 
      funded_accounts_total, net_pnl, total_paid_out, payouts_count, accounts
    - GET /api/me/accounts returns [] for fresh user
    - GET /api/me/payouts returns {eligible, pending_amount, total_paid, history:[]}
    - GET /api/me/certificates returns [] for fresh user
    - GET /api/me/billing returns [] for fresh user
    """
    print_section("TEST 4: Dashboard Endpoints")
    
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Test 4.1: GET /api/me/dashboard
    resp = requests.get(
        f"{BASE_URL}/me/dashboard",
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/me/dashboard", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    # Verify required fields
    required_fields = ["user", "simulated_capital", "funded_accounts_active", 
                      "funded_accounts_total", "net_pnl", "total_paid_out", 
                      "payouts_count", "accounts"]
    missing = [f for f in required_fields if f not in data]
    
    if missing:
        print_test("GET /api/me/dashboard - fields", False, 
                  f"Missing fields: {missing}")
        return False
    
    # Verify user object
    user_obj = data.get("user", {})
    if user_obj.get("id") != user_id or user_obj.get("email") != user_email:
        print_test("GET /api/me/dashboard - user object", False, 
                  f"User object mismatch: {user_obj}")
        return False
    
    print_test("GET /api/me/dashboard", True, 
              f"user.id={user_obj.get('id')}, simulated_capital={data.get('simulated_capital')}, "
              f"funded_accounts_active={data.get('funded_accounts_active')}")
    
    # Test 4.2: GET /api/me/accounts
    resp = requests.get(
        f"{BASE_URL}/me/accounts",
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/me/accounts", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if not isinstance(data, list):
        print_test("GET /api/me/accounts - returns array", False, 
                  f"Expected array, got {type(data)}")
        return False
    
    print_test("GET /api/me/accounts", True, 
              f"Returns array with {len(data)} items (expected 0 for fresh user)")
    
    # Test 4.3: GET /api/me/payouts
    resp = requests.get(
        f"{BASE_URL}/me/payouts",
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/me/payouts", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    # Verify required fields
    required_fields = ["eligible", "pending_amount", "total_paid", "history"]
    missing = [f for f in required_fields if f not in data]
    
    if missing:
        print_test("GET /api/me/payouts - fields", False, 
                  f"Missing fields: {missing}")
        return False
    
    print_test("GET /api/me/payouts", True, 
              f"eligible={data.get('eligible')}, pending_amount={data.get('pending_amount')}, "
              f"total_paid={data.get('total_paid')}, history length={len(data.get('history', []))}")
    
    # Test 4.4: GET /api/me/certificates
    resp = requests.get(
        f"{BASE_URL}/me/certificates",
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/me/certificates", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if not isinstance(data, list):
        print_test("GET /api/me/certificates - returns array", False, 
                  f"Expected array, got {type(data)}")
        return False
    
    print_test("GET /api/me/certificates", True, 
              f"Returns array with {len(data)} items (expected 0 for fresh user)")
    
    # Test 4.5: GET /api/me/billing
    resp = requests.get(
        f"{BASE_URL}/me/billing",
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/me/billing", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if not isinstance(data, list):
        print_test("GET /api/me/billing - returns array", False, 
                  f"Expected array, got {type(data)}")
        return False
    
    print_test("GET /api/me/billing", True, 
              f"Returns array with {len(data)} items (expected 0 for fresh user)")
    
    return True

def test_profile_kyc():
    """
    Test 5: Profile & KYC endpoints
    
    Tests:
    - PUT /api/me/profile with name and phone returns 200 with updated user object
    - GET /api/me shows the update
    - PUT /api/me/profile with empty body returns 400 "Nothing to update"
    - PUT /api/me/kyc with all fields returns 200 with kyc dict containing submitted_at + status="submitted"
    - PUT /api/me/kyc with empty body returns 400 (missing full_name/pan)
    """
    print_section("TEST 5: Profile & KYC Endpoints")
    
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Test 5.1: PUT /api/me/profile with valid data
    resp = requests.put(
        f"{BASE_URL}/me/profile",
        json={
            "name": "Updated Name",
            "phone": "1111111111"
        },
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("PUT /api/me/profile (valid)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if data.get("name") != "Updated Name" or data.get("phone") != "1111111111":
        print_test("PUT /api/me/profile (valid) - updated", False, 
                  f"Expected name='Updated Name', phone='1111111111', got name='{data.get('name')}', phone='{data.get('phone')}'")
        return False
    
    print_test("PUT /api/me/profile (valid)", True, 
              f"name={data.get('name')}, phone={data.get('phone')}")
    
    # Test 5.2: GET /api/auth/me to verify update
    resp = requests.get(
        f"{BASE_URL}/auth/me",
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/auth/me (verify profile update)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if data.get("name") != "Updated Name" or data.get("phone") != "1111111111":
        print_test("GET /api/auth/me (verify profile update)", False, 
                  f"Profile not updated: name='{data.get('name')}', phone='{data.get('phone')}'")
        return False
    
    print_test("GET /api/auth/me (verify profile update)", True, 
              "Profile update verified")
    
    # Test 5.3: PUT /api/me/profile with empty body - should return 400
    resp = requests.put(
        f"{BASE_URL}/me/profile",
        json={},
        headers=headers,
        timeout=10
    )
    
    if resp.status_code == 400:
        body = resp.json()
        detail = body.get("detail", "")
        if "Nothing to update" in detail:
            print_test("PUT /api/me/profile (empty body)", True, 
                      f"Got 400 with correct error: {detail}")
        else:
            print_test("PUT /api/me/profile (empty body)", False, 
                      f"Got 400 but wrong error message: {detail}")
            return False
    else:
        print_test("PUT /api/me/profile (empty body)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 5.4: PUT /api/me/kyc with valid data
    resp = requests.put(
        f"{BASE_URL}/me/kyc",
        json={
            "full_name": "Legal Name",
            "pan": "ABCDE1234F",
            "upi_id": "foo@upi",
            "bank_account_number": "1234567890",
            "ifsc": "HDFC0001234"
        },
        headers=headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("PUT /api/me/kyc (valid)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    # Verify required fields
    if "submitted_at" not in data or data.get("status") != "submitted":
        print_test("PUT /api/me/kyc (valid) - fields", False, 
                  f"Missing submitted_at or status != 'submitted': {data}")
        return False
    
    if data.get("full_name") != "Legal Name" or data.get("pan") != "ABCDE1234F":
        print_test("PUT /api/me/kyc (valid) - data", False, 
                  f"KYC data mismatch: {data}")
        return False
    
    print_test("PUT /api/me/kyc (valid)", True, 
              f"full_name={data.get('full_name')}, pan={data.get('pan')}, status={data.get('status')}, submitted_at={data.get('submitted_at')}")
    
    # Test 5.5: PUT /api/me/kyc with empty body - should return 400
    resp = requests.put(
        f"{BASE_URL}/me/kyc",
        json={},
        headers=headers,
        timeout=10
    )
    
    if resp.status_code == 400:
        print_test("PUT /api/me/kyc (empty body)", True, "Got 400 as expected")
    else:
        print_test("PUT /api/me/kyc (empty body)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    return True

def test_admin_users():
    """
    Test 6: Admin - GET /api/admin/users and DELETE /api/admin/users/{id}
    
    Tests:
    - Login as admin
    - GET /api/admin/users returns array containing the "newuser@test.com" registered above
    - User has fields: id, email, name, phone, role='user', kyc (with submitted_at), created_at
    - Users list does NOT contain the admin user itself (filter role != 'admin')
    - Without auth returns 401
    - With user token returns 401 (admin only)
    - DELETE /api/admin/users/{id} as admin returns 200
    - Verify the user is gone from GET /api/admin/users
    """
    print_section("TEST 6: Admin - User Management")
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Test 6.1: GET /api/admin/users as admin
    resp = requests.get(
        f"{BASE_URL}/admin/users",
        headers=admin_headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/admin/users (admin)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    users = resp.json()
    
    if not isinstance(users, list):
        print_test("GET /api/admin/users - returns array", False, 
                  f"Expected array, got {type(users)}")
        return False
    
    # Find our test user
    test_user = next((u for u in users if u.get("email") == user_email), None)
    
    if not test_user:
        print_test("GET /api/admin/users - contains test user", False, 
                  f"Test user {user_email} not found in users list")
        return False
    
    # Verify user fields
    required_fields = ["id", "email", "name", "phone", "role", "kyc", "created_at"]
    missing = [f for f in required_fields if f not in test_user]
    
    if missing:
        print_test("GET /api/admin/users - user fields", False, 
                  f"Missing fields in user: {missing}")
        return False
    
    if test_user.get("role") != "user":
        print_test("GET /api/admin/users - user role='user'", False, 
                  f"Expected role='user', got role='{test_user.get('role')}'")
        return False
    
    # Verify KYC has submitted_at (from previous test)
    kyc = test_user.get("kyc", {})
    if "submitted_at" not in kyc:
        print_test("GET /api/admin/users - user kyc has submitted_at", False, 
                  f"KYC missing submitted_at: {kyc}")
        return False
    
    print_test("GET /api/admin/users (admin)", True, 
              f"Found {len(users)} users, test user present with all fields")
    
    # Test 6.2: Verify admin user is NOT in the list
    admin_in_list = any(u.get("email") == ADMIN_EMAIL for u in users)
    
    if admin_in_list:
        print_test("GET /api/admin/users - admin NOT in list", False, 
                  "Admin user found in users list (should be filtered out)")
        return False
    
    print_test("GET /api/admin/users - admin NOT in list", True, 
              "Admin user correctly filtered out")
    
    # Test 6.3: GET /api/admin/users without auth - should return 401
    resp = requests.get(
        f"{BASE_URL}/admin/users",
        timeout=10
    )
    
    if resp.status_code == 401:
        print_test("GET /api/admin/users (no auth)", True, "Got 401 as expected")
    else:
        print_test("GET /api/admin/users (no auth)", False, 
                  f"Expected 401, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 6.4: GET /api/admin/users with user token - should return 401
    user_headers = {"Authorization": f"Bearer {user_token}"}
    resp = requests.get(
        f"{BASE_URL}/admin/users",
        headers=user_headers,
        timeout=10
    )
    
    if resp.status_code == 401:
        print_test("GET /api/admin/users (user token)", True, "Got 401 as expected (admin only)")
    else:
        print_test("GET /api/admin/users (user token)", False, 
                  f"Expected 401, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 6.5: DELETE /api/admin/users/{id} as admin
    resp = requests.delete(
        f"{BASE_URL}/admin/users/{user_id}",
        headers=admin_headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("DELETE /api/admin/users/{id} (admin)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    print_test("DELETE /api/admin/users/{id} (admin)", True, 
              f"Deleted user {user_id}")
    
    # Test 6.6: Verify user is gone from GET /api/admin/users
    resp = requests.get(
        f"{BASE_URL}/admin/users",
        headers=admin_headers,
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/admin/users (verify delete)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    users = resp.json()
    test_user = next((u for u in users if u.get("email") == user_email), None)
    
    if test_user:
        print_test("GET /api/admin/users (verify delete)", False, 
                  f"User {user_email} still found in users list after delete")
        return False
    
    print_test("GET /api/admin/users (verify delete)", True, 
              "User successfully deleted and not in list")
    
    return True

def test_regression():
    """
    Test 7: Regression - smoke tests
    
    Tests:
    - GET /api/plans (Starter still ₹3999 or updated value?)
    - GET /api/weekly-highest-payouts (works)
    - GET /api/league/config (works)
    """
    print_section("TEST 7: Regression - Smoke Tests")
    
    # Test 7.1: GET /api/plans
    resp = requests.get(f"{BASE_URL}/plans", timeout=10)
    
    if resp.status_code != 200:
        print_test("GET /api/plans", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    plans = resp.json()
    starter = next((p for p in plans if p.get("name") == "Starter"), None)
    
    if not starter:
        print_test("GET /api/plans - Starter exists", False, "Starter plan not found")
        return False
    
    print_test("GET /api/plans", True, 
              f"Starter plan: challenge_fee={starter.get('challenge_fee')}, original_price={starter.get('original_price')}")
    
    # Test 7.2: GET /api/weekly-highest-payouts
    resp = requests.get(f"{BASE_URL}/weekly-highest-payouts", timeout=10)
    
    if resp.status_code != 200:
        print_test("GET /api/weekly-highest-payouts", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if not isinstance(data, list):
        print_test("GET /api/weekly-highest-payouts - returns array", False, 
                  f"Expected array, got {type(data)}")
        return False
    
    print_test("GET /api/weekly-highest-payouts", True, 
              f"Returns array with {len(data)} items")
    
    # Test 7.3: GET /api/league/config
    resp = requests.get(f"{BASE_URL}/league/config", timeout=10)
    
    if resp.status_code != 200:
        print_test("GET /api/league/config", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    config = resp.json()
    
    print_test("GET /api/league/config", True, 
              f"enabled={config.get('enabled')}, fee_existing={config.get('fee_existing')}, fee_new={config.get('fee_new')}")
    
    return True

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  IndiFunded Backend API Tests - User Authentication + Dashboard")
    print("  Backend URL:", BASE_URL)
    print("="*80)
    
    results = {}
    
    try:
        # Run all tests in sequence
        results["test_1_signup"] = test_signup()
        results["test_2_login"] = test_login()
        results["test_3_auth_me"] = test_auth_me()
        results["test_4_dashboard_endpoints"] = test_dashboard_endpoints()
        results["test_5_profile_kyc"] = test_profile_kyc()
        results["test_6_admin_users"] = test_admin_users()
        results["test_7_regression"] = test_regression()
        
    except Exception as e:
        print(f"\n❌ Test suite failed with exception: {e}")
        import traceback
        traceback.print_exc()
        results["exception"] = False
    
    # Summary
    print_section("TEST SUMMARY")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {total}, Passed: {passed}, Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit(main())
