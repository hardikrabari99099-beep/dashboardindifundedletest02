import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatINR } from "../../lib/api";
import { ArrowRight, Rocket } from "lucide-react";

export default function UserAccounts() {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    api.get("/me/accounts").then(r=>{setRows(r.data||[]); setLoaded(true);}).catch(()=>setLoaded(true));
  }, []);
  const statusBadge = (s) => {
    const map = {
      "pending_payment": { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Awaiting payment" },
      "pending_verification": { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
      "completed": { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Active" },
      "rejected": { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "Rejected" },
    };
    const m = map[s] || map["pending_verification"];
    return <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full" style={{background:m.bg, color:m.text}}>{m.label}</span>;
  };

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Accounts</h1>
          <p className="text-sm text-[var(--muted)] mt-2">All your challenge and funded accounts, with live rules and progress.</p>
        </div>
        <Link to="/challenges" className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2">Buy new account <ArrowRight size={14}/></Link>
      </div>

      {!loaded ? (
        <div className="card-panel p-8 mt-10 text-center text-[var(--muted)]">Loading…</div>
      ) : rows.length ? (
        <div className="grid md:grid-cols-2 gap-4 mt-10">
          {rows.map((o,i)=>(
            <div key={o.id || i} className="card-panel p-6" data-testid={`user-account-${i}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">Plan</div>
                  <div className="font-display text-2xl mt-1">{o.plan_name}</div>
                </div>
                <Rocket size={18} className="text-[var(--accent)]"/>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <div className="text-[var(--muted)]">Paid <span className="text-white font-mono">{formatINR(o.amount)}</span></div>
                {statusBadge(o.status)}
              </div>
              <div className="text-[11px] text-[var(--muted-2)] mt-3 font-mono">{new Date(o.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-panel p-10 mt-10 text-center">
          <div className="font-display text-2xl">You don't have any accounts yet</div>
          <p className="text-sm text-[var(--muted)] mt-3 max-w-md mx-auto">Pick an account type and size, pay once, and start trading simulated capital immediately.</p>
          <Link to="/challenges" className="btn-amber rounded-full px-6 py-3 text-sm mt-6 inline-flex items-center gap-2">Browse accounts <ArrowRight size={14}/></Link>
        </div>
      )}

      <div className="mt-10 card-panel p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div>
          <div className="chip mb-2">New · ₹999 Starter · Limited run</div>
          <div className="font-display text-xl">A full evaluation on ₹50,000 for ₹999</div>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-lg">Same rules, same up to 70% profit split — our cheapest way in.</p>
        </div>
        <Link to="/challenges" className="btn-amber rounded-full px-5 py-2.5 text-sm whitespace-nowrap">Start for ₹999</Link>
      </div>
    </div>
  );
}
