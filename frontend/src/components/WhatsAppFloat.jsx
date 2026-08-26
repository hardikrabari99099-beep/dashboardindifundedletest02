import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function WhatsAppFloat() {
  const { settings } = useSettings();
  const cfg = settings.widgets?.whatsapp ?? { enabled: true };
  const loc = useLocation();
  if (!cfg.enabled) return null;
  if (loc.pathname.startsWith("/admin")) return null;
  const link = cfg.link || settings.social?.whatsapp_link || `https://wa.me/${(settings.contact?.whatsapp || "").replace(/[^\d]/g,"")}`;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp support"
      className="fixed bottom-6 left-6 z-[55] wa-float"
      data-testid="whatsapp-float"
    >
      <span className="wa-pulse"/>
      <MessageCircle size={22}/>
    </a>
  );
}
