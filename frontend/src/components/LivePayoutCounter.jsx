import { useEffect, useRef, useState } from "react";
import { Users, Wallet, TrendingUp, Zap } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const defaultIcons = [<Users size={20}/>, <Wallet size={20}/>, <TrendingUp size={20}/>, <Zap size={20}/>];

function useCountUp(target, duration = 2000) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (t) => {
            const p = Math.min(1, (t - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [target, duration]);
  return [val, ref];
}

function Counter({ target, prefix = "", suffix = "", label, icon }) {
  const [val, ref] = useCountUp(target);
  const formatted = new Intl.NumberFormat("en-IN").format(val);
  return (
    <div ref={ref} className="glass-card p-4 md:p-8 text-center">
      <div className="w-10 h-10 md:w-12 md:h-12 mx-auto rounded-xl grid place-items-center border border-[var(--border-hi)] text-[var(--accent)] mb-3 md:mb-4">{icon}</div>
      <div className="font-display text-2xl md:text-4xl text-white">{prefix}{formatted}{suffix}</div>
      <div className="text-[10px] md:text-xs tracking-wider uppercase text-[var(--muted-2)] mt-1 md:mt-2">{label}</div>
    </div>
  );
}

export default function LivePayoutCounter() {
  const { settings } = useSettings();
  const cfg = settings.live_counter || {};
  if (cfg.enabled === false) return null;
  const items = cfg.items && cfg.items.length ? cfg.items : [
    { label: "Traders Funded", value: 5247, suffix: "+", prefix: "" },
    { label: "Total Payouts", value: 12480000, suffix: "", prefix: "₹" },
    { label: "Profit Split", value: 70, suffix: "%", prefix: "" },
    { label: "Payout Speed", value: 24, suffix: "h", prefix: "" },
  ];
  return (
    <section className="container-xl py-16 md:py-20" data-testid="live-counter">
      <div className="mb-8 md:mb-10 text-center">
        <div className="chip inline-flex mb-4"><span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse mr-2"/> Live Numbers</div>
        <h2 className="font-display text-2xl md:text-4xl">{cfg.heading || "Trusted by India's growing trader community"}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {items.slice(0, 4).map((it, i) => (
          <Counter key={i} target={Number(it.value) || 0} prefix={it.prefix || ""} suffix={it.suffix || ""} label={it.label} icon={defaultIcons[i]}/>
        ))}
      </div>
    </section>
  );
}
