import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

export const DEFAULT_SETTINGS = {
  brand: { name: "IndiFunded", logo_url: "/logo.jpg", tagline: "India's 1st prop trading firm." },
  contact: {
    email: "support@indifunded.com",
    phone: "+91 78019 20564",
    whatsapp: "+91 78019 20564",
    upi_id: "indifunded@upi",
    company: "BRVS Education Pvt Ltd",
    address: "Unique Square, Causeway, Katargam, Surat, Gujarat, India",
    office: "Unique Square, Causeway, Katargam, Surat",
  },
  social: {
    instagram: "https://www.instagram.com/indifunded?igsh=MXR6bWJhZHV5ZWgwcA==",
    youtube: "https://youtube.com/@indifunded?si=D3AWNCyccOLEp85E",
    twitter: "https://x.com/indifunded",
    facebook: "https://www.facebook.com/share/17bwvWUub7/",
    whatsapp_link: "https://wa.me/919081489458?text=",
  },
  announcement: { enabled: false, text: "🎉 30% OFF on all challenge plans — limited time", link: "/challenges", cta: "Grab Now" },
  widgets: {
    sticky_cta: { enabled: true, label: "Start Challenge", link: "/challenges" },
    whatsapp: { enabled: true, link: "" },
    scroll_progress: { enabled: true },
    bg_3d: { enabled: true },
  },
  hero: {
    chip: "India's 1st Prop Trading Firm",
    title_before: "Your Skills,",
    title_highlight: "Our Funds",
    title_after: "",
    subtitle: "Take on a simple challenge, prove your skill, and receive a funded trading account up to ₹5,00,000. Trade independently in Bank Nifty, Nifty, stocks, F&O, or any segment — take home 70% of the profits while we bear all the losses.",
    cta_primary: "Start Challenge",
    cta_secondary: "Learn More",
    stats: [
      { k: "70%", v: "Profit Split" },
      { k: "₹5L", v: "Max Account" },
      { k: "24h", v: "Payouts" },
      { k: "∞", v: "No Time Limit" },
    ],
  },
  ratings: {
    enabled: true,
    heading: "Rated by traders",
    subtitle: "Verified reviews across the top prop-firm review platforms.",
    items: [
      { platform: "Trustpilot", rating: 4.3, out_of: 5, reviews: 1287, color: "#00b67a", url: "https://www.trustpilot.com" },
      { platform: "PropFirmMatch", rating: 4.1, out_of: 5, reviews: 642, color: "#f59e0b", url: "https://propfirmmatch.com" },
    ],
  },
  steps: {
    title_prefix: "3 steps to become an",
    title_suffix: "IndiFunded trader",
    items: [
      { n: "01", t: "Challenge", d: "Prove your trading skills and discipline on a realistic virtual account. Hit profit targets and respect the risk rules." },
      { n: "02", t: "Verification", d: "Pass the challenge, complete quick KYC, and receive your real funded trading account within 24 hours." },
      { n: "03", t: "Get Paid", d: "Trade independently and take home 70% of the profits — payouts processed within 24 hours to your bank." },
    ],
  },
  testimonials: [
    { q: "Passing the challenge isn't easy, but it's worth it. You learn so much about yourself as a trader. IndiFunded truly pushes you to the next level.", a: "Rahul Chouhan", r: "Standard Challenge Trader" },
    { q: "Payout in 18 hours. I've tried 3 other prop firms — none come close. This is the one for Indian traders.", a: "Priya Sharma", r: "Standard Challenge Trader" },
    { q: "The risk cap is a blessing. I focus on my strategy, not on worrying about blowing up my savings.", a: "Arjun Menon", r: "Standard Challenge Trader" },
  ],
  faq_groups: [
    { title: "Trust & Transparency", items: [
      { q: "Is IndiFunded registered with SEBI?", a: "IndiFunded (BRVS Education Pvt Ltd) is a proprietary trading firm. We trade our own capital and fund traders under a profit-sharing model. Since we don't act as intermediaries, provide investment advice, or manage portfolios, SEBI registration is not required under the SEBI Act, 1992." },
      { q: "How do I know IndiFunded is a genuine platform?", a: "IndiFunded is a legally registered company. You can verify our registration and credentials. Our policies and procedures are designed for fairness and transparency." },
      { q: "How secure is my personal information?", a: "Your data is protected by strict privacy policies and secure systems. We do not share information with third parties without your consent." },
      { q: "Do you have customer support?", a: "Yes — we offer support via email, WhatsApp, and phone, 7 days a week." },
    ] },
    { title: "Challenge Details", items: [
      { q: "What is the profit target?", a: "750 points over 15 trading days on Nifty50/BankNifty options intraday (Standard plan). Targets vary by plan." },
      { q: "What happens if I fail?", a: "You can restart by purchasing a new challenge. No refunds on the challenge fee unless specifically stated." },
      { q: "Can I trade any segment?", a: "Yes — after being funded, you can trade BankNifty, Nifty50, equity F&O or any segment as per your strategy." },
      { q: "Which broker do you use?", a: "We integrate with Zerodha, Angel One, Dhan and Upstox." },
    ] },
    { title: "Funded Account", items: [
      { q: "When will I receive my payout?", a: "Within 24 hours of profit verification, through verified banking channels." },
      { q: "Is there a hidden fee?", a: "No hidden fees. Only the agreed profit share (70% to you) applies." },
      { q: "Do I need to pay after passing?", a: "No additional payments. Once you pass and complete KYC, you get the funded account." },
      { q: "Can my funded account grow?", a: "Yes — your account grows by ₹1 Lakh every 2 months of profitable performance up to ₹5 Lakh." },
    ] },
  ],
  rules: {
    title: "Simple. Realistic. Trader-first rules.",
    subtitle: "We designed our challenge to separate disciplined traders from gamblers — not to trick you with impossible targets.",
    items: [
      { t: "Account Size", d: "₹1,00,000 to ₹5,00,000 funded account. Scaled +₹1L every 2 months of profitable performance.", i: "Scale" },
      { t: "Profit Target", d: "750 points over 15 trading days on Nifty50/BankNifty options intraday (Standard plan).", i: "TrendingDown" },
      { t: "Maximum Loss", d: "Overall max drawdown capped at 20% of account size. Exceeding this ends the challenge.", i: "ShieldCheck" },
      { t: "Minimum Days", d: "At least 10 trading days of actual activity to qualify. Total window: 15 days.", i: "BookOpen" },
      { t: "Trade Limit", d: "Max 3 trades per day. Encourages selective, high-quality entries.", i: "Users" },
      { t: "Profit Accuracy", d: "Minimum 70% accuracy on profitable days over the challenge window.", i: "CheckCircle2" },
    ],
  },
  about: {
    title: "Built for Indian traders. Run by traders.",
    intro: "IndiFunded is India's first prop trading firm, operated by BRVS Education Pvt Ltd. We trade our own capital and fund skilled traders under a profit-sharing model — no third-party investors, no retail advisory, no hidden strings.",
    cards: [
      { t: "Our Mission", d: "Empower Indian traders with capital, not just courses. Give disciplined retail talent a path to professional trading." },
      { t: "Our Promise", d: "Transparent rules. 70% profit share. 24-hour payouts through verified banking channels. No hidden fees." },
      { t: "Who We Are", d: "A team of traders, engineers, and operators who've experienced the frustration of being capital-constrained in markets." },
    ],
    footer_title: "Why we exist",
    footer_text: "Too many traders have faced financial stress by risking their own savings. We're here to change that. Prove your skill — we'll provide the capital.",
  },
  benefits: {
    title: "Why IndiFunded",
    subtitle: "Everything you get when you become a funded trader with us.",
    items: [
      { t: "No Time Limits", d: "Pass the challenge at your own pace. Focus on discipline, not the clock.", i: "Clock" },
      { t: "Guaranteed Payouts", d: "Profit split processed within 24 hours through verified banking channels.", i: "CircleDollarSign" },
      { t: "Zero Risk of Loss", d: "20% max loss cap. We absorb the rest. Your personal capital is never at risk.", i: "ShieldCheck" },
      { t: "Best Trading Platforms", d: "Trade on Zerodha, Angel One, Dhan or Upstox — your familiar setup.", i: "Zap" },
      { t: "Trader Community", d: "Join a network of like-minded Indian traders with daily insights and mentorship.", i: "Star" },
      { t: "Scale Your Capital", d: "Starting at ₹1L, your funded account grows by ₹1L every 2 months up to ₹5L.", i: "TrendingUp" },
    ],
  },
  live_counter: {
    enabled: true,
    heading: "Trusted by India's growing trader community",
    items: [
      { label: "Traders Funded", value: 5247, suffix: "+", prefix: "" },
      { label: "Total Payouts", value: 12480000, suffix: "", prefix: "₹" },
      { label: "Profit Split", value: 70, suffix: "%", prefix: "" },
      { label: "Payout Speed", value: 24, suffix: "h", prefix: "" },
    ],
  },
  payouts_page: {
    heading: "Real payouts. Real traders. Real fast.",
    subtitle: "Every payout below is a verified transfer to a funded IndiFunded trader within 24 hours of profit verification.",
    show_request_form: true,
    items: [
      { name: "Vivek Raut", plan: "Starter", amount: 6700, city: "Pune", days_ago: 1 },
      { name: "Priya Sharma", plan: "Pro", amount: 34200, city: "Mumbai", days_ago: 1 },
      { name: "Arjun Menon", plan: "Standard", amount: 18450, city: "Bengaluru", days_ago: 2 },
      { name: "Rahul Chouhan", plan: "Standard", amount: 22800, city: "Indore", days_ago: 2 },
      { name: "Karthik R.", plan: "Pro", amount: 41250, city: "Chennai", days_ago: 3 },
      { name: "Neha Gupta", plan: "Starter", amount: 8900, city: "Delhi", days_ago: 3 },
      { name: "Manish P.", plan: "Standard", amount: 15600, city: "Ahmedabad", days_ago: 4 },
      { name: "Sneha K.", plan: "Pro", amount: 29750, city: "Hyderabad", days_ago: 4 },
      { name: "Rohan Desai", plan: "Standard", amount: 12300, city: "Nagpur", days_ago: 5 },
      { name: "Ananya M.", plan: "Pro", amount: 47800, city: "Kolkata", days_ago: 5 },
      { name: "Faizan Sheikh", plan: "Standard", amount: 19650, city: "Lucknow", days_ago: 6 },
      { name: "Deepika V.", plan: "Pro", amount: 52400, city: "Jaipur", days_ago: 6 },
    ],
  },
};

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, loading: true, reload: () => {} });

// Deep merge helper: fills missing keys from defaults
function merge(target, source) {
  if (Array.isArray(source)) return source;
  if (source && typeof source === "object") {
    const out = { ...target };
    for (const k of Object.keys(source)) out[k] = merge(target?.[k], source[k]);
    for (const k of Object.keys(target || {})) if (!(k in out)) out[k] = target[k];
    return out;
  }
  return source === undefined ? target : source;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      const r = await api.get("/settings");
      setSettings(merge(DEFAULT_SETTINGS, r.data || {}));
    } catch (_) { /* keep defaults */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return <SettingsContext.Provider value={{ settings, loading, reload }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
