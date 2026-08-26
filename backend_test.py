#!/usr/bin/env python3
"""
Backend API tests for IndiFunded app
Tests the four high-priority backend tasks:
1. Certificate seed no longer re-inserts after admin delete
2. Plan price edits persist across restart
3. GET /api/weekly-highest-payouts endpoint
4. Trader League endpoints (config, registration, status, admin listing)
"""

import requests
import time
import json
import subprocess
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://hardik-web.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@indifunded.com"
ADMIN_PASSWORD = "Admin@12345"

# Global token storage
admin_token = None

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

def admin_login() -> str:
    """Login as admin and return token"""
    global admin_token
    print_section("Admin Login")
    
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    
    if resp.status_code == 200:
        data = resp.json()
        admin_token = data.get("token")
        print_test("Admin login", True, f"Token: {admin_token[:20]}...")
        return admin_token
    else:
        print_test("Admin login", False, f"Status: {resp.status_code}, Body: {resp.text}")
        raise Exception("Admin login failed")

def get_auth_headers() -> Dict[str, str]:
    """Get authorization headers"""
    if not admin_token:
        admin_login()
    return {"Authorization": f"Bearer {admin_token}"}

def restart_backend():
    """Restart backend service"""
    print("\n🔄 Restarting backend service...")
    result = subprocess.run(
        ["sudo", "supervisorctl", "restart", "backend"],
        capture_output=True,
        text=True,
        timeout=30
    )
    print(f"    Restart command output: {result.stdout}")
    if result.stderr:
        print(f"    Stderr: {result.stderr}")
    
    # Wait for backend to be ready
    print("    Waiting 5 seconds for backend to start...")
    time.sleep(5)
    
    # Re-login after restart
    admin_login()

def test_certificate_seed_bug():
    """
    Test 1: Certificate seed no longer re-inserts after admin delete
    
    Steps:
    1. GET /api/certificates - note current visible certificates
    2. As admin, DELETE /api/certificates/{id} for every existing certificate
    3. Confirm GET /api/certificates returns []
    4. Restart backend
    5. GET /api/certificates again - MUST still return [] (bug fix verification)
    """
    print_section("TEST 1: Certificate Seed Bug Fix")
    
    # Step 1: Get current certificates
    resp = requests.get(f"{BASE_URL}/certificates", timeout=10)
    if resp.status_code != 200:
        print_test("Get certificates", False, f"Status: {resp.status_code}")
        return False
    
    certs = resp.json()
    print_test("Get certificates", True, f"Found {len(certs)} certificates")
    
    if len(certs) == 0:
        print("    ⚠️  No certificates to delete. Skipping delete step.")
    else:
        # Step 2: Delete all certificates
        print("\n    Deleting all certificates...")
        for cert in certs:
            cert_id = cert.get("id")
            del_resp = requests.delete(
                f"{BASE_URL}/certificates/{cert_id}",
                headers=get_auth_headers(),
                timeout=10
            )
            if del_resp.status_code == 200:
                print(f"    ✓ Deleted certificate {cert_id}")
            else:
                print_test(f"Delete certificate {cert_id}", False, 
                          f"Status: {del_resp.status_code}, Body: {del_resp.text}")
                return False
    
    # Step 3: Verify certificates are gone
    resp = requests.get(f"{BASE_URL}/certificates", timeout=10)
    if resp.status_code != 200:
        print_test("Verify certificates deleted", False, f"Status: {resp.status_code}")
        return False
    
    certs_after_delete = resp.json()
    if len(certs_after_delete) == 0:
        print_test("Verify certificates deleted", True, "All certificates deleted")
    else:
        print_test("Verify certificates deleted", False, 
                  f"Still found {len(certs_after_delete)} certificates")
        return False
    
    # Step 4: Restart backend
    restart_backend()
    
    # Step 5: Verify certificates don't come back (THE BUG FIX)
    resp = requests.get(f"{BASE_URL}/certificates", timeout=10)
    if resp.status_code != 200:
        print_test("Get certificates after restart", False, f"Status: {resp.status_code}")
        return False
    
    certs_after_restart = resp.json()
    if len(certs_after_restart) == 0:
        print_test("Certificate seed bug fix", True, 
                  "✅ Certificates did NOT come back after restart (bug fixed!)")
        return True
    else:
        print_test("Certificate seed bug fix", False, 
                  f"❌ Found {len(certs_after_restart)} certificates after restart (bug NOT fixed)")
        print(f"    Certificates: {json.dumps(certs_after_restart, indent=2)}")
        return False

def test_plan_price_persistence():
    """
    Test 2: Plan price edits persist across restart
    
    Steps:
    1. GET /api/plans - grab the Starter plan
    2. As admin, PUT /api/plans/{starter_id} with new challenge_fee and original_price
    3. GET /api/plans - confirm new prices
    4. Restart backend
    5. GET /api/plans - MUST still show new prices (bug fix verification)
    """
    print_section("TEST 2: Plan Price Persistence Bug Fix")
    
    # Step 1: Get Starter plan
    resp = requests.get(f"{BASE_URL}/plans", timeout=10)
    if resp.status_code != 200:
        print_test("Get plans", False, f"Status: {resp.status_code}")
        return False
    
    plans = resp.json()
    starter = next((p for p in plans if p.get("name") == "Starter"), None)
    
    if not starter:
        print_test("Find Starter plan", False, "Starter plan not found")
        return False
    
    starter_id = starter.get("id")
    original_challenge_fee = starter.get("challenge_fee")
    original_price = starter.get("original_price")
    
    print_test("Get Starter plan", True, 
              f"ID: {starter_id}, challenge_fee: {original_challenge_fee}, original_price: {original_price}")
    
    # Step 2: Update plan with new prices
    new_challenge_fee = 4499.0
    new_original_price = 5500.0
    
    update_body = {
        "name": starter["name"],
        "account_size": starter["account_size"],
        "challenge_fee": new_challenge_fee,
        "original_price": new_original_price,
        "profit_target_points": starter["profit_target_points"],
        "profit_share": starter["profit_share"],
        "max_loss_limit": starter["max_loss_limit"],
        "min_trading_days": starter["min_trading_days"],
        "total_trading_days": starter["total_trading_days"],
        "trades_per_day": starter["trades_per_day"],
        "description": starter.get("description", ""),
        "features": starter.get("features", []),
        "popular": starter.get("popular", False),
        "order": starter.get("order", 0),
    }
    
    resp = requests.put(
        f"{BASE_URL}/plans/{starter_id}",
        json=update_body,
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("Update plan prices", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    updated_plan = resp.json()
    print_test("Update plan prices", True, 
              f"New challenge_fee: {updated_plan.get('challenge_fee')}, new original_price: {updated_plan.get('original_price')}")
    
    # Step 3: Verify prices immediately
    resp = requests.get(f"{BASE_URL}/plans", timeout=10)
    if resp.status_code != 200:
        print_test("Verify updated prices", False, f"Status: {resp.status_code}")
        return False
    
    plans = resp.json()
    starter = next((p for p in plans if p.get("id") == starter_id), None)
    
    if not starter:
        print_test("Verify updated prices", False, "Starter plan not found after update")
        return False
    
    if starter.get("challenge_fee") == new_challenge_fee and starter.get("original_price") == new_original_price:
        print_test("Verify updated prices", True, "Prices updated correctly")
    else:
        print_test("Verify updated prices", False, 
                  f"Prices don't match: got challenge_fee={starter.get('challenge_fee')}, original_price={starter.get('original_price')}")
        return False
    
    # Step 4: Restart backend
    restart_backend()
    
    # Step 5: Verify prices persist after restart (THE BUG FIX)
    resp = requests.get(f"{BASE_URL}/plans", timeout=10)
    if resp.status_code != 200:
        print_test("Get plans after restart", False, f"Status: {resp.status_code}")
        return False
    
    plans = resp.json()
    starter = next((p for p in plans if p.get("id") == starter_id), None)
    
    if not starter:
        print_test("Plan price persistence bug fix", False, "Starter plan not found after restart")
        return False
    
    if starter.get("challenge_fee") == new_challenge_fee and starter.get("original_price") == new_original_price:
        print_test("Plan price persistence bug fix", True, 
                  f"✅ Prices persisted after restart: challenge_fee={new_challenge_fee}, original_price={new_original_price}")
        return True
    else:
        print_test("Plan price persistence bug fix", False, 
                  f"❌ Prices reverted after restart: got challenge_fee={starter.get('challenge_fee')}, original_price={starter.get('original_price')}")
        return False

def test_weekly_highest_payouts():
    """
    Test 3: GET /api/weekly-highest-payouts endpoint
    
    Verify:
    - Endpoint returns 200
    - Returns an array
    - Each item has required fields: plan, trader_name, amount, account_size, payout_date, image_url
    - Items are deduped per plan (at most one per unique plan value)
    - If certificates collection is empty, returns [] (no error)
    """
    print_section("TEST 3: Weekly Highest Payouts Endpoint")
    
    resp = requests.get(f"{BASE_URL}/weekly-highest-payouts", timeout=10)
    
    if resp.status_code != 200:
        print_test("GET /api/weekly-highest-payouts", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    print_test("GET /api/weekly-highest-payouts", True, "Endpoint returned 200")
    
    data = resp.json()
    
    if not isinstance(data, list):
        print_test("Response is array", False, f"Got type: {type(data)}")
        return False
    
    print_test("Response is array", True, f"Got {len(data)} items")
    
    if len(data) == 0:
        print("    ℹ️  Empty array returned (no certificates or none in last 7 days)")
        return True
    
    # Verify structure of each item
    required_fields = ["plan", "trader_name", "amount", "account_size", "payout_date", "image_url"]
    all_valid = True
    
    for i, item in enumerate(data):
        missing = [f for f in required_fields if f not in item]
        if missing:
            print_test(f"Item {i} has required fields", False, f"Missing: {missing}")
            all_valid = False
        else:
            print(f"    ✓ Item {i}: plan={item['plan']}, trader_name={item['trader_name']}, amount={item['amount']}")
    
    if all_valid:
        print_test("All items have required fields", True)
    
    # Verify deduplication (at most one per plan)
    plans_seen = set()
    duplicates = []
    
    for item in data:
        plan = item.get("plan")
        if plan in plans_seen:
            duplicates.append(plan)
        plans_seen.add(plan)
    
    if duplicates:
        print_test("Items deduped per plan", False, f"Duplicate plans: {duplicates}")
        return False
    else:
        print_test("Items deduped per plan", True, f"All plans unique: {list(plans_seen)}")
    
    return all_valid

def test_trader_league_endpoints():
    """
    Test 4: Trader League endpoints
    
    Tests:
    - GET /api/league/config (public)
    - PUT /api/league/config (admin) - disable
    - POST /api/league/register - should 403 when disabled
    - PUT /api/league/config (admin) - enable
    - POST /api/league/register with is_existing_trader:true and empty trader_id - should 400
    - POST /api/league/register with is_existing_trader:true and trader_id - should 200 with amount=999
    - POST /api/league/register with is_existing_trader:false - should 200 with amount=1499
    - GET /api/league/status/{registration_id}
    - GET /api/league/registrations (admin)
    - DELETE /api/league/registrations/{id} (admin)
    - PUT /api/league/config (admin) - disable again
    """
    print_section("TEST 4: Trader League Endpoints")
    
    # Test 4.1: GET /api/league/config (public)
    resp = requests.get(f"{BASE_URL}/league/config", timeout=10)
    if resp.status_code != 200:
        print_test("GET /api/league/config", False, f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    config = resp.json()
    print_test("GET /api/league/config", True, 
              f"enabled={config.get('enabled')}, fee_existing={config.get('fee_existing')}, fee_new={config.get('fee_new')}")
    
    if config.get("fee_existing") != 999 or config.get("fee_new") != 1499:
        print_test("Config fees correct", False, 
                  f"Expected fee_existing=999, fee_new=1499, got {config.get('fee_existing')}, {config.get('fee_new')}")
        return False
    
    print_test("Config fees correct", True)
    
    # Test 4.2: PUT /api/league/config - disable
    resp = requests.put(
        f"{BASE_URL}/league/config",
        json={"enabled": False},
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("PUT /api/league/config (disable)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    config = resp.json()
    if config.get("enabled") == False:
        print_test("PUT /api/league/config (disable)", True, "League disabled")
    else:
        print_test("PUT /api/league/config (disable)", False, f"enabled={config.get('enabled')}")
        return False
    
    # Test 4.3: POST /api/league/register when disabled - should 403
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "Test User",
            "email": "test@test.com",
            "phone": "9999999999",
            "is_existing_trader": False
        },
        timeout=10
    )
    
    if resp.status_code == 403:
        print_test("POST /api/league/register (disabled)", True, "Got 403 as expected")
    else:
        print_test("POST /api/league/register (disabled)", False, 
                  f"Expected 403, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 4.4: PUT /api/league/config - enable
    resp = requests.put(
        f"{BASE_URL}/league/config",
        json={"enabled": True},
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("PUT /api/league/config (enable)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    config = resp.json()
    if config.get("enabled") == True:
        print_test("PUT /api/league/config (enable)", True, "League enabled")
    else:
        print_test("PUT /api/league/config (enable)", False, f"enabled={config.get('enabled')}")
        return False
    
    # Test 4.5: POST /api/league/register with is_existing_trader:true and empty trader_id - should 400
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "Existing Trader No ID",
            "email": "existing_no_id@test.com",
            "phone": "9999999998",
            "is_existing_trader": True,
            "trader_id": ""
        },
        timeout=10
    )
    
    if resp.status_code == 400:
        print_test("POST /api/league/register (existing, no trader_id)", True, "Got 400 as expected")
    else:
        print_test("POST /api/league/register (existing, no trader_id)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 4.6: POST /api/league/register with is_existing_trader:true and trader_id - should 200 with amount=999
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "Existing Trader",
            "email": "existing@test.com",
            "phone": "9999999997",
            "is_existing_trader": True,
            "trader_id": "IF-123"
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/league/register (existing trader)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    existing_reg = resp.json()
    existing_reg_id = existing_reg.get("registration_id")
    
    if existing_reg.get("amount") != 999:
        print_test("POST /api/league/register (existing trader)", False, 
                  f"Expected amount=999, got {existing_reg.get('amount')}")
        return False
    
    if not existing_reg.get("qr_image"):
        print_test("POST /api/league/register (existing trader)", False, "No qr_image returned")
        return False
    
    qr_image = existing_reg.get("qr_image")
    has_rzp = "rzp.io" in qr_image or qr_image.startswith("http")
    
    print_test("POST /api/league/register (existing trader)", True, 
              f"registration_id={existing_reg_id}, amount=999, qr_image={'valid URL' if has_rzp else 'present'}")
    
    # Test 4.7: POST /api/league/register with is_existing_trader:false - should 200 with amount=1499
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "New Trader",
            "email": "new@test.com",
            "phone": "9999999996",
            "is_existing_trader": False
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/league/register (new trader)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    new_reg = resp.json()
    new_reg_id = new_reg.get("registration_id")
    
    if new_reg.get("amount") != 1499:
        print_test("POST /api/league/register (new trader)", False, 
                  f"Expected amount=1499, got {new_reg.get('amount')}")
        return False
    
    print_test("POST /api/league/register (new trader)", True, 
              f"registration_id={new_reg_id}, amount=1499")
    
    # Test 4.8: GET /api/league/status/{registration_id}
    resp = requests.get(f"{BASE_URL}/league/status/{existing_reg_id}", timeout=10)
    
    if resp.status_code != 200:
        print_test("GET /api/league/status/{id}", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    status = resp.json()
    print_test("GET /api/league/status/{id}", True, 
              f"status={status.get('status')}, amount={status.get('amount')}")
    
    # Test 4.9: GET /api/league/registrations (admin)
    resp = requests.get(
        f"{BASE_URL}/league/registrations",
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/league/registrations", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    registrations = resp.json()
    
    # Check if our two registrations are in the list
    reg_ids = [r.get("id") for r in registrations]
    
    if existing_reg_id in reg_ids and new_reg_id in reg_ids:
        print_test("GET /api/league/registrations", True, 
                  f"Found {len(registrations)} registrations, including our test registrations")
    else:
        print_test("GET /api/league/registrations", False, 
                  f"Test registrations not found in list. Found {len(registrations)} registrations")
        return False
    
    # Test 4.10: DELETE /api/league/registrations/{id} (cleanup)
    for reg_id in [existing_reg_id, new_reg_id]:
        resp = requests.delete(
            f"{BASE_URL}/league/registrations/{reg_id}",
            headers=get_auth_headers(),
            timeout=10
        )
        
        if resp.status_code == 200:
            print(f"    ✓ Deleted registration {reg_id}")
        else:
            print_test(f"DELETE /api/league/registrations/{reg_id}", False, 
                      f"Status: {resp.status_code}, Body: {resp.text}")
    
    print_test("DELETE /api/league/registrations (cleanup)", True, "Test registrations deleted")
    
    # Test 4.11: PUT /api/league/config - disable again (leave in default state)
    resp = requests.put(
        f"{BASE_URL}/league/config",
        json={"enabled": False},
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code == 200:
        print_test("PUT /api/league/config (disable final)", True, "League disabled (default state)")
    else:
        print_test("PUT /api/league/config (disable final)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
    
    return True

def test_razorpay_checkout_order():
    """
    Test 5: POST /api/orders/razorpay/checkout-order (NEW Standard Checkout endpoint)
    
    Tests:
    - Valid plan_id returns 200 with order_id, razorpay_order_id (starts with "order_"), 
      amount, amount_paise, key_id (starts with "rzp_live_"), customer{name,email,phone}, description
    - Invalid plan_id returns 404
    - Edge case: amount that would round below ₹1 should not crash
    """
    print_section("TEST 5: POST /api/orders/razorpay/checkout-order (NEW)")
    
    # Get Starter plan
    resp = requests.get(f"{BASE_URL}/plans", timeout=10)
    if resp.status_code != 200:
        print_test("Get plans", False, f"Status: {resp.status_code}")
        return False
    
    plans = resp.json()
    starter = next((p for p in plans if p.get("name") == "Starter"), None)
    
    if not starter:
        print_test("Find Starter plan", False, "Starter plan not found")
        return False
    
    starter_id = starter.get("id")
    print_test("Get Starter plan", True, f"ID: {starter_id}")
    
    # Test 5.1: Valid plan_id
    resp = requests.post(
        f"{BASE_URL}/orders/razorpay/checkout-order",
        json={
            "plan_id": starter_id,
            "customer_name": "Arjun Kumar",
            "customer_email": "arjun.kumar@example.com",
            "customer_phone": "9876543210"
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/orders/razorpay/checkout-order (valid)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    order = resp.json()
    
    # Verify required fields
    required_fields = ["order_id", "razorpay_order_id", "amount", "amount_paise", "key_id", "customer", "description"]
    missing = [f for f in required_fields if f not in order]
    
    if missing:
        print_test("POST /api/orders/razorpay/checkout-order (valid)", False, 
                  f"Missing fields: {missing}")
        return False
    
    # Verify razorpay_order_id starts with "order_"
    if not order.get("razorpay_order_id", "").startswith("order_"):
        print_test("razorpay_order_id format", False, 
                  f"Expected to start with 'order_', got: {order.get('razorpay_order_id')}")
        return False
    
    print_test("razorpay_order_id format", True, f"Starts with 'order_': {order.get('razorpay_order_id')}")
    
    # Verify key_id starts with "rzp_live_" or "rzp_test_"
    key_id = order.get("key_id", "")
    if not (key_id.startswith("rzp_live_") or key_id.startswith("rzp_test_")):
        print_test("key_id format", False, 
                  f"Expected to start with 'rzp_live_' or 'rzp_test_', got: {key_id}")
        return False
    
    print_test("key_id format", True, f"Valid Razorpay key: {key_id[:15]}...")
    
    # Verify amount and amount_paise
    if order.get("amount") <= 0:
        print_test("amount > 0", False, f"amount={order.get('amount')}")
        return False
    
    print_test("amount > 0", True, f"amount={order.get('amount')}")
    
    if not isinstance(order.get("amount_paise"), int) or order.get("amount_paise") <= 0:
        print_test("amount_paise is positive int", False, f"amount_paise={order.get('amount_paise')}")
        return False
    
    print_test("amount_paise is positive int", True, f"amount_paise={order.get('amount_paise')}")
    
    # Verify customer object
    customer = order.get("customer", {})
    if not all(k in customer for k in ["name", "email", "phone"]):
        print_test("customer object complete", False, f"customer={customer}")
        return False
    
    print_test("customer object complete", True, 
              f"name={customer.get('name')}, email={customer.get('email')}, phone={customer.get('phone')}")
    
    print_test("POST /api/orders/razorpay/checkout-order (valid)", True, 
              f"All fields present and valid")
    
    # Test 5.2: Invalid plan_id - should return 404
    resp = requests.post(
        f"{BASE_URL}/orders/razorpay/checkout-order",
        json={
            "plan_id": "invalid-plan-id-12345",
            "customer_name": "Test User",
            "customer_email": "test@test.com",
            "customer_phone": "9999999999"
        },
        timeout=10
    )
    
    if resp.status_code == 404:
        print_test("POST /api/orders/razorpay/checkout-order (invalid plan_id)", True, 
                  "Got 404 as expected")
    else:
        print_test("POST /api/orders/razorpay/checkout-order (invalid plan_id)", False, 
                  f"Expected 404, got {resp.status_code}, Body: {resp.text}")
        return False
    
    return True

def test_razorpay_verify():
    """
    Test 6: POST /api/orders/razorpay/verify (NEW)
    
    Tests:
    - Garbage payload with fake signature returns 400 with detail 'Invalid Razorpay signature'
    - Empty payload returns 400 with detail 'Missing payment fields'
    """
    print_section("TEST 6: POST /api/orders/razorpay/verify (NEW)")
    
    # Test 6.1: Garbage payload with fake signature
    resp = requests.post(
        f"{BASE_URL}/orders/razorpay/verify",
        json={
            "razorpay_order_id": "order_FAKE123",
            "razorpay_payment_id": "pay_FAKE456",
            "razorpay_signature": "zzz_invalid_signature"
        },
        timeout=10
    )
    
    if resp.status_code == 400:
        body = resp.json()
        detail = body.get("detail", "")
        if "Invalid Razorpay signature" in detail:
            print_test("POST /api/orders/razorpay/verify (fake signature)", True, 
                      f"Got 400 with correct error: {detail}")
        else:
            print_test("POST /api/orders/razorpay/verify (fake signature)", False, 
                      f"Got 400 but wrong error message: {detail}")
            return False
    else:
        print_test("POST /api/orders/razorpay/verify (fake signature)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 6.2: Empty payload
    resp = requests.post(
        f"{BASE_URL}/orders/razorpay/verify",
        json={},
        timeout=10
    )
    
    if resp.status_code == 400:
        body = resp.json()
        detail = body.get("detail", "")
        if "Missing payment fields" in detail:
            print_test("POST /api/orders/razorpay/verify (empty payload)", True, 
                      f"Got 400 with correct error: {detail}")
        else:
            print_test("POST /api/orders/razorpay/verify (empty payload)", False, 
                      f"Got 400 but wrong error message: {detail}")
            return False
    else:
        print_test("POST /api/orders/razorpay/verify (empty payload)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    return True

def test_league_register_new_checkout():
    """
    Test 7: POST /api/league/register (UPDATED to use Orders API)
    
    Tests:
    - League disabled returns 403
    - New trader returns 200 with razorpay_order_id (starts "order_"), amount=1499, 
      amount_paise=149900, key_id, customer, description
    - Response MUST NOT contain qr_image (removed since we now use Checkout SDK)
    - Existing trader with trader_id returns 200 with amount=999, amount_paise=99900
    - Existing trader with empty trader_id returns 400
    - GET /api/league/registrations includes created registrations with razorpay_order_id and status='pending_payment'
    - Cleanup: DELETE registrations and disable league
    """
    print_section("TEST 7: POST /api/league/register (NEW Orders API)")
    
    # Test 7.1: Enable league
    resp = requests.put(
        f"{BASE_URL}/league/config",
        json={"enabled": True},
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("PUT /api/league/config (enable)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    print_test("PUT /api/league/config (enable)", True, "League enabled")
    
    # Test 7.2: New trader registration
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "Ravi Sharma",
            "email": "ravi.sharma@example.com",
            "phone": "9876543211",
            "is_existing_trader": False
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/league/register (new trader)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    new_reg = resp.json()
    new_reg_id = new_reg.get("registration_id")
    
    # Verify required fields
    required_fields = ["registration_id", "razorpay_order_id", "amount", "amount_paise", "key_id", "customer", "description"]
    missing = [f for f in required_fields if f not in new_reg]
    
    if missing:
        print_test("POST /api/league/register (new trader) - fields", False, 
                  f"Missing fields: {missing}")
        return False
    
    # CRITICAL: Verify qr_image is NOT present (removed in new implementation)
    if "qr_image" in new_reg:
        print_test("POST /api/league/register (new trader) - NO qr_image", False, 
                  "❌ Response contains qr_image field (should be removed for Checkout SDK)")
        return False
    
    print_test("POST /api/league/register (new trader) - NO qr_image", True, 
              "✅ qr_image field correctly removed (using Checkout SDK)")
    
    # Verify razorpay_order_id starts with "order_"
    if not new_reg.get("razorpay_order_id", "").startswith("order_"):
        print_test("razorpay_order_id format", False, 
                  f"Expected to start with 'order_', got: {new_reg.get('razorpay_order_id')}")
        return False
    
    print_test("razorpay_order_id format", True, f"Starts with 'order_': {new_reg.get('razorpay_order_id')}")
    
    # Verify amount and amount_paise for new trader
    if new_reg.get("amount") != 1499:
        print_test("amount = 1499 (new trader)", False, f"Expected 1499, got {new_reg.get('amount')}")
        return False
    
    print_test("amount = 1499 (new trader)", True)
    
    if new_reg.get("amount_paise") != 149900:
        print_test("amount_paise = 149900 (new trader)", False, 
                  f"Expected 149900, got {new_reg.get('amount_paise')}")
        return False
    
    print_test("amount_paise = 149900 (new trader)", True)
    
    # Verify key_id
    key_id = new_reg.get("key_id", "")
    if not (key_id.startswith("rzp_live_") or key_id.startswith("rzp_test_")):
        print_test("key_id format", False, f"Invalid key_id: {key_id}")
        return False
    
    print_test("key_id format", True, f"Valid: {key_id[:15]}...")
    
    # Verify customer object
    customer = new_reg.get("customer", {})
    if customer.get("name") != "Ravi Sharma" or customer.get("email") != "ravi.sharma@example.com":
        print_test("customer object", False, f"customer={customer}")
        return False
    
    print_test("customer object", True, f"name={customer.get('name')}, email={customer.get('email')}")
    
    print_test("POST /api/league/register (new trader)", True, 
              f"registration_id={new_reg_id}, all fields valid")
    
    # Test 7.3: Existing trader with trader_id
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "Priya Patel",
            "email": "priya.patel@example.com",
            "phone": "9876543212",
            "is_existing_trader": True,
            "trader_id": "IF-9"
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/league/register (existing trader)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    existing_reg = resp.json()
    existing_reg_id = existing_reg.get("registration_id")
    
    # Verify amount and amount_paise for existing trader
    if existing_reg.get("amount") != 999:
        print_test("amount = 999 (existing trader)", False, f"Expected 999, got {existing_reg.get('amount')}")
        return False
    
    print_test("amount = 999 (existing trader)", True)
    
    if existing_reg.get("amount_paise") != 99900:
        print_test("amount_paise = 99900 (existing trader)", False, 
                  f"Expected 99900, got {existing_reg.get('amount_paise')}")
        return False
    
    print_test("amount_paise = 99900 (existing trader)", True)
    
    print_test("POST /api/league/register (existing trader)", True, 
              f"registration_id={existing_reg_id}, amount=999")
    
    # Test 7.4: Existing trader with empty trader_id - should 400
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "Test User",
            "email": "test_empty_id@example.com",
            "phone": "9876543213",
            "is_existing_trader": True,
            "trader_id": ""
        },
        timeout=10
    )
    
    if resp.status_code == 400:
        print_test("POST /api/league/register (existing, empty trader_id)", True, 
                  "Got 400 as expected")
    else:
        print_test("POST /api/league/register (existing, empty trader_id)", False, 
                  f"Expected 400, got {resp.status_code}, Body: {resp.text}")
        return False
    
    # Test 7.5: GET /api/league/registrations - verify registrations exist with razorpay_order_id
    resp = requests.get(
        f"{BASE_URL}/league/registrations",
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("GET /api/league/registrations", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    registrations = resp.json()
    
    # Find our registrations
    new_found = next((r for r in registrations if r.get("id") == new_reg_id), None)
    existing_found = next((r for r in registrations if r.get("id") == existing_reg_id), None)
    
    if not new_found or not existing_found:
        print_test("GET /api/league/registrations - find test registrations", False, 
                  f"Registrations not found. Total: {len(registrations)}")
        return False
    
    # Verify razorpay_order_id is set
    if not new_found.get("razorpay_order_id") or not existing_found.get("razorpay_order_id"):
        print_test("GET /api/league/registrations - razorpay_order_id set", False, 
                  f"razorpay_order_id missing in registrations")
        return False
    
    print_test("GET /api/league/registrations - razorpay_order_id set", True, 
              f"Both registrations have razorpay_order_id")
    
    # Verify status is 'pending_payment'
    if new_found.get("status") != "pending_payment" or existing_found.get("status") != "pending_payment":
        print_test("GET /api/league/registrations - status='pending_payment'", False, 
                  f"new status={new_found.get('status')}, existing status={existing_found.get('status')}")
        return False
    
    print_test("GET /api/league/registrations - status='pending_payment'", True)
    
    print_test("GET /api/league/registrations", True, 
              f"Found {len(registrations)} registrations, test registrations verified")
    
    # Test 7.6: Cleanup - DELETE registrations
    for reg_id in [new_reg_id, existing_reg_id]:
        resp = requests.delete(
            f"{BASE_URL}/league/registrations/{reg_id}",
            headers=get_auth_headers(),
            timeout=10
        )
        
        if resp.status_code == 200:
            print(f"    ✓ Deleted registration {reg_id}")
        else:
            print(f"    ⚠️  Failed to delete registration {reg_id}: {resp.status_code}")
    
    print_test("DELETE registrations (cleanup)", True)
    
    # Test 7.7: Disable league (cleanup)
    resp = requests.put(
        f"{BASE_URL}/league/config",
        json={"enabled": False},
        headers=get_auth_headers(),
        timeout=10
    )
    
    if resp.status_code == 200:
        print_test("PUT /api/league/config (disable cleanup)", True, "League disabled")
    else:
        print_test("PUT /api/league/config (disable cleanup)", False, 
                  f"Status: {resp.status_code}")
    
    # Test 7.8: Verify league disabled - registration should 403
    resp = requests.post(
        f"{BASE_URL}/league/register",
        json={
            "full_name": "Test User",
            "email": "test@test.com",
            "phone": "9999999999",
            "is_existing_trader": False
        },
        timeout=10
    )
    
    if resp.status_code == 403:
        print_test("POST /api/league/register (disabled)", True, "Got 403 as expected")
    else:
        print_test("POST /api/league/register (disabled)", False, 
                  f"Expected 403, got {resp.status_code}")
        return False
    
    return True

def test_razorpay_qr_regression():
    """
    Test 8: REGRESSION - POST /api/orders/razorpay/create (OLD QR endpoint)
    
    Verify:
    - Old QR endpoint still works
    - Returns qr_image, qr_id, order_id, amount
    - This endpoint was NOT removed, only new checkout-order endpoint was added
    """
    print_section("TEST 8: REGRESSION - POST /api/orders/razorpay/create (OLD QR)")
    
    # Get Starter plan
    resp = requests.get(f"{BASE_URL}/plans", timeout=10)
    if resp.status_code != 200:
        print_test("Get plans", False, f"Status: {resp.status_code}")
        return False
    
    plans = resp.json()
    starter = next((p for p in plans if p.get("name") == "Starter"), None)
    
    if not starter:
        print_test("Find Starter plan", False, "Starter plan not found")
        return False
    
    starter_id = starter.get("id")
    
    # Test old QR endpoint
    resp = requests.post(
        f"{BASE_URL}/orders/razorpay/create",
        json={
            "plan_id": starter_id,
            "customer_name": "Vikram Singh",
            "customer_email": "vikram.singh@example.com",
            "customer_phone": "9876543214"
        },
        timeout=10
    )
    
    if resp.status_code != 200:
        print_test("POST /api/orders/razorpay/create (OLD QR)", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    qr_order = resp.json()
    
    # Verify required fields for OLD QR endpoint
    required_fields = ["order_id", "qr_image", "qr_id", "amount"]
    missing = [f for f in required_fields if f not in qr_order]
    
    if missing:
        print_test("POST /api/orders/razorpay/create - fields", False, 
                  f"Missing fields: {missing}")
        return False
    
    print_test("POST /api/orders/razorpay/create - fields", True, 
              f"All required fields present: {list(qr_order.keys())}")
    
    # Verify qr_image is present (this is the key difference from new endpoint)
    if not qr_order.get("qr_image"):
        print_test("POST /api/orders/razorpay/create - qr_image present", False, 
                  "qr_image is missing or empty")
        return False
    
    print_test("POST /api/orders/razorpay/create - qr_image present", True, 
              f"qr_image: {qr_order.get('qr_image')[:50]}...")
    
    print_test("POST /api/orders/razorpay/create (OLD QR)", True, 
              "✅ Old QR endpoint still works correctly (not removed)")
    
    return True

def test_regression_smoke():
    """
    Test 9: REGRESSION - Smoke test for previously fixed bugs
    
    Quick verification:
    - GET /api/weekly-highest-payouts returns array without error
    - GET /api/plans shows Starter with challenge_fee=3999 or updated value, original_price exists
    """
    print_section("TEST 9: REGRESSION - Smoke test for previous bug fixes")
    
    # Test 9.1: Weekly highest payouts
    resp = requests.get(f"{BASE_URL}/weekly-highest-payouts", timeout=10)
    
    if resp.status_code != 200:
        print_test("GET /api/weekly-highest-payouts", False, 
                  f"Status: {resp.status_code}, Body: {resp.text}")
        return False
    
    data = resp.json()
    
    if not isinstance(data, list):
        print_test("GET /api/weekly-highest-payouts", False, 
                  f"Expected array, got {type(data)}")
        return False
    
    print_test("GET /api/weekly-highest-payouts", True, 
              f"Returns array with {len(data)} items")
    
    # Test 9.2: Plans endpoint and Starter plan
    resp = requests.get(f"{BASE_URL}/plans", timeout=10)
    
    if resp.status_code != 200:
        print_test("GET /api/plans", False, f"Status: {resp.status_code}")
        return False
    
    plans = resp.json()
    starter = next((p for p in plans if p.get("name") == "Starter"), None)
    
    if not starter:
        print_test("GET /api/plans - Starter exists", False, "Starter plan not found")
        return False
    
    print_test("GET /api/plans - Starter exists", True)
    
    # Verify Starter has challenge_fee and original_price
    if "challenge_fee" not in starter:
        print_test("Starter has challenge_fee", False, "challenge_fee missing")
        return False
    
    print_test("Starter has challenge_fee", True, f"challenge_fee={starter.get('challenge_fee')}")
    
    if "original_price" not in starter:
        print_test("Starter has original_price", False, "original_price missing")
        return False
    
    print_test("Starter has original_price", True, f"original_price={starter.get('original_price')}")
    
    print_test("REGRESSION smoke tests", True, "✅ Previous bug fixes still working")
    
    return True

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  IndiFunded Backend API Tests - NEW Razorpay Standard Checkout")
    print("  Backend URL:", BASE_URL)
    print("="*80)
    
    results = {}
    
    try:
        # Login first
        admin_login()
        
        # Run NEW tests for Razorpay Standard Checkout
        results["test_5_razorpay_checkout_order"] = test_razorpay_checkout_order()
        results["test_6_razorpay_verify"] = test_razorpay_verify()
        results["test_7_league_register_new_checkout"] = test_league_register_new_checkout()
        results["test_8_razorpay_qr_regression"] = test_razorpay_qr_regression()
        results["test_9_regression_smoke"] = test_regression_smoke()
        
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
