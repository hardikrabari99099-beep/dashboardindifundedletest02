#!/usr/bin/env python3
"""
Test Admin Weekly Highest Payouts CRUD + public endpoint override behavior
"""
import requests
import json

BASE_URL = "https://hardik-web.preview.emergentagent.com/api"

# Test data
ADMIN_EMAIL = "admin@indifunded.com"
ADMIN_PASSWORD = "Admin@12345"
USER_EMAIL = "wptest@example.com"
USER_PASSWORD = "secret123"
USER_NAME = "WP Tester"
USER_PHONE = "9999999999"

ADMIN_TOKEN = None
USER_TOKEN = None
USER_ID = None
WP1_ID = None
WP2_ID = None

def log(msg):
    print(f"✓ {msg}")

def fail(msg):
    print(f"✗ FAIL: {msg}")
    raise AssertionError(msg)

# ===== 1. AUTHENTICATION =====
def test_admin_auth():
    global ADMIN_TOKEN
    print("\n=== 1. Admin Authentication ===")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        fail(f"Admin login failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if "token" not in data:
        fail(f"Admin login missing token: {data}")
    ADMIN_TOKEN = data["token"]
    log(f"Admin login successful, token: {ADMIN_TOKEN[:20]}...")

def test_user_auth():
    global USER_TOKEN, USER_ID
    print("\n=== 2. User Authentication ===")
    # Signup
    resp = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "name": USER_NAME,
        "phone": USER_PHONE
    })
    if resp.status_code != 200:
        fail(f"User signup failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if "token" not in data or "id" not in data:
        fail(f"User signup missing token/id: {data}")
    USER_TOKEN = data["token"]
    USER_ID = data["id"]
    log(f"User signup successful, token: {USER_TOKEN[:20]}..., id: {USER_ID}")

# ===== 2. ADMIN CRUD =====
def test_admin_list_empty():
    print("\n=== 3. Admin GET /api/admin/weekly-payouts (empty) ===")
    resp = requests.get(f"{BASE_URL}/admin/weekly-payouts", headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin list failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if not isinstance(data, list):
        fail(f"Admin list should return array, got: {type(data)}")
    log(f"Admin list returned array with {len(data)} items (may be empty)")

def test_admin_create_wp1():
    global WP1_ID
    print("\n=== 4. Admin POST /api/admin/weekly-payouts (WP1 - Pro) ===")
    payload = {
        "image_url": "https://example.com/x.png",
        "trader_name": "Test Winner",
        "amount": 50000,
        "plan": "Pro",
        "account_size": 500000,
        "payout_date": "12/05/2026",
        "order": 1,
        "visible": True
    }
    resp = requests.post(f"{BASE_URL}/admin/weekly-payouts", json=payload, headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin create WP1 failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if "id" not in data:
        fail(f"Admin create WP1 missing id: {data}")
    WP1_ID = data["id"]
    # Verify all fields
    for key in ["image_url", "trader_name", "amount", "plan", "account_size", "payout_date", "order", "visible"]:
        if key not in data:
            fail(f"Admin create WP1 missing field {key}: {data}")
        if data[key] != payload[key]:
            fail(f"Admin create WP1 field {key} mismatch: expected {payload[key]}, got {data[key]}")
    log(f"Admin create WP1 successful, id: {WP1_ID}, trader_name: {data['trader_name']}, amount: {data['amount']}")

def test_admin_create_wp2():
    global WP2_ID
    print("\n=== 5. Admin POST /api/admin/weekly-payouts (WP2 - Standard) ===")
    payload = {
        "image_url": "https://example.com/y.png",
        "trader_name": "Test Two",
        "amount": 25000,
        "plan": "Standard",
        "account_size": 200000,
        "payout_date": "10/05/2026",
        "order": 2,
        "visible": True
    }
    resp = requests.post(f"{BASE_URL}/admin/weekly-payouts", json=payload, headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin create WP2 failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if "id" not in data:
        fail(f"Admin create WP2 missing id: {data}")
    WP2_ID = data["id"]
    log(f"Admin create WP2 successful, id: {WP2_ID}, trader_name: {data['trader_name']}, amount: {data['amount']}")

def test_admin_update_wp1():
    print("\n=== 6. Admin PUT /api/admin/weekly-payouts/{WP1_ID} (update amount) ===")
    payload = {
        "image_url": "https://example.com/x.png",
        "trader_name": "Test Winner",
        "amount": 55000,  # Updated from 50000
        "plan": "Pro",
        "account_size": 500000,
        "payout_date": "12/05/2026",
        "order": 1,
        "visible": True
    }
    resp = requests.put(f"{BASE_URL}/admin/weekly-payouts/{WP1_ID}", json=payload, headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin update WP1 failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if data.get("amount") != 55000:
        fail(f"Admin update WP1 amount not updated: expected 55000, got {data.get('amount')}")
    log(f"Admin update WP1 successful, amount updated to: {data['amount']}")

def test_admin_list_two_entries():
    print("\n=== 7. Admin GET /api/admin/weekly-payouts (2 entries) ===")
    resp = requests.get(f"{BASE_URL}/admin/weekly-payouts", headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin list failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if not isinstance(data, list):
        fail(f"Admin list should return array, got: {type(data)}")
    if len(data) < 2:
        fail(f"Admin list should have at least 2 entries, got {len(data)}: {data}")
    # Find WP1 and verify amount is 55000
    wp1 = next((x for x in data if x.get("id") == WP1_ID), None)
    if not wp1:
        fail(f"WP1 not found in admin list: {data}")
    if wp1.get("amount") != 55000:
        fail(f"WP1 amount should be 55000, got {wp1.get('amount')}")
    log(f"Admin list returned {len(data)} entries, WP1 amount verified: {wp1['amount']}")

def test_admin_delete_wp2():
    print("\n=== 8. Admin DELETE /api/admin/weekly-payouts/{WP2_ID} ===")
    resp = requests.delete(f"{BASE_URL}/admin/weekly-payouts/{WP2_ID}", headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin delete WP2 failed: {resp.status_code} {resp.text}")
    log(f"Admin delete WP2 successful")

def test_admin_list_one_entry():
    print("\n=== 9. Admin GET /api/admin/weekly-payouts (1 entry after delete) ===")
    resp = requests.get(f"{BASE_URL}/admin/weekly-payouts", headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin list failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if not isinstance(data, list):
        fail(f"Admin list should return array, got: {type(data)}")
    # Should have only 1 entry now (WP1)
    wp_ids = [x.get("id") for x in data]
    if WP2_ID in wp_ids:
        fail(f"WP2 should be deleted but still in list: {data}")
    if WP1_ID not in wp_ids:
        fail(f"WP1 should still be in list but not found: {data}")
    log(f"Admin list returned {len(data)} entry (WP2 deleted, WP1 remains)")

# ===== 3. PUBLIC ENDPOINT OVERRIDE =====
def test_public_endpoint_returns_curated():
    print("\n=== 10. Public GET /api/weekly-highest-payouts (returns curated admin entry) ===")
    resp = requests.get(f"{BASE_URL}/weekly-highest-payouts")
    if resp.status_code != 200:
        fail(f"Public endpoint failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if not isinstance(data, list):
        fail(f"Public endpoint should return array, got: {type(data)}")
    if len(data) == 0:
        fail(f"Public endpoint should return at least 1 curated entry, got empty array")
    # Verify at least one entry matches admin-entered data
    found_curated = False
    for entry in data:
        if entry.get("trader_name") == "Test Winner" and entry.get("amount") == 55000 and entry.get("plan") == "Pro":
            found_curated = True
            break
    if not found_curated:
        fail(f"Public endpoint should return curated entry (Test Winner, 55000, Pro), got: {data}")
    log(f"Public endpoint returned curated admin entry: trader_name='Test Winner', amount=55000, plan='Pro'")

def test_admin_delete_wp1():
    print("\n=== 11. Admin DELETE /api/admin/weekly-payouts/{WP1_ID} (cleanup) ===")
    resp = requests.delete(f"{BASE_URL}/admin/weekly-payouts/{WP1_ID}", headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Admin delete WP1 failed: {resp.status_code} {resp.text}")
    log(f"Admin delete WP1 successful")

def test_public_endpoint_fallback():
    print("\n=== 12. Public GET /api/weekly-highest-payouts (fallback to certificate-derived) ===")
    resp = requests.get(f"{BASE_URL}/weekly-highest-payouts")
    if resp.status_code != 200:
        fail(f"Public endpoint failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if not isinstance(data, list):
        fail(f"Public endpoint should return array, got: {type(data)}")
    # Should now return certificate-derived list (may be empty or have entries)
    # Verify it does NOT contain the admin-curated entry anymore
    for entry in data:
        if entry.get("trader_name") == "Test Winner" and entry.get("amount") == 55000:
            fail(f"Public endpoint should NOT return deleted admin entry, got: {data}")
    # Verify entries have plan field (Pro/Standard/Starter from certificates)
    if len(data) > 0:
        for entry in data:
            if "plan" not in entry:
                fail(f"Public endpoint fallback entry missing plan field: {entry}")
            if entry.get("plan") not in ["Pro", "Standard", "Starter"]:
                fail(f"Public endpoint fallback entry has invalid plan: {entry.get('plan')}")
    log(f"Public endpoint returned certificate-derived list with {len(data)} entries (fallback working)")

# ===== 4. AUTH GATING =====
def test_auth_gating_post_with_user_token():
    print("\n=== 13. Auth Gating: POST /api/admin/weekly-payouts with USER_TOKEN (401) ===")
    payload = {
        "image_url": "https://example.com/z.png",
        "trader_name": "Unauthorized",
        "amount": 10000,
        "plan": "Starter",
        "account_size": 100000,
        "payout_date": "01/05/2026",
        "order": 1,
        "visible": True
    }
    resp = requests.post(f"{BASE_URL}/admin/weekly-payouts", json=payload, headers={
        "Authorization": f"Bearer {USER_TOKEN}"
    })
    if resp.status_code != 401:
        fail(f"POST with user token should return 401, got {resp.status_code}: {resp.text}")
    log(f"POST with user token correctly returned 401")

def test_auth_gating_put_with_user_token():
    print("\n=== 14. Auth Gating: PUT /api/admin/weekly-payouts/fake_id with USER_TOKEN (401) ===")
    payload = {
        "image_url": "https://example.com/z.png",
        "trader_name": "Unauthorized",
        "amount": 10000,
        "plan": "Starter",
        "account_size": 100000,
        "payout_date": "01/05/2026",
        "order": 1,
        "visible": True
    }
    resp = requests.put(f"{BASE_URL}/admin/weekly-payouts/fake_id", json=payload, headers={
        "Authorization": f"Bearer {USER_TOKEN}"
    })
    if resp.status_code != 401:
        fail(f"PUT with user token should return 401, got {resp.status_code}: {resp.text}")
    log(f"PUT with user token correctly returned 401")

def test_auth_gating_delete_with_user_token():
    print("\n=== 15. Auth Gating: DELETE /api/admin/weekly-payouts/fake_id with USER_TOKEN (401) ===")
    resp = requests.delete(f"{BASE_URL}/admin/weekly-payouts/fake_id", headers={
        "Authorization": f"Bearer {USER_TOKEN}"
    })
    if resp.status_code != 401:
        fail(f"DELETE with user token should return 401, got {resp.status_code}: {resp.text}")
    log(f"DELETE with user token correctly returned 401")

def test_auth_gating_get_with_no_auth():
    print("\n=== 16. Auth Gating: GET /api/admin/weekly-payouts with no auth (401) ===")
    resp = requests.get(f"{BASE_URL}/admin/weekly-payouts")
    if resp.status_code != 401:
        fail(f"GET with no auth should return 401, got {resp.status_code}: {resp.text}")
    log(f"GET with no auth correctly returned 401")

def test_auth_gating_public_endpoint_no_auth():
    print("\n=== 17. Auth Gating: GET /api/weekly-highest-payouts with no auth (200 - public) ===")
    resp = requests.get(f"{BASE_URL}/weekly-highest-payouts")
    if resp.status_code != 200:
        fail(f"Public endpoint should return 200 with no auth, got {resp.status_code}: {resp.text}")
    log(f"Public endpoint correctly returned 200 with no auth (remains public)")

# ===== 5. REGRESSION =====
def test_regression_plans():
    print("\n=== 18. Regression: GET /api/plans (Starter/Standard/Pro with prices) ===")
    resp = requests.get(f"{BASE_URL}/plans")
    if resp.status_code != 200:
        fail(f"GET /api/plans failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if not isinstance(data, list):
        fail(f"GET /api/plans should return array, got: {type(data)}")
    if len(data) < 3:
        fail(f"GET /api/plans should have at least 3 plans, got {len(data)}")
    # Verify plan names
    plan_names = [p.get("name") for p in data]
    for expected in ["Starter", "Standard", "Pro"]:
        if expected not in plan_names:
            fail(f"GET /api/plans missing plan {expected}: {plan_names}")
    # Verify prices exist
    for plan in data:
        if "challenge_fee" not in plan or "original_price" not in plan:
            fail(f"GET /api/plans plan missing price fields: {plan}")
    log(f"GET /api/plans returned {len(data)} plans with correct names and prices")

def test_regression_admin_login():
    print("\n=== 19. Regression: Admin login still works ===")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        fail(f"Admin login failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if "token" not in data:
        fail(f"Admin login missing token: {data}")
    log(f"Admin login still works correctly")

def test_regression_admin_endpoints():
    print("\n=== 20. Regression: Admin endpoints still return 200 with admin token ===")
    endpoints = [
        "/admin/stats",
        "/admin/users",
    ]
    for endpoint in endpoints:
        resp = requests.get(f"{BASE_URL}{endpoint}", headers={
            "Authorization": f"Bearer {ADMIN_TOKEN}"
        })
        if resp.status_code != 200:
            fail(f"GET {endpoint} with admin token failed: {resp.status_code} {resp.text}")
    log(f"Admin endpoints still return 200 with admin token")

# ===== 6. CLEANUP =====
def test_cleanup_delete_user():
    print("\n=== 21. Cleanup: DELETE /api/admin/users/{user_id} ===")
    resp = requests.delete(f"{BASE_URL}/admin/users/{USER_ID}", headers={
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    if resp.status_code != 200:
        fail(f"Delete user failed: {resp.status_code} {resp.text}")
    log(f"Test user deleted successfully")

# ===== MAIN =====
def main():
    print("=" * 80)
    print("Testing Admin Weekly Highest Payouts CRUD + Public Endpoint Override")
    print("=" * 80)
    
    try:
        # 1. Authentication
        test_admin_auth()
        test_user_auth()
        
        # 2. Admin CRUD
        test_admin_list_empty()
        test_admin_create_wp1()
        test_admin_create_wp2()
        test_admin_update_wp1()
        test_admin_list_two_entries()
        test_admin_delete_wp2()
        test_admin_list_one_entry()
        
        # 3. Public endpoint override
        test_public_endpoint_returns_curated()
        test_admin_delete_wp1()
        test_public_endpoint_fallback()
        
        # 4. Auth gating
        test_auth_gating_post_with_user_token()
        test_auth_gating_put_with_user_token()
        test_auth_gating_delete_with_user_token()
        test_auth_gating_get_with_no_auth()
        test_auth_gating_public_endpoint_no_auth()
        
        # 5. Regression
        test_regression_plans()
        test_regression_admin_login()
        test_regression_admin_endpoints()
        
        # 6. Cleanup
        test_cleanup_delete_user()
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED (21/21)")
        print("=" * 80)
        
    except AssertionError as e:
        print("\n" + "=" * 80)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 80)
        exit(1)
    except Exception as e:
        print("\n" + "=" * 80)
        print(f"❌ UNEXPECTED ERROR: {e}")
        print("=" * 80)
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == "__main__":
    main()
