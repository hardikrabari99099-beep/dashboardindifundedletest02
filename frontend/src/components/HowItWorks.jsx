import { ShoppingCart, Target, Wallet, TrendingUp } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const iconMap = { ShoppingCart: <ShoppingCart size={20}/>, Target: <Target size={20}/>, Wallet: <Wallet size={20}/>, TrendingUp: <TrendingUp size={20}/> };
const iconList = [<ShoppingCart size={20}/>, <Target size={20}/>, <Wallet size={20}/>, <TrendingUp size={20}/>];

const defaultItems = [
  { t: "Purchase Challenge", d: "Pick a plan and pay via UPI. Get instant access to your evaluation account.", i: "ShoppingCart" },
  { t: "Pass Evaluation", d: "Hit the profit target within the trading window while respecting the max loss cap.", i: "Target" },
  { t: "Get Funded", d: "KYC + verification in 24h. Receive your real funded trading account.", i: "Wallet" },
  { t: "Withdraw Profits", d: "Keep 70% of profits. Payouts processed within 24 hours to your bank.", i: "TrendingUp" },
];

export default function HowItWorks() {
  const { settings } = useSettings();
  const cfg = settings.how_it_works || {};
  if (cfg.enabled === false) return null;
  const items = cfg.items && cfg.items.length ? cfg.items : defaultItems;
  return (
    <section className="container-xl py-16 md:py-24" data-testid="how-it-works">
      <div className="mb-10 md:mb-14">
        <div className="chip mb-4">How It Works</div>
        <h2 className="font-display text-3xl md:text-5xl max-w-3xl">{cfg.title || "Four simple steps to funded trading"}</h2>
        <p className="text-[var(--muted)] mt-3 md:mt-4 max-w-2xl">{cfg.subtitle || "No hidden hoops. Just discipline, strategy, and payouts."}</p>
      </div>
      <div className="relative">
        <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[var(--border-hi)] to-transparent" aria-hidden="true"/>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 md:gap-4 relative">
          {items.slice(0, 4).map((s, i) => (
            <div key={i} data-reveal data-reveal-delay={String((i%4)+1)} className="relative">
              <div className="flex md:flex-col items-start gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl grid place-items-center border border-[var(--border-hi)] bg-[var(--bg-2)] relative shrink-0 text-[var(--accent)]">
                  {iconMap[s.i] || iconList[i] || <ShoppingCart size={20}/>}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[10px] font-mono grid place-items-center font-bold">0{i+1}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base md:text-lg md:mt-2">{s.t}</div>
                  <p className="text-sm text-[var(--muted)] mt-1.5 md:mt-2 leading-relaxed">{s.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
