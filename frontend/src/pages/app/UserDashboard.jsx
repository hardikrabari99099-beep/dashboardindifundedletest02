import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, formatINR } from "../../lib/api";
import { Wallet, Briefcase, TrendingUp, Coins, ArrowRight, Rocket } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/me/dashboard").then(r=>setData(r.data)).catch(()=>{}); }, []);
  const firstName = (user?.name || "there").split(" ")[0];

  const stat = (label, value, sub, Icon) => (
    <div className="card-panel p-5 md:p-6" data-testid={`stat-${label.toLowerCase().replace(/[^a-z]/g,"")}`}>
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">{label}</div>
        <Icon size={16} className="text-[var(--accent)]"/>
      </div>
      <div className="font-display text-3xl md:text-4xl mt-3 text-white">{value}</div>
      {sub && <div className="text-xs text-[var(--muted-2)] mt-1">{sub}</div>}
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Welcome back, {firstName} <span className="align-middle">👋</span></h1>
          <p className="text-sm text-[var(--muted)] mt-2">Here's how your funded trading is looking today.</p>
        </div>
        <Link to="/challenges" className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2">Buy new account <ArrowRight size={14}/></Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {stat("Simulated capital", formatINR(data?.simulated_capital || 0), `${data?.funded_accounts_active || 0} active`, Coins)}
        {stat("Funded accounts", data?.funded_accounts_active ?? "—", `${data?.funded_accounts_total || 0} total`, Briefcase)}
        {stat("Net P&L", formatINR(data?.net_pnl || 0), "across all accounts", TrendingUp)}
        {stat("Total paid out", formatINR(data?.total_paid_out || 0), `${data?.payouts_count || 0} payouts`, Wallet)}
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl">Your accounts</h2>
          <Link to="/app/accounts" className="link-underline text-sm text-[var(--muted)]">View all →</Link>
        </div>

        {data?.accounts?.length ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.accounts.map((o,i)=>(
              <div key={o.id || i} className="card-panel p-5" data-testid={`account-card-${i}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">Plan</div>
                    <div className="font-display text-xl mt-1">{o.plan_name}</div>
                  </div>
                  <Rocket size={16} className="text-[var(--accent)]"/>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--muted)]">
                  Paid {formatINR(o.amount)} · {o.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-panel p-8 text-center">
            <div className="font-display text-xl">No accounts yet</div>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-md mx-auto">Buy your first funded account and it'll appear here instantly after payment.</p>
            <Link to="/challenges" className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2 mt-5">Get funded <ArrowRight size={14}/></Link>
          </div>
        )}
      </div>
    </div>
  );
}
