import { useSettings } from "../context/SettingsContext";

/**
 * Horizontal wordmark logo used in Header, Footer and Admin.
 * - Combines the "F" glyph mark (public/logo.jpg) with a two-tone
 *   "Indi / Funded" wordmark for a polished brand feel.
 *
 * Props:
 *   size?:    "sm" | "md" | "lg"  (default "md")
 *   variant?: "light" | "muted"  (default "light")  — controls the "Indi" tint
 *   showTagline?: boolean               — small caps tagline below wordmark
 */
export default function BrandLogo({ size = "md", variant = "light", showTagline = false, className = "" }) {
  const { settings } = useSettings();
  const b = settings.brand || {};
  const src = b.logo_url || "/logo.jpg";
  const name = b.name || "IndiFunded";

  // Split brand name into two tone halves. Fallback safely if the
  // configured name isn't "IndiFunded" (or similar).
  const lower = name.toLowerCase();
  let first = name, second = "";
  if (lower.startsWith("indi")) {
    first = name.slice(0, 4);
    second = name.slice(4);
  } else if (lower.startsWith("rubi")) {
    first = name.slice(0, 4);
    second = name.slice(4);
  } else {
    // Best-effort: split at half length if we can't detect a known brand
    const mid = Math.ceil(name.length / 2);
    first = name.slice(0, mid);
    second = name.slice(mid);
  }

  const sizes = {
    sm: { mark: "w-7 h-7", text: "text-base", tagline: "text-[9px]", gap: "gap-2" },
    md: { mark: "w-10 h-10", text: "text-xl", tagline: "text-[10px]", gap: "gap-2.5" },
    lg: { mark: "w-12 h-12", text: "text-2xl md:text-3xl", tagline: "text-[11px]", gap: "gap-3" },
  };
  const s = sizes[size] || sizes.md;
  const firstClass = variant === "muted" ? "text-white/90" : "text-white";

  return (
    <div className={`flex items-center ${s.gap} ${className}`} data-testid="brand-logo">
      <img
        src={src}
        alt={name}
        className={`${s.mark} rounded-xl object-contain bg-white/5 ring-1 ring-[var(--border-hi)] p-1`}
      />
      <div className="flex flex-col leading-none">
        <div className={`font-display ${s.text} font-semibold tracking-tight`}>
          <span className={firstClass}>{first}</span>
          <span className="text-[var(--accent)]">{second}</span>
        </div>
        {showTagline && (
          <div className={`${s.tagline} font-mono uppercase tracking-[0.18em] text-[var(--muted-2)] mt-1`}>
            {b.tagline || "India's 1st Prop Trading Firm"}
          </div>
        )}
      </div>
    </div>
  );
}
