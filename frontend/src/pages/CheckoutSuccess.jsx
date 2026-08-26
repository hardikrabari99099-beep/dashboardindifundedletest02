import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState({ loading: true });

  useEffect(()=>{
    if (!sessionId) { setStatus({ loading:false, error:"Missing session id" }); return; }
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/checkout/status/${sessionId}`);
        if (data.payment_status === "paid") { setStatus({ loading:false, data }); return; }
        if (data.status === "expired") { setStatus({ loading:false, error:"Payment session expired" }); return; }
        if (attempts++ < 12) setTimeout(poll, 2000);
        else setStatus({ loading:false, error:"Payment still processing — check your email shortly." });
      } catch { setStatus({ loading:false, error:"Could not verify payment" }); }
    };
    poll();
  },[sessionId]);

  return (
    <div className="container-xl pt-24 pb-24 max-w-xl">
      <div className="card-panel p-10 text-center glow-border">
        {status.loading && (
          <div className="py-8" data-testid="checkout-loading">
            <Loader2 className="mx-auto animate-spin text-[var(--accent)]" size={40}/>
            <div className="font-display text-2xl mt-6">Verifying payment…</div>
            <div className="text-[var(--muted)] mt-2 text-sm">Please don't close this page.</div>
          </div>
        )}
        {!status.loading && status.data && (
          <div data-testid="checkout-success">
            <CheckCircle2 className="mx-auto text-[var(--emerald)]" size={48}/>
            <div className="font-display text-3xl mt-5">Payment successful</div>
            <div className="text-[var(--muted)] mt-3">Welcome aboard. Our onboarding team will reach out within 24 hours with your challenge credentials.</div>
            <div className="card-panel p-4 text-left mt-6 font-mono text-xs">
              <div><span className="text-[var(--muted-2)]">Amount:</span> {status.data.amount_total/100} {status.data.currency?.toUpperCase()}</div>
              <div><span className="text-[var(--muted-2)]">Session:</span> {sessionId}</div>
            </div>
            <Link to="/" className="inline-block mt-7 btn-amber rounded-full px-6 py-3 text-sm">Back to Home</Link>
          </div>
        )}
        {!status.loading && status.error && (
          <div data-testid="checkout-error">
            <XCircle className="mx-auto text-[var(--rose)]" size={48}/>
            <div className="font-display text-2xl mt-5">{status.error}</div>
            <Link to="/challenges" className="inline-block mt-7 btn-ghost rounded-full px-6 py-3 text-sm">Try again</Link>
          </div>
        )}
      </div>
    </div>
  );
}
