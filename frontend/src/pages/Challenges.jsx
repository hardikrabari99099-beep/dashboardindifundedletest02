import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, formatINR, formatApiError } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { useReveal } from "../lib/useReveal";
import { useAuth } from "../context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import ProfitCalculator from "../components/ProfitCalculator";
import ComparePlans from "../components/ComparePlans";
import { openUpiCheckout } from "../lib/razorpay";
import { toast } from "sonner";
import { CheckCircle2, Rocket, Loader2, ShieldCheck, Sparkles, Tag, Gift } from "lucide-react";


export default function Challenges() {
  const [plans, setPlans] = useState([]);
  const [buying, setBuying] = useState(null);
  const [step, setStep] = useState(1); // 1: details, 2: razorpay QR, 3: success
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", coupon_code: "", referral_code: "" });
  const [couponInfo, setCouponInfo] = useState(null); // { discount_percent, discount_amount, final_amount }
  const [couponBusy, setCouponBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState(null); // { order_id, qr_image, amount }
  const pollRef = useRef(null);
  const [searchParams] = useSearchParams();
  useReveal([plans]);

  // Auto-apply referral from URL (?ref=CODE)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setForm(prev => ({ ...prev, referral_code: ref.toUpperCase() }));
  }, [searchParams]);

  useSEO({
    title: "Challenge Plans — Starter, Standard & Pro Funded Accounts",
    description: "Choose your IndiFunded challenge plan. Account sizes ₹1L, ₹2L, ₹5L. Challenge fees from ₹4,999. 70% profit split, 24-hour payouts. Pay via UPI.",
    path: "/challenges",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "IndiFunded Challenge Plans",
      "itemListElement": plans.map((p, i) => ({
        "@type": "Product",
        "position": i + 1,
        "name": `${p.name} Challenge — ${p.account_size} INR funded account`,
        "description": p.description,
        "offers": { "@type": "Offer", "price": p.challenge_fee, "priceCurrency": "INR", "availability": "https://schema.org/InStock" }
      }))
    }
  });

  useEffect(() => { api.get("/plans").then(r => setPlans(r.data)).catch(() => {}); }, []);

  const { user } = useAuth();
  const nav = useNavigate();

  const openBuy = (p) => {
    if (!user) {
      toast.error("Please sign in to buy a challenge account", { position: "bottom-center", duration: 4500 });
      nav("/login?next=/challenges");
      return;
    }
    setBuying(p);
    setStep(1);
    setCouponInfo(null);
    setQr(null);
    setForm(prev => ({
      customer_name: user.name || "",
      customer_email: user.email || "",
      customer_phone: user.phone || "",
      coupon_code: "",
      referral_code: prev.referral_code || "",
    }));
  };

  const applyCoupon = async () => {
    if (!form.coupon_code.trim()) { toast.error("Enter a coupon code"); return; }
    try {
      setCouponBusy(true);
      const { data } = await api.post("/coupons/validate", { code: form.coupon_code.trim(), amount: buying.challenge_fee });
      setCouponInfo(data);
      toast.success(`Coupon applied — ${data.discount_percent}% off`);
    } catch (e) {
      setCouponInfo(null);
      toast.error(formatApiError(e.response?.data?.detail) || "Invalid coupon");
    } finally { setCouponBusy(false); }
  };
  const removeCoupon = () => {
    setCouponInfo(null);
    setForm({ ...form, coupon_code: "" });
  };

  const proceedToPayment = async () => {
    if (!form.customer_name || !form.customer_email || !form.customer_phone) {
      toast.error("Please fill name, email, and phone");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post("/orders/razorpay/create", {
        plan_id: buying.id,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        coupon_code: couponInfo ? form.coupon_code.trim() : null,
        referral_code: form.referral_code.trim() || null,
      });
      setQr(data);
      setStep(2);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Could not start payment. Please try again.");
    } finally { setLoading(false); }
  };

  // Poll Razorpay for payment status while the QR is displayed
  useEffect(() => {
    if (step !== 2 || !qr?.order_id) return undefined;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/razorpay/status/${qr.order_id}`);
        if (data.paid) {
          clearInterval(pollRef.current);
          setStep(3);
        }
      } catch (_e) { /* keep polling */ }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [step, qr]);

  // Stop polling when the dialog closes
  useEffect(() => {
    if (!buying && pollRef.current) clearInterval(pollRef.current);
  }, [buying]);

  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4">Challenges</div>
      <h1 className="font-display text-3xl sm:text-4xl md:text-6xl max-w-3xl" data-testid="challenges-title">Pick a plan. Pass the challenge. Get funded.</h1>
      <p className="text-[var(--muted)] mt-5 max-w-2xl">All plans are INR-denominated, with a 70% profit split and no time limits on the challenge phase.</p>

      <div className="mt-14 grid md:grid-cols-3 gap-5 pt-4">
        {plans.map((p, i) => (
          <div key={p.id} data-reveal data-reveal-delay={String((i%3)+1)} className={`card-panel hover-lift p-8 pt-10 relative ${p.popular ? "glow-border" : ""}`} data-testid={`plan-card-${i}`}>
            {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:left-7 md:translate-x-0 text-[10px] tracking-widest font-mono uppercase px-3 py-1 rounded-full bg-[var(--accent)] text-white inline-flex items-center gap-1 shadow-lg whitespace-nowrap z-10"><Sparkles size={10}/> Best Value</div>}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">{p.name}</div>
                <div className="font-display text-4xl mt-2">{formatINR(p.account_size)}</div>
                <div className="text-xs text-[var(--muted)] mt-1">Funded Account</div>
              </div>
              <Rocket className="text-[var(--accent)]" size={20} />
            </div>
            <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed">{p.description}</p>
            <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-2.5">
              {p.features?.map((f, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-white/85"><CheckCircle2 size={14} className="mt-1 text-[var(--emerald)]" />{f}</div>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                <div><div className="text-[var(--muted-2)]">Profit Target</div><div className="text-white font-mono">{p.profit_target_points} pts</div></div>
                <div><div className="text-[var(--muted-2)]">Max Loss</div><div className="text-white font-mono">{p.max_loss_limit}%</div></div>
                <div><div className="text-[var(--muted-2)]">Min Days</div><div className="text-white font-mono">{p.min_trading_days}</div></div>
                <div><div className="text-[var(--muted-2)]">Total Days</div><div className="text-white font-mono">{p.total_trading_days}</div></div>
              </div>
            </div>
            <div className="flex items-end justify-between mt-8">
              <div>
                <div className="text-xs text-[var(--muted-2)]">Challenge Fee</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="font-display text-3xl text-white">{formatINR(p.challenge_fee)}</div>
                  {p.original_price && p.original_price > p.challenge_fee && (
                    <>
                      <div className="text-sm text-[var(--muted-2)] line-through">{formatINR(p.original_price)}</div>
                      <div className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(41,211,154,0.15)] text-[var(--accent)]">
                        -{Math.round(((p.original_price - p.challenge_fee) / p.original_price) * 100)}%
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => openBuy(p)} className="btn-amber rounded-full px-6 py-3 text-sm" data-testid={`plan-buy-${i}`}>Buy Now</button>
            </div>
          </div>
        ))}
      </div>

      {/* PROFIT CALCULATOR */}
      <ProfitCalculator />

      {/* COMPARE PLANS */}
      <ComparePlans plans={plans} />

      <Dialog open={!!buying} onOpenChange={(o) => !o && setBuying(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-xl" data-testid="checkout-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {step === 1 && `Checkout — ${buying?.name}`}
              {step === 2 && "Scan & Pay"}
              {step === 3 && "Payment successful"}
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <div className="card-panel p-4 flex justify-between">
                <div>
                  <div className="text-xs text-[var(--muted-2)]">Account Size</div>
                  <div className="font-display text-xl">{buying && formatINR(buying.account_size)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--muted-2)]">Challenge Fee</div>
                  <div className="font-display text-xl text-[var(--accent)]">
                    {couponInfo ? formatINR(couponInfo.final_amount) : (buying && formatINR(buying.challenge_fee))}
                  </div>
                  {couponInfo && (
                    <div className="text-[10px] text-[var(--muted-2)] line-through mt-0.5">{buying && formatINR(buying.challenge_fee)}</div>
                  )}
                </div>
              </div>
              <div><Label>Full Name</Label><Input data-testid="checkout-name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" /></div>
              <div><Label>Email</Label><Input data-testid="checkout-email" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" /></div>
              <div><Label>Phone (WhatsApp)</Label><Input data-testid="checkout-phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="+91 " className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" /></div>

              {/* COUPON */}
              <div>
                <Label className="flex items-center gap-1.5"><Tag size={12}/> Coupon Code <span className="text-[var(--muted-2)] text-xs">(optional)</span></Label>
                {couponInfo ? (
                  <div className="mt-2 flex items-center gap-2 p-3 rounded-lg border border-[var(--emerald)]/40 bg-[rgba(41,211,154,0.08)]" data-testid="coupon-applied">
                    <CheckCircle2 size={16} className="text-[var(--emerald)] shrink-0"/>
                    <div className="flex-1 text-sm">
                      <div className="text-white font-mono">{form.coupon_code.toUpperCase()}</div>
                      <div className="text-xs text-[var(--muted-2)]">-{couponInfo.discount_percent}% · You save {formatINR(couponInfo.discount_amount)}</div>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-xs text-[var(--muted-2)] hover:text-white">Remove</button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <Input data-testid="coupon-input" value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} placeholder="e.g. LAUNCH20" className="bg-[var(--bg-1)] border-[var(--border-hi)] font-mono tracking-wider flex-1"/>
                    <button type="button" onClick={applyCoupon} disabled={couponBusy} className="btn-ghost rounded-full px-4 text-xs whitespace-nowrap" data-testid="coupon-apply-btn">{couponBusy ? "…" : "Apply"}</button>
                  </div>
                )}
              </div>

              {/* REFERRAL */}
              <div>
                <Label className="flex items-center gap-1.5"><Gift size={12}/> Referral Code <span className="text-[var(--muted-2)] text-xs">(optional)</span></Label>
                <Input data-testid="referral-input" value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })} placeholder="Friend's referral code" className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono tracking-wider"/>
              </div>

              <button onClick={proceedToPayment} disabled={loading} className="btn-amber rounded-full px-6 py-3 text-sm w-full inline-flex items-center justify-center gap-2" data-testid="checkout-continue-btn">
                {loading ? <><Loader2 className="animate-spin" size={16}/> Generating QR…</> : "Continue to Payment"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-2xl overflow-hidden border border-[var(--border-hi)] bg-[var(--bg-1)] p-6" data-testid="razorpay-qr-box">
                <div className="text-center text-xs uppercase tracking-widest font-mono text-[var(--muted-2)] mb-4">Scan &amp; pay with any UPI app</div>

                <div className="bg-white rounded-xl p-4 w-fit mx-auto">
                  {qr?.qr_image ? (
                    <img src={qr.qr_image} alt="Razorpay UPI QR" className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] object-contain" data-testid="razorpay-qr-img"/>
                  ) : (
                    <div className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] grid place-items-center"><Loader2 className="animate-spin text-black" size={32}/></div>
                  )}
                </div>

                <div className="bg-[var(--bg-2)] rounded-xl px-5 py-5 text-center mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-mono mb-1">Amount to Pay</div>
                  <div className="font-display text-3xl text-[var(--accent)]">{formatINR(qr?.amount ?? (couponInfo ? couponInfo.final_amount : buying?.challenge_fee))}</div>
                  {couponInfo && <div className="text-[10px] text-[var(--muted-2)] mt-1">Coupon {form.coupon_code} applied · saved {formatINR(couponInfo.discount_amount)}</div>}
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-[var(--muted)]" data-testid="razorpay-waiting">
                  <Loader2 className="animate-spin text-[var(--accent)]" size={14}/>
                  <span>Waiting for payment… confirms automatically.</span>
                </div>

                {qr?.qr_image && (
                  <div className="mt-4" data-testid="upi-app-buttons">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { data: co } = await api.post("/orders/razorpay/checkout-order", {
                            plan_id: buying.id,
                            customer_name: form.customer_name,
                            customer_email: form.customer_email,
                            customer_phone: form.customer_phone,
                            coupon_code: couponInfo ? form.coupon_code.trim() : null,
                            referral_code: form.referral_code.trim() || null,
                          });
                          await openUpiCheckout(co, async (rsp) => {
                            try {
                              await api.post("/orders/razorpay/verify", {
                                razorpay_order_id: rsp.razorpay_order_id,
                                razorpay_payment_id: rsp.razorpay_payment_id,
                                razorpay_signature: rsp.razorpay_signature,
                              });
                              clearInterval(pollRef.current);
                              setStep(3);
                              toast.success("Payment successful!");
                            } catch (e) {
                              toast.error(formatApiError(e.response?.data?.detail) || "Payment could not be verified. Contact support.");
                            }
                          });
                        } catch (e) {
                          toast.error(formatApiError(e.response?.data?.detail) || "Could not start UPI payment. Please try again.");
                        }
                      }}
                      className="btn-amber w-full rounded-full px-6 py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2"
                      data-testid="pay-with-upi">
                      <ShieldCheck size={16}/> Pay with your UPI app
                    </button>
                    <div className="text-[11px] text-[var(--muted-2)] mt-2 text-center">On mobile, this opens the UPI app chooser (GPay / PhonePe / Paytm / BHIM). On desktop, use the QR above.</div>
                  </div>
                )}

                <div className="mt-3 text-[11px] text-[var(--muted-2)] leading-relaxed flex gap-2">
                  <ShieldCheck size={14} className="text-[var(--emerald)] mt-0.5 shrink-0"/>
                  <span>Open GPay / PhonePe / Paytm, scan this QR and pay securely via Razorpay. Keep this window open — your challenge activates instantly on success.</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { clearInterval(pollRef.current); setStep(1); }} className="btn-ghost rounded-full px-5 py-3 text-sm flex-1" data-testid="checkout-back-btn">Back</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6" data-testid="checkout-received">
              <CheckCircle2 className="mx-auto text-[var(--emerald)]" size={48}/>
              <div className="font-display text-2xl mt-5">Payment successful!</div>
              <p className="text-sm text-[var(--muted)] mt-3">Your payment is confirmed and your challenge account is being activated. You will receive your login details on WhatsApp and email shortly.</p>
              <div className="card-panel p-4 text-left mt-6 font-mono text-xs">
                <div><span className="text-[var(--muted-2)]">Plan:</span> {buying?.name}</div>
                <div><span className="text-[var(--muted-2)]">Amount:</span> {formatINR(qr?.amount ?? buying?.challenge_fee)}</div>
                <div><span className="text-[var(--muted-2)]">Status:</span> Paid</div>
              </div>
              <button onClick={()=>setBuying(null)} className="btn-amber rounded-full px-6 py-3 text-sm mt-6">Done</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
