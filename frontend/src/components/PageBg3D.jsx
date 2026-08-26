import { useEffect, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";

export default function PageBg3D() {
  const ref = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const { settings } = useSettings();
  const enabled = settings.widgets?.bg_3d?.enabled !== false;

  useEffect(() => {
    // Detect touch / small viewport once — mobile devices skip heavy effects
    const check = () => {
      const touch = (typeof window !== "undefined") &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0 || window.matchMedia("(max-width: 900px)").matches);
      setIsMobile(touch);
    };
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!enabled || isMobile) return; // no mousemove listener on mobile
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const on = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const x = ((e.clientX / window.innerWidth) * 100).toFixed(2);
        const y = ((e.clientY / window.innerHeight) * 100).toFixed(2);
        el.style.setProperty("--mx", x + "%");
        el.style.setProperty("--my", y + "%");
        raf = 0;
      });
    };
    window.addEventListener("mousemove", on, { passive: true });
    return () => { window.removeEventListener("mousemove", on); if (raf) cancelAnimationFrame(raf); };
  }, [enabled, isMobile]);

  if (!enabled) return null;
  // On mobile: render lightweight single gradient orb only, no mouse-glow, no blob
  if (isMobile) {
    return (
      <div className="page-bg-3d page-bg-3d-lite" aria-hidden="true">
        <span className="pb-orb pb-orb-1"/>
      </div>
    );
  }
  return (
    <div ref={ref} className="page-bg-3d" aria-hidden="true">
      <span className="pb-orb pb-orb-1"/>
      <span className="pb-orb pb-orb-2"/>
      <span className="pb-orb pb-orb-3"/>
      <span className="pb-blob"/>
      <span className="pb-glow"/>
    </div>
  );
}
