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

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  IndiFunded Backend API Tests")
    print("  Backend URL:", BASE_URL)
    print("="*80)
    
    results = {}
    
    try:
        # Login first
        admin_login()
        
        # Run tests
        results["test_1_certificate_seed"] = test_certificate_seed_bug()
        results["test_2_plan_price_persistence"] = test_plan_price_persistence()
        results["test_3_weekly_highest_payouts"] = test_weekly_highest_payouts()
        results["test_4_trader_league"] = test_trader_league_endpoints()
        
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
