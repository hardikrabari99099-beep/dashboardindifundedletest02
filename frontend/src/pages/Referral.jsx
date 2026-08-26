import { useState } from "react";
import { api, formatApiError } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Gift, Copy, Share2, Users, Wallet, CheckCircle2 } from "lucide-react";

export default function Referral() {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  useSEO({
    title: "Refer & Earn — Get ₹500 for every funded referral",
    description: "Refer traders to IndiFunded and earn ₹500 bonus when they pass their challenge. Share your unique code and track your earnings.",
    path: "/refer",
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
    try {
      setBusy(true);
      const { data } = await api.post("/referrals", form);
      setResult(data);
      toast.success("Your referral code is ready!");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to create referral");
    } finally { setBusy(false); }
  };

  const shareUrl = result ? `${window.location.origin}/challenges?ref=${result.code}` : "";

  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  const shareNow = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Get funded with IndiFunded", text: `Use my referral code ${result.code} for 5% off your challenge fee!`, url: shareUrl }); }
      catch (_) { /* user cancelled */ }
    } else {
      copy(shareUrl);
    }
  };

  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4 inline-flex"><Gift size={12} className="mr-1.5"/> Refer & Earn</div>
      <h1 className="font-display text-4xl md:text-5xl max-w-3xl" data-testid="referral-title">Refer traders. Earn rewards.</h1>
      <p className="text-[var(--muted)] mt-4 max-w-2xl">Get your unique referral code. When friends purchase a challenge with your code, you earn a bonus — they get 5% off their fee.</p>

      <div className="mt-10 grid md:grid-cols-3 gap-5">
        <div className="glass-card p-6 text-center"><Users size={24} className="mx-auto text-[var(--accent)] mb-3"/><div className="font-display text-2xl">1</div><div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mt-1">Get your code</div></div>
        <div className="glass-card p-6 text-center"><Share2 size={24} className="mx-auto text-[var(--accent)] mb-3"/><div className="font-display text-2xl">2</div><div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mt-1">Share with friends</div></div>
        <div className="glass-card p-6 text-center"><Wallet size={24} className="mx-auto text-[var(--accent)] mb-3"/><div className="font-display text-2xl">3</div><div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mt-1">Earn on every purchase</div></div>
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6 md:p-8">
          <div className="font-display text-xl mb-5">{result ? "Your Referral Details" : "Create your referral code"}</div>
          {!result ? (
            <form onSubmit={submit} className="space-y-4">
              <div><Label>Full Name</Label><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="ref-name"/></div>
              <div><Label>Email</Label><Input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="ref-email"/></div>
              <div><Label>Phone (WhatsApp) <span className="text-[var(--muted-2)]">(optional)</span></Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <button disabled={busy} className="btn-amber rounded-full w-full py-3 text-sm mt-2" data-testid="ref-submit">{busy ? "Generating…" : "Get My Referral Code"}</button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="card-panel p-5 text-center">
                <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider">Your Code</div>
                <div className="font-display text-3xl text-[var(--accent)] mt-2 select-all" data-testid="ref-code">{result.code}</div>
                <button onClick={()=>copy(result.code)} className="btn-ghost px-4 py-2 rounded-full inline-flex items-center gap-1.5 text-xs mt-4"><Copy size={12}/> Copy Code</button>
              </div>
              <div className="card-panel p-4">
                <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mb-1">Share Link</div>
                <div className="font-mono text-xs text-white break-all">{shareUrl}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={()=>copy(shareUrl)} className="btn-ghost flex-1 rounded-full py-2 text-xs inline-flex items-center justify-center gap-1.5"><Copy size={12}/> Copy Link</button>
                  <button onClick={shareNow} className="btn-amber flex-1 rounded-full py-2 text-xs inline-flex items-center justify-center gap-1.5"><Share2 size={12}/> Share Now</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card-panel p-4"><div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider">Referrals</div><div className="font-display text-2xl mt-1">{result.referrals_count || 0}</div></div>
                <div className="card-panel p-4"><div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider">Earned</div><div className="font-display text-2xl mt-1">₹{result.earnings || 0}</div></div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-6 md:p-8">
          <div className="font-display text-xl mb-5">How it works</div>
          <div className="space-y-4">
            {[
              {t:"Sign up for a referral code", d:"Just your name & email — no password needed."},
              {t:"Share your code or link", d:"WhatsApp, X, Instagram, email — anywhere your trader friends are."},
              {t:"They save on their challenge", d:"5% off any challenge fee when they use your code at checkout."},
              {t:"You earn per purchase", d:"5% of the purchase value goes to your referral wallet. Payouts every month."},
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 grid place-items-center shrink-0"><CheckCircle2 size={14} className="text-[var(--emerald)]"/></div>
                <div><div className="text-sm text-white/90">{s.t}</div><div className="text-xs text-[var(--muted-2)] mt-0.5">{s.d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
