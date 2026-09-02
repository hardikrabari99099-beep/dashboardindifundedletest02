import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatINR } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { useReveal } from "../lib/useReveal";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import PayoutCertificates from "../components/PayoutCertificates";
import HowItWorks from "../components/HowItWorks";
import LivePayoutCounter from "../components/LivePayoutCounter";
import TrustStrip from "../components/TrustStrip";
import RatingsBar from "../components/RatingsBar";
import ProfitCalculator from "../components/ProfitCalculator";
import WeeklyHighestPayout from "../components/WeeklyHighestPayout";
import { ArrowRight, ShieldCheck, Trophy, Flame, Rocket, Star, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [plans, setPlans] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const { settings } = useSettings();
  const { user } = useAuth();
  const challengesHref = user ? "/challenges" : "/login?next=/challenges";
  const h = settings.hero, st = settings.steps, tests = settings.testimonials || [];
  useReveal([plans, blogs]);
  useSEO({
    title: "India's 1st Prop Trading Firm — Get Funded up to ₹5 Lakh",
    description: "IndiFunded — India's 1st prop trading firm. Pass the challenge, get a funded trading account up to ₹5,00,000. Trade NSE, BankNifty, Nifty50 with 70% profit split and 24-hour payouts.",
    path: "/",
  });
  useEffect(()=>{
    api.get("/plans").then(r=>setPlans(r.data)).catch(()=>{});
    api.get("/blogs").then(r=>setBlogs(r.data)).catch(()=>{});
  },[]);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden="true"/>
        {/* Floating decorative orbs + 3D coins */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <span className="orb orb-1"/>
          <span className="orb orb-2"/>
          <span className="orb orb-3"/>
          <div className="coin-3d coin-a"><div className="coin-inner"><div className="face">₹</div><div className="face back">₹</div></div></div>
          <div className="coin-3d coin-b"><div className="coin-inner"><div className="face">₹</div><div className="face back">₹</div></div></div>
          <div className="coin-3d coin-c"><div className="coin-inner"><div className="face">₹</div><div className="face back">₹</div></div></div>
        </div>
        <div className="container-xl pt-12 md:pt-20 pb-16 md:pb-28 relative">
          <div className="reveal-up chip mb-5 md:mb-6" data-testid="hero-chip"><span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse"/> {h.chip}</div>
          <h1 className="font-display text-4xl md:text-7xl font-semibold leading-[0.98] max-w-4xl reveal-up" style={{animationDelay:"80ms"}}>
            {h.title_before} <span className="text-[var(--accent)] pulse-accent">{h.title_highlight}</span> {h.title_after}
          </h1>
          <p className="mt-4 md:mt-6 text-base md:text-lg text-[var(--muted)] max-w-2xl reveal-up" style={{animationDelay:"160ms"}}>
            {h.subtitle}
          </p>
          <div className="mt-6 md:mt-8 flex flex-wrap gap-3 reveal-up" style={{animationDelay:"240ms"}}>
            <Link to={challengesHref} className="btn-amber px-6 md:px-7 py-3 md:py-3.5 rounded-full inline-flex items-center gap-2 text-sm md:text-base" data-testid="hero-cta-primary">
              {h.cta_primary} <ArrowRight size={16}/>
            </Link>
            <Link to="/rules" className="btn-ghost px-6 md:px-7 py-3 md:py-3.5 rounded-full inline-flex items-center gap-2 text-sm md:text-base" data-testid="hero-cta-secondary">{h.cta_secondary}</Link>
          </div>

          {/* stat strip */}
          <div className="mt-10 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 reveal-up" style={{animationDelay:"320ms"}}>
            {(h.stats || []).map((s,i)=>(
              <div key={i} className="glass-card p-4 md:p-6" data-testid={`hero-stat-${i}`}>
                <div className="font-display text-2xl md:text-4xl text-white">{s.k}</div>
                <div className="text-[10px] md:text-xs tracking-wider uppercase text-[var(--muted-2)] mt-1 md:mt-2">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ticker removed — replaced by auto-playing certificate slider below */}
      </section>

      {/* TRUST STRIP */}
      <TrustStrip />

      {/* RATINGS (Trustpilot + PropFirmMatch) */}
      <RatingsBar />

      {/* LIVE COUNTER */}
      <LivePayoutCounter />

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* PATH TO FUNDING */}
      <section className="container-xl py-24">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="chip mb-4">Your Path to Funding</div>
            <h2 className="font-display text-4xl md:text-5xl max-w-2xl">{st.title_prefix} {st.title_suffix}</h2>
          </div>
          <Link to="/challenges" className="link-underline text-sm text-[var(--muted)]">See all plans →</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {(st.items || []).map((s,i)=>{
            const iconMap = [<Flame/>, <ShieldCheck/>, <Trophy/>];
            return (
              <div key={i} data-reveal data-reveal-delay={String((i%3)+1)} className="glass-card hover-lift p-7 relative" data-testid={`path-step-${i}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-[var(--muted-2)]">STEP {s.n}</div>
                  <div className="w-10 h-10 rounded-xl grid place-items-center border border-[var(--border-hi)] text-[var(--accent)]">{iconMap[i] || <Flame/>}</div>
                </div>
                <div className="font-display text-2xl mt-10">{s.t}</div>
                <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{s.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PLANS */}
      <section className="container-xl py-24">
        <div className="mb-12">
          <div className="chip mb-4">Plans</div>
          <h2 className="font-display text-4xl md:text-5xl max-w-3xl">Prove your skills. Pick your plan.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 pt-4">
          {plans.map((p,i)=>(
            <div key={p.id} data-reveal data-reveal-delay={String((i%3)+1)}
                 className={`card-panel hover-lift p-8 pt-10 relative ${p.popular ? "glow-border" : ""}`}
                 data-testid={`home-plan-${i}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:left-7 md:translate-x-0 text-[10px] tracking-widest font-mono uppercase px-3 py-1 rounded-full bg-[var(--accent)] text-white shadow-lg whitespace-nowrap z-10">Most Popular</div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">{p.name}</div>
                  <div className="font-display text-3xl mt-2">{formatINR(p.account_size)}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">Account Size</div>
                </div>
                <Rocket className="text-[var(--accent)]" size={20}/>
              </div>
              <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-2">
                {p.features?.slice(0,4).map((f,idx)=>(
                  <div key={idx} className="flex items-start gap-2 text-sm text-[var(--muted)]"><CheckCircle2 size={14} className="mt-1 text-[var(--emerald)]"/>{f}</div>
                ))}
              </div>
              <div className="flex items-end justify-between mt-7">
                <div>
                  <div className="text-xs text-[var(--muted-2)]">Challenge Fee</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <div className="font-display text-2xl text-white">{formatINR(p.challenge_fee)}</div>
                    {p.original_price && p.original_price > p.challenge_fee && (
                      <>
                        <div className="text-sm text-[var(--muted-2)] line-through">{formatINR(p.original_price)}</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(41,211,154,0.15)] text-[var(--accent)]">
                          -{Math.round(((p.original_price - p.challenge_fee) / p.original_price) * 100)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Link to={challengesHref} className="btn-amber rounded-full px-5 py-2.5 text-sm" data-testid={`home-plan-cta-${i}`}>Buy Now</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <PayoutCertificates />

      {/* WEEKLY HIGHEST PAYOUT — per plan, last 7 days */}
      <WeeklyHighestPayout />

      {/* PROFIT CALCULATOR */}
      <ProfitCalculator />

      <section className="container-xl py-24">
        <div className="mb-12">
          <div className="chip mb-4">Stories</div>
          <h2 className="font-display text-4xl md:text-5xl max-w-3xl">Why traders choose IndiFunded</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {tests.map((t,i)=>(
            <div key={i} data-reveal data-reveal-delay={String((i%3)+1)} className="glass-card p-8 hover-lift" data-testid={`testimonial-${i}`}>
              <div className="flex gap-1 text-[var(--accent)] mb-4">{[...Array(5)].map((_,k)=><Star key={k} size={14} fill="currentColor"/>)}</div>
              <p className="text-base text-white/90 leading-relaxed">“{t.q}”</p>
              <div className="mt-6 pt-5 border-t border-[var(--border)]">
                <div className="font-display">{t.a}</div>
                <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mt-1">{t.r}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BLOGS */}
      <section className="container-xl py-24">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="chip mb-4">Insights</div>
            <h2 className="font-display text-4xl md:text-5xl">Latest Updates</h2>
          </div>
          <Link to="/blog" className="link-underline text-sm text-[var(--muted)]">Read all →</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {blogs.slice(0,3).map((b,i)=>(
            <Link to={`/blog/${b.slug}`} key={b.id} data-reveal data-reveal-delay={String((i%3)+1)} className="card-panel hover-lift overflow-hidden block" data-testid={`home-blog-${i}`}>
              <div className="h-44 bg-cover bg-center" style={{backgroundImage:`url(${b.cover_image})`}}/>
              <div className="p-6">
                <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-2)]">Article</div>
                <div className="font-display text-lg mt-2 line-clamp-2">{b.title}</div>
                <p className="text-sm text-[var(--muted)] mt-3 line-clamp-2">{b.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-xl pt-12 pb-24">
        <div className="card-panel glow-border p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8" data-testid="bottom-cta">
          <div>
            <h3 className="font-display text-3xl md:text-4xl max-w-xl">Stop risking your own capital. Trade ours.</h3>
            <p className="text-[var(--muted)] mt-3 max-w-xl">One challenge. Funded in 24h after verification. 70% profits to you.</p>
          </div>
          <Link to={challengesHref} className="btn-amber rounded-full px-7 py-3.5 inline-flex items-center gap-2 whitespace-nowrap">Start Your Challenge <ArrowRight size={16}/></Link>
        </div>
      </section>
    </div>
  );
}
