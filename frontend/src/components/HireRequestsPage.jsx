import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { api } from "../lib/api.js";

export default function HireRequestsPage({ user, onOpenProvider }) {
  const isProvider = user?.role === "provider";
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api(isProvider ? "/api/hire/provider" : "/api/hire/sent");
      setRequests(result.requests || []);
    } catch (cause) { setError(cause.message || "Could not load your requests."); }
    finally { setLoading(false); }
  }, [isProvider]);
  useEffect(() => { load(); }, [load]);

  async function decide(item, status) {
    if (busyId) return;
    setBusyId(item._id); setError("");
    try {
      await api("/api/hire/" + encodeURIComponent(item._id) + "/status", {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      await load();
    } catch (cause) { setError(cause.message || "Could not update this request."); }
    finally { setBusyId(null); }
  }
  return <section className="react-hire-requests">
    <div className="react-requests-toolbar"><h2>{isProvider ? "Requests from customers" : "Requests you sent"}</h2><button type="button" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error && <p className="marketplace-error" role="alert">{error}</p>}
    {loading && <p className="marketplace-loading" role="status">Loading requests…</p>}
    {!loading && requests.length === 0 && <div className="react-requests-empty"><BriefcaseBusiness size={27}/><strong>No requests yet</strong><p>{isProvider ? "Customers' hire requests will appear here." : "Search providers and request a service to get started."}</p></div>}
    <div className="react-request-list">{requests.map((item) => <article key={item._id} className="react-request-card">
      <div><strong>{isProvider ? item.customerName || "Customer" : item.providerName || "Provider"}</strong><span className={"react-request-status " + (item.status || "pending")}>{item.status || "pending"}</span></div>
      <h3>{item.serviceNeeded}</h3><p>{item.description}</p>
      <small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-NG") : ""}</small>
      {isProvider && item.customerPhone && <p className="react-request-contact">Customer contact: {item.customerPhone}</p>}
      {isProvider && item.status === "pending" && <div className="react-request-actions">
        <button type="button" disabled={busyId === item._id} onClick={() => decide(item, "accepted")}><CheckCircle2 size={16}/> Accept</button>
        <button type="button" disabled={busyId === item._id} onClick={() => decide(item, "declined")}><XCircle size={16}/> Decline</button>
      </div>}
      {!isProvider && item.providerId && <button type="button" className="react-requests-profile" onClick={() => onOpenProvider?.(item.providerId)}>View provider <ArrowRight size={15}/></button>}
    </article>)}</div>
  </section>;
}
