from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import json
import hmac
import hashlib
import requests
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutStatusResponse,
)

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# JWT
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@indifunded.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
RAZORPAY_BASE = "https://api.razorpay.com/v1"

app = FastAPI()
api = APIRouter(prefix="/api")

# ===== Helpers =====
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())

def create_access_token(uid: str, email: str) -> str:
    return jwt.encode(
        {"sub": uid, "email": email, "type": "access",
         "exp": datetime.now(timezone.utc) + timedelta(hours=12)},
        JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookie(resp: Response, token: str):
    resp.set_cookie("access_token", token, httponly=True, secure=True,
                    samesite="none", max_age=43200, path="/")

def clear_auth_cookie(resp: Response):
    resp.delete_cookie("access_token", path="/")

async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user or user.get("role") != "admin":
            raise HTTPException(401, "Not authorized")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_current_user(request: Request) -> dict:
    """Any authenticated user (role=user or admin)."""
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "Not authorized")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ===== Models =====
class LoginReq(BaseModel):
    email: EmailStr
    password: str

class Plan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    account_size: int  # in INR
    challenge_fee: float
    original_price: Optional[float] = None  # strike-through price
    profit_target_points: int = 750
    profit_share: int = 70
    max_loss_limit: int = 20
    min_trading_days: int = 10
    total_trading_days: int = 15
    trades_per_day: int = 3
    description: str = ""
    features: List[str] = []
    popular: bool = False
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlanCreate(BaseModel):
    name: str
    account_size: int
    challenge_fee: float
    original_price: Optional[float] = None
    profit_target_points: int = 750
    profit_share: int = 70
    max_loss_limit: int = 20
    min_trading_days: int = 10
    total_trading_days: int = 15
    trades_per_day: int = 3
    description: str = ""
    features: List[str] = []
    popular: bool = False
    order: int = 0

class Blog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    title: str
    excerpt: str
    content: str
    cover_image: str = ""
    author: str = "IndiFunded Team"
    published: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BlogCreate(BaseModel):
    slug: str
    title: str
    excerpt: str
    content: str
    cover_image: str = ""
    author: str = "IndiFunded Team"
    published: bool = True

class Lead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str = ""
    email: EmailStr
    phone: str = ""
    city: str = ""
    challenge_type: str = ""
    platform: str = ""
    message: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LeadCreate(BaseModel):
    first_name: str
    last_name: str = ""
    email: EmailStr
    phone: str = ""
    city: str = ""
    challenge_type: str = ""
    platform: str = ""
    message: str = ""

class CheckoutReq(BaseModel):
    plan_id: str
    origin_url: str
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = None

class UPIOrderReq(BaseModel):
    plan_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    utr: str  # UPI transaction reference number
    notes: str = ""
    coupon_code: Optional[str] = None
    referral_code: Optional[str] = None

class RazorpayOrderReq(BaseModel):
    plan_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    notes: str = ""
    coupon_code: Optional[str] = None
    referral_code: Optional[str] = None

class Certificate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_url: str
    trader_name: str = ""
    amount: float = 0
    plan: str = ""
    account_size: int = 0
    payout_date: str = ""
    order: int = 0
    visible: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CertificateCreate(BaseModel):
    image_url: str
    trader_name: str = ""
    amount: float = 0
    plan: str = ""
    account_size: int = 0
    payout_date: str = ""
    order: int = 0
    visible: bool = True

class WeeklyPayout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_url: str
    trader_name: str = ""
    amount: float = 0
    plan: str = ""
    account_size: int = 0
    payout_date: str = ""
    order: int = 0
    visible: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WeeklyPayoutCreate(BaseModel):
    image_url: str
    trader_name: str = ""
    amount: float = 0
    plan: str = ""
    account_size: int = 0
    payout_date: str = ""
    order: int = 0
    visible: bool = True

class PayoutRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    account_id: str = ""      # funded account id / login
    plan: str = ""
    amount: float             # requested payout amount in INR
    method: str = "upi"       # "upi" or "bank"
    upi_id: str = ""
    bank_name: str = ""
    account_number: str = ""
    ifsc: str = ""
    account_holder: str = ""
    notes: str = ""
    status: str = "pending"   # pending | approved | paid | rejected
    admin_note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PayoutRequestCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    account_id: str = ""
    plan: str = ""
    amount: float
    method: str = "upi"
    upi_id: str = ""
    bank_name: str = ""
    account_number: str = ""
    ifsc: str = ""
    account_holder: str = ""
    notes: str = ""

class PayoutRequestUpdate(BaseModel):
    status: Optional[str] = None
    admin_note: Optional[str] = None

# ===== Auth =====
@api.post("/auth/signup")
async def signup(body: dict, resp: Response):
    """Create a new user account. Any signup gets role='user'."""
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    name = str(body.get("name", "")).strip()
    phone = str(body.get("phone", "")).strip()
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email is required")
    if len(password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not name:
        raise HTTPException(400, "Name is required")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(409, "An account with this email already exists")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(password),
        "name": name,
        "phone": phone,
        "role": "user",
        "kyc": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(uid, email)
    set_auth_cookie(resp, token)
    return {"id": uid, "email": email, "name": name, "phone": phone,
            "role": "user", "token": token,
            "created_at": doc["created_at"]}

@api.post("/auth/login")
async def login(body: LoginReq, resp: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user["id"], user["email"])
    set_auth_cookie(resp, token)
    return {"id": user["id"], "email": user["email"], "name": user.get("name", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", "user"), "token": token,
            "created_at": user.get("created_at", "")}

@api.post("/auth/logout")
async def logout(resp: Response):
    clear_auth_cookie(resp)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ===== User Dashboard (self-service) =====
@api.get("/me/dashboard")
async def my_dashboard(user: dict = Depends(get_current_user)):
    email = user["email"].lower()
    orders = await db.orders.find({"customer_email": email}, {"_id": 0}).sort("created_at", -1).to_list(500)
    payouts = await db.payout_requests.find({"email": email}, {"_id": 0}).sort("created_at", -1).to_list(500)
    completed_orders = [o for o in orders if o.get("status") == "completed"]
    simulated_capital = sum(int(o.get("plan_account_size", 0)) for o in completed_orders)
    # Fallback: derive account_size from plan_name if missing
    if not simulated_capital and completed_orders:
        plan_map = {p["name"]: p for p in await db.plans.find({}, {"_id": 0}).to_list(50)}
        for o in completed_orders:
            pn = o.get("plan_name")
            if pn and pn in plan_map:
                simulated_capital += int(plan_map[pn].get("account_size", 0))
    paid_payouts = [p for p in payouts if p.get("status") == "paid"]
    return {
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", ""),
                 "phone": user.get("phone", ""), "created_at": user.get("created_at", "")},
        "simulated_capital": simulated_capital,
        "funded_accounts_active": len(completed_orders),
        "funded_accounts_total": len(orders),
        "net_pnl": 0,  # placeholder — trading feed not integrated yet
        "total_paid_out": sum(float(p.get("amount", 0)) for p in paid_payouts),
        "payouts_count": len(paid_payouts),
        "accounts": completed_orders[:6],
    }

@api.get("/me/accounts")
async def my_accounts(user: dict = Depends(get_current_user)):
    email = user["email"].lower()
    orders = await db.orders.find({"customer_email": email}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api.get("/me/payouts")
async def my_payouts(user: dict = Depends(get_current_user)):
    email = user["email"].lower()
    payouts = await db.payout_requests.find({"email": email}, {"_id": 0}).sort("created_at", -1).to_list(500)
    paid = [p for p in payouts if p.get("status") == "paid"]
    pending = [p for p in payouts if p.get("status") in ("pending", "approved")]
    return {
        "eligible": 0,  # placeholder — depends on live P&L feed
        "pending_amount": sum(float(p.get("amount", 0)) for p in pending),
        "total_paid": sum(float(p.get("amount", 0)) for p in paid),
        "history": payouts,
    }

@api.get("/me/certificates")
async def my_certificates(user: dict = Depends(get_current_user)):
    email = user["email"].lower()
    certs = await db.certificates.find({"trader_email": email, "visible": True}, {"_id": 0}).to_list(200)
    return certs

@api.get("/me/billing")
async def my_billing(user: dict = Depends(get_current_user)):
    email = user["email"].lower()
    orders = await db.orders.find({"customer_email": email}, {"_id": 0}).sort("created_at", -1).to_list(500)
    league = await db.league_registrations.find({"email": email}, {"_id": 0}).sort("created_at", -1).to_list(200)
    items = []
    for o in orders:
        items.append({
            "id": o.get("id"),
            "kind": "challenge",
            "product": o.get("plan_name", "Challenge"),
            "amount": o.get("amount", 0),
            "status": o.get("status", "pending_payment"),
            "created_at": o.get("created_at", ""),
        })
    for r in league:
        items.append({
            "id": r.get("id"),
            "kind": "league",
            "product": "Trader League" + (" (existing)" if r.get("is_existing_trader") else " (new)"),
            "amount": r.get("amount", 0),
            "status": r.get("status", "pending_payment"),
            "created_at": r.get("created_at", ""),
        })
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items

@api.put("/me/profile")
async def update_my_profile(body: dict, user: dict = Depends(get_current_user)):
    updates = {}
    if "name" in body and isinstance(body["name"], str) and body["name"].strip():
        updates["name"] = body["name"].strip()
    if "phone" in body and isinstance(body["phone"], str):
        updates["phone"] = body["phone"].strip()
    if not updates:
        raise HTTPException(400, "Nothing to update")
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return u

@api.put("/me/kyc")
async def update_my_kyc(body: dict, user: dict = Depends(get_current_user)):
    kyc = {
        "full_name": str(body.get("full_name", "")).strip(),
        "pan": str(body.get("pan", "")).strip().upper(),
        "upi_id": str(body.get("upi_id", "")).strip(),
        "bank_account_number": str(body.get("bank_account_number", "")).strip(),
        "ifsc": str(body.get("ifsc", "")).strip().upper(),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "status": "submitted",
    }
    if not kyc["full_name"] or not kyc["pan"]:
        raise HTTPException(400, "Full name and PAN are required")
    await db.users.update_one({"id": user["id"]}, {"$set": {"kyc": kyc}})
    return kyc

# ===== Admin — user list =====
@api.get("/admin/users")
async def admin_list_users(user: dict = Depends(get_current_admin)):
    users = await db.users.find({"role": {"$ne": "admin"}}, {"_id": 0, "password_hash": 0}) \
        .sort("created_at", -1).to_list(1000)
    return users

@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(get_current_admin)):
    await db.users.delete_one({"id": user_id, "role": {"$ne": "admin"}})
    return {"ok": True}


# ===== Plans =====
@api.get("/plans", response_model=List[Plan])
async def list_plans():
    return await db.plans.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@api.get("/plans/{plan_id}", response_model=Plan)
async def get_plan(plan_id: str):
    p = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not p: raise HTTPException(404, "Plan not found")
    return p

@api.post("/plans", response_model=Plan)
async def create_plan(body: PlanCreate, user: dict = Depends(get_current_admin)):
    plan = Plan(**body.model_dump())
    await db.plans.insert_one(plan.model_dump())
    return plan

@api.put("/plans/{plan_id}", response_model=Plan)
async def update_plan(plan_id: str, body: PlanCreate, user: dict = Depends(get_current_admin)):
    await db.plans.update_one({"id": plan_id}, {"$set": body.model_dump()})
    p = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not p: raise HTTPException(404, "Plan not found")
    return p

@api.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, user: dict = Depends(get_current_admin)):
    await db.plans.delete_one({"id": plan_id})
    return {"ok": True}

# ===== Blogs =====
@api.get("/blogs", response_model=List[Blog])
async def list_blogs():
    return await db.blogs.find({"published": True}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.get("/blogs/all", response_model=List[Blog])
async def list_all_blogs(user: dict = Depends(get_current_admin)):
    return await db.blogs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.get("/blogs/{slug}", response_model=Blog)
async def get_blog(slug: str):
    b = await db.blogs.find_one({"slug": slug}, {"_id": 0})
    if not b: raise HTTPException(404, "Blog not found")
    return b

@api.post("/blogs", response_model=Blog)
async def create_blog(body: BlogCreate, user: dict = Depends(get_current_admin)):
    blog = Blog(**body.model_dump())
    await db.blogs.insert_one(blog.model_dump())
    return blog

@api.put("/blogs/{blog_id}", response_model=Blog)
async def update_blog(blog_id: str, body: BlogCreate, user: dict = Depends(get_current_admin)):
    await db.blogs.update_one({"id": blog_id}, {"$set": body.model_dump()})
    b = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    if not b: raise HTTPException(404, "Blog not found")
    return b

@api.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str, user: dict = Depends(get_current_admin)):
    await db.blogs.delete_one({"id": blog_id})
    return {"ok": True}

# ===== Leads =====
@api.post("/leads", response_model=Lead)
async def create_lead(body: LeadCreate):
    lead = Lead(**body.model_dump())
    await db.leads.insert_one(lead.model_dump())
    return lead

@api.get("/leads", response_model=List[Lead])
async def list_leads(user: dict = Depends(get_current_admin)):
    return await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_admin)):
    await db.leads.delete_one({"id": lead_id})
    return {"ok": True}

# ===== Stripe Checkout =====
@api.post("/checkout/session")
async def create_checkout(body: CheckoutReq, request: Request):
    plan = await db.plans.find_one({"id": body.plan_id}, {"_id": 0})
    if not plan: raise HTTPException(404, "Plan not found")
    # Amount is taken from backend — never from frontend
    amount_inr = float(plan["challenge_fee"])
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/challenges"
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    metadata = {
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "customer_email": body.customer_email or "",
        "customer_name": body.customer_name or "",
    }
    req = CheckoutSessionRequest(
        amount=amount_inr, currency="inr",
        success_url=success_url, cancel_url=cancel_url, metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)
    # Create pending transaction
    tx = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "amount": amount_inr,
        "currency": "inr",
        "status": "initiated",
        "payment_status": "pending",
        "customer_email": body.customer_email or "",
        "customer_name": body.customer_name or "",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(tx)
    return {"url": session.url, "session_id": session.session_id}

@api.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if tx and tx.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": status.status, "payment_status": status.payment_status}},
        )
        if status.payment_status == "paid":
            order = {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "plan_id": tx["plan_id"],
                "plan_name": tx["plan_name"],
                "amount": tx["amount"],
                "currency": tx["currency"],
                "customer_email": tx.get("customer_email", ""),
                "customer_name": tx.get("customer_name", ""),
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.orders.insert_one(order)
    return {"status": status.status, "payment_status": status.payment_status,
            "amount_total": status.amount_total, "currency": status.currency}

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    try:
        evt = await stripe.handle_webhook(body, sig)
        if evt.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": evt.session_id},
                {"$set": {"payment_status": "paid", "status": "complete"}},
            )
    except Exception as e:
        logging.exception(f"webhook err: {e}")
    return {"ok": True}

# ===== Certificates (Last Week Payouts) =====
@api.get("/certificates", response_model=List[Certificate])
async def list_certificates():
    return await db.certificates.find({"visible": True}, {"_id": 0}).sort("order", 1).to_list(100)

@api.get("/certificates/all", response_model=List[Certificate])
async def list_all_certificates(user: dict = Depends(get_current_admin)):
    return await db.certificates.find({}, {"_id": 0}).sort("order", 1).to_list(200)

@api.post("/certificates", response_model=Certificate)
async def create_certificate(body: CertificateCreate, user: dict = Depends(get_current_admin)):
    cert = Certificate(**body.model_dump())
    await db.certificates.insert_one(cert.model_dump())
    return cert

@api.put("/certificates/{cert_id}", response_model=Certificate)
async def update_certificate(cert_id: str, body: CertificateCreate, user: dict = Depends(get_current_admin)):
    await db.certificates.update_one({"id": cert_id}, {"$set": body.model_dump()})
    c = await db.certificates.find_one({"id": cert_id}, {"_id": 0})
    if not c: raise HTTPException(404, "Certificate not found")
    return c

@api.delete("/certificates/{cert_id}")
async def delete_certificate(cert_id: str, user: dict = Depends(get_current_admin)):
    await db.certificates.delete_one({"id": cert_id})
    return {"ok": True}

# ===== Payout Requests =====
@api.post("/payout-requests", response_model=PayoutRequest)
async def create_payout_request(body: PayoutRequestCreate):
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be greater than 0")
    if body.method not in ("upi", "bank"):
        raise HTTPException(400, "Invalid payout method")
    if body.method == "upi" and not body.upi_id.strip():
        raise HTTPException(400, "UPI ID is required for UPI payouts")
    if body.method == "bank" and not (body.account_number.strip() and body.ifsc.strip()):
        raise HTTPException(400, "Bank account number and IFSC are required for bank payouts")
    req = PayoutRequest(**body.model_dump())
    await db.payout_requests.insert_one(req.model_dump())
    return req

@api.get("/payout-requests", response_model=List[PayoutRequest])
async def list_payout_requests(user: dict = Depends(get_current_admin)):
    return await db.payout_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.patch("/payout-requests/{req_id}", response_model=PayoutRequest)
async def update_payout_request(req_id: str, body: PayoutRequestUpdate, user: dict = Depends(get_current_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "status" in update and update["status"] not in ("pending", "approved", "paid", "rejected"):
        raise HTTPException(400, "Invalid status")
    if update:
        await db.payout_requests.update_one({"id": req_id}, {"$set": update})
    r = await db.payout_requests.find_one({"id": req_id}, {"_id": 0})
    if not r: raise HTTPException(404, "Payout request not found")
    return r

@api.delete("/payout-requests/{req_id}")
async def delete_payout_request(req_id: str, user: dict = Depends(get_current_admin)):
    await db.payout_requests.delete_one({"id": req_id})
    return {"ok": True}

# ===== File Upload (base64 pass-through) =====
class UploadReq(BaseModel):
    data_url: str
    filename: str = ""

@api.post("/uploads/image")
async def upload_image(body: UploadReq, user: dict = Depends(get_current_admin)):
    if not body.data_url.startswith("data:image/"):
        raise HTTPException(400, "Not a valid image data URL")
    if len(body.data_url) > 8 * 1024 * 1024:  # ~6MB decoded
        raise HTTPException(413, "Image too large (max ~6MB)")
    return {"url": body.data_url}

# ===== Site Settings (CMS-lite) =====
DEFAULT_SETTINGS_SEED = {
    "brand": {"name": "IndiFunded", "logo_url": "/logo.jpg", "tagline": "India's 1st prop trading firm."},
    "contact": {
        "email": "support@indifunded.com",
        "phone": "+91 78019 20564",
        "whatsapp": "+91 78019 20564",
        "upi_id": "indifunded@upi",
        "company": "BRVS Education Pvt Ltd",
        "address": "Unique Square, Causeway, Katargam, Surat, Gujarat, India",
        "office": "Unique Square, Causeway, Katargam, Surat",
    },
    "social": {
        "instagram": "https://www.instagram.com/indifunded?igsh=MXR6bWJhZHV5ZWgwcA==",
        "youtube": "https://youtube.com/@indifunded?si=D3AWNCyccOLEp85E",
        "twitter": "https://x.com/indifunded",
        "facebook": "https://www.facebook.com/share/17bwvWUub7/",
        "whatsapp_link": "https://wa.me/919081489458?text=",
    },
    "announcement": {"enabled": False, "text": "🎉 30% OFF on all challenge plans — limited time", "link": "/challenges", "cta": "Grab Now"},
    "widgets": {
        "sticky_cta": {"enabled": True, "label": "Start Challenge", "link": "/challenges"},
        "whatsapp": {"enabled": True, "link": ""},
        "scroll_progress": {"enabled": True},
        "bg_3d": {"enabled": True},
    },
    "hero": {
        "chip": "India's 1st Prop Trading Firm",
        "title_before": "Your Skills,",
        "title_highlight": "Our Funds",
        "title_after": "",
        "subtitle": "Take on a simple challenge, prove your skill, and receive a funded trading account up to ₹5,00,000. Trade independently in Bank Nifty, Nifty, stocks, F&O, or any segment — take home 70% of the profits while we bear all the losses.",
        "cta_primary": "Start Challenge",
        "cta_secondary": "Learn More",
        "stats": [
            {"k": "70%", "v": "Profit Split"},
            {"k": "₹5L", "v": "Max Account"},
            {"k": "24h", "v": "Payouts"},
            {"k": "∞", "v": "No Time Limit"},
        ],
    },
    "ratings": {
        "enabled": True,
        "heading": "Rated by traders",
        "subtitle": "Verified reviews across the top prop-firm review platforms.",
        "items": [
            {"platform": "Trustpilot", "rating": 4.3, "out_of": 5, "reviews": 1287, "color": "#00b67a", "url": "https://www.trustpilot.com"},
            {"platform": "PropFirmMatch", "rating": 4.1, "out_of": 5, "reviews": 642, "color": "#f59e0b", "url": "https://propfirmmatch.com"},
        ],
    },
    "steps": {
        "title_prefix": "3 steps to become an",
        "title_suffix": "IndiFunded trader",
        "items": [
            {"n": "01", "t": "Challenge", "d": "Prove your trading skills and discipline on a realistic virtual account. Hit profit targets and respect the risk rules."},
            {"n": "02", "t": "Verification", "d": "Pass the challenge, complete quick KYC, and receive your real funded trading account within 24 hours."},
            {"n": "03", "t": "Get Paid", "d": "Trade independently and take home 70% of the profits — payouts processed within 24 hours to your bank."},
        ],
    },
    "testimonials": [
        {"q": "Passing the challenge isn't easy, but it's worth it. You learn so much about yourself as a trader. IndiFunded truly pushes you to the next level.", "a": "Rahul Chouhan", "r": "Standard Challenge Trader"},
        {"q": "Payout in 18 hours. I've tried 3 other prop firms — none come close. This is the one for Indian traders.", "a": "Priya Sharma", "r": "Standard Challenge Trader"},
        {"q": "The risk cap is a blessing. I focus on my strategy, not on worrying about blowing up my savings.", "a": "Arjun Menon", "r": "Standard Challenge Trader"},
    ],
    "faq_groups": [
        {"title": "Trust & Transparency", "items": [
            {"q": "Is IndiFunded registered with SEBI?", "a": "IndiFunded (BRVS Education Pvt Ltd) is a proprietary trading firm, meaning we trade our own capital and fund traders under a profit-sharing model. Since we do not act as intermediaries, provide investment advice, or manage portfolios, SEBI registration is not required as per the SEBI Act, 1992."},
            {"q": "How do I know IndiFunded is a genuine platform and not a scam?", "a": "IndiFunded is a legally registered company. You can verify our registration and credentials. Additionally, our policies and procedures are designed to ensure fairness and transparency."},
            {"q": "Can I verify IndiFunded's authenticity before applying?", "a": "Yes, you can review our website and reach out to our team directly for any queries. We are happy to provide clarity on our processes and practices."},
            {"q": "What guarantees do I have that IndiFunded will honor its commitments?", "a": "IndiFunded is committed to building a trustworthy relationship with traders. As India's first platform, we are focused on ensuring our users have a seamless experience to establish a strong reputation."},
            {"q": "How can I contact IndiFunded if I have concerns or doubts?", "a": "You can contact us through email, live chat, or our official phone number. Our team is always available to address your questions and concerns."},
            {"q": "How secure is my personal information with IndiFunded?", "a": "Your personal data is protected by strict privacy policies and secure systems. We do not share your information with third parties without your consent."},
            {"q": "What happens if I pass the challenge, but IndiFunded doesn't fund my account?", "a": "This situation will not occur as IndiFunded operates with integrity. If you fulfill the challenge and pass KYC, you will receive your funded account without fail."},
            {"q": "Do you have a customer support system?", "a": "Yes, we provide dedicated customer support to address any issues or concerns. You can contact us through email, chat, or phone."},
            {"q": "How do I know the payout process is real?", "a": "Payouts are processed through verified banking channels. Details of the process are clearly outlined in our terms and conditions."},
            {"q": "Can I visit your office?", "a": "We operate primarily online to reduce operational costs, but we can arrange an office visit or video call for verification purposes."},
            {"q": "How do I know I'll receive my payout if I earn profits?", "a": "All payouts are processed transparently through secure banking channels. We ensure timely payment to all eligible traders as per our payout schedule."},
            {"q": "Is there a fee or hidden charge deducted from payouts?", "a": "No, we do not deduct any hidden fees. Only the agreed profit-sharing percentage is applied, as mentioned in our terms."},
            {"q": "How long does it take to receive payouts after trading?", "a": "Payouts are processed within 24 hours after the profit verification and settlement period."},
            {"q": "Do I need to make any additional payments after passing the challenge?", "a": "No, once you pass the challenge and complete the KYC process, you don't need to make any further payments to access your funded account."},
        ]},
        {"title": "Challenge Details", "items": [
            {"q": "What is the eligibility to join IndiFunded?", "a": "Anyone with a basic understanding of the stock market, BankNifty F&O trading and a passion to prove their skills can join IndiFunded."},
            {"q": "On which application or trading account do I need to pass this challenge?", "a": "The challenge will take place on our specially designed virtual trading platform, which replicates real-market conditions to accurately test your trading skills."},
            {"q": "How can I apply for the challenge?", "a": "Applying is simple! Visit our website, select your preferred challenge type (Standard or Instant), and complete the registration process. Once registered, you'll receive access to your virtual trading account."},
            {"q": "When will I receive my funded trading account?", "a": "Once you successfully pass our challenge, you will proceed with the identity verification process. After completing KYC, you will receive your funded account ID and password within 2 working days."},
            {"q": "What documents do I need to complete KYC after passing the challenge?", "a": "To complete KYC, you'll need: a valid government-issued photo ID (e.g., Aadhaar card, PAN card, or passport), proof of address (e.g., utility bill, bank statement, or rent agreement), and your bank account details for profit transfers."},
            {"q": "Are there any restrictions on the trading instruments during the challenge?", "a": "Yes, you can only trade Bank Nifty options intraday during the challenge."},
            {"q": "Can I attempt the challenge multiple times if I fail?", "a": "Yes, you can reapply for the challenge as many times as you wish. Each attempt will require a new registration and challenge fee."},
            {"q": "What happens if I exceed the stop loss limit during the challenge?", "a": "If you exceed the maximum loss limit of 40 points per day, the challenge will be considered failed. You will need to reapply for a new challenge."},
            {"q": "Is there a time limit to complete the challenge?", "a": "Yes, the time limit depends on the type of challenge. Standard Challenge: total trading days are 15, with a minimum of 10 trading days. Instant Challenge: you begin trading on your funded account right away, so there is no evaluation time limit."},
            {"q": "Will I get any support or guidance during the challenge?", "a": "Yes, our support team and trading community are available to assist you with queries and guidance to help you navigate the challenge effectively."},
            {"q": "What happens if I fail the challenge?", "a": "If you fail the challenge, you can reapply for a new one after meeting the eligibility requirements."},
            {"q": "How long does it take to verify KYC after passing the challenge?", "a": "KYC verification typically takes up to 2 working days after you pass the challenge."},
            {"q": "Can I pause the challenge once it has started?", "a": "No, the challenge must be completed within the specified trading days without pauses or extensions."},
            {"q": "How can I trust your rules and trading process are fair?", "a": "Our challenge rules are designed to mimic real-market conditions, promoting fairness and transparency. We focus on building trust by providing clear guidelines."},
        ]},
        {"title": "Funded Account", "items": [
            {"q": "What can I trade with a funded account?", "a": "Once you have the funded account, you can trade in any segment you choose without any restrictions, such as BankNifty options, with no fixed rules for stop loss (SL), target, or timeline. You can use your own strategies to trade."},
            {"q": "How are profits shared in a funded account?", "a": "You will receive 70% of your profits every 24 hours, and IndiFunded will keep 30%. The profits are processed and transferred regularly."},
            {"q": "Are there any restrictions on the funded account?", "a": "The only restriction is that you cannot lose more than 30% of your funded capital. If your losses exceed this limit, your positions will be squared off, and the account will be disqualified."},
            {"q": "Will my funded account be immediately available for trading?", "a": "Yes, once you receive the account details, your funded account will be fully operational, and you can start trading immediately. There are no waiting periods after receiving the login credentials."},
            {"q": "How is the funded account balance allocated?", "a": "For the Standard challenge, you'll receive ₹1,00,000 in your funded account after passing the challenge. For the Instant challenge, you'll receive ₹50,000 in your funded account. The funds will be available for trading as soon as you log in."},
            {"q": "Is there a time limit to start trading with my funded account after receiving it?", "a": "There is no specific time limit to start trading after receiving your funded account. You can begin trading at your convenience once you have your login details."},
            {"q": "What if I lose the login credentials for my funded account?", "a": "If you lose your login credentials, you can contact our support team for assistance. We will help you recover your account credentials securely."},
            {"q": "Will the funded account be refilled if I make a loss?", "a": "The company does not refill the account balance in case of losses. If you exceed the loss limit, your account will be disqualified, and positions will be squared off. You will not be liable for any loss."},
            {"q": "Can I trade other instruments apart from BankNifty options in the funded account?", "a": "Yes, after receiving your funded account, you are free to trade in any instrument or market segment that suits your strategy. There are no restrictions on which assets you can trade."},
            {"q": "What if I don't want to continue trading with my funded account?", "a": "If you decide to stop trading with your funded account, you can withdraw your profits and contact us for account deactivation. We do not charge any additional fees for discontinuing your trading activity."},
            {"q": "Can I trade on multiple devices with my funded account?", "a": "Yes, you can access and trade your funded account from any device, as long as you have the login credentials. However, ensure that you maintain the security of your account by using strong passwords and keeping them confidential."},
            {"q": "Is there a minimum profit requirement for the funded account?", "a": "No, there is no minimum profit requirement once you receive your funded account. You can trade according to your strategy and risk tolerance, but consistent profitability is key to maximizing your profit share."},
            {"q": "Will my funded account be audited or monitored?", "a": "Yes, your trading activity may be monitored to ensure compliance with the rules, including the 30% loss limit. While you have full flexibility in trading, the company reserves the right to audit accounts if necessary."},
            {"q": "What happens if I don't trade consistently with my funded account?", "a": "There are no specific trading frequency requirements once you receive your funded account. You can trade as much or as little as you like, but remember that profits are based on your trading success. Consistency generally leads to better returns."},
            {"q": "Can I transfer my funded account to someone else?", "a": "No, the funded account is non-transferable. The account is assigned to the individual who has passed the challenge and completed the KYC process. Any attempt to transfer the account will lead to disqualification."},
        ]},
    ],
    "rules": {
        "title": "Simple. Realistic. Trader-first rules.",
        "subtitle": "We designed our challenge to separate disciplined traders from gamblers — not to trick you with impossible targets.",
        "items": [
            {"t": "Account Size", "d": "₹1,00,000 to ₹5,00,000 funded account. Scaled +₹1L every 2 months of profitable performance.", "i": "Scale"},
            {"t": "Profit Target", "d": "750 points over 15 trading days on Nifty50/BankNifty options intraday (Standard plan).", "i": "TrendingDown"},
            {"t": "Maximum Loss", "d": "Overall max drawdown capped at 20% of account size. Exceeding this ends the challenge.", "i": "ShieldCheck"},
            {"t": "Minimum Days", "d": "At least 10 trading days of actual activity to qualify. Total window: 15 days.", "i": "BookOpen"},
            {"t": "Trade Limit", "d": "Max 3 trades per day. Encourages selective, high-quality entries.", "i": "Users"},
            {"t": "Profit Accuracy", "d": "Minimum 70% accuracy on profitable days over the challenge window.", "i": "CheckCircle2"},
        ],
    },
    "about": {
        "title": "Built for Indian traders. Run by traders.",
        "intro": "IndiFunded is India's first prop trading firm, operated by BRVS Education Pvt Ltd. We trade our own capital and fund skilled traders under a profit-sharing model — no third-party investors, no retail advisory, no hidden strings.",
        "cards": [
            {"t": "Our Mission", "d": "Empower Indian traders with capital, not just courses. Give disciplined retail talent a path to professional trading."},
            {"t": "Our Promise", "d": "Transparent rules. 70% profit share. 24-hour payouts through verified banking channels. No hidden fees."},
            {"t": "Who We Are", "d": "A team of traders, engineers, and operators who've experienced the frustration of being capital-constrained in markets."},
        ],
        "footer_title": "Why we exist",
        "footer_text": "Too many traders have faced financial stress by risking their own savings. We're here to change that. Prove your skill — we'll provide the capital.",
    },
    "trust_strip": {
        "enabled": True,
        "title": "Trusted by 5,000+ Indian Traders",
        "subtitle": "Works with your preferred broker",
        "partners": ["Zerodha", "Angel One", "Upstox", "Dhan", "Groww", "NSE", "BSE"],
    },
    "live_counter": {
        "enabled": True,
        "heading": "Trusted by India's growing trader community",
        "items": [
            {"label": "Traders Funded", "value": 5247, "suffix": "+", "prefix": ""},
            {"label": "Total Payouts", "value": 12480000, "suffix": "", "prefix": "₹"},
            {"label": "Profit Split", "value": 70, "suffix": "%", "prefix": ""},
            {"label": "Payout Speed", "value": 24, "suffix": "h", "prefix": ""},
        ],
    },
    "how_it_works": {
        "enabled": True,
        "title": "Four simple steps to funded trading",
        "subtitle": "No hidden hoops. Just discipline, strategy, and payouts.",
        "items": [
            {"t": "Purchase Challenge", "d": "Pick a plan and pay via UPI. Get instant access to your evaluation account.", "i": "ShoppingCart"},
            {"t": "Pass Evaluation", "d": "Hit the profit target within the trading window while respecting the max loss cap.", "i": "Target"},
            {"t": "Get Funded", "d": "KYC + verification in 24h. Receive your real funded trading account.", "i": "Wallet"},
            {"t": "Withdraw Profits", "d": "Keep 70% of profits. Payouts processed within 24 hours to your bank.", "i": "TrendingUp"},
        ],
    },
    "address": {
        "line1": "Unique Square, Causeway, Katargam",
        "line2": "Surat, Gujarat, India",
    },
    "benefits": {
        "title": "Why IndiFunded",
        "subtitle": "Everything you get when you become a funded trader with us.",
        "items": [
            {"t": "No Time Limits", "d": "Pass the challenge at your own pace. Focus on discipline, not the clock.", "i": "Clock"},
            {"t": "Guaranteed Payouts", "d": "Profit split processed within 24 hours through verified banking channels.", "i": "CircleDollarSign"},
            {"t": "Zero Risk of Loss", "d": "20% max loss cap. We absorb the rest. Your personal capital is never at risk.", "i": "ShieldCheck"},
            {"t": "Best Trading Platforms", "d": "Trade on Zerodha, Angel One, Dhan or Upstox — your familiar setup.", "i": "Zap"},
            {"t": "Trader Community", "d": "Join a network of like-minded Indian traders with daily insights and mentorship.", "i": "Star"},
            {"t": "Scale Your Capital", "d": "Starting at ₹1L, your funded account grows by ₹1L every 2 months up to ₹5L.", "i": "TrendingUp"},
        ],
    },
    "payouts_page": {
        "heading": "Real payouts. Real traders. Real fast.",
        "subtitle": "Every payout below is a verified transfer to a funded IndiFunded trader within 24 hours of profit verification.",
        "show_request_form": True,
        "items": [
            {"name": "Vivek Raut", "plan": "Starter", "amount": 6700, "city": "Pune", "days_ago": 1},
            {"name": "Priya Sharma", "plan": "Pro", "amount": 34200, "city": "Mumbai", "days_ago": 1},
            {"name": "Arjun Menon", "plan": "Standard", "amount": 18450, "city": "Bengaluru", "days_ago": 2},
            {"name": "Rahul Chouhan", "plan": "Standard", "amount": 22800, "city": "Indore", "days_ago": 2},
            {"name": "Karthik R.", "plan": "Pro", "amount": 41250, "city": "Chennai", "days_ago": 3},
            {"name": "Neha Gupta", "plan": "Starter", "amount": 8900, "city": "Delhi", "days_ago": 3},
            {"name": "Manish P.", "plan": "Standard", "amount": 15600, "city": "Ahmedabad", "days_ago": 4},
            {"name": "Sneha K.", "plan": "Pro", "amount": 29750, "city": "Hyderabad", "days_ago": 4},
            {"name": "Rohan Desai", "plan": "Standard", "amount": 12300, "city": "Nagpur", "days_ago": 5},
            {"name": "Ananya M.", "plan": "Pro", "amount": 47800, "city": "Kolkata", "days_ago": 5},
            {"name": "Faizan Sheikh", "plan": "Standard", "amount": 19650, "city": "Lucknow", "days_ago": 6},
            {"name": "Deepika V.", "plan": "Pro", "amount": 52400, "city": "Jaipur", "days_ago": 6},
        ],
    },
}

def _merge_settings(base: dict, override: dict) -> dict:
    """Deep-merge admin overrides on top of DEFAULT_SETTINGS_SEED so partial saves
    never drop default fields. Lists/scalars in override replace base wholesale."""
    if not isinstance(override, dict):
        return override
    out = {**base}
    for k, v in override.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            out[k] = _merge_settings(base[k], v)
        else:
            out[k] = v
    return out

@api.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"_id": "site"}, {"_id": 0})
    if not doc:
        return DEFAULT_SETTINGS_SEED
    return _merge_settings(DEFAULT_SETTINGS_SEED, doc)

@api.put("/settings")
async def update_settings(body: dict, user: dict = Depends(get_current_admin)):
    body.pop("_id", None)
    await db.settings.update_one({"_id": "site"}, {"$set": body}, upsert=True)
    doc = await db.settings.find_one({"_id": "site"}, {"_id": 0})
    return _merge_settings(DEFAULT_SETTINGS_SEED, doc or {})

@api.delete("/settings")
async def reset_settings(user: dict = Depends(get_current_admin)):
    """Reset site settings by deleting the doc so defaults are used."""
    await db.settings.delete_many({})
    return {"ok": True}

# ===== Orders & Admin Stats =====
@api.post("/orders/upi")
async def create_upi_order(body: UPIOrderReq):
    plan = await db.plans.find_one({"id": body.plan_id}, {"_id": 0})
    if not plan: raise HTTPException(404, "Plan not found")
    base_amount = float(plan["challenge_fee"])
    final_amount = base_amount
    discount_amount = 0.0
    coupon_code = None
    if body.coupon_code:
        code_up = body.coupon_code.strip().upper()
        c = await db.coupons.find_one({"code": code_up}, {"_id": 0})
        if c and c.get("active", True):
            # Basic gate checks (max_uses, expiry) mirrored from validate endpoint
            ok = True
            if c.get("max_uses") is not None and c.get("used_count", 0) >= c["max_uses"]:
                ok = False
            if c.get("expires_at"):
                try:
                    exp = datetime.fromisoformat(c["expires_at"].replace("Z", "+00:00"))
                    if exp < datetime.now(timezone.utc):
                        ok = False
                except (ValueError, AttributeError):
                    pass
            if ok:
                discount_amount = round((base_amount * c["discount_percent"]) / 100, 2)
                final_amount = max(0, round(base_amount - discount_amount, 2))
                coupon_code = code_up
                await db.coupons.update_one({"code": code_up}, {"$inc": {"used_count": 1}})
    referral_code = None
    if body.referral_code:
        rc = body.referral_code.strip().upper()
        r = await db.referrals.find_one({"code": rc})
        if r:
            referral_code = rc
            await db.referrals.update_one({"code": rc}, {"$inc": {"referrals_count": 1, "earnings": int(final_amount * 0.05)}})
    order = {
        "id": str(uuid.uuid4()),
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "amount": final_amount,
        "base_amount": base_amount,
        "discount_amount": discount_amount,
        "coupon_code": coupon_code,
        "referral_code": referral_code,
        "currency": "inr",
        "payment_method": "upi",
        "upi_id": "indifunded@upi",
        "utr": body.utr.strip(),
        "customer_name": body.customer_name,
        "customer_email": body.customer_email,
        "customer_phone": body.customer_phone,
        "notes": body.notes,
        "status": "pending_verification",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)
    return order

# ===== Razorpay QR Checkout =====
async def _compute_pricing(plan, coupon_code, referral_code):
    """Shared pricing/coupon/referral logic. Increments coupon/referral usage."""
    base_amount = float(plan["challenge_fee"])
    final_amount = base_amount
    discount_amount = 0.0
    ccode = None
    if coupon_code:
        code_up = coupon_code.strip().upper()
        c = await db.coupons.find_one({"code": code_up}, {"_id": 0})
        if c and c.get("active", True):
            ok = True
            if c.get("max_uses") is not None and c.get("used_count", 0) >= c["max_uses"]:
                ok = False
            if c.get("expires_at"):
                try:
                    exp = datetime.fromisoformat(c["expires_at"].replace("Z", "+00:00"))
                    if exp < datetime.now(timezone.utc):
                        ok = False
                except (ValueError, AttributeError):
                    pass
            if ok:
                discount_amount = round((base_amount * c["discount_percent"]) / 100, 2)
                final_amount = max(0, round(base_amount - discount_amount, 2))
                ccode = code_up
                await db.coupons.update_one({"code": code_up}, {"$inc": {"used_count": 1}})
    rcode = None
    if referral_code:
        rc = referral_code.strip().upper()
        r = await db.referrals.find_one({"code": rc})
        if r:
            rcode = rc
            await db.referrals.update_one({"code": rc}, {"$inc": {"referrals_count": 1, "earnings": int(final_amount * 0.05)}})
    return base_amount, final_amount, discount_amount, ccode, rcode


@api.post("/orders/razorpay/create")
async def create_razorpay_order(body: RazorpayOrderReq):
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(500, "Razorpay is not configured")
    plan = await db.plans.find_one({"id": body.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    base_amount, final_amount, discount_amount, ccode, rcode = await _compute_pricing(
        plan, body.coupon_code, body.referral_code)
    amount_paise = int(round(final_amount * 100))
    if amount_paise < 100:
        raise HTTPException(400, "Amount too low for online payment")
    order_id = str(uuid.uuid4())
    payload = {
        "type": "upi_qr",
        "name": f"IndiFunded - {plan['name']}"[:50],
        "usage": "single_use",
        "fixed_amount": True,
        "payment_amount": amount_paise,
        "description": f"IndiFunded {plan['name']} Challenge"[:100],
        "notes": {"order_id": order_id, "plan": plan["name"], "email": body.customer_email},
    }
    try:
        resp = requests.post(f"{RAZORPAY_BASE}/payments/qr_codes", json=payload,
                             auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=20)
    except requests.RequestException as e:
        raise HTTPException(502, f"Razorpay request failed: {e}")
    if resp.status_code not in (200, 201):
        logging.error("Razorpay QR create failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(502, f"Razorpay error: {resp.text[:300]}")
    qr = resp.json()
    order = {
        "id": order_id,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "amount": final_amount,
        "base_amount": base_amount,
        "discount_amount": discount_amount,
        "coupon_code": ccode,
        "referral_code": rcode,
        "currency": "inr",
        "payment_method": "razorpay_qr",
        "razorpay_qr_id": qr.get("id"),
        "razorpay_qr_image": qr.get("image_url"),
        "razorpay_payment_id": None,
        "customer_name": body.customer_name,
        "customer_email": body.customer_email,
        "customer_phone": body.customer_phone,
        "notes": body.notes,
        "status": "pending_payment",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    return {
        "order_id": order_id,
        "qr_image": qr.get("image_url"),
        "qr_id": qr.get("id"),
        "amount": final_amount,
    }


@api.get("/orders/razorpay/status/{order_id}")
async def razorpay_order_status(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("status") == "completed":
        return {"status": "completed", "paid": True}
    qr_id = order.get("razorpay_qr_id")
    if not qr_id:
        return {"status": order.get("status"), "paid": False}
    try:
        resp = requests.get(f"{RAZORPAY_BASE}/payments/qr_codes/{qr_id}/payments",
                            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=20)
    except requests.RequestException:
        return {"status": order.get("status"), "paid": False}
    if resp.status_code != 200:
        return {"status": order.get("status"), "paid": False}
    captured = None
    for p in resp.json().get("items", []):
        if p.get("status") == "captured":
            captured = p
            break
    if captured:
        await db.orders.update_one({"id": order_id}, {"$set": {
            "status": "completed", "razorpay_payment_id": captured.get("id")}})
        try:
            requests.post(f"{RAZORPAY_BASE}/payments/qr_codes/{qr_id}/close",
                          auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=15)
        except requests.RequestException:
            pass
        return {"status": "completed", "paid": True}
    return {"status": order.get("status"), "paid": False}


# ===== Razorpay Standard Checkout (UPI intent with native app chooser) =====
@api.post("/orders/razorpay/checkout-order")
async def create_razorpay_checkout_order(body: RazorpayOrderReq):
    """Create a Razorpay Order (Standard Checkout). Used by frontend Razorpay SDK
    to launch native UPI intent chooser on mobile (GPay/PhonePe/Paytm/BHIM etc.)."""
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(500, "Razorpay is not configured")
    plan = await db.plans.find_one({"id": body.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan not found")
    base_amount, final_amount, discount_amount, ccode, rcode = await _compute_pricing(
        plan, body.coupon_code, body.referral_code)
    amount_paise = int(round(final_amount * 100))
    if amount_paise < 100:
        raise HTTPException(400, "Amount too low for online payment")
    order_id = str(uuid.uuid4())
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": order_id[:40],
        "notes": {"order_id": order_id, "plan": plan["name"], "kind": "challenge",
                  "email": body.customer_email},
    }
    try:
        resp = requests.post(f"{RAZORPAY_BASE}/orders", json=payload,
                             auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=20)
    except requests.RequestException as e:
        raise HTTPException(502, f"Razorpay request failed: {e}")
    if resp.status_code not in (200, 201):
        logging.error("Razorpay checkout order failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(502, f"Razorpay error: {resp.text[:300]}")
    rz = resp.json()
    order = {
        "id": order_id,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "amount": final_amount,
        "base_amount": base_amount,
        "discount_amount": discount_amount,
        "coupon_code": ccode,
        "referral_code": rcode,
        "currency": "inr",
        "payment_method": "razorpay_checkout",
        "razorpay_order_id": rz.get("id"),
        "razorpay_payment_id": None,
        "customer_name": body.customer_name,
        "customer_email": body.customer_email,
        "customer_phone": body.customer_phone,
        "notes": body.notes,
        "status": "pending_payment",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    return {
        "order_id": order_id,
        "razorpay_order_id": rz.get("id"),
        "amount": final_amount,
        "amount_paise": amount_paise,
        "key_id": RAZORPAY_KEY_ID,
        "customer": {
            "name": body.customer_name,
            "email": body.customer_email,
            "phone": body.customer_phone,
        },
        "description": f"IndiFunded {plan['name']} Challenge",
    }


@api.post("/orders/razorpay/verify")
async def verify_razorpay_payment(body: dict):
    """Verify Razorpay Checkout signature and mark our order as completed."""
    rz_order_id = body.get("razorpay_order_id", "")
    rz_payment_id = body.get("razorpay_payment_id", "")
    rz_signature = body.get("razorpay_signature", "")
    if not (rz_order_id and rz_payment_id and rz_signature):
        raise HTTPException(400, "Missing payment fields")
    generated = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{rz_order_id}|{rz_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(generated, rz_signature):
        raise HTTPException(400, "Invalid Razorpay signature")
    # Try challenge order first, then league registration
    order = await db.orders.find_one({"razorpay_order_id": rz_order_id})
    if order:
        await db.orders.update_one({"id": order["id"]}, {"$set": {
            "status": "completed",
            "razorpay_payment_id": rz_payment_id,
        }})
        return {"status": "completed", "kind": "order", "id": order["id"]}
    reg = await db.league_registrations.find_one({"razorpay_order_id": rz_order_id})
    if reg:
        await db.league_registrations.update_one({"id": reg["id"]}, {"$set": {
            "status": "completed",
            "razorpay_payment_id": rz_payment_id,
        }})
        return {"status": "completed", "kind": "league", "id": reg["id"]}
    raise HTTPException(404, "Order not found")


@api.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(400, "Invalid signature")
    try:
        evt = json.loads(body)
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid payload")
    try:
        payment_entity = evt.get("payload", {}).get("payment", {}).get("entity", {})
        qr_entity = evt.get("payload", {}).get("qr_code", {}).get("entity", {})
        qr_id = qr_entity.get("id") or payment_entity.get("qr_code_id")
        order = None
        if qr_id:
            order = await db.orders.find_one({"razorpay_qr_id": qr_id})
        if not order:
            notes = payment_entity.get("notes") or {}
            oid = notes.get("order_id")
            if oid:
                order = await db.orders.find_one({"id": oid})
        if order and order.get("status") != "completed" and payment_entity.get("status") == "captured":
            await db.orders.update_one({"id": order["id"]}, {"$set": {
                "status": "completed", "razorpay_payment_id": payment_entity.get("id")}})
    except (KeyError, TypeError, AttributeError) as e:
        logging.error("Razorpay webhook processing error: %s", e)
    return {"status": "ok"}

@api.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, user: dict = Depends(get_current_admin)):
    if status not in ("pending_verification", "completed", "rejected"):
        raise HTTPException(400, "Invalid status")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o: raise HTTPException(404, "Order not found")
    return o

@api.delete("/orders/{order_id}")
async def delete_order(order_id: str, user: dict = Depends(get_current_admin)):
    await db.orders.delete_one({"id": order_id})
    return {"ok": True}

@api.get("/orders")
async def list_orders(user: dict = Depends(get_current_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_admin)):
    total_plans = await db.plans.count_documents({})
    total_blogs = await db.blogs.count_documents({})
    total_leads = await db.leads.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending_verification"})
    pending_payouts = await db.payout_requests.count_documents({"status": "pending"})
    total_payouts = await db.payout_requests.count_documents({})
    agg = await db.orders.aggregate([
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$amount"}}}
    ]).to_list(1)
    revenue = agg[0]["revenue"] if agg else 0
    return {"plans": total_plans, "blogs": total_blogs, "leads": total_leads,
            "orders": total_orders, "pending_orders": pending_orders, "revenue": revenue,
            "payout_requests": total_payouts, "pending_payouts": pending_payouts}

@api.get("/")
async def root():
    return {"message": "IndiFunded API"}

# ============================================================
# WEEKLY HIGHEST PAYOUT (per plan, from certificates in last 7 days)
# ============================================================
@api.get("/weekly-highest-payouts")
async def weekly_highest_payouts():
    """Return admin-curated weekly winners (per plan) if any; otherwise fall back
    to the highest visible certificate per plan for the last 7 days."""
    # 1) Admin-curated entries (highest priority)
    curated = await db.weekly_payouts.find(
        {"visible": True}, {"_id": 0}
    ).sort([("order", 1), ("amount", -1)]).to_list(50)
    if curated:
        # Dedupe by plan (keep highest amount per plan, honor order first)
        seen = {}
        for r in curated:
            key = r.get("plan") or ""
            if key not in seen:
                seen[key] = r
        return list(seen.values())

    # 2) Fallback — auto-derive from certificates (last 7 days)
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    pipeline = [
        {"$match": {"visible": True, "created_at": {"$gte": since}}},
        {"$sort": {"amount": -1}},
        {"$group": {
            "_id": "$plan",
            "trader_name": {"$first": "$trader_name"},
            "amount": {"$first": "$amount"},
            "plan": {"$first": "$plan"},
            "account_size": {"$first": "$account_size"},
            "payout_date": {"$first": "$payout_date"},
            "image_url": {"$first": "$image_url"},
        }},
        {"$sort": {"amount": -1}},
    ]
    rows = await db.certificates.aggregate(pipeline).to_list(50)
    if not rows:
        pipeline2 = [
            {"$match": {"visible": True}},
            {"$sort": {"amount": -1}},
            {"$group": {
                "_id": "$plan",
                "trader_name": {"$first": "$trader_name"},
                "amount": {"$first": "$amount"},
                "plan": {"$first": "$plan"},
                "account_size": {"$first": "$account_size"},
                "payout_date": {"$first": "$payout_date"},
                "image_url": {"$first": "$image_url"},
            }},
            {"$sort": {"amount": -1}},
        ]
        rows = await db.certificates.aggregate(pipeline2).to_list(50)
    for r in rows:
        r.pop("_id", None)
    return rows


# ===== Admin — Weekly Highest Payouts (curated) =====
@api.get("/admin/weekly-payouts")
async def admin_list_weekly_payouts(user: dict = Depends(get_current_admin)):
    return await db.weekly_payouts.find({}, {"_id": 0}).sort([("order", 1), ("created_at", -1)]).to_list(500)

@api.post("/admin/weekly-payouts")
async def admin_create_weekly_payout(body: WeeklyPayoutCreate, user: dict = Depends(get_current_admin)):
    wp = WeeklyPayout(**body.model_dump())
    await db.weekly_payouts.insert_one(wp.model_dump())
    return wp.model_dump()

@api.put("/admin/weekly-payouts/{wp_id}")
async def admin_update_weekly_payout(wp_id: str, body: WeeklyPayoutCreate, user: dict = Depends(get_current_admin)):
    await db.weekly_payouts.update_one({"id": wp_id}, {"$set": body.model_dump()})
    return await db.weekly_payouts.find_one({"id": wp_id}, {"_id": 0})

@api.delete("/admin/weekly-payouts/{wp_id}")
async def admin_delete_weekly_payout(wp_id: str, user: dict = Depends(get_current_admin)):
    await db.weekly_payouts.delete_one({"id": wp_id})
    return {"ok": True}


# ============================================================
# TRADER LEAGUE — registration + admin toggle + Razorpay
# ============================================================
class LeagueRegistrationCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    is_existing_trader: bool = False
    trader_id: str = ""
    notes: str = ""

class LeagueRegistration(LeagueRegistrationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float = 0
    status: str = "pending_payment"   # pending_payment | completed | rejected
    razorpay_qr_id: str = ""
    razorpay_qr_image: str = ""
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

LEAGUE_FEE_EXISTING = 999.0
LEAGUE_FEE_NEW = 1499.0

async def _league_enabled() -> bool:
    doc = await db.system_meta.find_one({"key": "league_enabled"})
    return bool(doc and doc.get("value"))

@api.get("/league/config")
async def league_config():
    return {
        "enabled": await _league_enabled(),
        "fee_existing": LEAGUE_FEE_EXISTING,
        "fee_new": LEAGUE_FEE_NEW,
    }

@api.put("/league/config")
async def set_league_config(body: dict, user: dict = Depends(get_current_admin)):
    enabled = bool(body.get("enabled"))
    await db.system_meta.update_one(
        {"key": "league_enabled"},
        {"$set": {"key": "league_enabled", "value": enabled,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"enabled": enabled}

@api.post("/league/register")
async def league_register(body: LeagueRegistrationCreate):
    """Create a Razorpay Standard Checkout Order for the league — used by
    frontend Razorpay SDK to launch native UPI intent chooser on mobile."""
    if not await _league_enabled():
        raise HTTPException(403, "Trader League registration is currently closed")
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(500, "Razorpay is not configured")
    if body.is_existing_trader and not body.trader_id.strip():
        raise HTTPException(400, "Trader ID is required for existing traders")
    amount = LEAGUE_FEE_EXISTING if body.is_existing_trader else LEAGUE_FEE_NEW
    reg = LeagueRegistration(**body.model_dump(), amount=amount)
    amount_paise = int(round(amount * 100))
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": reg.id[:40],
        "notes": {"reg_id": reg.id, "email": body.email, "kind": "league"},
    }
    try:
        resp = requests.post(f"{RAZORPAY_BASE}/orders", json=payload,
                             auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=20)
    except requests.RequestException as e:
        raise HTTPException(502, f"Razorpay request failed: {e}")
    if resp.status_code not in (200, 201):
        logging.error("Razorpay league order failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(502, f"Razorpay error: {resp.text[:300]}")
    rz = resp.json()
    reg.razorpay_order_id = rz.get("id", "")
    await db.league_registrations.insert_one(reg.model_dump())
    return {
        "registration_id": reg.id,
        "razorpay_order_id": reg.razorpay_order_id,
        "amount": amount,
        "amount_paise": amount_paise,
        "key_id": RAZORPAY_KEY_ID,
        "customer": {
            "name": body.full_name,
            "email": body.email,
            "phone": body.phone,
        },
        "description": "IndiFunded Trader League Registration",
    }

@api.get("/league/status/{registration_id}")
async def league_status(registration_id: str):
    reg = await db.league_registrations.find_one({"id": registration_id}, {"_id": 0})
    if not reg:
        raise HTTPException(404, "Registration not found")
    if reg.get("status") == "completed":
        return {"status": "completed", "amount": reg.get("amount")}
    qr_id = reg.get("razorpay_qr_id")
    if not qr_id:
        return {"status": reg.get("status"), "amount": reg.get("amount")}
    try:
        resp = requests.get(f"{RAZORPAY_BASE}/payments/qr_codes/{qr_id}/payments",
                            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=15)
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            captured = next((p for p in items if p.get("status") == "captured"), None)
            if captured:
                await db.league_registrations.update_one(
                    {"id": registration_id},
                    {"$set": {"status": "completed",
                              "razorpay_payment_id": captured.get("id", "")}})
                return {"status": "completed", "amount": reg.get("amount"),
                        "razorpay_payment_id": captured.get("id")}
    except requests.RequestException:
        pass
    return {"status": reg.get("status"), "amount": reg.get("amount")}

@api.get("/league/registrations")
async def list_league_registrations(user: dict = Depends(get_current_admin)):
    return await db.league_registrations.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.delete("/league/registrations/{reg_id}")
async def delete_league_registration(reg_id: str, user: dict = Depends(get_current_admin)):
    await db.league_registrations.delete_one({"id": reg_id})
    return {"ok": True}


# ============================================================
# GEMINI CERTIFICATE OCR — auto-detect payout details from image
# ============================================================
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import re
import json as _json

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

class CertAnalyzeReq(BaseModel):
    data_url: str

@api.post("/admin/certificates/analyze")
async def analyze_certificate(body: CertAnalyzeReq, user: dict = Depends(get_current_admin)):
    """Analyze a payout certificate/receipt image using Gemini and return structured fields."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")
    if not body.data_url.startswith("data:image/"):
        raise HTTPException(400, "Not a valid image data URL")
    # Extract base64 payload
    try:
        b64 = body.data_url.split(",", 1)[1]
    except IndexError:
        raise HTTPException(400, "Malformed data URL")

    system = (
        "You are a receipt/bank-transfer OCR assistant. You will be shown a screenshot of a UPI/bank payout receipt. "
        "Extract these fields and return ONLY valid JSON (no markdown fences, no commentary):\n"
        "{\n"
        '  "name": "recipient full name",\n'
        '  "amount": <number in INR without commas or currency symbol>,\n'
        '  "date": "YYYY-MM-DD",\n'
        '  "plan": "Starter | Standard | Pro (guess based on amount: <15000 Starter, 15000-30000 Standard, >30000 Pro)",\n'
        '  "raw_text": "short summary of what the receipt shows"\n'
        "}\n"
        "If a field is not visible, use null. Return ONLY the JSON object."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"cert-{uuid.uuid4().hex[:8]}",
        system_message=system,
    ).with_model("gemini", "gemini-2.5-flash")

    image_content = ImageContent(image_base64=b64)
    msg = UserMessage(text="Extract the fields from this payout receipt.", file_contents=[image_content])
    try:
        reply = await chat.send_message(msg)
    except Exception as e:
        logging.exception("Gemini call failed")
        raise HTTPException(502, f"AI analysis failed: {str(e)[:200]}")
    # Reply is a plain string
    text = str(reply).strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    try:
        parsed = _json.loads(text)
    except Exception:
        # Try to extract JSON object with regex
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return {"name": None, "amount": None, "date": None, "plan": None, "raw_text": text[:500]}
        try:
            parsed = _json.loads(m.group(0))
        except Exception:
            return {"name": None, "amount": None, "date": None, "plan": None, "raw_text": text[:500]}
    return {
        "name": parsed.get("name"),
        "amount": parsed.get("amount"),
        "date": parsed.get("date"),
        "plan": parsed.get("plan"),
        "raw_text": parsed.get("raw_text") or "",
    }

# ============================================================
# COUPONS
# ============================================================
class CouponBase(BaseModel):
    code: str
    discount_percent: float = Field(ge=0, le=90)
    active: bool = True
    max_uses: Optional[int] = None
    expires_at: Optional[str] = None  # ISO date
    description: str = ""

class Coupon(CouponBase):
    id: str
    used_count: int = 0
    created_at: str

@api.get("/coupons", response_model=List[Coupon])
async def list_coupons(user: dict = Depends(get_current_admin)):
    return await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/coupons", response_model=Coupon)
async def create_coupon(body: CouponBase, user: dict = Depends(get_current_admin)):
    code = body.code.strip().upper()
    if not code:
        raise HTTPException(400, "Code required")
    if await db.coupons.find_one({"code": code}):
        raise HTTPException(400, "Coupon code already exists")
    doc = {**body.model_dump(), "code": code, "id": str(uuid.uuid4()),
           "used_count": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.coupons.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/coupons/{coupon_id}", response_model=Coupon)
async def update_coupon(coupon_id: str, body: CouponBase, user: dict = Depends(get_current_admin)):
    upd = {**body.model_dump(), "code": body.code.strip().upper()}
    await db.coupons.update_one({"id": coupon_id}, {"$set": upd})
    doc = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "Coupon not found")
    return doc

@api.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(get_current_admin)):
    await db.coupons.delete_one({"id": coupon_id})
    return {"ok": True}

class ValidateCouponReq(BaseModel):
    code: str
    amount: float = 0

@api.post("/coupons/validate")
async def validate_coupon(body: ValidateCouponReq):
    code = body.code.strip().upper()
    c = await db.coupons.find_one({"code": code}, {"_id": 0})
    if not c or not c.get("active", True):
        raise HTTPException(404, "Invalid or inactive coupon")
    if c.get("max_uses") is not None and c.get("used_count", 0) >= c["max_uses"]:
        raise HTTPException(400, "Coupon usage limit reached")
    if c.get("expires_at"):
        try:
            exp = datetime.fromisoformat(c["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                raise HTTPException(400, "Coupon has expired")
        except (ValueError, AttributeError):
            pass
    disc = c["discount_percent"]
    discount_amt = round((body.amount * disc) / 100, 2)
    final_amt = max(0, round(body.amount - discount_amt, 2))
    return {"code": code, "discount_percent": disc,
            "discount_amount": discount_amt, "final_amount": final_amt,
            "description": c.get("description", "")}

# ============================================================
# LEADERBOARD (public read, admin CRUD)
# ============================================================
class LeaderboardEntryBase(BaseModel):
    name: str
    plan: str = "Standard"
    total_payout: float
    city: str = ""
    avatar_url: str = ""
    verified: bool = True
    rank_note: str = ""  # optional badge like "Rising Star"

class LeaderboardEntry(LeaderboardEntryBase):
    id: str
    created_at: str

@api.get("/leaderboard", response_model=List[LeaderboardEntry])
async def public_leaderboard(limit: int = 20):
    return await db.leaderboard.find({}, {"_id": 0}).sort("total_payout", -1).to_list(min(limit, 100))

@api.post("/leaderboard", response_model=LeaderboardEntry)
async def create_leaderboard(body: LeaderboardEntryBase, user: dict = Depends(get_current_admin)):
    doc = {**body.model_dump(), "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.leaderboard.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/leaderboard/{entry_id}", response_model=LeaderboardEntry)
async def update_leaderboard(entry_id: str, body: LeaderboardEntryBase, user: dict = Depends(get_current_admin)):
    await db.leaderboard.update_one({"id": entry_id}, {"$set": body.model_dump()})
    doc = await db.leaderboard.find_one({"id": entry_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "Entry not found")
    return doc

@api.delete("/leaderboard/{entry_id}")
async def delete_leaderboard(entry_id: str, user: dict = Depends(get_current_admin)):
    await db.leaderboard.delete_one({"id": entry_id})
    return {"ok": True}

# ============================================================
# REFERRAL SYSTEM
# ============================================================
class ReferralCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""

class ReferralUse(BaseModel):
    code: str

def _generate_ref_code(name: str) -> str:
    import random, string
    base = re.sub(r"[^A-Za-z0-9]", "", name.upper())[:6] or "TRADE"
    suffix = "".join(random.choices(string.digits, k=4))
    return f"{base}{suffix}"

@api.post("/referrals")
async def create_referral(body: ReferralCreate):
    # Deduplicate by email
    existing = await db.referrals.find_one({"email": body.email.lower()}, {"_id": 0})
    if existing:
        return existing
    # Try up to 3 unique codes
    code = ""
    for _ in range(5):
        code = _generate_ref_code(body.name)
        if not await db.referrals.find_one({"code": code}):
            break
    doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": body.name,
        "email": body.email.lower(),
        "phone": body.phone,
        "referrals_count": 0,
        "earnings": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.referrals.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/referrals/{code}")
async def get_referral(code: str):
    doc = await db.referrals.find_one({"code": code.strip().upper()}, {"_id": 0})
    if not doc: raise HTTPException(404, "Referral code not found")
    # Don't leak email/phone publicly
    return {"code": doc["code"], "name": doc["name"], "referrals_count": doc.get("referrals_count", 0)}

@api.get("/admin/referrals")
async def list_referrals(user: dict = Depends(get_current_admin)):
    return await db.referrals.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.delete("/admin/referrals/{ref_id}")
async def delete_referral(ref_id: str, user: dict = Depends(get_current_admin)):
    await db.referrals.delete_one({"id": ref_id})
    return {"ok": True}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"https?://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

# ===== Seeding =====
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.plans.create_index("id", unique=True)
    await db.blogs.create_index("slug", unique=True)
    await db.coupons.create_index("code", unique=True)
    await db.referrals.create_index("code", unique=True)
    await db.referrals.create_index("email", unique=True)

    # Admin seed
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )

    # ---- Migration: ensure original_price is set on the 3 default plans (only if missing) ----
    plan_price_map = {
        "Starter":  {"challenge_fee": 3999.0,  "original_price": 5000.0},
        "Standard": {"challenge_fee": 7999.0,  "original_price": 9999.0},
        "Pro":      {"challenge_fee": 14999.0, "original_price": 18999.0},
    }
    for pname, prices in plan_price_map.items():
        # Only set if the plan document doesn't have original_price yet — never overwrite admin edits.
        await db.plans.update_one(
            {"name": pname, "original_price": {"$in": [None, 0]}},
            {"$set": {"original_price": prices["original_price"]}},
        )

    # Seed provided payout certificate ONCE (never re-seed after admin deletes it)
    seed_cert_url = "https://customer-assets.emergentagent.com/job_funded-platform/artifacts/3j4e5txj_Screenshot%202026-07-04%20163903.png"
    seed_marker = await db.system_meta.find_one({"key": "seed_cert_done"})
    if not seed_marker and await db.certificates.count_documents({}) == 0:
        seed_cert = Certificate(
            image_url=seed_cert_url,
            trader_name="Vivek Raut",
            amount=6700,
            plan="Starter",
            account_size=100000,
            payout_date="09/05/2026",
            order=1,
            visible=True,
        )
        await db.certificates.insert_one(seed_cert.model_dump())
        await db.system_meta.insert_one({"key": "seed_cert_done", "at": datetime.now(timezone.utc).isoformat()})

    # Seed default plans
    if await db.plans.count_documents({}) == 0:
        default_plans = [
            Plan(name="Starter", account_size=100000, challenge_fee=3999.0,
                 profit_target_points=750, profit_share=70, max_loss_limit=20,
                 min_trading_days=8, total_trading_days=15, trades_per_day=3,
                 description="Perfect launchpad for aspiring traders. Prove your skills with ₹1L account.",
                 features=["Account Size ₹1,00,000","70% Profit Split","15 Trading Days","Trade Nifty/BankNifty"],
                 order=1),
            Plan(name="Standard", account_size=200000, challenge_fee=7999.0,
                 profit_target_points=750, profit_share=70, max_loss_limit=20,
                 min_trading_days=10, total_trading_days=15, trades_per_day=3,
                 description="Our most popular plan. Ideal for disciplined traders ready to scale.",
                 features=["Account Size ₹2,00,000","70% Profit Split","Fund scales to ₹5L","Zerodha/Dhan/Angel One"],
                 popular=True, order=2),
            Plan(name="Pro", account_size=500000, challenge_fee=14999.0,
                 profit_target_points=1250, profit_share=70, max_loss_limit=20,
                 min_trading_days=12, total_trading_days=20, trades_per_day=5,
                 description="Built for pros. Maximum capital, top profit share, full market access.",
                 features=["Account Size ₹5,00,000","70% Profit Split","No segment restriction","24hr Payouts"],
                 order=3),
        ]
        for p in default_plans:
            await db.plans.insert_one(p.model_dump())

    # Seed blogs
    if await db.blogs.count_documents({}) == 0:
        default_blogs = [
            Blog(slug="turn-small-investment-into-profitable-trading",
                 title="Unlock Your Potential: Turn a Small Investment into a Profitable Trading Venture",
                 excerpt="Trading can seem intimidating, especially when considering the challenge fees for a funded account. But with the right approach, a small investment goes a long way.",
                 content="Trading can seem intimidating, especially when considering the challenge fees for a funded account. However, it's important to understand the long-term upside. At IndiFunded, a one-time challenge fee unlocks access to accounts of up to ₹5,00,000 with 70% profit sharing. Start small, prove your discipline, and scale systematically.\n\n**Why it works**\n- Capital efficiency: you keep 70% of profits without risking your own capital beyond the challenge fee.\n- Risk discipline: hard drawdown rules train you to protect capital.\n- Scaling: passing traders see account increments every 2 months up to ₹5L.",
                 cover_image="https://images.unsplash.com/photo-1642790595397-7047dc98fa72?w=1200"),
            Blog(slug="rise-of-indifunded-indian-trading",
                 title="Uncovering the Rise of IndiFunded: A New Player in the Indian Trading Scene",
                 excerpt="As India's financial sector expands, traders need platforms built for NSE/BSE. Here's why IndiFunded is changing the game.",
                 content="In today's fast-paced trading landscape, the right platform can make all the difference for traders. As India's financial sector expands, IndiFunded has emerged as India's 1st prop trading firm tailored to NSE stocks, BankNifty, Nifty50 and F&O segments.\n\n**What sets us apart**\n- Rupee-denominated accounts\n- Payouts within 24 hours\n- Integration with Zerodha, Angel One, Dhan, Upstox\n- A community of Indian traders",
                 cover_image="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200"),
            Blog(slug="strategies-for-maximizing-profits",
                 title="Strategies for Maximizing Profits with Funded Trading Accounts",
                 excerpt="Fresh methods to boost profits while keeping risk tight. A playbook from IndiFunded's top traders.",
                 content="Traders constantly seek methods to boost profits while keeping risk tight. Here are three proven strategies from our funded traders:\n\n1. **Plan your trading day**: pre-market prep beats reactive trading.\n2. **Respect the loss cap**: 20% max loss isn't a target, it's a guardrail — stay well under it.\n3. **Let winners run**: 70% profit accuracy requires fewer losers, not more winners.",
                 cover_image="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200"),
        ]
        for b in default_blogs:
            await db.blogs.insert_one(b.model_dump())

@app.on_event("shutdown")
async def shutdown():
    client.close()
