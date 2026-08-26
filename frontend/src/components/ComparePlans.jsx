import { CheckCircle2, MinusCircle } from "lucide-react";

const formatINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function ComparePlans({ plans }) {
  if (!plans || plans.length === 0) return null;
  const rows = [
    { label: "Account Size", key: "account_size", render: (v) => formatINR(v) },
    { label: "Challenge Fee", key: "challenge_fee", render: (v) => formatINR(v) },
    { label: "Profit Split", key: "profit_share", render: (v) => `${v}%` },
    { label: "Profit Target", key: "profit_target_points", render: (v) => `${v} pts` },
    { label: "Max Loss", key: "max_loss_limit", render: (v) => `${v}%` },
    { label: "Min Trading Days", key: "min_trading_days", render: (v) => v },
    { label: "Total Trading Days", key: "total_trading_days", render: (v) => v },
    { label: "Trades Per Day", key: "trades_per_day", render: (v) => v || "Unlimited" },
  ];
  return (
    <section className="container-xl py-16" data-testid="compare-plans">
      <div className="mb-8">
        <div className="chip mb-3">Compare</div>
        <h2 className="font-display text-2xl md:text-3xl">Compare all plans side-by-side</h2>
      </div>
      <div className="card-panel overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-4 text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono font-normal">Feature</th>
              {plans.map(p => (
                <th key={p.id} className="text-left p-4">
                  <div className="font-display text-lg">{p.name}</div>
                  {p.popular && <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--accent)] mt-1">Most Popular</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-[var(--border)]/60 hover:bg-[rgba(255,255,255,0.02)]">
                <td className="p-4 text-[var(--muted)] whitespace-nowrap">{r.label}</td>
                {plans.map(p => (
                  <td key={p.id} className="p-4 font-mono text-white">{r.render(p[r.key])}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-4 text-[var(--muted)]">24h Payouts</td>
              {plans.map(p => (
                <td key={p.id} className="p-4"><CheckCircle2 size={16} className="text-[var(--emerald)]"/></td>
              ))}
            </tr>
            <tr>
              <td className="p-4 text-[var(--muted)]">Scaling Plan</td>
              {plans.map(p => (
                <td key={p.id} className="p-4">{p.account_size >= 200000 ? <CheckCircle2 size={16} className="text-[var(--emerald)]"/> : <MinusCircle size={16} className="text-[var(--muted-2)]"/>}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
