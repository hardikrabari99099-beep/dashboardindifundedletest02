import { useEffect, useRef, useState } from "react";
import { api, formatINR, formatApiError } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { toast } from "sonner";
import { Trophy, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

export default function TraderLeague() {
  useSEO({
    title: "IndiFunded Trader League — Register Now",
    description: "Join the IndiFunded Trader League. ₹999 for existing IndiFunded traders (with Trader ID), ₹1499 for new traders. Direct Razorpay UPI payment.",
    path: "/league",
  });
  const [config, setConfig] = useState({ enabled: true, fee_existing: 999, fee_new: 1499 });
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    is_existing_trader: false, trader_id: "", notes: "",
  });
  const [step, setStep] = useState(1); // 1: form, 2: qr, 3: success
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.get("/league/config").then(r => { setConfig(r.data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const amount = form.is_existing_trader ? config.fee_existing : config.fee_new;

  const startPayment = async (e) => {
    e.preventDefault();
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
      const { data } = await api.post("/league/register", form);
      setQr(data);
      setStep(2);
      pollRef.current = setInterval(async () => {
        try {
          const { data: st } = await api.get(`/league/status/${data.registration_id}`);
          if (st.status === "completed") {
            clearInterval(pollRef.current);
            setStep(3);
            toast.success("Registration confirmed!");
          }
        } catch {}
      }, 4000);
    } catch (err) {
      toast.error(formatApiError(err));
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

          <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-6">
            <div>
              <div className="text-xs uppercase tracking-wider font-mono text-[var(--muted-2)]">Amount to Pay</div>
              <div className="font-display text-3xl text-[var(--accent)] mt-1">{formatINR(amount)}</div>
            </div>
            <button type="submit" disabled={loading}
                    className="btn-amber rounded-full px-6 py-3 text-sm inline-flex items-center gap-2 disabled:opacity-60"
                    data-testid="league-submit">
              {loading ? <><Loader2 className="animate-spin" size={16}/> Generating QR…</> : "Continue to Payment"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && qr && (
        <div className="mt-10 card-panel p-6 md:p-8 max-w-2xl" data-testid="league-qr">
          <div className="text-center text-xs uppercase tracking-widest font-mono text-[var(--muted-2)] mb-4">Scan &amp; pay with any UPI app</div>
          <div className="bg-white rounded-xl p-4 w-fit mx-auto">
            <img src={qr.qr_image} alt="Razorpay UPI QR" className="w-72 h-72 sm:w-96 sm:h-96 object-contain" data-testid="league-qr-img"/>
          </div>
          <div className="bg-[var(--bg-2)] rounded-xl px-5 py-5 text-center mt-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-mono mb-1">Amount to Pay</div>
            <div className="font-display text-3xl text-[var(--accent)]">{formatINR(qr.amount)}</div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-[var(--muted)]">
            <Loader2 className="animate-spin text-[var(--accent)]" size={14}/>
            <span>Waiting for payment… confirms automatically.</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <a href={qr.qr_image} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border-hi)] bg-[var(--bg-2)] px-3 py-2.5 hover:border-[var(--accent)] transition-colors" data-testid="league-pay-gpay">
              <div className="w-8 h-8 rounded-full bg-white grid place-items-center text-[10px] font-bold text-[#4285F4]">GPay</div>
              <div className="text-[11px] text-white/90">Pay via GPay</div>
            </a>
            <a href={qr.qr_image} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border-hi)] bg-[var(--bg-2)] px-3 py-2.5 hover:border-[var(--accent)] transition-colors" data-testid="league-pay-phonepe">
              <div className="w-8 h-8 rounded-full bg-[#5f259f] grid place-items-center text-[10px] font-bold text-white">Pe</div>
              <div className="text-[11px] text-white/90">Pay via PhonePe</div>
            </a>
            <a href={qr.qr_image} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border-hi)] bg-[var(--bg-2)] px-3 py-2.5 hover:border-[var(--accent)] transition-colors" data-testid="league-pay-paytm">
              <div className="w-8 h-8 rounded-full bg-[#00baf2] grid place-items-center text-[10px] font-bold text-white">P</div>
              <div className="text-[11px] text-white/90">Pay via Paytm</div>
            </a>
          </div>
          <div className="mt-3 text-[11px] text-[var(--muted-2)] leading-relaxed flex gap-2">
            <ShieldCheck size={14} className="text-[var(--emerald)] mt-0.5 shrink-0"/>
            <span>Open GPay / PhonePe / Paytm, scan this QR and pay securely via Razorpay. Keep this window open — your league registration activates instantly on success.</span>
          </div>
        </div>
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
