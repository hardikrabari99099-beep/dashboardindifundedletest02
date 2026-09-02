import { Header } from "./Header";
import { Footer } from "./Footer";
import AnnouncementBar from "./AnnouncementBar";
import ScrollProgress from "./ScrollProgress";
import StickyCTA from "./StickyCTA";
import WhatsAppMenu from "./WhatsAppMenu";
import PageBg3D from "./PageBg3D";
import { Outlet, useLocation } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function Layout() {
  const loc = useLocation();
  const { settings } = useSettings();
  const w = settings.widgets || {};
  return (
    <div className="min-h-screen flex flex-col grain relative">
      <PageBg3D />
      {w.scroll_progress?.enabled !== false && <ScrollProgress />}
      <AnnouncementBar />
      <Header />
      <main key={loc.pathname} className={`flex-1 page-transition ${loc.pathname === "/" ? "" : "pt-8 md:pt-12"}`}><Outlet /></main>
      <Footer />
      <StickyCTA />
      <WhatsAppMenu />
    </div>
  );
}
