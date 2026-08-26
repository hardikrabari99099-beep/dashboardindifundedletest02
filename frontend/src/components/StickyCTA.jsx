import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";

export default function StickyCTA() {
  const { settings } = useSettings();
  const cfg = settings.widgets?.sticky_cta ?? { enabled: true };
  const loc = useLocation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const on = () => setVisible(window.scrollY > 600);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (!cfg.enabled) return null;
  if (loc.pathname.startsWith("/admin") || loc.pathname === "/challenges" || loc.pathname === "/login") return null;
  const label = cfg.label || settings.hero?.cta_primary || "Start Challenge";
  return (
    <Link
      to={cfg.link || "/challenges"}
      className={`fixed bottom-6 right-6 z-[55] btn-amber rounded-full px-5 py-3.5 text-sm inline-flex items-center gap-2 shadow-2xl float-cta ${visible ? "is-visible" : ""}`}
      data-testid="sticky-cta"
    >
      <span className="hidden sm:inline">{label}</span>
      <ArrowRight size={16}/>
    </Link>
  );
}
