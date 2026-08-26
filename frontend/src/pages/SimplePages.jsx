import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Link, useParams } from "react-router-dom";
import { api, formatApiError, formatINR } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { useSettings } from "../context/SettingsContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, ShieldCheck, Scale, BookOpen, TrendingDown, Users, Clock, CircleDollarSign, Zap, Star, TrendingUp } from "lucide-react";
import PayoutRequest from "./PayoutRequest";

const iconLibrary = {
  Scale: <Scale/>, TrendingDown: <TrendingDown/>, ShieldCheck: <ShieldCheck/>,
  BookOpen: <BookOpen/>, Users: <Users/>, CheckCircle2: <CheckCircle2/>,
  Clock: <Clock/>, CircleDollarSign: <CircleDollarSign/>, Zap: <Zap/>,
  Star: <Star/>, TrendingUp: <TrendingUp/>,
};

export function About() {
  const { settings } = useSettings();
  const a = settings.about;
  useSEO({
    title: "About Us — Built for Indian Traders",
    description: a.intro.slice(0, 155),
    path: "/about",
  });
  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4">About</div>
      <h1 className="font-display text-3xl sm:text-4xl md:text-6xl max-w-3xl" data-testid="about-title">{a.title}</h1>
      <p className="text-[var(--muted)] mt-6 max-w-3xl text-lg leading-relaxed">{a.intro}</p>
      <div className="grid md:grid-cols-3 gap-5 mt-14">
        {(a.cards || []).map((x,i)=>(
          <div key={i} className="glass-card p-7">
            <div className="font-display text-2xl">{x.t}</div>
            <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{x.d}</p>
          </div>
        ))}
      </div>
      <div className="glass-card p-10 md:p-14 mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h3 className="font-display text-3xl">{a.footer_title}</h3>
          <p className="text-[var(--muted)] mt-2 max-w-2xl">{a.footer_text}</p>
        </div>
        <Link to="/challenges" className="btn-amber rounded-full px-6 py-3 inline-flex items-center gap-2" data-testid="about-cta">Start Challenge <ArrowRight size={16}/></Link>
      </div>
    </div>
  );
}

export function Rules() {
  const { settings } = useSettings();
  const r = settings.rules;
  const b = settings.benefits || {};
  useSEO({
    title: "Trading Rules & Benefits — Profit Targets, Loss Limits & Payouts",
    description: (r.subtitle || "").slice(0, 155),
    path: "/rules",
  });
  return (
    <div className="container-xl pt-12 md:pt-16 pb-16 md:pb-24">
      <div className="chip mb-4">Rules</div>
      <h1 className="font-display text-3xl sm:text-4xl md:text-6xl max-w-3xl" data-testid="rules-title">{r.title}</h1>
      <p className="text-[var(--muted)] mt-4 md:mt-6 max-w-2xl text-sm md:text-base">{r.subtitle}</p>
      <div className="grid sm:grid-cols-2 gap-4 md:gap-5 mt-8 md:mt-14">
        {(r.items || []).map((x,i)=>(
          <div key={i} className="glass-card hover-lift p-5 md:p-7" data-testid={`rule-${i}`}>
            <div className="w-10 h-10 rounded-xl grid place-items-center border border-[var(--border-hi)] text-[var(--accent)]">{iconLibrary[x.i] || <CheckCircle2/>}</div>
            <div className="font-display text-lg md:text-2xl mt-4 md:mt-6">{x.t}</div>
            <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{x.d}</p>
          </div>
        ))}
      </div>

      {b.items && b.items.length > 0 && (
        <div className="mt-16 md:mt-24">
          <div className="chip mb-4">Benefits</div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl max-w-3xl">{b.title || "Why IndiFunded"}</h2>
          {b.subtitle && <p className="text-[var(--muted)] mt-3 max-w-2xl text-sm md:text-base">{b.subtitle}</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-8 md:mt-12">
            {b.items.map((f, i) => (
              <div key={i} className="card-panel hover-lift p-5 md:p-7" data-testid={`benefit-${i}`}>
                <div className="w-10 h-10 rounded-xl grid place-items-center border border-[var(--border-hi)] text-[var(--accent)]">{iconLibrary[f.i] || <CheckCircle2/>}</div>
                <div className="font-display text-lg md:text-xl mt-4 md:mt-6">{f.t}</div>
                <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Full dedicated Payouts page — replaces the "Recent Payouts" home section.
 * Data source: settings.payouts_page (fully editable from admin).
 */
export function Payouts() {
  const { settings } = useSettings();
  const p = settings.payouts_page || {};
  const items = p.items || [];
  const showForm = p.show_request_form !== false;
  useSEO({
    title: "Payouts — Request Your Payout & See Recent Trader Payouts",
    description: p.subtitle ? p.subtitle.slice(0, 155) : "Submit a payout request and see recent verified payouts to funded IndiFunded traders — processed within 24 hours.",
    path: "/payouts",
  });
  return (
    <div>
      {/* 1) PAYOUT REQUEST FORM comes first */}
      {showForm && <PayoutRequest embedded />}

      {/* 2) RECENT PAYOUTS below */}
      <div className="container-xl pt-4 pb-16 md:pb-24">
        <div className="chip mb-4"><span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse mr-2 inline-block"/> Recent Payouts</div>
        <h2 className="font-display text-2xl sm:text-3xl md:text-5xl max-w-3xl" data-testid="payouts-title">{p.heading || "Real payouts. Real traders. Real fast."}</h2>
        <p className="text-[var(--muted)] mt-3 md:mt-4 max-w-2xl text-sm md:text-base">{p.subtitle || "Verified payouts to funded IndiFunded traders — processed within 24 hours of profit verification."}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-8 md:mt-10">
          {items.map((it, i) => (
            <div key={i} className="glass-card p-4 md:p-5 flex items-start gap-3" data-testid={`payout-item-${i}`}>
              <div className="w-10 h-10 rounded-full bg-[rgba(41,211,154,0.15)] grid place-items-center text-[var(--emerald)] shrink-0">
                <CheckCircle2 size={18}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-sm truncate">{it.name}</div>
                  <div className="text-[var(--emerald)] font-mono text-sm whitespace-nowrap">+{formatINR(it.amount)}</div>
                </div>
                <div className="text-xs text-[var(--muted-2)] font-mono mt-1 truncate">{it.plan} · {it.city} · {it.days_ago}d ago</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const { settings } = useSettings();
  const groups = settings.faq_groups || [];
  const allQA = groups.flatMap(g => (g.items || []).map(it => [it.q, it.a]));
  useSEO({
    title: "FAQ — Trust, Challenge & Payouts",
    description: "Answers about IndiFunded — SEBI status, profit targets, payout timelines, segments allowed, broker integrations and challenge rules.",
    path: "/faq",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": allQA.map(([q, ans]) => ({
        "@type": "Question",
        "name": q,
        "acceptedAnswer": { "@type": "Answer", "text": ans }
      }))
    }
  });
  const first = groups[0]?.title;
  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4">FAQ</div>
      <h1 className="font-display text-3xl sm:text-4xl md:text-6xl max-w-3xl" data-testid="faq-title">Frequently asked questions</h1>
      {first && (
        <Tabs defaultValue={first} className="mt-12">
          <TabsList className="glass p-1 h-auto flex flex-wrap gap-1 rounded-2xl" data-testid="faq-tabs">
            {groups.map(g=>(
              <TabsTrigger key={g.title} value={g.title} className="data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white px-4 py-2 rounded-xl text-sm">{g.title}</TabsTrigger>
            ))}
          </TabsList>
          {groups.map(g=>(
            <TabsContent key={g.title} value={g.title} className="mt-8">
              <Accordion type="single" collapsible className="space-y-3">
                {(g.items || []).map((it,i)=>(
                  <AccordionItem key={i} value={`${g.title}-${i}`} className="glass-card border-0 px-6" data-testid={`faq-item-${g.title}-${i}`}>
                    <AccordionTrigger className="text-left font-display text-lg hover:text-[var(--accent)]">{it.q}</AccordionTrigger>
                    <AccordionContent className="text-[var(--muted)] leading-relaxed">{it.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

export function Blog() {
  const [blogs, setBlogs] = useState([]);
  useSEO({
    title: "Blog — Trading Insights, Strategies & Updates",
    description: "Trading insights, prop firm strategies, and updates from IndiFunded. Learn how to maximize profits with funded accounts, manage risk, and pass the challenge.",
    path: "/blog",
  });
  useEffect(()=>{ api.get("/blogs").then(r=>setBlogs(r.data)).catch(()=>{}); },[]);
  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4">Insights</div>
      <h1 className="font-display text-3xl sm:text-4xl md:text-6xl" data-testid="blog-title">Latest updates & resources</h1>
      <div className="grid md:grid-cols-3 gap-5 mt-12">
        {blogs.map((b,i)=>(
          <Link to={`/blog/${b.slug}`} key={b.id} className="glass-card hover-lift overflow-hidden block" data-testid={`blog-card-${i}`}>
            <div className="h-52 bg-cover bg-center" style={{backgroundImage:`url(${b.cover_image})`}}/>
            <div className="p-6">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-2)]">By {b.author}</div>
              <div className="font-display text-xl mt-2 line-clamp-2">{b.title}</div>
              <p className="text-sm text-[var(--muted)] mt-3 line-clamp-3">{b.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BlogDetail() {
  const { slug } = useParams();
  const [b, setB] = useState(null);
  useEffect(()=>{ api.get(`/blogs/${slug}`).then(r=>setB(r.data)).catch(()=>setB(false)); },[slug]);
  useSEO({
    title: b && b.title ? b.title : "Article",
    description: b && b.excerpt ? b.excerpt : "Trading insights from IndiFunded.",
    path: `/blog/${slug}`,
    image: b && b.cover_image ? b.cover_image : "/logo.jpg",
    type: "article",
  });
  if (b===null) return <div className="container-xl py-24 text-[var(--muted)]">Loading…</div>;
  if (b===false) return <div className="container-xl py-24">Post not found. <Link to="/blog" className="text-[var(--accent)]">Back to blog</Link></div>;
  return (
    <div className="container-xl pt-16 pb-24 max-w-3xl">
      <Link to="/blog" className="text-sm text-[var(--muted)] link-underline">← All posts</Link>
      <h1 className="font-display text-4xl md:text-5xl mt-6" data-testid="blog-detail-title">{b.title}</h1>
      <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-2)] mt-4">By {b.author} · {new Date(b.created_at).toLocaleDateString()}</div>
      {b.cover_image && <div className="h-80 mt-8 rounded-2xl bg-cover bg-center border border-[var(--border)]" style={{backgroundImage:`url(${b.cover_image})`}}/>}
      <div className="mt-8 text-[var(--muted)] leading-relaxed whitespace-pre-wrap">{b.content}</div>
    </div>
  );
}

export function Contact() {
  const { settings } = useSettings();
  const c = settings.contact;
  const [form, setForm] = useState({first_name:"",last_name:"",email:"",phone:"",city:"",challenge_type:"",platform:"",message:""});
  const [busy, setBusy] = useState(false);
  useSEO({
    title: "Contact Us — Talk to the IndiFunded Team",
    description: `Get in touch with IndiFunded. Email ${c.email} or WhatsApp ${c.whatsapp} for help with challenges, KYC, payouts and more.`,
    path: "/contact",
  });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/leads", form);
      toast.success("Thanks! Our team will contact you shortly.");
      setForm({first_name:"",last_name:"",email:"",phone:"",city:"",challenge_type:"",platform:"",message:""});
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Submission failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="container-xl pt-16 pb-24">
      <div className="chip mb-4">Contact</div>
      <h1 className="font-display text-3xl sm:text-4xl md:text-6xl max-w-3xl" data-testid="contact-title">Talk to the IndiFunded team</h1>
      <p className="text-[var(--muted)] mt-6 max-w-2xl">Our team will help you with queries and enrollment to start your challenge.</p>
      <div className="grid md:grid-cols-5 gap-8 mt-14">
        <form onSubmit={submit} className="glass-card p-8 md:col-span-3 space-y-5" data-testid="contact-form">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input required value={form.first_name} onChange={e=>setForm({...form, first_name:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-first-name"/></div>
            <div><Label>Last Name</Label><Input value={form.last_name} onChange={e=>setForm({...form, last_name:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-last-name"/></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Email</Label><Input required type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-email"/></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-phone"/></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={form.city} onChange={e=>setForm({...form, city:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-city"/></div>
            <div><Label>Challenge Type</Label><Input placeholder="Starter / Standard / Pro" value={form.challenge_type} onChange={e=>setForm({...form, challenge_type:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-challenge"/></div>
            <div><Label>Platform</Label><Input placeholder="Zerodha / Dhan / Angel" value={form.platform} onChange={e=>setForm({...form, platform:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-platform"/></div>
          </div>
          <div><Label>Message</Label><Textarea rows={4} value={form.message} onChange={e=>setForm({...form, message:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="contact-message"/></div>
          <button disabled={busy} className="btn-amber rounded-full px-6 py-3 text-sm" data-testid="contact-submit">{busy ? "Sending…" : "Register Now"}</button>
        </form>
        <div className="md:col-span-2 space-y-4">
          <div className="glass-card p-6">
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider">Email</div>
            <div className="font-display text-xl mt-1">{c.email}</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider">WhatsApp</div>
            <div className="font-display text-xl mt-1">{c.whatsapp || c.phone}</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider">Office</div>
            <div className="text-sm text-[var(--muted)] mt-2">{c.office}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
