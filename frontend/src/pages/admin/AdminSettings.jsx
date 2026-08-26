import { useEffect, useState } from "react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useSettings, DEFAULT_SETTINGS } from "../../context/SettingsContext";
import { Plus, Trash2, Save, RotateCcw, Megaphone, User, Mail, Home as HomeIcon, ListChecks, MessageSquare, HelpCircle, BookOpen, Info } from "lucide-react";

const inputCls = "bg-[var(--bg-1)] border-[var(--border-hi)] mt-2";

export default function AdminSettings() {
  const { settings, reload } = useSettings();
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setS(deepClone(settings)); }, [settings]);

  if (!s) return <div className="text-[var(--muted)]">Loading…</div>;

  const set = (path, value) => setS(prev => setDeep(prev, path, value));
  const save = async () => {
    setSaving(true);
    try { await api.put("/settings", s); toast.success("Settings saved"); reload(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const reset = () => { if (window.confirm("Reset to default content? Your custom edits will be lost.")) setS(deepClone(DEFAULT_SETTINGS)); };

  return (
    <div>
      <div className="flex justify-between items-center mb-10 flex-wrap gap-3">
        <div><div className="chip mb-3">CMS</div><h1 className="font-display text-4xl">Site Settings</h1></div>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-ghost rounded-full px-4 py-2 text-xs inline-flex items-center gap-2"><RotateCcw size={14}/> Reset defaults</button>
          <button onClick={save} disabled={saving} className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60" data-testid="settings-save"><Save size={14}/> {saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="glass p-1 h-auto flex flex-wrap gap-1 rounded-2xl mb-8">
          <T v="general" icon={<User size={14}/>}>General</T>
          <T v="contact" icon={<Mail size={14}/>}>Contact & Social</T>
          <T v="announce" icon={<Megaphone size={14}/>}>Announcement</T>
          <T v="widgets" icon={<HomeIcon size={14}/>}>Widgets</T>
          <T v="hero" icon={<HomeIcon size={14}/>}>Hero</T>
          <T v="ratings" icon={<HomeIcon size={14}/>}>Ratings</T>
          <T v="steps" icon={<ListChecks size={14}/>}>3 Steps</T>
          <T v="counter" icon={<HomeIcon size={14}/>}>Live Counter</T>
          <T v="benefits" icon={<HomeIcon size={14}/>}>Benefits</T>
          <T v="payouts" icon={<HomeIcon size={14}/>}>Payouts</T>
          <T v="testi" icon={<MessageSquare size={14}/>}>Testimonials</T>
          <T v="faq" icon={<HelpCircle size={14}/>}>FAQ</T>
          <T v="rules" icon={<BookOpen size={14}/>}>Rules</T>
          <T v="about" icon={<Info size={14}/>}>About</T>
        </TabsList>

        <TabsContent value="general">
          <Section title="Brand">
            <Grid2>
              <F label="Brand Name"><Input value={s.brand.name} onChange={e=>set("brand.name", e.target.value)} className={inputCls}/></F>
              <F label="Logo URL"><Input value={s.brand.logo_url} onChange={e=>set("brand.logo_url", e.target.value)} className={inputCls}/></F>
            </Grid2>
            <F label="Tagline"><Textarea rows={2} value={s.brand.tagline} onChange={e=>set("brand.tagline", e.target.value)} className={inputCls}/></F>
          </Section>
        </TabsContent>

        <TabsContent value="contact">
          <Section title="Contact Info">
            <Grid2>
              <F label="Email"><Input value={s.contact.email} onChange={e=>set("contact.email", e.target.value)} className={inputCls}/></F>
              <F label="Phone"><Input value={s.contact.phone} onChange={e=>set("contact.phone", e.target.value)} className={inputCls}/></F>
              <F label="WhatsApp Number"><Input value={s.contact.whatsapp} onChange={e=>set("contact.whatsapp", e.target.value)} className={inputCls}/></F>
              <F label="UPI ID (payments)"><Input value={s.contact.upi_id} onChange={e=>set("contact.upi_id", e.target.value)} className={inputCls}/></F>
              <F label="Company Legal Name"><Input value={s.contact.company} onChange={e=>set("contact.company", e.target.value)} className={inputCls}/></F>
            </Grid2>
            <F label="Office info (contact page)"><Textarea rows={2} value={s.contact.office} onChange={e=>set("contact.office", e.target.value)} className={inputCls}/></F>
          </Section>
          <Section title="Social Links">
            <Grid2>
              <F label="Instagram URL"><Input value={s.social.instagram} onChange={e=>set("social.instagram", e.target.value)} className={inputCls}/></F>
              <F label="YouTube URL"><Input value={s.social.youtube} onChange={e=>set("social.youtube", e.target.value)} className={inputCls}/></F>
              <F label="Twitter / X URL"><Input value={s.social.twitter} onChange={e=>set("social.twitter", e.target.value)} className={inputCls}/></F>
              <F label="Facebook URL"><Input value={s.social.facebook} onChange={e=>set("social.facebook", e.target.value)} className={inputCls}/></F>
              <F label="WhatsApp Link (wa.me/...)"><Input value={s.social.whatsapp_link} onChange={e=>set("social.whatsapp_link", e.target.value)} className={inputCls}/></F>
            </Grid2>
          </Section>
        </TabsContent>

        <TabsContent value="announce">
          <Section title="Announcement Bar (top of site)">
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={!!s.announcement.enabled} onChange={e=>set("announcement.enabled", e.target.checked)}/>
              <span>Show announcement bar</span>
            </label>
            <F label="Message"><Input value={s.announcement.text} onChange={e=>set("announcement.text", e.target.value)} className={inputCls} placeholder="🎉 30% OFF — limited time"/></F>
            <Grid2>
              <F label="CTA Link (path or URL)"><Input value={s.announcement.link} onChange={e=>set("announcement.link", e.target.value)} className={inputCls} placeholder="/challenges"/></F>
              <F label="CTA Label"><Input value={s.announcement.cta} onChange={e=>set("announcement.cta", e.target.value)} className={inputCls}/></F>
            </Grid2>
          </Section>
        </TabsContent>

        <TabsContent value="widgets">
          <Section title="Widgets on the site">
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={s.widgets?.sticky_cta?.enabled ?? true} onChange={e=>set("widgets.sticky_cta.enabled", e.target.checked)}/>
              <span>Sticky floating CTA button (bottom-right)</span>
            </label>
            <Grid2>
              <F label="Sticky CTA label"><Input value={s.widgets?.sticky_cta?.label || ""} onChange={e=>set("widgets.sticky_cta.label", e.target.value)} className={inputCls} placeholder="Start Challenge"/></F>
              <F label="Sticky CTA link"><Input value={s.widgets?.sticky_cta?.link || ""} onChange={e=>set("widgets.sticky_cta.link", e.target.value)} className={inputCls} placeholder="/challenges"/></F>
            </Grid2>
            <label className="flex items-center gap-2 text-sm mt-6 mb-2">
              <input type="checkbox" checked={s.widgets?.whatsapp?.enabled ?? true} onChange={e=>set("widgets.whatsapp.enabled", e.target.checked)}/>
              <span>WhatsApp floating button (bottom-left)</span>
            </label>
            <F label="WhatsApp link (overrides social/contact)"><Input value={s.widgets?.whatsapp?.link || ""} onChange={e=>set("widgets.whatsapp.link", e.target.value)} className={inputCls} placeholder="https://wa.me/91..."/></F>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input type="checkbox" checked={s.widgets?.scroll_progress?.enabled ?? true} onChange={e=>set("widgets.scroll_progress.enabled", e.target.checked)}/>
              <span>Scroll progress bar (top of page)</span>
            </label>
            <label className="flex items-center gap-2 text-sm mt-3">
              <input type="checkbox" checked={s.widgets?.bg_3d?.enabled ?? true} onChange={e=>set("widgets.bg_3d.enabled", e.target.checked)}/>
              <span>3D animated background (orbs + blob + mouse glow)</span>
            </label>
          </Section>
        </TabsContent>

        <TabsContent value="hero">
          <Section title="Hero Section">
            <F label="Chip Text"><Input value={s.hero.chip} onChange={e=>set("hero.chip", e.target.value)} className={inputCls}/></F>
            <Grid2>
              <F label="Title (before highlight)"><Input value={s.hero.title_before} onChange={e=>set("hero.title_before", e.target.value)} className={inputCls}/></F>
              <F label="Highlight Text"><Input value={s.hero.title_highlight} onChange={e=>set("hero.title_highlight", e.target.value)} className={inputCls}/></F>
            </Grid2>
            <F label="Title (after highlight)"><Input value={s.hero.title_after} onChange={e=>set("hero.title_after", e.target.value)} className={inputCls}/></F>
            <F label="Subtitle"><Textarea rows={3} value={s.hero.subtitle} onChange={e=>set("hero.subtitle", e.target.value)} className={inputCls}/></F>
            <Grid2>
              <F label="Primary CTA label"><Input value={s.hero.cta_primary} onChange={e=>set("hero.cta_primary", e.target.value)} className={inputCls}/></F>
              <F label="Secondary CTA label"><Input value={s.hero.cta_secondary} onChange={e=>set("hero.cta_secondary", e.target.value)} className={inputCls}/></F>
            </Grid2>
          </Section>
          <Section title="Stat Strip (4 items)">
            <ListEditor
              items={s.hero.stats}
              onChange={arr => set("hero.stats", arr)}
              empty={{k:"", v:""}}
              render={(it, upd) => (
                <Grid2>
                  <F label="Number / Label"><Input value={it.k} onChange={e=>upd({...it, k:e.target.value})} className={inputCls} placeholder="75%"/></F>
                  <F label="Caption"><Input value={it.v} onChange={e=>upd({...it, v:e.target.value})} className={inputCls} placeholder="Profit Split"/></F>
                </Grid2>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="ratings">
          <Section title="Review-Platform Ratings (Trustpilot, PropFirmMatch, etc.)">
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={s.ratings?.enabled ?? true} onChange={e=>set("ratings.enabled", e.target.checked)}/>
              <span>Show ratings strip on Home</span>
            </label>
            <Grid2>
              <F label="Section heading"><Input value={s.ratings?.heading || ""} onChange={e=>set("ratings.heading", e.target.value)} className={inputCls} placeholder="Rated by traders"/></F>
              <F label="Section subtitle"><Input value={s.ratings?.subtitle || ""} onChange={e=>set("ratings.subtitle", e.target.value)} className={inputCls}/></F>
            </Grid2>
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider mt-6 mb-3">Rating cards</div>
            <ListEditor
              items={s.ratings?.items || []}
              onChange={arr => set("ratings.items", arr)}
              empty={{platform:"", rating:4.5, out_of:5, reviews:0, color:"#29d39a", url:""}}
              addLabel="Add rating platform"
              render={(it, upd) => (
                <>
                  <Grid2>
                    <F label="Platform (e.g. Trustpilot)"><Input value={it.platform} onChange={e=>upd({...it, platform:e.target.value})} className={inputCls}/></F>
                    <F label="Link URL"><Input value={it.url || ""} onChange={e=>upd({...it, url:e.target.value})} className={inputCls} placeholder="https://..."/></F>
                  </Grid2>
                  <Grid2>
                    <F label="Rating (e.g. 4.3)"><Input type="number" step="0.1" min="0" max="5" value={it.rating} onChange={e=>upd({...it, rating: Number(e.target.value) || 0})} className={inputCls}/></F>
                    <F label="Out of (e.g. 5)"><Input type="number" step="1" min="1" max="10" value={it.out_of} onChange={e=>upd({...it, out_of: Number(e.target.value) || 5})} className={inputCls}/></F>
                  </Grid2>
                  <Grid2>
                    <F label="Number of Reviews"><Input type="number" value={it.reviews} onChange={e=>upd({...it, reviews: Number(e.target.value) || 0})} className={inputCls}/></F>
                    <F label="Brand Color (hex)"><Input value={it.color || ""} onChange={e=>upd({...it, color:e.target.value})} className={inputCls} placeholder="#00b67a"/></F>
                  </Grid2>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="steps">
          <Section title="3 Steps section">
            <Grid2>
              <F label="Title prefix"><Input value={s.steps.title_prefix} onChange={e=>set("steps.title_prefix", e.target.value)} className={inputCls}/></F>
              <F label="Title suffix (brand)"><Input value={s.steps.title_suffix} onChange={e=>set("steps.title_suffix", e.target.value)} className={inputCls}/></F>
            </Grid2>
            <ListEditor
              items={s.steps.items}
              onChange={arr => set("steps.items", arr)}
              empty={{n:"", t:"", d:""}}
              render={(it, upd) => (
                <>
                  <Grid2>
                    <F label="Step Number"><Input value={it.n} onChange={e=>upd({...it, n:e.target.value})} className={inputCls}/></F>
                    <F label="Title"><Input value={it.t} onChange={e=>upd({...it, t:e.target.value})} className={inputCls}/></F>
                  </Grid2>
                  <F label="Description"><Textarea rows={2} value={it.d} onChange={e=>upd({...it, d:e.target.value})} className={inputCls}/></F>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="counter">
          <Section title="Live Counter (Trusted by India's growing trader community)">
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={s.live_counter?.enabled ?? true} onChange={e=>set("live_counter.enabled", e.target.checked)}/>
              <span>Show this section on Home</span>
            </label>
            <F label="Heading"><Input value={s.live_counter?.heading || ""} onChange={e=>set("live_counter.heading", e.target.value)} className={inputCls}/></F>
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider mt-6 mb-3">Numbers (4 items)</div>
            <ListEditor
              items={s.live_counter?.items || []}
              onChange={arr => set("live_counter.items", arr)}
              empty={{label:"", value:0, prefix:"", suffix:""}}
              addLabel="Add number"
              render={(it, upd) => (
                <>
                  <Grid2>
                    <F label="Label (e.g. Traders Funded)"><Input value={it.label} onChange={e=>upd({...it, label:e.target.value})} className={inputCls}/></F>
                    <F label="Value (number, no commas)"><Input type="number" value={it.value} onChange={e=>upd({...it, value: Number(e.target.value) || 0})} className={inputCls}/></F>
                  </Grid2>
                  <Grid2>
                    <F label="Prefix (e.g. ₹)"><Input value={it.prefix || ""} onChange={e=>upd({...it, prefix:e.target.value})} className={inputCls}/></F>
                    <F label="Suffix (e.g. + or %)"><Input value={it.suffix || ""} onChange={e=>upd({...it, suffix:e.target.value})} className={inputCls}/></F>
                  </Grid2>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="benefits">
          <Section title="Benefits (shown on Rules page)">
            <Grid2>
              <F label="Section title"><Input value={s.benefits?.title || ""} onChange={e=>set("benefits.title", e.target.value)} className={inputCls} placeholder="Why IndiFunded"/></F>
              <F label="Subtitle"><Input value={s.benefits?.subtitle || ""} onChange={e=>set("benefits.subtitle", e.target.value)} className={inputCls}/></F>
            </Grid2>
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider mt-6 mb-3">Benefit cards</div>
            <ListEditor
              items={s.benefits?.items || []}
              onChange={arr => set("benefits.items", arr)}
              empty={{t:"", d:"", i:"CheckCircle2"}}
              addLabel="Add benefit"
              render={(it, upd) => (
                <>
                  <Grid2>
                    <F label="Title"><Input value={it.t} onChange={e=>upd({...it, t:e.target.value})} className={inputCls}/></F>
                    <F label="Icon (Clock/CircleDollarSign/ShieldCheck/Zap/Star/TrendingUp/CheckCircle2)"><Input value={it.i} onChange={e=>upd({...it, i:e.target.value})} className={inputCls}/></F>
                  </Grid2>
                  <F label="Description"><Textarea rows={2} value={it.d} onChange={e=>upd({...it, d:e.target.value})} className={inputCls}/></F>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="payouts">
          <Section title="Payouts Page (/payouts)">
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={s.payouts_page?.show_request_form !== false} onChange={e=>set("payouts_page.show_request_form", e.target.checked)}/>
              <span>Show Payout Request form at the top of /payouts</span>
            </label>
            <Grid2>
              <F label="Heading"><Input value={s.payouts_page?.heading || ""} onChange={e=>set("payouts_page.heading", e.target.value)} className={inputCls}/></F>
              <F label="Subtitle"><Input value={s.payouts_page?.subtitle || ""} onChange={e=>set("payouts_page.subtitle", e.target.value)} className={inputCls}/></F>
            </Grid2>
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider mt-6 mb-3">Payout entries</div>
            <ListEditor
              items={s.payouts_page?.items || []}
              onChange={arr => set("payouts_page.items", arr)}
              empty={{name:"", plan:"Standard", amount:0, city:"", days_ago:1}}
              addLabel="Add payout"
              render={(it, upd) => (
                <>
                  <Grid2>
                    <F label="Trader Name"><Input value={it.name} onChange={e=>upd({...it, name:e.target.value})} className={inputCls}/></F>
                    <F label="Plan (Starter/Standard/Pro)"><Input value={it.plan} onChange={e=>upd({...it, plan:e.target.value})} className={inputCls}/></F>
                  </Grid2>
                  <Grid2>
                    <F label="Amount (₹, keep between 5,000 and 55,000)"><Input type="number" min="5000" max="55000" value={it.amount} onChange={e=>upd({...it, amount: Number(e.target.value) || 0})} className={inputCls}/></F>
                    <F label="City"><Input value={it.city} onChange={e=>upd({...it, city:e.target.value})} className={inputCls}/></F>
                  </Grid2>
                  <F label="Days Ago"><Input type="number" value={it.days_ago} onChange={e=>upd({...it, days_ago: Number(e.target.value) || 0})} className={inputCls}/></F>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="testi">
          <Section title="Testimonials (Why traders choose …)">
            <ListEditor
              items={s.testimonials}
              onChange={arr => set("testimonials", arr)}
              empty={{q:"", a:"", r:""}}
              render={(it, upd) => (
                <>
                  <F label="Quote"><Textarea rows={3} value={it.q} onChange={e=>upd({...it, q:e.target.value})} className={inputCls}/></F>
                  <Grid2>
                    <F label="Author"><Input value={it.a} onChange={e=>upd({...it, a:e.target.value})} className={inputCls}/></F>
                    <F label="Role / Plan"><Input value={it.r} onChange={e=>upd({...it, r:e.target.value})} className={inputCls} placeholder="Pro Plan"/></F>
                  </Grid2>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="faq">
          <Section title="FAQ Groups">
            <ListEditor
              items={s.faq_groups}
              onChange={arr => set("faq_groups", arr)}
              empty={{title:"New group", items:[]}}
              addLabel="Add group"
              render={(g, upd) => (
                <>
                  <F label="Group title"><Input value={g.title} onChange={e=>upd({...g, title:e.target.value})} className={inputCls}/></F>
                  <div className="mt-4 pl-4 border-l border-[var(--border-hi)]">
                    <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider mb-3">Questions in this group</div>
                    <ListEditor
                      items={g.items || []}
                      onChange={arr => upd({...g, items: arr})}
                      empty={{q:"", a:""}}
                      addLabel="Add question"
                      render={(it, updIt) => (
                        <>
                          <F label="Question"><Input value={it.q} onChange={e=>updIt({...it, q:e.target.value})} className={inputCls}/></F>
                          <F label="Answer"><Textarea rows={3} value={it.a} onChange={e=>updIt({...it, a:e.target.value})} className={inputCls}/></F>
                        </>
                      )}
                    />
                  </div>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="rules">
          <Section title="Rules Page">
            <F label="Title"><Input value={s.rules.title} onChange={e=>set("rules.title", e.target.value)} className={inputCls}/></F>
            <F label="Subtitle"><Textarea rows={2} value={s.rules.subtitle} onChange={e=>set("rules.subtitle", e.target.value)} className={inputCls}/></F>
            <ListEditor
              items={s.rules.items}
              onChange={arr => set("rules.items", arr)}
              empty={{t:"", d:"", i:"CheckCircle2"}}
              addLabel="Add rule"
              render={(it, upd) => (
                <>
                  <Grid2>
                    <F label="Title"><Input value={it.t} onChange={e=>upd({...it, t:e.target.value})} className={inputCls}/></F>
                    <F label="Icon (Scale/TrendingDown/ShieldCheck/BookOpen/Users/CheckCircle2)"><Input value={it.i} onChange={e=>upd({...it, i:e.target.value})} className={inputCls}/></F>
                  </Grid2>
                  <F label="Description"><Textarea rows={2} value={it.d} onChange={e=>upd({...it, d:e.target.value})} className={inputCls}/></F>
                </>
              )}
            />
          </Section>
        </TabsContent>

        <TabsContent value="about">
          <Section title="About Page">
            <F label="Title"><Input value={s.about.title} onChange={e=>set("about.title", e.target.value)} className={inputCls}/></F>
            <F label="Intro paragraph"><Textarea rows={4} value={s.about.intro} onChange={e=>set("about.intro", e.target.value)} className={inputCls}/></F>
            <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider mt-6 mb-3">Info cards (3)</div>
            <ListEditor
              items={s.about.cards}
              onChange={arr => set("about.cards", arr)}
              empty={{t:"", d:""}}
              render={(it, upd) => (
                <>
                  <F label="Title"><Input value={it.t} onChange={e=>upd({...it, t:e.target.value})} className={inputCls}/></F>
                  <F label="Description"><Textarea rows={3} value={it.d} onChange={e=>upd({...it, d:e.target.value})} className={inputCls}/></F>
                </>
              )}
            />
            <Grid2>
              <F label="Footer card title"><Input value={s.about.footer_title} onChange={e=>set("about.footer_title", e.target.value)} className={inputCls}/></F>
              <F label="Footer card text"><Textarea rows={3} value={s.about.footer_text} onChange={e=>set("about.footer_text", e.target.value)} className={inputCls}/></F>
            </Grid2>
          </Section>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 mt-10 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-amber rounded-full px-6 py-3 text-sm inline-flex items-center gap-2 shadow-2xl disabled:opacity-60">
          <Save size={16}/> {saving ? "Saving…" : "Save all changes"}
        </button>
      </div>
    </div>
  );
}

function T({ v, icon, children }) {
  return <TabsTrigger value={v} className="data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white px-3 py-2 rounded-xl text-sm inline-flex items-center gap-2">{icon}{children}</TabsTrigger>;
}
function Section({ title, children }) {
  return (
    <div className="glass-card p-6 md:p-8 mb-6">
      <div className="text-xs uppercase font-mono text-[var(--muted-2)] tracking-wider mb-5">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Grid2({ children }) { return <div className="grid md:grid-cols-2 gap-4">{children}</div>; }
function F({ label, children }) {
  return <div><Label className="text-xs uppercase font-mono tracking-wider text-[var(--muted-2)]">{label}</Label>{children}</div>;
}

function ListEditor({ items = [], onChange, render, empty, addLabel = "Add item" }) {
  const upd = (i, v) => { const a = [...items]; a[i] = v; onChange(a); };
  const del = (i) => { const a = [...items]; a.splice(i, 1); onChange(a); };
  const add = () => onChange([...items, deepClone(empty)]);
  const move = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const a = [...items]; [a[i], a[j]] = [a[j], a[i]]; onChange(a);
  };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-[var(--border)] p-4 relative bg-[rgba(255,255,255,0.01)]">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-2)]">#{i+1}</div>
            <div className="flex gap-1">
              <button onClick={()=>move(i,-1)} className="btn-ghost rounded-md px-2 py-1 text-xs" title="Move up">↑</button>
              <button onClick={()=>move(i,1)} className="btn-ghost rounded-md px-2 py-1 text-xs" title="Move down">↓</button>
              <button onClick={()=>del(i)} className="btn-ghost rounded-md px-2 py-1 text-xs text-[var(--rose)]"><Trash2 size={12}/></button>
            </div>
          </div>
          <div className="space-y-3">{render(it, v => upd(i, v))}</div>
        </div>
      ))}
      <button onClick={add} className="btn-ghost rounded-full px-4 py-2 text-xs inline-flex items-center gap-2"><Plus size={12}/> {addLabel}</button>
    </div>
  );
}

function deepClone(v) { return JSON.parse(JSON.stringify(v ?? null)); }
function setDeep(obj, path, value) {
  const parts = path.split(".");
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = out;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] || {}) };
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return out;
}
