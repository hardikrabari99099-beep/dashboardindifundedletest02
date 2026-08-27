import { useEffect, useState } from "react";
import { api, formatINR, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

export default function UserPayouts() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [kyc, setKyc] = useState({
    full_name: user?.name || "", pan: "", upi_id: "",
    bank_account_number: "", ifsc: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/me/payouts").then(r=>setData(r.data)).catch(()=>{});
    if (user?.kyc) setKyc(k => ({...k, ...user.kyc}));
  }, [user]);

  const saveKyc = async (e) => {
    e.preventDefault();
    if (!kyc.full_name || !kyc.pan) { toast.error("Full name and PAN are required"); return; }
    setSaving(true);
    try {
      await api.put("/me/kyc", kyc);
      await refresh();
      toast.success("KYC submitted for review");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const statusBadge = (s) => {
    const map = {
      "pending": { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
      "approved": { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Approved" },
      "paid": { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Paid" },
      "rejected": { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "Rejected" },
    };
    const m = map[s] || map["pending"];
    return <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full" style={{background:m.bg, color:m.text}}>{m.label}</span>;
  };

  const alreadySubmitted = !!user?.kyc?.submitted_at;

  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl">Payouts</h1>
      <p className="text-sm text-[var(--muted)] mt-2">Withdraw your profit share via UPI or bank transfer.</p>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="card-panel p-5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">Eligible now</div>
          <div className="font-display text-3xl mt-3">{formatINR(data?.eligible || 0)}</div>
        </div>
        <div className="card-panel p-5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">Pending</div>
          <div className="font-display text-3xl mt-3">{formatINR(data?.pending_amount || 0)}</div>
        </div>
        <div className="card-panel p-5">
          <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">Total paid out</div>
          <div className="font-display text-3xl mt-3 text-[var(--accent)]">{formatINR(data?.total_paid || 0)}</div>
        </div>
      </div>

      <div className="card-panel p-6 md:p-8 mt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-xl">KYC verification</h2>
            <p className="text-xs text-[var(--muted)] mt-1">Required before your first payout.</p>
          </div>
          {alreadySubmitted && <span className="chip">Submitted</span>}
        </div>
        <form onSubmit={saveKyc} className="grid md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Full legal name</label>
            <input className="input-dark mt-2" value={kyc.full_name} onChange={e=>setKyc({...kyc, full_name: e.target.value})} data-testid="kyc-name"/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">PAN</label>
            <input className="input-dark mt-2 uppercase" value={kyc.pan} onChange={e=>setKyc({...kyc, pan: e.target.value.toUpperCase()})} placeholder="ABCDE1234F" data-testid="kyc-pan"/>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">UPI ID (optional)</label>
            <input className="input-dark mt-2" value={kyc.upi_id} onChange={e=>setKyc({...kyc, upi_id: e.target.value})} placeholder="yourname@upi" data-testid="kyc-upi"/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Bank account no.</label>
            <input className="input-dark mt-2" value={kyc.bank_account_number} onChange={e=>setKyc({...kyc, bank_account_number: e.target.value})}/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">IFSC</label>
            <input className="input-dark mt-2 uppercase" value={kyc.ifsc} onChange={e=>setKyc({...kyc, ifsc: e.target.value.toUpperCase()})}/>
          </div>
          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <p className="text-[11px] text-[var(--muted-2)]">Your details are stored securely and used only to process payouts.</p>
            <button disabled={saving} className="btn-amber rounded-full px-5 py-2.5 text-xs disabled:opacity-60" data-testid="kyc-submit">{saving ? "Submitting…" : "Submit KYC"}</button>
          </div>
        </form>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl mb-4">Payout history</h2>
        {data?.history?.length ? (
          <div className="card-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">
                <tr className="border-b border-[var(--border)]"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody>
                {data.history.map((p,i)=>(
                  <tr key={p.id || i} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-[var(--accent)]">{formatINR(p.amount)}</td>
                    <td className="px-4 py-3 text-xs uppercase">{p.method || "—"}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-panel p-8 text-center">
            <div className="font-display text-lg">No payouts yet</div>
            <p className="text-xs text-[var(--muted)] mt-2">Once you request a payout it'll show up here with its live status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
