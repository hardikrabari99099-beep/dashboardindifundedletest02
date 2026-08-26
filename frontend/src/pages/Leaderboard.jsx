import { useEffect, useState } from "react";
import { api, formatINR } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { Trophy, Crown, Medal, Award, TrendingUp, CheckCircle2 } from "lucide-react";

const rankIcon = (i) => {
  if (i === 0) return <Crown size={20} className="text-[#f5b638]"/>;
  if (i === 1) return <Medal size={20} className="text-[#c0c0c0]"/>;
  if (i === 2) return <Award size={20} className="text-[#cd7f32]"/>;
  return <span className="font-mono text-[var(--muted-2)]">#{i+1}</span>;
};

export default function Leaderboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useSEO({
    title: "Trader Leaderboard — Top Funded Traders on IndiFunded",
    description: "See India's top-performing prop traders on IndiFunded ranked by total payouts. Real traders, real profits, verified payouts.",
    path: "/leaderboard",
  });
  useEffect(() => {
    api.get("/leaderboard?limit=30").then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4 inline-flex"><Trophy size={12} className="mr-1.5"/> Leaderboard</div>
      <h1 className="font-display text-4xl md:text-5xl max-w-3xl" data-testid="leaderboard-title">Top IndiFunded Traders</h1>
      <p className="text-[var(--muted)] mt-4 max-w-2xl">Ranked by verified lifetime payouts. Updated in real time as our funded traders earn.</p>

      {loading ? (
        <div className="mt-12 text-center text-[var(--muted-2)]">Loading leaderboard…</div>
      ) : items.length === 0 ? (
        <div className="mt-12 card-panel p-10 text-center">
          <Trophy size={40} className="mx-auto text-[var(--muted-2)] mb-4"/>
          <div className="font-display text-xl">Leaderboard coming soon</div>
          <p className="text-sm text-[var(--muted)] mt-2">Be one of our first funded traders to appear here.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-3">
          {items.map((t, i) => {
            const isTop3 = i < 3;
            return (
              <div key={t.id} className={`glass-card p-5 md:p-6 flex items-center gap-4 md:gap-6 ${isTop3 ? "glow-border" : ""}`} data-testid={`leaderboard-row-${i}`}>
                <div className="w-12 md:w-14 shrink-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full grid place-items-center border border-[var(--border-hi)] bg-[var(--bg-2)]">{rankIcon(i)}</div>
                </div>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-[var(--bg-2)] border border-[var(--border-hi)] shrink-0">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" loading="lazy"/>
                  ) : (
                    <div className="w-full h-full grid place-items-center font-display text-lg text-[var(--muted)]">{t.name?.charAt(0) || "?"}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display text-base md:text-lg truncate">{t.name}</div>
                    {t.verified && <CheckCircle2 size={14} className="text-[var(--emerald)] shrink-0"/>}
                  </div>
                  <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mt-1 flex items-center gap-2">
                    <span>{t.plan}</span>
                    {t.city && <><span>·</span><span>{t.city}</span></>}
                    {t.rank_note && <><span>·</span><span className="text-[var(--accent)]">{t.rank_note}</span></>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg md:text-2xl text-[var(--accent)] flex items-center gap-1 justify-end"><TrendingUp size={16}/> {formatINR(t.total_payout)}</div>
                  <div className="text-[10px] text-[var(--muted-2)] font-mono uppercase tracking-wider mt-0.5">Total Payouts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
