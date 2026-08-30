import { useMemo, useState } from "react";
import { Calculator, TrendingUp } from "lucide-react";

const formatINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.round(n));

export default function ProfitCalculator({ defaultAccount = 500000 }) {
  const [account, setAccount] = useState(defaultAccount);
  const [annualReturn, setAnnualReturn] = useState(96);
  const [split, setSplit] = useState(75);

  const { grossAnnual, yourAnnual } = useMemo(() => {
    const g = (account * annualReturn) / 100;
    const y = (g * split) / 100;
    return { grossAnnual: g, yourAnnual: y };
  }, [account, annualReturn, split]);

  return (
    <section className="container-xl py-16" data-testid="profit-calculator">
      <div className="glass-card p-6 md:p-10">
        <div className="flex items-center gap-3 mb-2">
          <Calculator size={20} className="text-[var(--accent)]"/>
          <div className="chip">Profit Calculator</div>
        </div>
        <h2 className="font-display text-2xl md:text-3xl mt-3">See how much you could earn</h2>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">Move the sliders to project your annual take-home based on account size and returns.</p>

        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mb-2"><span>Account Size</span><span className="text-white">{formatINR(account)}</span></div>
              <input type="range" min="100000" max="500000" step="50000" value={account} onChange={(e)=>setAccount(Number(e.target.value))} className="w-full accent-[var(--accent)]" data-testid="calc-account"/>
            </div>
            <div>
              <div className="flex justify-between text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mb-2"><span>Annual Return %</span><span className="text-white">{annualReturn}%</span></div>
              <input type="range" min="20" max="240" step="10" value={annualReturn} onChange={(e)=>setAnnualReturn(Number(e.target.value))} className="w-full accent-[var(--accent)]" data-testid="calc-return"/>
            </div>
            <div>
              <div className="flex justify-between text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mb-2"><span>Your Profit Split</span><span className="text-white">{split}%</span></div>
              <input type="range" min="70" max="90" step="5" value={split} onChange={(e)=>setSplit(Number(e.target.value))} className="w-full accent-[var(--accent)]" data-testid="calc-split"/>
            </div>
          </div>

          <div className="space-y-3">
            <div className="card-panel p-5">
              <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider">Gross Annual Profit</div>
              <div className="font-display text-2xl mt-1">{formatINR(grossAnnual)}</div>
            </div>
            <div className="card-panel p-5 glow-border">
              <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider flex items-center gap-1"><TrendingUp size={12}/> Your Annual Take-Home</div>
              <div className="font-display text-3xl mt-1 text-[var(--accent)]" data-testid="calc-annual">{formatINR(yourAnnual)}</div>
            </div>
            <div className="text-[10px] text-[var(--muted-2)] leading-relaxed">Illustrative only. Actual results depend on trading performance and adherence to rules.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
