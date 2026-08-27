import { useEffect, useState } from "react";
import { api, formatINR } from "../../lib/api";
import { Award } from "lucide-react";

export default function UserCertificates() {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    api.get("/me/certificates").then(r=>{setRows(r.data||[]); setLoaded(true);}).catch(()=>setLoaded(true));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl">Certificates</h1>
      <p className="text-sm text-[var(--muted)] mt-2">Your verified achievements — share them or download a copy.</p>

      {!loaded ? (
        <div className="card-panel p-8 mt-10 text-center text-[var(--muted)]">Loading…</div>
      ) : rows.length ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {rows.map((c,i)=>(
            <div key={c.id || i} className="card-panel overflow-hidden" data-testid={`user-cert-${i}`}>
              {c.image_url && <div className="aspect-square bg-cover bg-center" style={{backgroundImage:`url(${c.image_url})`}}/>}
              <div className="p-5">
                <div className="font-display text-lg">{c.plan || "Certificate"}</div>
                <div className="text-xs text-[var(--muted-2)] mt-1">₹{formatINR(c.amount)} · {c.payout_date}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-panel p-10 mt-10 text-center">
          <Award className="mx-auto text-[var(--muted-2)]" size={40}/>
          <div className="font-display text-2xl mt-4">No certificates yet</div>
          <p className="text-sm text-[var(--muted)] mt-3 max-w-md mx-auto">Pass a challenge phase or complete a payout and your certificate will be issued here automatically.</p>
        </div>
      )}
    </div>
  );
}
