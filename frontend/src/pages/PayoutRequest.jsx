import { useEffect, useState } from "react";
import { api, formatApiError, formatINR } from "../lib/api";
import { toast } from "sonner";
import { useSEO } from "../lib/useSEO";
import { ArrowRight, CheckCircle2, Wallet, Landmark, Shield, Clock, IndianRupee } from "lucide-react";

const empty = {
  full_name: "", email: "", phone: "",
  account_id: "", plan: "", amount: "",
  method: "upi",
  upi_id: "",
  bank_name: "", account_number: "", ifsc: "", account_holder: "",
  notes: "",
};

export default function PayoutRequest({ embedded = false }) {
  useSEO({
    title: "Request Payout — IndiFunded",
    description: "Submit your payout request. Payouts are processed within 24 hours to your UPI or bank account.",
  });
  const [form, setForm] = useState(empty);
  const [plans, setPlans] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/plans").then(r => setPlans(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const MIN_AMT = 5000;
  const MAX_AMT = 55000;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill name, email and phone"); return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error("Please enter a valid payout amount"); return; }
    if (amt < MIN_AMT || amt > MAX_AMT) {
      toast.error(`Payout amount must be between ₹${MIN_AMT.toLocaleString('en-IN')} and ₹${MAX_AMT.toLocaleString('en-IN')}`);
      return;
    }
    if (form.method === "upi" && !form.upi_id.trim()) { toast.error("UPI ID is required"); return; }
    if (form.method === "bank" && (!form.account_number.trim() || !form.ifsc.trim())) {
      toast.error("Bank account number and IFSC are required"); return;
    }
    setSubmitting(true);
    try {
      await api.post("/payout-requests", { ...form, amount: amt });
      setDone(true);
      toast.success("Payout request submitted!");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="container-xl py-24" data-testid="payout-success">
        <div className="max-w-2xl mx-auto card-panel p-10 text-center glow-border">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(41,211,154,0.15)] text-[var(--accent)] mb-6">
            <CheckCircle2 size={32}/>
          </div>
          <h1 className="font-display text-4xl mb-3">Payout request received</h1>
          <p className="text-[var(--muted)] mb-8">
            Our team will verify your account status and process the payout within <span className="text-white">24 hours</span>. You'll receive a confirmation on <span className="text-white">{form.email}</span>.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="/" className="btn-ghost rounded-full px-6 py-2.5 text-sm">Back to home</a>
            <button onClick={() => { setForm(empty); setDone(false); }} className="btn-amber rounded-full px-6 py-2.5 text-sm">Submit another</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`container-xl ${embedded ? "pt-12 pb-8" : "py-16 md:py-24"}`} data-testid="payout-request-page">
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <div className="chip mb-4">Withdraw Profits</div>
          <h1 className="font-display text-4xl md:text-5xl">Request your payout</h1>
          <p className="text-[var(--muted)] mt-3 max-w-2xl">
            Submit the details of your funded account and preferred payout method. Our team will verify and transfer within 24 hours.
          </p>

          <form onSubmit={submit} className="card-panel p-6 md:p-8 mt-8 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full Name *">
                <input required value={form.full_name} onChange={e=>set("full_name", e.target.value)} className="input-dark" placeholder="As on your PAN" data-testid="pr-name"/>
              </Field>
              <Field label="Email *">
                <input required type="email" value={form.email} onChange={e=>set("email", e.target.value)} className="input-dark" placeholder="you@example.com" data-testid="pr-email"/>
              </Field>
              <Field label="Phone *">
                <input required value={form.phone} onChange={e=>set("phone", e.target.value)} className="input-dark" placeholder="+91 …" data-testid="pr-phone"/>
              </Field>
              <Field label="Funded Account ID">
                <input value={form.account_id} onChange={e=>set("account_id", e.target.value)} className="input-dark" placeholder="e.g. RF-10245" data-testid="pr-account"/>
              </Field>
              <Field label="Plan">
                <select value={form.plan} onChange={e=>set("plan", e.target.value)} className="input-dark" data-testid="pr-plan">
                  <option value="">Select plan</option>
                  {plans.map(p => <option key={p.id} value={p.name}>{p.name} — ₹{p.account_size?.toLocaleString("en-IN")}</option>)}
                </select>
              </Field>
              <Field label="Payout Amount (₹) *" hint="Between ₹5,000 and ₹55,000">
                <input required type="number" step="1" min="5000" max="55000" value={form.amount} onChange={e=>set("amount", e.target.value)} className="input-dark" placeholder="e.g. 12500" data-testid="pr-amount"/>
              </Field>
            </div>

            <div>
              <div className="text-sm text-[var(--muted-2)] font-mono uppercase tracking-wider mb-3">Payout Method</div>
              <div className="grid grid-cols-2 gap-3">
                <MethodCard active={form.method==="upi"} onClick={()=>set("method","upi")} icon={<Wallet size={18}/>} title="UPI" desc="Instant, recommended" testId="method-upi"/>
                <MethodCard active={form.method==="bank"} onClick={()=>set("method","bank")} icon={<Landmark size={18}/>} title="Bank Transfer" desc="NEFT / IMPS" testId="method-bank"/>
              </div>
            </div>

            {form.method === "upi" ? (
              <Field label="UPI ID *">
                <input value={form.upi_id} onChange={e=>set("upi_id", e.target.value)} className="input-dark" placeholder="yourname@upi" data-testid="pr-upi"/>
              </Field>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Account Holder Name">
                  <input value={form.account_holder} onChange={e=>set("account_holder", e.target.value)} className="input-dark" data-testid="pr-holder"/>
                </Field>
                <Field label="Bank Name">
                  <input value={form.bank_name} onChange={e=>set("bank_name", e.target.value)} className="input-dark" placeholder="e.g. HDFC Bank" data-testid="pr-bank"/>
                </Field>
                <Field label="Account Number *">
                  <input value={form.account_number} onChange={e=>set("account_number", e.target.value)} className="input-dark" data-testid="pr-acnum"/>
                </Field>
                <Field label="IFSC *">
                  <input value={form.ifsc} onChange={e=>set("ifsc", e.target.value.toUpperCase())} className="input-dark" placeholder="HDFC0001234" data-testid="pr-ifsc"/>
                </Field>
              </div>
            )}

            <Field label="Additional notes">
              <textarea rows={3} value={form.notes} onChange={e=>set("notes", e.target.value)} className="input-dark" placeholder="Optional — anything you'd like our payout team to know." data-testid="pr-notes"/>
            </Field>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-[var(--muted-2)] font-mono">By submitting you confirm the details are accurate.</div>
              <button type="submit" disabled={submitting} className="btn-amber rounded-full px-6 py-3 text-sm inline-flex items-center gap-2 disabled:opacity-60" data-testid="pr-submit">
                {submitting ? "Submitting…" : (<>Submit Request <ArrowRight size={16}/></>)}
              </button>
            </div>
          </form>
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          <div className="card-panel p-6">
            <div className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono mb-3">How it works</div>
            <ul className="space-y-4">
              <SideStep n="01" title="Submit request" desc="Fill in your account & payout details."/>
              <SideStep n="02" title="Verification" desc="Our team confirms your trading account and profit."/>
              <SideStep n="03" title="Payout in 24h" desc="UPI/Bank transfer with confirmation email."/>
            </ul>
          </div>
          <div className="card-panel p-6">
            <div className="flex items-center gap-2 text-[var(--accent)]"><Shield size={16}/><span className="text-xs uppercase tracking-wider font-mono">Secure & Private</span></div>
            <p className="text-sm text-[var(--muted)] mt-2">Your details are encrypted in transit and only used for payout processing.</p>
          </div>
          <div className="card-panel p-6">
            <div className="flex items-center gap-2 text-[var(--accent)]"><Clock size={16}/><span className="text-xs uppercase tracking-wider font-mono">24h SLA</span></div>
            <p className="text-sm text-[var(--muted)] mt-2">All verified payouts are processed within a single business day.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <div className="text-[10px] font-mono text-[var(--muted-2)] mt-1">{hint}</div>}
    </label>
  );
}

function MethodCard({ active, onClick, icon, title, desc, testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className={`text-left p-4 rounded-xl border transition ${active ? "border-[var(--accent)] bg-[rgba(41,211,154,0.08)]" : "border-[var(--border)] hover:border-[var(--border-hi)]"}`}>
      <div className={`inline-flex items-center gap-2 ${active ? "text-[var(--accent)]" : "text-white"}`}>{icon}<span className="font-display">{title}</span></div>
      <div className="text-xs text-[var(--muted)] mt-1">{desc}</div>
    </button>
  );
}

function SideStep({ n, title, desc }) {
  return (
    <li className="flex gap-3">
      <div className="text-[var(--accent)] font-mono text-xs pt-1">{n}</div>
      <div>
        <div className="font-display text-sm">{title}</div>
        <div className="text-xs text-[var(--muted)] mt-1">{desc}</div>
      </div>
    </li>
  );
}
