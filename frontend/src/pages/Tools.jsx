import { useState, useMemo } from "react";
import { useSEO } from "../lib/useSEO";
import { Calculator, Percent, TrendingDown, LineChart } from "lucide-react";

const formatINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.round(n));
const num = (n, d = 2) => Number.isFinite(n) ? n.toFixed(d) : "—";

function Card({ title, icon, children, tag }) {
  return (
    <div className="glass-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl grid place-items-center border border-[var(--border-hi)] text-[var(--accent)]">{icon}</div>
        <div>
          <div className="font-display text-lg">{title}</div>
          {tag && <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">{tag}</div>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({ label, value, right }) {
  return (
    <div className="flex justify-between items-baseline text-sm border-b border-[var(--border)]/60 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-mono text-white">{right ?? value}</span>
    </div>
  );
}

function Input({ label, value, onChange, suffix, min, step = 1 }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mb-1.5">{label}</div>
      <div className="flex items-center bg-[var(--bg-1)] border border-[var(--border-hi)] rounded-lg px-3">
        <input type="number" value={value} min={min} step={step} onChange={(e)=>onChange(e.target.value === "" ? "" : Number(e.target.value))} className="flex-1 bg-transparent py-2.5 text-white font-mono focus:outline-none"/>
        {suffix && <span className="text-xs text-[var(--muted-2)] font-mono">{suffix}</span>}
      </div>
    </label>
  );
}

function PositionSize() {
  const [account, setAccount] = useState(500000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(500);
  const [stop, setStop] = useState(495);
  const { risk, qty } = useMemo(() => {
    const r = (account * riskPct) / 100;
    const perShare = Math.abs(entry - stop);
    const q = perShare > 0 ? r / perShare : 0;
    return { risk: r, qty: q };
  }, [account, riskPct, entry, stop]);
  return (
    <Card title="Position Size Calculator" icon={<Calculator size={18}/>} tag="Size trades right">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Account Size" value={account} onChange={setAccount} suffix="₹"/>
        <Input label="Risk %" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1}/>
        <Input label="Entry Price" value={entry} onChange={setEntry} suffix="₹" step={0.05}/>
        <Input label="Stop Loss Price" value={stop} onChange={setStop} suffix="₹" step={0.05}/>
      </div>
      <div className="mt-5 space-y-0">
        <Row label="Amount at Risk" right={formatINR(risk)}/>
        <Row label="Position Size (Qty)" right={num(qty, 0)}/>
      </div>
    </Card>
  );
}

function RiskReward() {
  const [entry, setEntry] = useState(500);
  const [stop, setStop] = useState(495);
  const [target, setTarget] = useState(510);
  const { rr, rewardPct, riskPct } = useMemo(() => {
    const r = Math.abs(entry - stop);
    const w = Math.abs(target - entry);
    return {
      rr: r > 0 ? w / r : 0,
      rewardPct: (w / entry) * 100,
      riskPct: (r / entry) * 100,
    };
  }, [entry, stop, target]);
  return (
    <Card title="Risk / Reward Calculator" icon={<Percent size={18}/>} tag="Grade each setup">
      <div className="grid grid-cols-3 gap-3">
        <Input label="Entry" value={entry} onChange={setEntry} suffix="₹" step={0.05}/>
        <Input label="Stop" value={stop} onChange={setStop} suffix="₹" step={0.05}/>
        <Input label="Target" value={target} onChange={setTarget} suffix="₹" step={0.05}/>
      </div>
      <div className="mt-5">
        <Row label="Risk :Reward" right={`1 : ${num(rr)}`}/>
        <Row label="Reward %" right={`${num(rewardPct)}%`}/>
        <Row label="Risk %" right={`${num(riskPct)}%`}/>
      </div>
    </Card>
  );
}

function Drawdown() {
  const [start, setStart] = useState(500000);
  const [maxLossPct, setMaxLossPct] = useState(20);
  const [dailyLossPct, setDailyLossPct] = useState(5);
  const { maxLossAmt, dailyLossAmt, floor } = useMemo(() => {
    const m = (start * maxLossPct) / 100;
    const d = (start * dailyLossPct) / 100;
    return { maxLossAmt: m, dailyLossAmt: d, floor: start - m };
  }, [start, maxLossPct, dailyLossPct]);
  return (
    <Card title="Drawdown Calculator" icon={<TrendingDown size={18}/>} tag="Stay in the game">
      <div className="grid grid-cols-3 gap-3">
        <Input label="Starting Balance" value={start} onChange={setStart} suffix="₹"/>
        <Input label="Max Loss %" value={maxLossPct} onChange={setMaxLossPct} suffix="%" step={0.5}/>
        <Input label="Daily Loss %" value={dailyLossPct} onChange={setDailyLossPct} suffix="%" step={0.5}/>
      </div>
      <div className="mt-5">
        <Row label="Max Loss Amount" right={formatINR(maxLossAmt)}/>
        <Row label="Daily Loss Limit" right={formatINR(dailyLossAmt)}/>
        <Row label="Account Floor" right={formatINR(floor)}/>
      </div>
    </Card>
  );
}

function LotSize() {
  const [account, setAccount] = useState(500000);
  const [riskPct, setRiskPct] = useState(1);
  const [slPoints, setSlPoints] = useState(30);
  const [lotSize, setLotSize] = useState(25);
  const { risk, lots, contracts } = useMemo(() => {
    const r = (account * riskPct) / 100;
    const perLot = slPoints * lotSize;
    const l = perLot > 0 ? r / perLot : 0;
    return { risk: r, lots: l, contracts: Math.floor(l) * lotSize };
  }, [account, riskPct, slPoints, lotSize]);
  return (
    <Card title="Lot Size Calculator (F&O)" icon={<LineChart size={18}/>} tag="Nifty / BankNifty">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Account Size" value={account} onChange={setAccount} suffix="₹"/>
        <Input label="Risk %" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1}/>
        <Input label="Stop Loss (points)" value={slPoints} onChange={setSlPoints} suffix="pts"/>
        <Input label="Lot Size" value={lotSize} onChange={setLotSize} suffix="units"/>
      </div>
      <div className="mt-5">
        <Row label="Amount at Risk" right={formatINR(risk)}/>
        <Row label="Lots You Can Trade" right={num(lots, 2)}/>
        <Row label="Total Contracts" right={num(contracts, 0)}/>
      </div>
    </Card>
  );
}

export default function Tools() {
  useSEO({
    title: "Trading Tools & Calculators — Position Size, Risk, Drawdown, Lot Size",
    description: "Free trading calculators from IndiFunded — position size, risk/reward, drawdown, and F&O lot size calculators for Indian traders.",
    path: "/tools",
  });
  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4">Trader Tools</div>
      <h1 className="font-display text-4xl md:text-5xl max-w-3xl" data-testid="tools-title">Free calculators for disciplined trading</h1>
      <p className="text-[var(--muted)] mt-5 max-w-2xl">Use these tools to size your trades, control drawdown and grade every setup — the same math our funded traders use.</p>
      <div className="mt-12 grid md:grid-cols-2 gap-5">
        <PositionSize/>
        <RiskReward/>
        <Drawdown/>
        <LotSize/>
      </div>
    </div>
  );
}
