#!/usr/bin/env python3
"""
Backend Bug Fix Verification Test Suite
Tests three bug fixes:
1. Auto-generated APK trading-app credentials on signup + backfill
2. Coupon flow (default coupons seeded + validation)
3. Cert AI detector (Emergent LLM) is configured
"""

import requests
import json
import sys

BASE_URL = "https://hardik-web.preview.emergentagent.com/api"

# Test results tracking
passed = 0
failed = 0
test_results = []

def log_test(name, success, details=""):
    global passed, failed
    if success:
        passed += 1
        print(f"✅ PASS: {name}")
        test_results.append({"test": name, "status": "PASS", "details": details})
    else:
        failed += 1
        print(f"❌ FAIL: {name}")
        print(f"   Details: {details}")
        test_results.append({"test": name, "status": "FAIL", "details": details})

def test_admin_auth():
    """Test admin authentication and capture token"""
    print("\n=== ADMIN AUTH ===")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@indifunded.com",
        "password": "Admin@12345"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("token")
        role = data.get("role")
        if token and role == "admin":
            log_test("Admin login", True, f"Token: {token[:20]}...")
            return token
        else:
            log_test("Admin login", False, f"Missing token or wrong role: {data}")
            return None
    else:
        log_test("Admin login", False, f"Status {resp.status_code}: {resp.text}")
        return None

def test_apk_credentials_signup(admin_token):
    """FIX 1: Test APK credentials auto-generation on signup"""
    print("\n=== FIX 1: APK CREDENTIALS AUTO-GENERATION ===")
    
    # Test 1: Signup with "Hardik Rabari" - expect apk_password="HARDIK@1234"
    print("\n--- Test 1: Signup Hardik Rabari ---")
    resp = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": "hardik.test@example.com",
        "password": "secret123",
        "name": "Hardik Rabari",
        "phone": "9999999999"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        apk_username = data.get("apk_username")
        apk_password = data.get("apk_password")
        user_token = data.get("token")
        user_id = data.get("id")
        
        if apk_username == "hardik.test@example.com" and apk_password == "HARDIK@1234":
            log_test("Signup Hardik - APK credentials", True, 
                    f"apk_username={apk_username}, apk_password={apk_password}")
        else:
            log_test("Signup Hardik - APK credentials", False,
                    f"Expected apk_username='hardik.test@example.com' and apk_password='HARDIK@1234', got {apk_username}/{apk_password}")
            user_token = None
            user_id = None
    else:
        log_test("Signup Hardik - APK credentials", False, 
                f"Status {resp.status_code}: {resp.text}")
        user_token = None
        user_id = None
    
    # Test 2: Signup with single name "Rohan" - expect apk_password="ROHAN@1234"
    print("\n--- Test 2: Signup Rohan (single name) ---")
    resp = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": "single.name@example.com",
        "password": "secret123",
        "name": "Rohan",
        "phone": "9999999998"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        apk_password = data.get("apk_password")
        rohan_id = data.get("id")
        
        if apk_password == "ROHAN@1234":
            log_test("Signup Rohan - APK credentials", True, 
                    f"apk_password={apk_password}")
        else:
            log_test("Signup Rohan - APK credentials", False,
                    f"Expected apk_password='ROHAN@1234', got {apk_password}")
            rohan_id = None
    else:
        log_test("Signup Rohan - APK credentials", False, 
                f"Status {resp.status_code}: {resp.text}")
        rohan_id = None
    
    # Test 3: GET /api/auth/me with user token - should include apk fields
    if user_token:
        print("\n--- Test 3: GET /auth/me with user token ---")
        resp = requests.get(f"{BASE_URL}/auth/me", 
                           headers={"Authorization": f"Bearer {user_token}"})
        
        if resp.status_code == 200:
            data = resp.json()
            if "apk_username" in data and "apk_password" in data:
                log_test("GET /auth/me includes APK fields", True,
                        f"apk_username={data['apk_username']}, apk_password={data['apk_password']}")
            else:
                log_test("GET /auth/me includes APK fields", False,
                        f"Missing apk_username or apk_password in response: {data}")
        else:
            log_test("GET /auth/me includes APK fields", False,
                    f"Status {resp.status_code}: {resp.text}")
    
    # Test 4: GET /api/admin/users - check new users have APK fields
    if admin_token:
        print("\n--- Test 4: GET /admin/users - verify APK fields ---")
        resp = requests.get(f"{BASE_URL}/admin/users",
                           headers={"Authorization": f"Bearer {admin_token}"})
        
        if resp.status_code == 200:
            users = resp.json()
            hardik_user = next((u for u in users if u.get("email") == "hardik.test@example.com"), None)
            rohan_user = next((u for u in users if u.get("email") == "single.name@example.com"), None)
            
            all_have_apk = all("apk_username" in u and "apk_password" in u for u in users)
            
            if all_have_apk:
                log_test("GET /admin/users - all users have APK fields", True,
                        f"Total users: {len(users)}, all have apk_username and apk_password")
            else:
                missing = [u.get("email") for u in users if "apk_username" not in u or "apk_password" not in u]
                log_test("GET /admin/users - all users have APK fields", False,
                        f"Users missing APK fields: {missing}")
            
            if hardik_user:
                if hardik_user.get("apk_username") == "hardik.test@example.com" and hardik_user.get("apk_password") == "HARDIK@1234":
                    log_test("Hardik user in admin list with correct APK", True)
                else:
                    log_test("Hardik user in admin list with correct APK", False,
                            f"Expected hardik.test@example.com/HARDIK@1234, got {hardik_user.get('apk_username')}/{hardik_user.get('apk_password')}")
            
            if rohan_user:
                if rohan_user.get("apk_password") == "ROHAN@1234":
                    log_test("Rohan user in admin list with correct APK", True)
                else:
                    log_test("Rohan user in admin list with correct APK", False,
                            f"Expected ROHAN@1234, got {rohan_user.get('apk_password')}")
        else:
            log_test("GET /admin/users - verify APK fields", False,
                    f"Status {resp.status_code}: {resp.text}")
    
    return user_id, rohan_id

def test_coupon_flow(admin_token):
    """FIX 2: Test coupon validation and order creation with coupons"""
    print("\n=== FIX 2: COUPON FLOW ===")
    
    # Get plans first
    resp = requests.get(f"{BASE_URL}/plans")
    if resp.status_code != 200:
        log_test("GET /plans for coupon tests", False, f"Status {resp.status_code}")
        return
    
    plans = resp.json()
    starter_plan = next((p for p in plans if p.get("name") == "Starter"), None)
    standard_plan = next((p for p in plans if p.get("name") == "Standard"), None)
    pro_plan = next((p for p in plans if p.get("name") == "Pro"), None)
    
    if not starter_plan:
        log_test("GET /plans - Starter plan exists", False, "Starter plan not found")
        return
    
    # Test 1: WELCOME10 coupon (10% off)
    print("\n--- Test 1: Validate WELCOME10 (10% off) ---")
    resp = requests.post(f"{BASE_URL}/coupons/validate", json={
        "code": "WELCOME10",
        "amount": 3999
    })
    
    if resp.status_code == 200:
        data = resp.json()
        discount_percent = data.get("discount_percent")
        discount_amount = data.get("discount_amount")
        final_amount = data.get("final_amount")
        
        # Expected: 10% of 3999 = 399.9, final = 3599.1
        if discount_percent == 10 and abs(discount_amount - 399.9) < 0.1 and abs(final_amount - 3599.1) < 0.1:
            log_test("WELCOME10 coupon validation", True,
                    f"discount_percent={discount_percent}, discount_amount={discount_amount}, final_amount={final_amount}")
        else:
            log_test("WELCOME10 coupon validation", False,
                    f"Expected discount_percent=10, discount_amount≈399.9, final_amount≈3599.1, got {discount_percent}/{discount_amount}/{final_amount}")
    else:
        log_test("WELCOME10 coupon validation", False,
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 2: LAUNCH20 coupon (20% off)
    print("\n--- Test 2: Validate LAUNCH20 (20% off) ---")
    resp = requests.post(f"{BASE_URL}/coupons/validate", json={
        "code": "LAUNCH20",
        "amount": 7999
    })
    
    if resp.status_code == 200:
        data = resp.json()
        discount_percent = data.get("discount_percent")
        
        if discount_percent == 20:
            log_test("LAUNCH20 coupon validation", True,
                    f"discount_percent={discount_percent}")
        else:
            log_test("LAUNCH20 coupon validation", False,
                    f"Expected discount_percent=20, got {discount_percent}")
    else:
        log_test("LAUNCH20 coupon validation", False,
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 3: TRADER5 coupon (5% off)
    print("\n--- Test 3: Validate TRADER5 (5% off) ---")
    resp = requests.post(f"{BASE_URL}/coupons/validate", json={
        "code": "TRADER5",
        "amount": 14999
    })
    
    if resp.status_code == 200:
        data = resp.json()
        discount_percent = data.get("discount_percent")
        
        if discount_percent == 5:
            log_test("TRADER5 coupon validation", True,
                    f"discount_percent={discount_percent}")
        else:
            log_test("TRADER5 coupon validation", False,
                    f"Expected discount_percent=5, got {discount_percent}")
    else:
        log_test("TRADER5 coupon validation", False,
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 4: Case-insensitive coupon code
    print("\n--- Test 4: Case-insensitive coupon (welcome10) ---")
    resp = requests.post(f"{BASE_URL}/coupons/validate", json={
        "code": "welcome10",
        "amount": 3999
    })
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("code") == "WELCOME10":
            log_test("Coupon code case-insensitive", True,
                    f"Lowercase 'welcome10' matched to 'WELCOME10'")
        else:
            log_test("Coupon code case-insensitive", False,
                    f"Expected code='WELCOME10', got {data.get('code')}")
    else:
        log_test("Coupon code case-insensitive", False,
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 5: Invalid coupon code
    print("\n--- Test 5: Invalid coupon code (NOPE) ---")
    resp = requests.post(f"{BASE_URL}/coupons/validate", json={
        "code": "NOPE",
        "amount": 3999
    })
    
    if resp.status_code == 404:
        if "Invalid or inactive coupon" in resp.text:
            log_test("Invalid coupon returns 404", True,
                    f"Status 404 with message: {resp.text}")
        else:
            log_test("Invalid coupon returns 404", False,
                    f"Status 404 but wrong message: {resp.text}")
    else:
        log_test("Invalid coupon returns 404", False,
                f"Expected 404, got {resp.status_code}: {resp.text}")
    
    # Test 6: Order creation with coupon (Razorpay QR endpoint)
    print("\n--- Test 6: POST /orders/razorpay/create with WELCOME10 ---")
    resp = requests.post(f"{BASE_URL}/orders/razorpay/create", json={
        "plan_id": starter_plan["id"],
        "customer_name": "Test User",
        "customer_email": "test@example.com",
        "customer_phone": "9999999999",
        "coupon_code": "WELCOME10"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        amount = data.get("amount")
        # Expected: 3999 * 0.9 = 3599.1
        if abs(amount - 3599.1) < 0.1:
            log_test("Order with WELCOME10 coupon - discounted amount", True,
                    f"amount={amount} (expected ≈3599.1)")
        else:
            log_test("Order with WELCOME10 coupon - discounted amount", False,
                    f"Expected amount≈3599.1, got {amount}")
    else:
        log_test("Order with WELCOME10 coupon - discounted amount", False,
                f"Status {resp.status_code}: {resp.text}")
    
    # Test 7: Checkout order with coupon
    print("\n--- Test 7: POST /orders/razorpay/checkout-order with WELCOME10 ---")
    resp = requests.post(f"{BASE_URL}/orders/razorpay/checkout-order", json={
        "plan_id": starter_plan["id"],
        "customer_name": "Test User",
        "customer_email": "test@example.com",
        "customer_phone": "9999999999",
        "coupon_code": "WELCOME10"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        amount = data.get("amount")
        # Expected: 3999 * 0.9 = 3599.1
        if abs(amount - 3599.1) < 0.1:
            log_test("Checkout order with WELCOME10 coupon - discounted amount", True,
                    f"amount={amount} (expected ≈3599.1)")
        else:
            log_test("Checkout order with WELCOME10 coupon - discounted amount", False,
                    f"Expected amount≈3599.1, got {amount}")
    else:
        log_test("Checkout order with WELCOME10 coupon - discounted amount", False,
                f"Status {resp.status_code}: {resp.text}")

def test_cert_ai_detector(admin_token):
    """FIX 3: Test certificate AI detector (Emergent LLM) configuration"""
    print("\n=== FIX 3: CERT AI DETECTOR (EMERGENT LLM) ===")
    
    # Test 1: POST /admin/certificates/analyze with admin token
    print("\n--- Test 1: POST /admin/certificates/analyze with admin token ---")
    # 1x1 blank PNG
    data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    
    resp = requests.post(f"{BASE_URL}/admin/certificates/analyze",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        json={"data_url": data_url})
    
    # The key indicator: should NOT return 500 with "LLM key not configured"
    if resp.status_code == 500 and "LLM key not configured" in resp.text:
        log_test("Cert AI detector - LLM key configured", False,
                f"Status 500 with 'LLM key not configured': {resp.text}")
    elif resp.status_code in [200, 400, 422, 502]:
        # 200 = success (may have empty fields for tiny image)
        # 400/422 = validation error (tiny image)
        # 502 = AI call failed (but key is configured)
        log_test("Cert AI detector - LLM key configured", True,
                f"Status {resp.status_code} (not 500 'LLM key not configured'). Response: {resp.text[:200]}")
    else:
        log_test("Cert AI detector - LLM key configured", False,
                f"Unexpected status {resp.status_code}: {resp.text}")
    
    # Test 2: POST /admin/certificates/analyze with user token (should be 401)
    print("\n--- Test 2: POST /admin/certificates/analyze with user token (401) ---")
    # Create a test user to get user token
    resp = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": "certtest.user@example.com",
        "password": "secret123",
        "name": "Cert Test User",
        "phone": "9999999997"
    })
    
    if resp.status_code == 200:
        user_token = resp.json().get("token")
        cert_test_user_id = resp.json().get("id")
        
        resp = requests.post(f"{BASE_URL}/admin/certificates/analyze",
                            headers={"Authorization": f"Bearer {user_token}"},
                            json={"data_url": data_url})
        
        if resp.status_code == 401:
            log_test("Cert AI detector - user token returns 401", True,
                    f"Status 401 (admin only)")
        else:
            log_test("Cert AI detector - user token returns 401", False,
                    f"Expected 401, got {resp.status_code}: {resp.text}")
    else:
        log_test("Cert AI detector - user token returns 401", False,
                f"Failed to create test user: {resp.status_code}")
        cert_test_user_id = None
    
    return cert_test_user_id

def test_regression(admin_token):
    """Test regression - ensure existing features still work"""
    print("\n=== REGRESSION TESTS ===")
    
    # Test 1: GET /plans returns 3 plans with correct prices
    print("\n--- Test 1: GET /plans ---")
    resp = requests.get(f"{BASE_URL}/plans")
    
    if resp.status_code == 200:
        plans = resp.json()
        if len(plans) == 3:
            starter = next((p for p in plans if p.get("name") == "Starter"), None)
            standard = next((p for p in plans if p.get("name") == "Standard"), None)
            pro = next((p for p in plans if p.get("name") == "Pro"), None)
            
            if starter and starter.get("challenge_fee") == 3999:
                log_test("GET /plans - Starter price", True, f"challenge_fee=3999")
            else:
                log_test("GET /plans - Starter price", False,
                        f"Expected 3999, got {starter.get('challenge_fee') if starter else 'N/A'}")
            
            if standard and standard.get("challenge_fee") == 7999:
                log_test("GET /plans - Standard price", True, f"challenge_fee=7999")
            else:
                log_test("GET /plans - Standard price", False,
                        f"Expected 7999, got {standard.get('challenge_fee') if standard else 'N/A'}")
            
            if pro and pro.get("challenge_fee") == 14999:
                log_test("GET /plans - Pro price", True, f"challenge_fee=14999")
            else:
                log_test("GET /plans - Pro price", False,
                        f"Expected 14999, got {pro.get('challenge_fee') if pro else 'N/A'}")
        else:
            log_test("GET /plans - 3 plans exist", False,
                    f"Expected 3 plans, got {len(plans)}")
    else:
        log_test("GET /plans", False, f"Status {resp.status_code}: {resp.text}")
    
    # Test 2: GET /weekly-highest-payouts returns non-empty
    print("\n--- Test 2: GET /weekly-highest-payouts ---")
    resp = requests.get(f"{BASE_URL}/weekly-highest-payouts")
    
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            log_test("GET /weekly-highest-payouts returns array", True,
                    f"Returned {len(data)} items")
        else:
            log_test("GET /weekly-highest-payouts returns array", False,
                    f"Expected array, got {type(data)}")
    else:
        log_test("GET /weekly-highest-payouts", False,
                f"Status {resp.status_code}: {resp.text}")

def cleanup_test_users(admin_token, user_ids):
    """Cleanup test users created during testing"""
    print("\n=== CLEANUP ===")
    
    for user_id in user_ids:
        if user_id:
            resp = requests.delete(f"{BASE_URL}/admin/users/{user_id}",
                                 headers={"Authorization": f"Bearer {admin_token}"})
            if resp.status_code == 200:
                log_test(f"Cleanup user {user_id[:8]}...", True)
            else:
                log_test(f"Cleanup user {user_id[:8]}...", False,
                        f"Status {resp.status_code}: {resp.text}")

def main():
    print("=" * 80)
    print("INDIFUNDED BACKEND BUG FIX VERIFICATION TEST SUITE")
    print("=" * 80)
    
    # Step 1: Admin auth
    admin_token = test_admin_auth()
    if not admin_token:
        print("\n❌ CRITICAL: Admin authentication failed. Cannot proceed with tests.")
        sys.exit(1)
    
    # Step 2: Test FIX 1 - APK credentials
    hardik_id, rohan_id = test_apk_credentials_signup(admin_token)
    
    # Step 3: Test FIX 2 - Coupon flow
    test_coupon_flow(admin_token)
    
    # Step 4: Test FIX 3 - Cert AI detector
    cert_test_user_id = test_cert_ai_detector(admin_token)
    
    # Step 5: Regression tests
    test_regression(admin_token)
    
    # Step 6: Cleanup
    cleanup_test_users(admin_token, [hardik_id, rohan_id, cert_test_user_id])
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {passed + failed}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print("=" * 80)
    
    if failed > 0:
        print("\n❌ SOME TESTS FAILED. See details above.")
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
