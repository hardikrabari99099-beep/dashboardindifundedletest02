import { useState, useEffect } from "react";
import { MessageCircle, X, HeadphonesIcon, ShoppingBag, Wallet, HelpCircle } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const options = [
  { icon: <HeadphonesIcon size={16}/>, label: "Customer Support", text: "Hi IndiFunded team, I need help with my account." },
  { icon: <ShoppingBag size={16}/>, label: "Buy a Challenge", text: "Hi, I want to buy a challenge plan. Please guide me." },
  { icon: <Wallet size={16}/>, label: "Payout Query", text: "Hi, I have a question about my payout." },
  { icon: <HelpCircle size={16}/>, label: "General Question", text: "Hi, I have a question about IndiFunded." },
];

export default function WhatsAppMenu() {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const cfg = settings.widgets?.whatsapp ?? { enabled: true };
  const number = (settings.contact?.whatsapp || settings.contact?.phone || "+919081489458").replace(/[^0-9+]/g, "");
  const num = number.startsWith("+") ? number.slice(1) : number;

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!cfg.enabled) return null;

  const openChat = (text) => {
    const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <button aria-label="WhatsApp" onClick={() => setOpen(v => !v)} className="wa-float" style={{ bottom: 20, left: 20 }} data-testid="whatsapp-float">
        {open ? <X size={22}/> : <MessageCircle size={22}/>}
        {!open && <span className="wa-pulse"/>}
      </button>
      {open && (
        <div className="fixed bottom-24 left-5 z-[60] w-[280px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-hi)] bg-[var(--bg-2)] animate-fade-in" data-testid="whatsapp-menu">
          <div className="bg-[#25D366] text-white p-4">
            <div className="font-display text-base">IndiFunded Support</div>
            <div className="text-xs opacity-90 mt-0.5">Typically replies in a few minutes</div>
          </div>
          <div className="p-2">
            {options.map((o, i) => (
              <button key={i} onClick={() => openChat(o.text)} className="w-full text-left px-3 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-3 transition" data-testid={`wa-option-${i}`}>
                <div className="w-8 h-8 rounded-full bg-[rgba(37,211,102,0.15)] text-[#25D366] grid place-items-center shrink-0">{o.icon}</div>
                <div className="text-sm text-white/90">{o.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
