import { NavLink, Navigate, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Wallet, Award, Settings as SettingsIcon, Briefcase, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import BrandLogo from "../../components/BrandLogo";

const links = [
  { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16}/>, end: true },
  { to: "/app/accounts", label: "Accounts", icon: <Briefcase size={16}/> },
  { to: "/app/payouts", label: "Payouts", icon: <Wallet size={16}/> },
  { to: "/app/certificates", label: "Certificates", icon: <Award size={16}/> },
  { to: "/app/settings", label: "Settings", icon: <SettingsIcon size={16}/> },
];

export default function UserDashboardLayout() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (loading) return <div className="container-xl py-24 text-[var(--muted)]">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;

  const initials = (user.name || user.email || "?").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
      {/* Mobile topbar */}
      <div className="md:hidden flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-1)] p-4 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo size="sm" />
        </Link>
        <button onClick={()=>setOpen(v=>!v)} className="btn-ghost px-3 py-2 rounded-lg" data-testid="dash-mobile-toggle">
          {open ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      <aside className={`${open ? "block" : "hidden"} md:block border-r border-[var(--border)] bg-[var(--bg-1)] p-5 md:sticky md:top-0 md:h-screen overflow-y-auto`}>
        <Link to="/" className="hidden md:flex items-center gap-2">
          <BrandLogo size="md"/>
        </Link>

        <nav className="mt-8 md:mt-10 flex flex-col gap-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={()=>setOpen(false)}
              className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-white"}`}
              data-testid={`dash-nav-${l.label.toLowerCase()}`}>
              {l.icon}{l.label}
            </NavLink>
          ))}
        </nav>

        <Link to="/challenges" className="btn-amber rounded-full px-4 py-2.5 text-xs w-full text-center mt-6 inline-block">
          Buy new account
        </Link>

        <div className="mt-6 chip w-full justify-center text-[10px]"><ShieldCheck size={10}/> Simulated trading environment</div>
        <Link to="/rules" className="text-[11px] text-[var(--muted-2)] mt-2 block text-center hover:text-white">Rules</Link>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white grid place-items-center font-semibold text-xs shrink-0" data-testid="dash-user-initials">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{user.name || "—"}</div>
            <div className="text-[10px] text-[var(--muted-2)] truncate font-mono">{user.email}</div>
          </div>
        </div>
        <button onClick={async()=>{await logout(); nav("/login");}}
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--muted)] hover:text-white hover:bg-[var(--surface)] w-full"
                data-testid="dash-signout">
          <LogOut size={14}/> Sign out
        </button>
      </aside>

      <main className="p-5 md:p-8 lg:p-12 max-w-6xl w-full min-w-0"><Outlet/></main>
    </div>
  );
}
