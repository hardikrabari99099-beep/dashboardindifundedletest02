import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { formatApiError } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { Loader2, LockKeyhole, UserPlus } from "lucide-react";

export default function Login() {
  useSEO({ title: "Sign in — IndiFunded", description: "IndiFunded trader sign-in.", path: "/login" });
  if (typeof document !== "undefined") {
    let m = document.head.querySelector('meta[name="robots"]');
    if (m) m.setAttribute("content", "noindex, nofollow");
  }
  const { user, login, signup } = useAuth();
  const loc = useLocation();
  const initialMode = new URLSearchParams(loc.search).get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (user) {
    const target = user.role === "admin" ? "/admin" : "/app";
    return <Navigate to={target} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      let res;
      if (mode === "signup") {
        if (!form.name.trim()) { toast.error("Please enter your name"); setBusy(false); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); setBusy(false); return; }
        res = await signup(form);
        toast.success("Welcome to IndiFunded!");
      } else {
        res = await login(form.email, form.password);
        toast.success(`Welcome back${res?.name ? ", " + res.name.split(" ")[0] : ""}`);
      }
      const target = res?.role === "admin" ? "/admin" : "/app";
      nav(target);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || (mode === "signup" ? "Sign up failed" : "Login failed"));
    } finally { setBusy(false); }
  };

  const isSignup = mode === "signup";

  return (
    <div className="container-xl pt-16 pb-24 max-w-md">
      <div className="card-panel p-8 md:p-10 glow-border" data-testid="auth-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--accent)] text-white">
            {isSignup ? <UserPlus size={18}/> : <LockKeyhole size={18}/>}
          </div>
          <div>
            <div className="font-display text-2xl">{isSignup ? "Create your account" : "Welcome back"}</div>
            <div className="text-xs text-[var(--muted-2)] font-mono tracking-wider uppercase mt-0.5">IndiFunded Trader</div>
          </div>
        </div>

        <div className="flex gap-2 rounded-full bg-[var(--bg-1)] p-1 border border-[var(--border-hi)] mb-6" data-testid="auth-mode-switch">
          <button type="button" onClick={()=>setMode("login")}
                  className={`flex-1 rounded-full py-2 text-sm transition-colors ${!isSignup ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-white"}`}
                  data-testid="auth-tab-login">Sign in</button>
          <button type="button" onClick={()=>setMode("signup")}
                  className={`flex-1 rounded-full py-2 text-sm transition-colors ${isSignup ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-white"}`}
                  data-testid="auth-tab-signup">Sign up</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Full name</label>
                <input required value={form.name} onChange={e=>setForm({...form, name: e.target.value})}
                       className="input-dark mt-2" placeholder="Rahul Sharma" data-testid="signup-name"/>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Mobile (optional)</label>
                <input value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})}
                       className="input-dark mt-2" placeholder="+91 9XXXXXXXXX" data-testid="signup-phone"/>
              </div>
            </>
          )}
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Email</label>
            <input required type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})}
                   className="input-dark mt-2" placeholder="you@example.com" data-testid="auth-email"/>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">Password</label>
            <input required type="password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})}
                   className="input-dark mt-2" placeholder={isSignup ? "min 6 characters" : "••••••••"}
                   data-testid="auth-password"/>
          </div>
          <button disabled={busy} className="btn-amber rounded-full w-full py-3 text-sm inline-flex items-center justify-center gap-2 mt-2" data-testid="auth-submit">
            {busy
              ? <><Loader2 className="animate-spin" size={16}/> {isSignup ? "Creating account…" : "Signing in…"}</>
              : (isSignup ? "Create account" : "Sign in")}
          </button>
        </form>

        <div className="text-xs text-[var(--muted-2)] text-center mt-6">
          {isSignup ? (
            <>Already have an account? <button type="button" onClick={()=>setMode("login")} className="text-[var(--accent)] hover:underline">Sign in</button></>
          ) : (
            <>New to IndiFunded? <button type="button" onClick={()=>setMode("signup")} className="text-[var(--accent)] hover:underline">Create an account</button></>
          )}
        </div>
        <div className="text-[10px] text-[var(--muted-2)] text-center mt-4">
          By continuing, you agree to our <Link to="/rules" className="hover:text-white">rules</Link> and privacy policy.
        </div>
      </div>
    </div>
  );
}
