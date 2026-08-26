import { useEffect, useState } from "react";
import { api, formatINR } from "../lib/api";

/**
 * Continuous auto-scrolling certificate ticker (like fundedfriday's payout wall).
 * - Horizontal marquee, seamless loop
 * - Pauses on hover
 * - Multiple certificates visible at once
 */
export default function PayoutCertificates() {
  const [certs, setCerts] = useState([]);
  useEffect(() => {
    api.get("/certificates").then(r => setCerts(r.data)).catch(() => {});
  }, []);
  if (!certs.length) return null;
  const loop = [...certs, ...certs, ...certs]; // triple loop for seamless
  return (
    <section className="py-24" data-testid="payout-certificates-section">
      <div className="container-xl mb-10">
        <div className="chip mb-4">Weekly Payouts</div>
        <h2 className="font-display text-4xl md:text-5xl max-w-3xl">Real traders. Real payouts.</h2>
        <p className="text-[var(--muted)] mt-3 max-w-2xl">Live receipts of what we send to our funded traders — every single week.</p>
      </div>
      <div className="cert-marquee-wrap" data-testid="cert-marquee">
        <div className="cert-marquee">
          {loop.map((c, i) => (
            <div key={`${c.id}-${i}`} className="cert-card" data-testid={`cert-card-${i}`}>
              <img src={c.image_url} alt={`Payout to ${c.trader_name || "trader"}`} loading="lazy"/>
              {(c.trader_name || c.amount > 0) && (
                <div className="cert-meta flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm">{c.trader_name || "—"}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-2)] mt-0.5">{c.plan || "Payout"}{c.payout_date ? ` · ${c.payout_date}` : ""}</div>
                  </div>
                  {c.amount > 0 && <div className="font-display text-[var(--accent)] text-lg">+{formatINR(c.amount)}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
