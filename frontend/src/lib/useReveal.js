import { useEffect, useRef } from "react";

/** Lightweight scroll reveal using IntersectionObserver — no library needed. */
export function useReveal(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const els = ref.current ? [ref.current] : Array.from(document.querySelectorAll("[data-reveal]:not(.is-visible)"));
    if (!els.length) return;
    const reveal = (el) => el.classList.add("is-visible");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -5% 0px" });
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      else io.observe(el);
    });
    const t = setTimeout(() => els.forEach(reveal), 1800);
    return () => { io.disconnect(); clearTimeout(t); };
    // eslint-disable-next-line
  }, deps);
  return ref;
}

/** Build a UPI deep-link. On mobile, window.location = link opens UPI apps. */
export function buildUpiLink({ pa, pn, am, tn, cu = "INR" }) {
  const params = new URLSearchParams();
  params.set("pa", pa);
  params.set("pn", pn);
  params.set("am", Number(am).toFixed(2));
  params.set("cu", cu);
  if (tn) params.set("tn", tn);
  return `upi://pay?${params.toString()}`;
}

export function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
