import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatINR, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { Mail, LogOut, LifeBuoy } from "lucide-react";

export default function UserSettings() {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState([]);

  useEffect(() => { api.get("/me/billing").then(r=>setBilling(r.data||[])).catch(()=>{}); }, []);
  useEffect(() => { setProfile({ name: user?.name || "", phone: user?.phone || "" }); }, [user]);

  const save = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) { toast.error("Name is required"); return; }
    if (!profile.phone.trim()) { toast.error("Mobile number is required — it's how our team reaches you"); return; }
    setSaving(true);
    try {
      await api.put("/me/profile", profile);
      await refresh();
      toast.success("Profile updated");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const statusBadge = (s) => {
    const map = {
      "pending_payment": { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "pending" },
      "pending_verification": { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "pending" },
      "completed": { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "paid" },
      "rejected": { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "rejected" },
    };
    const m = map[s] || map["pending_payment"];
    return <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full" style={{background:m.bg, color:m.text}}>{m.label}</span>;
  };

  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl">Settings</h1>
      <p className="text-sm text-[var(--muted)] mt-2">Manage your profile, account and billing history.</p>

      <div className="card-panel p-6 md:p-8 mt-8">
        <h2 className="font-display text-xl">Profile</h2>
        <p className="text-xs text-[var(--muted)] mt-1">Update your personal details.</p>
        <form onSubmit={save} className="grid md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Full name</label>
            <input className="input-dark mt-2" value={profile.name} onChange={e=>setProfile({...profile, name: e.target.value})} data-testid="settings-name"/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Mobile number</label>
            <input className="input-dark mt-2" value={profile.phone} onChange={e=>setProfile({...profile, phone: e.target.value})} placeholder="+91 9XXXXXXXXX" data-testid="settings-phone"/>
            <p className="text-[10px] text-[var(--muted-2)] mt-1">Required — it's how our team reaches you about your account.</p>
          </div>
          <div className="md:col-span-2">
            <button disabled={saving} className="btn-amber rounded-full px-5 py-2.5 text-xs disabled:opacity-60" data-testid="settings-save">{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>

      <div className="card-panel p-6 md:p-8 mt-6">
        <h2 className="font-display text-xl">Billing history</h2>
        <p className="text-xs text-[var(--muted)] mt-1">Your account purchases.</p>
        {billing.length ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">
                <tr className="border-b border-[var(--border)]"><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Product</th><th className="py-3 pr-4">Amount</th><th className="py-3">Status</th></tr>
              </thead>
              <tbody>
                {billing.map((b,i)=>(
                  <tr key={b.id || i} className="border-b border-[var(--border)]">
                    <td className="py-3 pr-4 text-xs text-[var(--muted)]">{new Date(b.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</td>
                    <td className="py-3 pr-4">{b.product}</td>
                    <td className="py-3 pr-4 font-mono">{formatINR(b.amount)}</td>
                    <td className="py-3">{statusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-[var(--muted)] py-6">No purchases yet.</div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="card-panel p-6">
          <h3 className="font-display text-lg">Account</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-3"><Mail size={14} className="mt-0.5 text-[var(--muted-2)]"/><div><div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-mono">Email</div><div>{user?.email}</div></div></div>
            <div className="text-xs text-[var(--muted)]"><span className="text-[var(--muted-2)] font-mono">Sign-in:</span> Email + password</div>
            {user?.created_at && <div className="text-xs text-[var(--muted)]"><span className="text-[var(--muted-2)] font-mono">Member since:</span> {new Date(user.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</div>}
          </div>
        </div>
        <div className="card-panel p-6" data-testid="apk-credentials-card">
          <h3 className="font-display text-lg">Trading App (APK) credentials</h3>
          <p className="text-xs text-[var(--muted)] mt-1">Use these to log in to the IndiFunded trading app once your account is funded.</p>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-mono">Username</div>
              <div className="font-mono select-all mt-1 break-all">{user?.apk_username || user?.email}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-mono">Password</div>
              <div className="font-mono select-all mt-1">{user?.apk_password || "—"}</div>
            </div>
          </div>
        </div>
        <div className="card-panel p-6 flex flex-col md:col-span-2">
          <h3 className="font-display text-lg">Support</h3>
          <p className="text-xs text-[var(--muted)] mt-1">Questions about your accounts or payouts?</p>
          <Link to="/contact" className="btn-ghost rounded-full px-4 py-2.5 text-xs mt-4 inline-flex items-center gap-2 self-start"><LifeBuoy size={14}/> Contact support</Link>
        </div>
      </div>

      <div className="card-panel p-6 mt-6">
        <h3 className="font-display text-lg">Session</h3>
        <p className="text-xs text-[var(--muted)] mt-1">Sign out of this device.</p>
        <button onClick={async()=>{await logout(); nav("/login");}} className="btn-ghost rounded-full px-4 py-2.5 text-xs mt-4 inline-flex items-center gap-2" data-testid="settings-signout"><LogOut size={14}/> Sign out</button>
      </div>
    </div>
  );
}
