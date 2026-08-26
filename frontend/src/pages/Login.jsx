import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { formatApiError } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { Loader2, LockKeyhole } from "lucide-react";

export default function Login() {
  useSEO({ title: "Admin Sign-in", description: "IndiFunded admin sign-in.", path: "/login" });
  // Prevent indexing of login page
  if (typeof document !== "undefined") {
    let m = document.head.querySelector('meta[name="robots"]');
    if (m) m.setAttribute("content", "noindex, nofollow");
  }
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@indifunded.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await login(email, password); toast.success("Welcome back"); nav("/admin"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Login failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="container-xl pt-24 pb-24 max-w-md">
      <div className="card-panel p-10 glow-border" data-testid="login-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--accent)] text-white"><LockKeyhole size={18}/></div>
          <div>
            <div className="font-display text-2xl">Admin Sign-in</div>
            <div className="text-xs text-[var(--muted-2)] font-mono tracking-wider uppercase mt-0.5">IndiFunded Control</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Email</Label><Input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="login-email"/></div>
          <div><Label>Password</Label><Input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2" data-testid="login-password"/></div>
          <button disabled={busy} className="btn-amber rounded-full w-full py-3 text-sm inline-flex items-center justify-center gap-2" data-testid="login-submit">
            {busy ? <><Loader2 className="animate-spin" size={16}/> Signing in…</> : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
