import { ShieldCheck } from "lucide-react";

import { useSettings } from "../context/SettingsContext";

const defaultPartners = ["Zerodha", "Angel One", "Upstox", "Dhan", "Groww", "NSE", "BSE"];

export default function TrustStrip() {
  const { settings } = useSettings();
  const cfg = settings.trust_strip || {};
  if (cfg.enabled === false) return null;
  const partners = cfg.partners && cfg.partners.length ? cfg.partners : defaultPartners;
  return (
    <section className="border-y border-[var(--border)] bg-[rgba(255,255,255,0.02)] py-6 md:py-8" data-testid="trust-strip">
      <div className="container-xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-3 shrink-0 text-center md:text-left">
          <ShieldCheck size={20} className="text-[var(--emerald)] hidden md:block"/>
          <div>
            <div className="font-display text-base md:text-lg text-white">{cfg.title || "Trusted by 5,000+ Indian Traders"}</div>
            <div className="text-[10px] md:text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider">{cfg.subtitle || "Works with your preferred broker"}</div>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-x-5 md:gap-x-8 gap-y-2 justify-center opacity-80">
          {partners.map(p => (
            <div key={p} className="font-mono text-[11px] md:text-sm uppercase tracking-widest text-[var(--muted)]">{p}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
