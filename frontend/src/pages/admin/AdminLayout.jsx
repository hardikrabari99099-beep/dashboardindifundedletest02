import { NavLink, Navigate, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Package, FileText, Users, ShoppingBag, LogOut, Award, Wallet, Settings, Trophy, Tag, Gift, Menu, X } from "lucide-react";
import { useState } from "react";
import BrandLogo from "../../components/BrandLogo";

const links = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard size={16}/> , end: true},
  { to: "/admin/settings", label: "Site Settings", icon: <Settings size={16}/>},
  { to: "/admin/plans", label: "Plans", icon: <Package size={16}/>},
  { to: "/admin/blogs", label: "Blogs", icon: <FileText size={16}/>},
  { to: "/admin/certificates", label: "Certificates", icon: <Award size={16}/>},
  { to: "/admin/leaderboard", label: "Leaderboard", icon: <Trophy size={16}/>},
  { to: "/admin/coupons", label: "Coupons", icon: <Tag size={16}/>},
  { to: "/admin/referrals", label: "Referrals", icon: <Gift size={16}/>},
  { to: "/admin/payouts", label: "Payouts", icon: <Wallet size={16}/>},
  { to: "/admin/leads", label: "Leads", icon: <Users size={16}/>},
  { to: "/admin/orders", label: "Orders", icon: <ShoppingBag size={16}/>},
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (loading) return <div className="container-xl py-24 text-[var(--muted)]">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr] grain">
      {/* Mobile topbar */}
      <div className="md:hidden flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-1)] p-4 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo size="sm" />
          <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider ml-1">Admin</div>
        </Link>
        <button onClick={()=>setOpen(v=>!v)} className="btn-ghost px-3 py-2 rounded-lg" data-testid="admin-mobile-toggle">
          {open ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>
      <aside className={`${open ? "block" : "hidden"} md:block border-r border-[var(--border)] bg-[var(--bg-1)] p-5 md:sticky md:top-0 md:h-screen overflow-y-auto`}>
        <Link to="/" className="hidden md:flex items-center gap-2">
          <BrandLogo size="md" />
          <div className="text-[10px] text-[var(--muted-2)] font-mono uppercase tracking-wider ml-1">Admin</div>
        </Link>
        <nav className="md:mt-10 flex flex-col gap-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={()=>setOpen(false)}
              className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${isActive ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-white"}`}
              data-testid={`admin-nav-${l.label.toLowerCase().replace(/\s+/g,"-")}`}>
              {l.icon}{l.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={async()=>{await logout(); nav("/login");}} className="mt-6 md:mt-10 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:text-white hover:bg-[var(--surface)] w-full" data-testid="admin-logout">
          <LogOut size={16}/> Logout
        </button>
        <div className="mt-6 md:mt-10 text-xs text-[var(--muted-2)] font-mono truncate">{user.email}</div>
      </aside>
      <main className="p-5 md:p-8 lg:p-12 max-w-6xl w-full min-w-0"><Outlet/></main>
    </div>
  );
}
