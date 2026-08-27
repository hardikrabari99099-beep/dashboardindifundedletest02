import { useEffect, useState } from "react";
import { api, formatINR, formatApiError } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { openUpiCheckout } from "../lib/razorpay";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Trophy, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

export default function TraderLeague() {
  useSEO({
    title: "IndiFunded Trader League — Register Now",
    description: "Join the IndiFunded Trader League. ₹999 for existing IndiFunded traders (with Trader ID), ₹1499 for new traders. Direct Razorpay UPI payment.",
    path: "/league",
  });
  const { user } = useAuth();
  const nav = useNavigate();
  const [config, setConfig] = useState({ enabled: true, fee_existing: 999, fee_new: 1499 });
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.name || "", email: user?.email || "", phone: user?.phone || "",
    is_existing_trader: false, trader_id: "", notes: "",
  });
  const [step, setStep] = useState(1); // 1: form, 3: success
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/league/config").then(r => { setConfig(r.data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (user) setForm(f => ({ ...f, full_name: f.full_name || user.name || "", email: f.email || user.email || "", phone: f.phone || user.phone || "" }));
  }, [user]);

  const amount = form.is_existing_trader ? config.fee_existing : config.fee_new;

  const startPayment = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to register for the Trader League", { position: "bottom-center", duration: 4500 });
      nav("/login?next=/league");
      return;
    }
    if (!form.full_name || !form.email || !form.phone) {
      toast.error("Please fill your name, email and phone");
      return;
    }
    if (form.is_existing_trader && !form.trader_id.trim()) {
      toast.error("Please enter your existing IndiFunded Trader ID");
      return;
    }
    setLoading(true);
    try {
      const { data: co } = await api.post("/league/register", form);
      await openUpiCheckout(co, async (rsp) => {
        try {
          await api.post("/orders/razorpay/verify", {
            razorpay_order_id: rsp.razorpay_order_id,
            razorpay_payment_id: rsp.razorpay_payment_id,
            razorpay_signature: rsp.razorpay_signature,
          });
          setStep(3);
          toast.success("Registration confirmed!");
        } catch (err) {
          toast.error(formatApiError(err.response?.data?.detail) || "Payment could not be verified. Contact support.");
        }
      }, () => {
        toast.message("Payment cancelled");
      });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) {
    return <div className="container-xl py-24 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" size={24}/></div>;
  }

  if (!config.enabled) {
    return (
      <div className="container-xl py-20 md:py-28 text-center" data-testid="league-closed">
        <Trophy className="mx-auto text-[var(--muted-2)]" size={48}/>
        <h1 className="font-display text-3xl md:text-5xl mt-6">Trader League registration is closed</h1>
        <p className="text-[var(--muted)] mt-4 max-w-xl mx-auto">
          The IndiFunded Trader League is not currently accepting new registrations. Please check back soon or follow us on WhatsApp for updates.
        </p>
      </div>
    );
  }

  return (
    <div className="container-xl py-14 md:py-20" data-testid="league-page">
      <div className="max-w-3xl">
        <div className="chip mb-4"><Trophy size={12}/> Trader League</div>
        <h1 className="font-display text-4xl md:text-6xl leading-[1.02]">IndiFunded Trader League Registration</h1>
        <p className="text-[var(--muted)] mt-5 max-w-2xl">
          Compete with the best. Pass challenges, climb the leaderboard, win prizes and bragging rights. Register once, participate all season.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className={`card-panel p-6 ${!form.is_existing_trader ? "glow-border" : ""}`}>
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-2)]">New Trader</div>
            <div className="font-display text-3xl mt-2">{formatINR(config.fee_new)}</div>
            <p className="text-sm text-[var(--muted)] mt-3">First-time registrations. Get your league Trader ID after payment.</p>
          </div>
          <div className={`card-panel p-6 ${form.is_existing_trader ? "glow-border" : ""}`}>
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-2)]">Existing IndiFunded Trader</div>
            <div className="font-display text-3xl mt-2">{formatINR(config.fee_existing)}</div>
            <p className="text-sm text-[var(--muted)] mt-3">Already have an IndiFunded Trader ID? Get discounted league entry.</p>
          </div>
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={startPayment} className="mt-10 card-panel p-6 md:p-8 max-w-2xl" data-testid="league-form">
          <h2 className="font-display text-2xl">Your Details</h2>

          <label className="flex items-center gap-3 mt-6 select-none" data-testid="league-existing-toggle">
            <input type="checkbox" className="accent-[var(--accent)] w-4 h-4"
                   checked={form.is_existing_trader}
                   onChange={e => setForm({ ...form, is_existing_trader: e.target.checked })}/>
            <span className="text-sm">I'm already an existing IndiFunded trader ({formatINR(config.fee_existing)} entry)</span>
          </label>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Full Name</label>
              <input className="input-dark mt-2" placeholder="Rahul Sharma"
                     value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                     data-testid="league-name"/>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Phone</label>
              <input className="input-dark mt-2" placeholder="+91 9XXXXXXXXX"
                     value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                     data-testid="league-phone"/>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Email</label>
              <input type="email" className="input-dark mt-2" placeholder="rahul@example.com"
                     value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                     data-testid="league-email"/>
            </div>
            {form.is_existing_trader && (
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Existing Trader ID</label>
                <input className="input-dark mt-2" placeholder="IF-XXXXX"
                       value={form.trader_id} onChange={e => setForm({ ...form, trader_id: e.target.value })}
                       data-testid="league-trader-id"/>
                <p className="text-[11px] text-[var(--muted-2)] mt-1">Enter the Trader ID we issued when you first joined IndiFunded.</p>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Notes (optional)</label>
              <textarea className="input-dark mt-2" rows={3} placeholder="Anything we should know"
                        value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-6 flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider font-mono text-[var(--muted-2)]">Amount to Pay</div>
              <div className="font-display text-3xl text-[var(--accent)] mt-1">{formatINR(amount)}</div>
            </div>
            <button type="submit" disabled={loading}
                    className="btn-amber rounded-full px-6 py-3.5 text-sm inline-flex items-center gap-2 disabled:opacity-60"
                    data-testid="league-submit">
              {loading ? <><Loader2 className="animate-spin" size={16}/> Opening UPI…</> : <><ShieldCheck size={16}/> Pay with your UPI app</>}
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted-2)] mt-4">On mobile, tap the button — your UPI app chooser opens with GPay / PhonePe / Paytm / BHIM etc. On desktop, Razorpay's secure UPI modal opens.</p>
        </form>
      )}

      {step === 3 && (
        <div className="mt-10 card-panel p-8 max-w-2xl text-center" data-testid="league-success">
          <CheckCircle2 className="mx-auto text-[var(--emerald)]" size={48}/>
          <div className="font-display text-2xl mt-5">You're in the League!</div>
          <p className="text-sm text-[var(--muted)] mt-3">Your payment is confirmed. Our team will send your League Trader ID and season details on WhatsApp and email shortly.</p>
        </div>
      )}
    </div>
  );
}
