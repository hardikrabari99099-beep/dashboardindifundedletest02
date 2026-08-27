import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

// attach bearer token fallback (for preview domains that may strip cookies)
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("if_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Silently clear a stale token when the server rejects it, so subsequent
// requests don't repeatedly surface the same 401 to the console.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const isAuthMe = err?.config?.url?.endsWith("/auth/me");
      if (isAuthMe && typeof window !== "undefined") {
        try { localStorage.removeItem("if_token"); } catch { /* ignore */ }
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
