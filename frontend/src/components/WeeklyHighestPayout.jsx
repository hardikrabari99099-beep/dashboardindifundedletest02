import { useEffect, useState } from "react";
import { api, formatINR } from "../lib/api";
import { Trophy, Award } from "lucide-react";

export default function WeeklyHighestPayout() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/weekly-highest-payouts").then(r => setRows(r.data || [])).catch(() => {});
  }, []);

  if (!rows.length) return null;

  return (
    <section className="container-xl py-16 md:py-24" data-testid="weekly-highest-payout">
      <div className="mb-10 md:mb-12">
        <div className="chip mb-4"><Trophy size={12}/> Weekly Highest Payout</div>
        <h2 className="font-display text-3xl md:text-5xl max-w-3xl">This week's top winners, by plan</h2>
        <p className="text-[var(--muted)] mt-3 max-w-2xl text-sm md:text-base">
          Highest payouts from IndiFunded traders in the last 7 days — the leaderboard resets every Monday.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {rows.map((r, i) => (
          <div key={i} className="glass-card hover-lift p-6 md:p-7 relative overflow-hidden" data-testid={`whp-${i}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">Plan</div>
                <div className="font-display text-lg mt-1 text-white">{r.plan || "—"}</div>
                {r.account_size ? (
                  <div className="text-xs text-[var(--muted)] mt-1">Account {formatINR(r.account_size)}</div>
                ) : null}
              </div>
              <div className="w-10 h-10 rounded-xl grid place-items-center border border-[var(--border-hi)] text-[var(--accent)]">
                <Award size={18}/>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-[var(--border)]">
              <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">Highest payout</div>
              <div className="font-display text-3xl md:text-4xl text-[var(--accent)] pulse-accent mt-1">
                {formatINR(r.amount || 0)}
              </div>
              <div className="text-xs text-[var(--muted)] mt-2">
                by <span className="text-white/90">{r.trader_name || "Anonymous"}</span>
                {r.payout_date ? <span> · {r.payout_date}</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
