import { useEffect, useState } from "react";
import { api, formatINR, formatApiError } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Package, FileText, Users, ShoppingBag, IndianRupee, Award, Upload, Sparkles, Loader2, Trophy, Gift, Tag } from "lucide-react";

export function AdminDashboard() {
  const [s, setS] = useState(null);
  useEffect(()=>{ api.get("/admin/stats").then(r=>setS(r.data)); },[]);
  const items = [
    {k:"plans", label:"Plans", icon:<Package/>},
    {k:"blogs", label:"Blog Posts", icon:<FileText/>},
    {k:"leads", label:"Leads", icon:<Users/>},
    {k:"orders", label:"Orders", icon:<ShoppingBag/>},
  ];
  return (
    <div>
      <div className="chip mb-4">Overview</div>
      <h1 className="font-display text-4xl" data-testid="admin-dashboard-title">Dashboard</h1>
      {s && s.pending_orders > 0 && (
        <div className="card-panel glow-border p-5 mt-8 flex items-center justify-between" data-testid="pending-alert">
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-[var(--accent)]">Action needed</div>
            <div className="font-display text-xl mt-1">{s.pending_orders} pending payment{s.pending_orders>1?"s":""} to verify</div>
          </div>
          <a href="/admin/orders" className="btn-amber rounded-full px-5 py-2.5 text-sm">Review →</a>
        </div>
      )}
      <div className="grid md:grid-cols-4 gap-4 mt-10">
        {items.map((it,i)=>(
          <div key={it.k} className="card-panel p-6" data-testid={`stat-${it.k}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">{it.label}</div>
              <div className="text-[var(--accent)]">{it.icon}</div>
            </div>
            <div className="font-display text-4xl mt-5">{s ? s[it.k] : "—"}</div>
          </div>
        ))}
        <div className="card-panel p-6 md:col-span-4 glow-border" data-testid="stat-revenue">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Total Revenue</div>
            <IndianRupee className="text-[var(--accent)]"/>
          </div>
          <div className="font-display text-5xl mt-5">{s ? formatINR(s.revenue) : "—"}</div>
        </div>
      </div>
    </div>
  );
}

const empty = { name:"",account_size:100000,challenge_fee:4999,profit_target_points:750,profit_share:70,max_loss_limit:20,min_trading_days:10,total_trading_days:15,trades_per_day:3,description:"",features:[],popular:false,order:0};

export function AdminPlans() {
  const [plans,setPlans] = useState([]);
  const [editing,setEditing] = useState(null);
  const load = ()=>api.get("/plans").then(r=>setPlans(r.data));
  useEffect(()=>{ load(); },[]);
  const save = async () => {
    const payload = { ...editing, features: Array.isArray(editing.features) ? editing.features : (editing.features||"").split("\n").map(s=>s.trim()).filter(Boolean) };
    try {
      if (editing.id) await api.put(`/plans/${editing.id}`, payload);
      else await api.post("/plans", payload);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if(!window.confirm("Delete?")) return; await api.delete(`/plans/${id}`); toast.success("Deleted"); load(); };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div><div className="chip mb-3">Plans</div><h1 className="font-display text-4xl">Challenge Plans</h1></div>
        <button onClick={()=>setEditing({...empty, features:""})} className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="plan-new-btn"><Plus size={16}/> New Plan</button>
      </div>
      <div className="card-panel overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Name</TableHead><TableHead>Size</TableHead><TableHead>Fee</TableHead><TableHead>Popular</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {plans.map(p=>(
              <TableRow key={p.id} className="border-[var(--border)]" data-testid={`plan-row-${p.id}`}>
                <TableCell className="font-display">{p.name}</TableCell>
                <TableCell>{formatINR(p.account_size)}</TableCell>
                <TableCell>{formatINR(p.challenge_fee)}</TableCell>
                <TableCell>{p.popular ? "★" : ""}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>setEditing({...p, features: (p.features||[]).join("\n")})} className="btn-ghost px-3 py-1.5 rounded-md mr-2 inline-flex items-center gap-1"><Pencil size={14}/></button>
                  <button onClick={()=>del(p.id)} className="btn-ghost px-3 py-1.5 rounded-md inline-flex items-center gap-1 text-[var(--rose)]"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing?.id ? "Edit Plan" : "New Plan"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={editing.name} onChange={e=>setEditing({...editing, name:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Order</Label><Input type="number" value={editing.order} onChange={e=>setEditing({...editing, order:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Account Size (₹)</Label><Input type="number" value={editing.account_size} onChange={e=>setEditing({...editing, account_size:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Challenge Fee (₹)</Label><Input type="number" step="0.01" value={editing.challenge_fee} onChange={e=>setEditing({...editing, challenge_fee:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Profit Share %</Label><Input type="number" value={editing.profit_share} onChange={e=>setEditing({...editing, profit_share:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Max Loss %</Label><Input type="number" value={editing.max_loss_limit} onChange={e=>setEditing({...editing, max_loss_limit:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Min Days</Label><Input type="number" value={editing.min_trading_days} onChange={e=>setEditing({...editing, min_trading_days:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Total Days</Label><Input type="number" value={editing.total_trading_days} onChange={e=>setEditing({...editing, total_trading_days:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Profit Target (pts)</Label><Input type="number" value={editing.profit_target_points} onChange={e=>setEditing({...editing, profit_target_points:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Trades/Day</Label><Input type="number" value={editing.trades_per_day} onChange={e=>setEditing({...editing, trades_per_day:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              </div>
              <div><Label>Description</Label><Textarea value={editing.description} onChange={e=>setEditing({...editing, description:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div><Label>Features (one per line)</Label><Textarea rows={5} value={editing.features} onChange={e=>setEditing({...editing, features:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.popular} onChange={e=>setEditing({...editing, popular:e.target.checked})}/> Most Popular</label>
            </div>
          )}
          <DialogFooter><button onClick={save} className="btn-amber rounded-full px-6 py-2.5 text-sm" data-testid="plan-save-btn">Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const emptyBlog = { slug:"", title:"", excerpt:"", content:"", cover_image:"", author:"IndiFunded Team", published:true };

export function AdminBlogs() {
  const [blogs,setBlogs] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/blogs/all").then(r=>setBlogs(r.data));
  useEffect(()=>{ load(); },[]);
  const save = async () => {
    try {
      if (editing.id) await api.put(`/blogs/${editing.id}`, editing);
      else await api.post("/blogs", editing);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if(!window.confirm("Delete?")) return; await api.delete(`/blogs/${id}`); toast.success("Deleted"); load(); };
  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div><div className="chip mb-3">Blog</div><h1 className="font-display text-4xl">Posts</h1></div>
        <button onClick={()=>setEditing({...emptyBlog})} className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="blog-new-btn"><Plus size={16}/> New Post</button>
      </div>
      <div className="card-panel overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Published</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {blogs.map(b=>(
              <TableRow key={b.id} className="border-[var(--border)]" data-testid={`blog-row-${b.id}`}>
                <TableCell className="font-display">{b.title}</TableCell>
                <TableCell className="font-mono text-xs text-[var(--muted)]">{b.slug}</TableCell>
                <TableCell>{b.published ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>setEditing(b)} className="btn-ghost px-3 py-1.5 rounded-md mr-2"><Pencil size={14}/></button>
                  <button onClick={()=>del(b.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing?.id ? "Edit Post" : "New Post"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editing.title} onChange={e=>setEditing({...editing, title:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div><Label>Slug</Label><Input value={editing.slug} onChange={e=>setEditing({...editing, slug:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div><Label>Cover Image URL</Label><Input value={editing.cover_image} onChange={e=>setEditing({...editing, cover_image:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div><Label>Author</Label><Input value={editing.author} onChange={e=>setEditing({...editing, author:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div><Label>Excerpt</Label><Textarea rows={2} value={editing.excerpt} onChange={e=>setEditing({...editing, excerpt:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div><Label>Content</Label><Textarea rows={10} value={editing.content} onChange={e=>setEditing({...editing, content:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.published} onChange={e=>setEditing({...editing, published:e.target.checked})}/> Published</label>
            </div>
          )}
          <DialogFooter><button onClick={save} className="btn-amber rounded-full px-6 py-2.5 text-sm" data-testid="blog-save-btn">Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminLeads() {
  const [leads,setLeads] = useState([]);
  const load = () => api.get("/leads").then(r=>setLeads(r.data));
  useEffect(()=>{ load(); },[]);
  const del = async (id) => { if(!window.confirm("Delete lead?")) return; await api.delete(`/leads/${id}`); toast.success("Deleted"); load(); };
  return (
    <div>
      <div className="chip mb-3">Contact</div>
      <h1 className="font-display text-4xl">Leads ({leads.length})</h1>
      <div className="card-panel overflow-hidden mt-10">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>City</TableHead><TableHead>Plan</TableHead><TableHead>Date</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {leads.map(l=>(
              <TableRow key={l.id} className="border-[var(--border)]" data-testid={`lead-row-${l.id}`}>
                <TableCell>{l.first_name} {l.last_name}</TableCell>
                <TableCell className="text-[var(--muted)]">{l.email}</TableCell>
                <TableCell className="font-mono text-xs">{l.phone}</TableCell>
                <TableCell>{l.city}</TableCell>
                <TableCell>{l.challenge_type}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right"><button onClick={()=>del(l.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"><Trash2 size={14}/></button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


const emptyCert = { image_url:"", trader_name:"", amount:0, plan:"", account_size:0, payout_date:"", order:0, visible:true };

export function AdminCertificates() {
  const [certs, setCerts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const load = () => api.get("/certificates/all").then(r => setCerts(r.data));
  useEffect(()=>{ load(); },[]);
  const save = async () => {
    try {
      if (!editing.image_url) { toast.error("Please upload or paste an image URL"); return; }
      if (editing.id) await api.put(`/certificates/${editing.id}`, editing);
      else await api.post("/certificates", editing);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if(!window.confirm("Delete certificate?")) return; await api.delete(`/certificates/${id}`); toast.success("Deleted"); load(); };

  const analyzeCurrent = async () => {
    if (!editing?.image_url || !editing.image_url.startsWith("data:image/")) {
      toast.error("Upload an image first (URLs cannot be analyzed)"); return;
    }
    try {
      setAnalyzing(true);
      const { data } = await api.post("/admin/certificates/analyze", { data_url: editing.image_url });
      // Convert date to DD/MM/YYYY for display
      let payout_date = data.date || "";
      if (payout_date && /^\d{4}-\d{2}-\d{2}$/.test(payout_date)) {
        const [y,m,d] = payout_date.split("-");
        payout_date = `${d}/${m}/${y}`;
      }
      setEditing(prev => ({
        ...prev,
        trader_name: data.name || prev.trader_name,
        amount: data.amount ? Number(data.amount) : prev.amount,
        payout_date: payout_date || prev.payout_date,
        plan: data.plan || prev.plan,
      }));
      toast.success("AI extracted details — please review");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "AI analysis failed");
    } finally { setAnalyzing(false); }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5MB)"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setEditing(prev => ({ ...prev, image_url: reader.result }));
      setUploading(false);
      toast.success("Image loaded — click 'Auto-Detect' to fill fields");
    };
    reader.onerror = () => { setUploading(false); toast.error("Failed to read file"); };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div><div className="chip mb-3">Last Week Payouts</div><h1 className="font-display text-4xl">Certificates</h1></div>
        <button onClick={()=>setEditing({...emptyCert})} className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="cert-new-btn"><Plus size={16}/> New Certificate</button>
      </div>
      <div className="card-panel overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Image</TableHead><TableHead>Trader</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Order</TableHead><TableHead>Visible</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {certs.map(c=>(
              <TableRow key={c.id} className="border-[var(--border)]" data-testid={`cert-row-${c.id}`}>
                <TableCell><img src={c.image_url} alt="" className="w-16 h-16 object-cover rounded-md border border-[var(--border)]"/></TableCell>
                <TableCell className="font-display">{c.trader_name || "—"}</TableCell>
                <TableCell>{c.plan || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">{c.amount ? formatINR(c.amount) : "—"}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{c.payout_date || "—"}</TableCell>
                <TableCell className="font-mono">{c.order}</TableCell>
                <TableCell>{c.visible ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>setEditing(c)} className="btn-ghost px-3 py-1.5 rounded-md mr-2"><Pencil size={14}/></button>
                  <button onClick={()=>del(c.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing?.id ? "Edit Certificate" : "New Certificate"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Certificate Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  <label className="btn-amber rounded-full px-4 py-2 text-sm inline-flex items-center gap-2 cursor-pointer" data-testid="cert-upload-btn">
                    <Upload size={14}/> {uploading ? "Loading…" : "Upload from device"}
                    <input type="file" accept="image/*" onChange={onFile} className="hidden"/>
                  </label>
                  {editing.image_url && (
                    <button type="button" onClick={()=>setEditing({...editing, image_url:""})} className="btn-ghost rounded-full px-3 py-2 text-xs text-[var(--rose)]">Clear</button>
                  )}
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-[var(--muted-2)]">…or paste an image URL</Label>
                  <Input value={editing.image_url?.startsWith("data:") ? "" : editing.image_url} onChange={e=>setEditing({...editing, image_url:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" placeholder="https://… or /certificates/cert-1.png"/>
                </div>
              </div>
              {editing.image_url && <img src={editing.image_url} alt="" className="w-full max-h-64 object-contain rounded-md border border-[var(--border)]"/>}
              {editing.image_url?.startsWith("data:image/") && (
                <button type="button" onClick={analyzeCurrent} disabled={analyzing} className="btn-amber rounded-full px-4 py-2.5 text-sm w-full inline-flex items-center justify-center gap-2" data-testid="cert-analyze-btn">
                  {analyzing ? <><Loader2 size={14} className="animate-spin"/> Analyzing image…</> : <><Sparkles size={14}/> Auto-Detect Fields (AI)</>}
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Trader Name</Label><Input value={editing.trader_name} onChange={e=>setEditing({...editing, trader_name:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Plan (Starter/Standard/Pro)</Label><Input value={editing.plan} onChange={e=>setEditing({...editing, plan:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Payout Amount (₹)</Label><Input type="number" step="0.01" value={editing.amount} onChange={e=>setEditing({...editing, amount:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Account Size (₹)</Label><Input type="number" value={editing.account_size} onChange={e=>setEditing({...editing, account_size:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Payout Date (DD/MM/YYYY)</Label><Input value={editing.payout_date} onChange={e=>setEditing({...editing, payout_date:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Order (lower = first)</Label><Input type="number" value={editing.order} onChange={e=>setEditing({...editing, order:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.visible} onChange={e=>setEditing({...editing, visible:e.target.checked})}/> Visible on website</label>
            </div>
          )}
          <DialogFooter><button onClick={save} className="btn-amber rounded-full px-6 py-2.5 text-sm" data-testid="cert-save-btn">Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Admin Payout Requests =====
const payoutStatusMap = {
  pending:  { bg: "rgba(245,182,56,0.15)",  text: "#ffd166", label: "Pending" },
  approved: { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", label: "Approved" },
  paid:     { bg: "rgba(41,211,154,0.15)",  text: "#29d39a", label: "Paid" },
  rejected: { bg: "rgba(239,68,68,0.15)",   text: "#f87171", label: "Rejected" },
};

export function AdminPayoutRequests() {
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const load = () => api.get("/payout-requests").then(r=>setRows(r.data));
  useEffect(()=>{ load(); },[]);
  const setStatus = async (id, status) => {
    try { await api.patch(`/payout-requests/${id}`, { status }); toast.success(`Marked ${status}`); load(); if (view?.id===id) setView(v => ({...v, status})); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const saveNote = async () => {
    try { await api.patch(`/payout-requests/${view.id}`, { admin_note: view.admin_note || "" }); toast.success("Note saved"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if(!window.confirm("Delete payout request?")) return; await api.delete(`/payout-requests/${id}`); toast.success("Deleted"); if (view?.id===id) setView(null); load(); };

  const Badge = ({ s }) => {
    const c = payoutStatusMap[s] || payoutStatusMap.pending;
    return <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider" style={{ background: c.bg, color: c.text }}>{c.label}</span>;
  };

  return (
    <div>
      <div className="chip mb-3">Trader Payouts</div>
      <h1 className="font-display text-4xl mb-10">Payout Requests</h1>
      <div className="card-panel overflow-hidden">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Trader</TableHead><TableHead>Contact</TableHead><TableHead>Account</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="border-[var(--border)]"><TableCell colSpan={7} className="text-center text-[var(--muted)] py-10">No payout requests yet.</TableCell></TableRow>
            )}
            {rows.map(r=>(
              <TableRow key={r.id} className="border-[var(--border)]" data-testid={`payout-row-${r.id}`}>
                <TableCell className="font-display">{r.full_name}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{r.email}<br/>{r.phone}</TableCell>
                <TableCell className="font-mono text-xs">{r.account_id || "—"}<br/>{r.plan || ""}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">{formatINR(r.amount)}</TableCell>
                <TableCell className="uppercase text-xs font-mono">{r.method}</TableCell>
                <TableCell><Badge s={r.status}/></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <button onClick={()=>setView(r)} className="btn-ghost px-3 py-1.5 rounded-md mr-2 text-xs">View</button>
                  <button onClick={()=>del(r.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!view} onOpenChange={(o)=>!o && setView(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">Payout Request</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-xl">{view.full_name}</div>
                  <div className="text-xs text-[var(--muted)] font-mono mt-1">{new Date(view.created_at).toLocaleString()}</div>
                </div>
                <Badge s={view.status}/>
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <Info label="Email" value={view.email}/>
                <Info label="Phone" value={view.phone}/>
                <Info label="Funded Account ID" value={view.account_id || "—"}/>
                <Info label="Plan" value={view.plan || "—"}/>
                <Info label="Amount" value={formatINR(view.amount)} accent/>
                <Info label="Method" value={view.method?.toUpperCase()}/>
              </div>
              {view.method === "upi" ? (
                <Info label="UPI ID" value={view.upi_id || "—"} mono/>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <Info label="Account Holder" value={view.account_holder || "—"}/>
                  <Info label="Bank Name" value={view.bank_name || "—"}/>
                  <Info label="Account Number" value={view.account_number || "—"} mono/>
                  <Info label="IFSC" value={view.ifsc || "—"} mono/>
                </div>
              )}
              {view.notes && <Info label="Trader Notes" value={view.notes}/>}
              <div>
                <Label>Admin Note (internal)</Label>
                <Textarea value={view.admin_note || ""} onChange={e=>setView({...view, admin_note:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" rows={3} placeholder="Verification notes, UTR of transfer, etc."/>
                <button onClick={saveNote} className="btn-ghost rounded-full px-4 py-2 text-xs mt-2">Save note</button>
              </div>
              <div className="border-t border-[var(--border)] pt-4">
                <div className="text-xs uppercase tracking-wider font-mono text-[var(--muted-2)] mb-3">Change status</div>
                <div className="flex flex-wrap gap-2">
                  {["pending","approved","paid","rejected"].map(s => (
                    <button key={s} onClick={()=>setStatus(view.id, s)}
                      className={`rounded-full px-4 py-2 text-xs uppercase font-mono tracking-wider ${view.status===s ? "btn-amber" : "btn-ghost"}`}
                      data-testid={`payout-status-${s}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, mono, accent }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-mono text-[var(--muted-2)]">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono text-sm" : "text-sm"} ${accent ? "text-[var(--accent)] font-display text-lg" : "text-white"}`}>{value}</div>
    </div>
  );
}

export function AdminOrders() {
  const [orders,setOrders] = useState([]);
  const load = () => api.get("/orders").then(r=>setOrders(r.data));
  useEffect(()=>{ load(); },[]);
  const setStatus = async (id, status) => {
    try { await api.patch(`/orders/${id}/status?status=${status}`); toast.success(`Marked ${status}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if(!window.confirm("Delete order?")) return; await api.delete(`/orders/${id}`); toast.success("Deleted"); load(); };

  const statusBadge = (s) => {
    const map = {
      "pending_verification": { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
      "completed": { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Verified" },
      "rejected": { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "Rejected" },
    };
    const m = map[s] || map["pending_verification"];
    return <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full" style={{background:m.bg, color:m.text}}>{m.label}</span>;
  };

  return (
    <div>
      <div className="chip mb-3">Orders</div>
      <h1 className="font-display text-4xl">Orders ({orders.length})</h1>
      <p className="text-sm text-[var(--muted)] mt-2">Verify UPI transactions. Match the UTR in your bank statement before approving.</p>
      <div className="card-panel overflow-hidden mt-10">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Customer</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>UTR</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.map(o=>(
              <TableRow key={o.id} className="border-[var(--border)]" data-testid={`order-row-${o.id}`}>
                <TableCell>
                  <div>{o.customer_name || "—"}</div>
                  <div className="text-xs text-[var(--muted-2)]">{o.customer_email}</div>
                  <div className="text-xs text-[var(--muted-2)] font-mono">{o.customer_phone}</div>
                </TableCell>
                <TableCell>{o.plan_name}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">{formatINR(o.amount)}</TableCell>
                <TableCell className="font-mono text-xs">{o.utr || "—"}</TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{new Date(o.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {o.status === "pending_verification" && (
                    <>
                      <button onClick={()=>setStatus(o.id,"completed")} className="btn-amber rounded-full px-3 py-1.5 text-xs mr-2" data-testid={`order-approve-${o.id}`}>Verify</button>
                      <button onClick={()=>setStatus(o.id,"rejected")} className="btn-ghost rounded-full px-3 py-1.5 text-xs mr-2 text-[var(--rose)]" data-testid={`order-reject-${o.id}`}>Reject</button>
                    </>
                  )}
                  <button onClick={()=>del(o.id)} className="btn-ghost px-2 py-1.5 rounded-md text-[var(--rose)] inline-flex"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


// ===== Admin Coupons =====
const emptyCoupon = { code: "", discount_percent: 10, active: true, max_uses: null, expires_at: "", description: "" };

export function AdminCoupons() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/coupons").then(r => setRows(r.data)).catch(()=>{});
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      const body = { ...editing, code: editing.code?.trim().toUpperCase() };
      if (!body.code) { toast.error("Code is required"); return; }
      if (editing.id) await api.put(`/coupons/${editing.id}`, body);
      else await api.post("/coupons", body);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if (!window.confirm("Delete coupon?")) return; await api.delete(`/coupons/${id}`); toast.success("Deleted"); load(); };
  return (
    <div>
      <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
        <div><div className="chip mb-3">Discount Codes</div><h1 className="font-display text-4xl">Coupons</h1></div>
        <button onClick={() => setEditing({ ...emptyCoupon })} className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="coupon-new-btn"><Plus size={16}/> New Coupon</button>
      </div>
      <div className="card-panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Uses</TableHead><TableHead>Expires</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} className="border-[var(--border)]" data-testid={`coupon-row-${r.id}`}>
                <TableCell className="font-mono text-white">{r.code}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">{r.discount_percent}%</TableCell>
                <TableCell className="text-sm">{r.used_count || 0}{r.max_uses ? ` / ${r.max_uses}` : ""}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{r.expires_at ? r.expires_at.slice(0, 10) : "—"}</TableCell>
                <TableCell>{r.active ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>setEditing(r)} className="btn-ghost px-3 py-1.5 rounded-md mr-2"><Pencil size={14}/></button>
                  <button onClick={()=>del(r.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing?.id ? "Edit Coupon" : "New Coupon"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Code</Label><Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="e.g. LAUNCH20" className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono tracking-wider"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Discount %</Label><Input type="number" min="0" max="90" value={editing.discount_percent} onChange={e => setEditing({ ...editing, discount_percent: +e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Max Uses (blank = unlimited)</Label><Input type="number" value={editing.max_uses ?? ""} onChange={e => setEditing({ ...editing, max_uses: e.target.value === "" ? null : +e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              </div>
              <div><Label>Expires At (YYYY-MM-DD, optional)</Label><Input type="date" value={editing.expires_at || ""} onChange={e => setEditing({ ...editing, expires_at: e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div><Label>Description (internal)</Label><Input value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })}/> Active</label>
            </div>
          )}
          <DialogFooter><button onClick={save} className="btn-amber rounded-full px-6 py-2.5 text-sm" data-testid="coupon-save-btn">Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Admin Leaderboard =====
const emptyLB = { name: "", plan: "Standard", total_payout: 0, city: "", avatar_url: "", verified: true, rank_note: "" };

export function AdminLeaderboard() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/leaderboard?limit=100").then(r => setRows(r.data)).catch(()=>{});
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (!editing.name) { toast.error("Name required"); return; }
      if (editing.id) await api.put(`/leaderboard/${editing.id}`, editing);
      else await api.post("/leaderboard", editing);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if (!window.confirm("Delete entry?")) return; await api.delete(`/leaderboard/${id}`); toast.success("Deleted"); load(); };

  const uploadAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Image too large (max 3MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setEditing(prev => ({ ...prev, avatar_url: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
        <div><div className="chip mb-3">Top Traders</div><h1 className="font-display text-4xl">Leaderboard</h1></div>
        <button onClick={() => setEditing({ ...emptyLB })} className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="lb-new-btn"><Plus size={16}/> New Entry</button>
      </div>
      <div className="card-panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>#</TableHead><TableHead>Avatar</TableHead><TableHead>Name</TableHead><TableHead>Plan</TableHead><TableHead>City</TableHead><TableHead>Total Payout</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id} className="border-[var(--border)]" data-testid={`lb-row-${r.id}`}>
                <TableCell className="font-mono text-[var(--muted-2)]">{i + 1}</TableCell>
                <TableCell>{r.avatar_url ? <img src={r.avatar_url} alt="" className="w-10 h-10 object-cover rounded-full border border-[var(--border)]"/> : <div className="w-10 h-10 rounded-full bg-[var(--bg-2)] border border-[var(--border)]"/>}</TableCell>
                <TableCell className="font-display">{r.name}</TableCell>
                <TableCell>{r.plan}</TableCell>
                <TableCell className="text-sm text-[var(--muted)]">{r.city || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">{formatINR(r.total_payout)}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>setEditing(r)} className="btn-ghost px-3 py-1.5 rounded-md mr-2"><Pencil size={14}/></button>
                  <button onClick={()=>del(r.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing?.id ? "Edit Entry" : "New Entry"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Full Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              <div>
                <Label>Avatar Photo</Label>
                <div className="mt-2 flex items-center gap-3">
                  <label className="btn-amber rounded-full px-4 py-2 text-sm inline-flex items-center gap-2 cursor-pointer">
                    <Upload size={14}/> Upload
                    <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden"/>
                  </label>
                  {editing.avatar_url && <img src={editing.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-[var(--border)]"/>}
                  {editing.avatar_url && <button type="button" onClick={()=>setEditing({...editing, avatar_url:""})} className="btn-ghost rounded-full px-3 py-2 text-xs text-[var(--rose)]">Clear</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Plan</Label><Input value={editing.plan} onChange={e => setEditing({ ...editing, plan: e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>City</Label><Input value={editing.city} onChange={e => setEditing({ ...editing, city: e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Total Payout (₹)</Label><Input type="number" value={editing.total_payout} onChange={e => setEditing({ ...editing, total_payout: +e.target.value })} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Rank Note (optional)</Label><Input value={editing.rank_note} onChange={e => setEditing({ ...editing, rank_note: e.target.value })} placeholder="Rising Star" className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.verified} onChange={e => setEditing({ ...editing, verified: e.target.checked })}/> Verified badge</label>
            </div>
          )}
          <DialogFooter><button onClick={save} className="btn-amber rounded-full px-6 py-2.5 text-sm" data-testid="lb-save-btn">Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Admin Referrals =====
export function AdminReferrals() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/admin/referrals").then(r => setRows(r.data)).catch(()=>{});
  useEffect(() => { load(); }, []);
  const del = async (id) => { if (!window.confirm("Delete referral?")) return; await api.delete(`/admin/referrals/${id}`); toast.success("Deleted"); load(); };
  return (
    <div>
      <div className="chip mb-3">Referral Program</div>
      <h1 className="font-display text-4xl">Referrals ({rows.length})</h1>
      <p className="text-sm text-[var(--muted)] mt-2">All users who have generated a referral code.</p>
      <div className="card-panel overflow-x-auto mt-10">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Referrals</TableHead><TableHead>Earnings</TableHead><TableHead>Created</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} className="border-[var(--border)]" data-testid={`ref-row-${r.id}`}>
                <TableCell className="font-mono text-[var(--accent)]">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{r.email}</TableCell>
                <TableCell className="font-mono">{r.referrals_count || 0}</TableCell>
                <TableCell className="font-mono">₹{r.earnings || 0}</TableCell>
                <TableCell className="text-xs text-[var(--muted-2)]">{r.created_at?.slice(0, 10)}</TableCell>
                <TableCell className="text-right"><button onClick={()=>del(r.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"><Trash2 size={14}/></button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===== Admin Trader League =====
export function AdminLeague() {
  const [config, setConfig] = useState({ enabled: false, fee_existing: 999, fee_new: 1499 });
  const [rows, setRows] = useState([]);
  const load = async () => {
    try {
      const c = await api.get("/league/config");
      setConfig(c.data);
      const r = await api.get("/league/registrations");
      setRows(r.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  useEffect(() => { load(); }, []);
  const toggle = async () => {
    try {
      const { data } = await api.put("/league/config", { enabled: !config.enabled });
      setConfig({ ...config, enabled: data.enabled });
      toast.success(data.enabled ? "Registration is now OPEN" : "Registration is now CLOSED");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this registration?")) return;
    await api.delete(`/league/registrations/${id}`);
    toast.success("Deleted"); load();
  };
  const statusBadge = (s) => {
    const map = {
      "pending_payment": { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
      "completed": { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Paid" },
      "rejected": { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "Rejected" },
    };
    const m = map[s] || map["pending_payment"];
    return <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full" style={{background:m.bg, color:m.text}}>{m.label}</span>;
  };

  const paidCount = rows.filter(r => r.status === "completed").length;
  const totalRevenue = rows.filter(r => r.status === "completed").reduce((a,r)=>a+(r.amount||0),0);

  return (
    <div>
      <div className="chip mb-3"><Trophy size={12}/> Trader League</div>
      <h1 className="font-display text-4xl">Trader League</h1>
      <p className="text-sm text-[var(--muted)] mt-2">Manage league registration availability and view sign-ups.</p>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="card-panel p-5">
          <div className="text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">Public Registration</div>
          <div className="mt-3 flex items-center justify-between">
            <span className={`text-lg font-display ${config.enabled ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}>
              {config.enabled ? "OPEN" : "CLOSED"}
            </span>
            <button onClick={toggle} className={`rounded-full px-4 py-2 text-xs font-mono uppercase tracking-wider ${config.enabled ? "btn-ghost" : "btn-amber"}`} data-testid="admin-league-toggle">
              {config.enabled ? "Turn OFF" : "Turn ON"}
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted-2)] mt-3 leading-relaxed">Turn OFF to hide the /league page and reject new sign-ups. Existing registrations remain intact.</p>
        </div>
        <div className="card-panel p-5">
          <div className="text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">Paid Registrations</div>
          <div className="font-display text-4xl mt-3 text-[var(--accent)]">{paidCount}</div>
          <div className="text-[11px] text-[var(--muted-2)] mt-2">out of {rows.length} total</div>
        </div>
        <div className="card-panel p-5">
          <div className="text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">Revenue Collected</div>
          <div className="font-display text-4xl mt-3">{formatINR(totalRevenue)}</div>
          <div className="text-[11px] text-[var(--muted-2)] mt-2">Existing {formatINR(config.fee_existing)} · New {formatINR(config.fee_new)}</div>
        </div>
      </div>

      <div className="card-panel overflow-hidden mt-8">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Trader</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Trader ID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} className="border-[var(--border)]" data-testid={`league-row-${r.id}`}>
                <TableCell>
                  <div>{r.full_name}</div>
                  <div className="text-xs text-[var(--muted-2)]">{r.email}</div>
                  <div className="text-xs text-[var(--muted-2)] font-mono">{r.phone}</div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono uppercase tracking-wider">{r.is_existing_trader ? "Existing" : "New"}</span>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.trader_id || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">{formatINR(r.amount)}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>del(r.id)} className="btn-ghost px-2 py-1.5 rounded-md text-[var(--rose)] inline-flex" data-testid={`league-delete-${r.id}`}><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow className="border-[var(--border)]"><TableCell colSpan={7} className="text-center text-[var(--muted)] py-8">No registrations yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===== Admin Users =====
export function AdminUsers() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/admin/users").then(r => setRows(r.data || [])).catch(()=>{});
  useEffect(() => { load(); }, []);
  const del = async (id) => {
    if (!window.confirm("Delete this user? Their orders remain but the login is removed.")) return;
    await api.delete(`/admin/users/${id}`);
    toast.success("Deleted"); load();
  };
  return (
    <div>
      <div className="chip mb-3"><Users size={12}/> Users</div>
      <h1 className="font-display text-4xl">Registered users ({rows.length})</h1>
      <p className="text-sm text-[var(--muted)] mt-2">Every signup from the trader-facing site appears here with their contact info and KYC status.</p>

      <div className="card-panel overflow-hidden mt-8">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>APK Username</TableHead>
            <TableHead>APK Password</TableHead>
            <TableHead>KYC</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(u => (
              <TableRow key={u.id} className="border-[var(--border)]" data-testid={`user-row-${u.id}`}>
                <TableCell><div className="font-medium">{u.name || "—"}</div><div className="text-[10px] text-[var(--muted-2)] font-mono">{u.id.slice(0,8)}</div></TableCell>
                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                <TableCell className="font-mono text-xs">{u.phone || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{u.apk_username || u.email}</TableCell>
                <TableCell className="font-mono text-xs text-[var(--accent)]">{u.apk_password || "—"}</TableCell>
                <TableCell>
                  {u.kyc?.submitted_at
                    ? <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full" style={{background:"rgba(41,211,154,0.15)", color:"#29d39a"}}>Submitted</span>
                    : <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full" style={{background:"rgba(245,182,56,0.15)", color:"#ffd166"}}>Pending</span>}
                </TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>del(u.id)} className="btn-ghost px-2 py-1.5 rounded-md text-[var(--rose)] inline-flex"><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (<TableRow className="border-[var(--border)]"><TableCell colSpan={8} className="text-center text-[var(--muted)] py-8">No users signed up yet.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===== Admin Weekly Highest Payouts (curated) =====
const emptyWP = { image_url:"", trader_name:"", amount:0, plan:"", account_size:0, payout_date:"", order:0, visible:true };

export function AdminWeeklyPayouts() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const load = () => api.get("/admin/weekly-payouts").then(r => setRows(r.data || []));
  useEffect(()=>{ load(); },[]);
  const save = async () => {
    try {
      if (!editing.image_url) { toast.error("Please upload or paste an image URL"); return; }
      if (editing.id) await api.put(`/admin/weekly-payouts/${editing.id}`, editing);
      else await api.post("/admin/weekly-payouts", editing);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if(!window.confirm("Delete this weekly payout entry?")) return; await api.delete(`/admin/weekly-payouts/${id}`); toast.success("Deleted"); load(); };
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5MB)"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => { setEditing(prev => ({ ...prev, image_url: reader.result })); setUploading(false); toast.success("Image loaded"); };
    reader.onerror = () => { setUploading(false); toast.error("Failed to read file"); };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <div className="chip mb-3"><Trophy size={12}/> Weekly Highest Payout</div>
          <h1 className="font-display text-4xl">Weekly Highest Payouts</h1>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">Curated winners shown on the home page — one card per plan (Starter / Standard / Pro). Entries listed here override the auto-derived list from certificates.</p>
        </div>
        <button onClick={()=>setEditing({...emptyWP})} className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2" data-testid="wp-new-btn"><Plus size={16}/> New Weekly Payout</button>
      </div>
      <div className="card-panel overflow-hidden mt-6">
        <Table>
          <TableHeader><TableRow className="border-[var(--border)]">
            <TableHead>Image</TableHead><TableHead>Trader</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Order</TableHead><TableHead>Visible</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(c=>(
              <TableRow key={c.id} className="border-[var(--border)]" data-testid={`wp-row-${c.id}`}>
                <TableCell><img src={c.image_url} alt="" className="w-16 h-16 object-cover rounded-md border border-[var(--border)]"/></TableCell>
                <TableCell className="font-display">{c.trader_name || "—"}</TableCell>
                <TableCell>{c.plan || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">{c.amount ? formatINR(c.amount) : "—"}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{c.payout_date || "—"}</TableCell>
                <TableCell className="font-mono">{c.order}</TableCell>
                <TableCell>{c.visible ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <button onClick={()=>setEditing(c)} className="btn-ghost px-3 py-1.5 rounded-md mr-2" data-testid={`wp-edit-${c.id}`}><Pencil size={14}/></button>
                  <button onClick={()=>del(c.id)} className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]" data-testid={`wp-delete-${c.id}`}><Trash2 size={14}/></button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (<TableRow className="border-[var(--border)]"><TableCell colSpan={8} className="text-center text-[var(--muted)] py-8">No curated weekly payouts yet — the home page currently auto-picks winners from Certificates. Add entries here to override.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing?.id ? "Edit Weekly Payout" : "New Weekly Payout"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Award / Certificate Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  <label className="btn-amber rounded-full px-4 py-2 text-sm inline-flex items-center gap-2 cursor-pointer" data-testid="wp-upload-btn">
                    <Upload size={14}/> {uploading ? "Loading…" : "Upload from device"}
                    <input type="file" accept="image/*" onChange={onFile} className="hidden"/>
                  </label>
                  {editing.image_url && (
                    <button type="button" onClick={()=>setEditing({...editing, image_url:""})} className="btn-ghost rounded-full px-3 py-2 text-xs text-[var(--rose)]">Clear</button>
                  )}
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-[var(--muted-2)]">…or paste an image URL</Label>
                  <Input value={editing.image_url?.startsWith("data:") ? "" : editing.image_url} onChange={e=>setEditing({...editing, image_url:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" placeholder="https://…"/>
                </div>
              </div>
              {editing.image_url && <img src={editing.image_url} alt="" className="w-full max-h-64 object-contain rounded-md border border-[var(--border)]"/>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Trader Name</Label><Input value={editing.trader_name} onChange={e=>setEditing({...editing, trader_name:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Plan (Starter/Standard/Pro)</Label><Input value={editing.plan} onChange={e=>setEditing({...editing, plan:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Payout Amount (₹)</Label><Input type="number" step="0.01" value={editing.amount} onChange={e=>setEditing({...editing, amount:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Account Size (₹)</Label><Input type="number" value={editing.account_size} onChange={e=>setEditing({...editing, account_size:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Payout Date (DD/MM/YYYY)</Label><Input value={editing.payout_date} onChange={e=>setEditing({...editing, payout_date:e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
                <div><Label>Order (lower = first)</Label><Input type="number" value={editing.order} onChange={e=>setEditing({...editing, order:+e.target.value})} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"/></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.visible} onChange={e=>setEditing({...editing, visible:e.target.checked})}/> Visible on home page</label>
            </div>
          )}
          <DialogFooter><button onClick={save} className="btn-amber rounded-full px-6 py-2.5 text-sm" data-testid="wp-save-btn">Save</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
