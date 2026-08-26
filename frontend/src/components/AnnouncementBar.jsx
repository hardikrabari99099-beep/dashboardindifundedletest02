import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";

export default function AnnouncementBar() {
  const { settings } = useSettings();
  const a = settings?.announcement || {};
  const key = `ann_dismissed_${(a.text || "").slice(0, 40)}`;
  const [visible, setVisible] = useState(true);
  useEffect(() => { setVisible(!localStorage.getItem(key)); }, [key]);
  if (!a.enabled || !visible || !a.text) return null;
  return (
    <div className="relative z-40 glass-strong border-b border-[var(--border)] animate-fade-in" data-testid="announcement-bar">
      <div className="container-xl flex items-center justify-center gap-3 py-2.5 text-sm">
        <Sparkles size={14} className="text-[var(--accent)] shrink-0"/>
        <div className="text-white/90 truncate">{a.text}</div>
        {a.link && (
          <Link to={a.link} className="text-[var(--accent)] font-medium hover:underline underline-offset-2 whitespace-nowrap">
            {a.cta || "Learn more"} →
          </Link>
        )}
        <button onClick={() => { localStorage.setItem(key, "1"); setVisible(false); }} className="ml-2 text-[var(--muted-2)] hover:text-white" aria-label="Dismiss">
          <X size={14}/>
        </button>
      </div>
    </div>
  );
}
