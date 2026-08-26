import { useSettings } from "../context/SettingsContext";
import { Star } from "lucide-react";

/**
 * External review-platform ratings strip (e.g. Trustpilot, PropFirmMatch).
 * Fully driven by settings.ratings — admins can edit platform, rating,
 * out-of, review count, brand color, and target URL.
 */
export default function RatingsBar() {
  const { settings } = useSettings();
  const r = settings.ratings || {};
  const items = r.items || [];
  if (r.enabled === false || items.length === 0) return null;

  return (
    <section className="container-xl py-10 md:py-14" data-testid="ratings-bar">
      <div className="glass-card p-5 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8">
          <div className="min-w-0">
            <div className="chip mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse mr-2 inline-block"/>
              {r.heading || "Rated by traders"}
            </div>
            <p className="text-sm text-[var(--muted)] max-w-md">{r.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full md:w-auto">
            {items.map((it, i) => (
              <RatingCard key={i} item={it} idx={i}/>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RatingCard({ item, idx }) {
  const outOf = item.out_of || 5;
  const rating = Number(item.rating) || 0;
  const pct = Math.max(0, Math.min(1, rating / outOf));
  const filled = Math.round(pct * outOf);
  const color = item.color || "#29d39a";
  const inner = (
    <div
      className="flex items-center gap-3 md:gap-4 rounded-xl border border-[var(--border-hi)] bg-[rgba(255,255,255,0.02)] px-4 md:px-5 py-3 md:py-3.5 hover:border-[var(--accent)] transition-colors"
      data-testid={`rating-card-${idx}`}
    >
      <div
        className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
        style={{ background: `${color}20`, color: color }}
      >
        <Star size={20} fill={color} strokeWidth={0}/>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-display text-base md:text-lg leading-tight truncate">{item.platform}</div>
          <div className="flex items-center gap-0.5">
            {Array.from({length: outOf}).map((_, s) => (
              <Star key={s} size={12} fill={s < filled ? color : "transparent"} stroke={s < filled ? color : "var(--muted-2)"} strokeWidth={1.5}/>
            ))}
          </div>
        </div>
        <div className="text-xs text-[var(--muted-2)] font-mono mt-0.5">
          <span className="text-white font-semibold">{rating.toFixed(1)}</span> / {outOf} · {item.reviews?.toLocaleString?.() || item.reviews || 0}+ reviews
        </div>
      </div>
    </div>
  );
  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
  ) : inner;
}
