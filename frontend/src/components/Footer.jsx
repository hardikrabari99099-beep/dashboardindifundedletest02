import { Link } from "react-router-dom";
import { Instagram, Youtube, Twitter, Facebook, MessageCircle } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import BrandLogo from "./BrandLogo";

export const Footer = () => {
  const { settings } = useSettings();
  const b = settings.brand, c = settings.contact, s = settings.social;
  return (
    <footer className="border-t border-[var(--border)] mt-24 pt-16 pb-16" data-testid="site-footer">
      <div className="container-xl grid md:grid-cols-4 gap-10">
        <div>
          <BrandLogo size="lg" className="mb-4" />
          <p className="text-sm text-[var(--muted)] leading-relaxed">{b.tagline}</p>
          <div className="flex gap-3 mt-5">
            {s.instagram && <a href={s.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border-hi)] hover:border-[var(--accent)]" data-testid="social-instagram"><Instagram size={16}/></a>}
            {s.youtube && <a href={s.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border-hi)] hover:border-[var(--accent)]" data-testid="social-youtube"><Youtube size={16}/></a>}
            {s.twitter && <a href={s.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border-hi)] hover:border-[var(--accent)]" data-testid="social-twitter"><Twitter size={16}/></a>}
            {s.facebook && <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border-hi)] hover:border-[var(--accent)]" data-testid="social-facebook"><Facebook size={16}/></a>}
            {s.whatsapp_link && <a href={s.whatsapp_link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border-hi)] hover:border-[var(--accent)]" data-testid="social-whatsapp"><MessageCircle size={16}/></a>}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-4 text-white/90">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/blog" className="hover:text-white">Blog</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-4 text-white/90">Traders</h4>
          <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
            <Link to="/challenges" className="hover:text-white">Challenges</Link>
            <Link to="/rules" className="hover:text-white">Rules</Link>
            <Link to="/tools" className="hover:text-white">Trading Tools</Link>
            <Link to="/faq" className="hover:text-white">FAQ</Link>
            <Link to="/payout-request" className="hover:text-white">Request Payout</Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-4 text-white/90">Contact</h4>
          <div className="text-sm text-[var(--muted)] space-y-2">
            <div className="flex gap-2 items-start"><span className="text-[var(--muted-2)] text-xs uppercase tracking-wider w-14 shrink-0 mt-0.5">Email</span><a href={`mailto:${c.email}`} className="hover:text-white break-all">{c.email}</a></div>
            <div className="flex gap-2 items-start"><span className="text-[var(--muted-2)] text-xs uppercase tracking-wider w-14 shrink-0 mt-0.5">Phone</span><a href={`tel:${c.phone}`} className="hover:text-white">{c.phone}</a></div>
            <div className="flex gap-2 items-start"><span className="text-[var(--muted-2)] text-xs uppercase tracking-wider w-14 shrink-0 mt-0.5">Address</span><span className="leading-relaxed text-xs">{c.address || "Unique Square, Causeway, Katargam, Surat, Gujarat, India"}</span></div>
            <div className="text-xs mt-3 text-[var(--muted-2)]">{c.company}</div>
          </div>
        </div>
      </div>
      <div className="container-xl mt-12 pt-6 border-t border-[var(--border)] flex flex-col md:flex-row justify-between gap-3 text-xs text-[var(--muted-2)]">
        <div>© 2025 {b.name}. All rights reserved.</div>
        <div>Trading involves risk. {b.name} provides simulated/funded accounts under profit-share agreements.</div>
      </div>
    </footer>
  );
};
