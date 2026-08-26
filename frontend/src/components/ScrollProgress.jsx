import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      setP(Math.min(100, Math.max(0, (h.scrollTop / max) * 100)));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none" data-testid="scroll-progress">
      <div className="h-full bg-gradient-to-r from-[var(--accent)] via-[#6ee7b7] to-[var(--accent)]" style={{ width: `${p}%`, transition: "width .1s linear" }}/>
    </div>
  );
}
