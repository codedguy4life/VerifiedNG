import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, Clock3, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../lib/api.js";

export default function ProviderProfile({ providerId, user, onBack, onViewRequests }) {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [service, setService] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setSent(false); setShowForm(false);
    api("/api/providers/" + encodeURIComponent(providerId))
      .then((result) => { if (active) { setProvider(result.provider); setService(result.provider?.category || ""); } })
      .catch((cause) => { if (active) setError(cause.message || "Could not load provider."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [providerId]);

  async function requestHire(event) {
    event.preventDefault();
    if (!provider || busy || description.trim().length < 20 || !service.trim()) return;
    setBusy(true); setError("");
    try {
      await api("/api/hire", { method: "POST", body: JSON.stringify({
        providerId: provider._id, serviceNeeded: service.trim(), description: description.trim(),
      }) });
      setSent(true); setShowForm(false); setDescription("");
    } catch (cause) { setError(cause.message || "Could not send hire request."); }
    finally { setBusy(false); }
  }

  return <section className="react-provider-profile">
    <button type="button" className="react-provider-back" onClick={onBack}><ArrowLeft size={15}/> Back to results</button>
    {loading && <p className="marketplace-loading" role="status">Loading provider…</p>}
    {error && <p className="marketplace-error" role="alert">{error}</p>}
    {!loading && !provider && <p>Provider not found. Try searching again.</p>}
    {provider && <div className="react-provider-card">
      <div className="react-provider-hero">
        <span className="react-provider-avatar">{(provider.fullName || "P").trim().slice(0, 1).toUpperCase()}</span>
        <div><span className="eyebrow">SERVICE PROVIDER</span><h1>{provider.fullName}</h1>
          {provider.isVerified && <span className="react-provider-verified"><BadgeCheck size={14}/> Reviewed account</span>}
          <p><BriefcaseBusiness size={15}/> {provider.category || "Service professional"}</p>
          <p><MapPin size={15}/> {[provider.city, provider.state].filter(Boolean).join(", ") || "Location not listed"}</p>
        </div>
      </div>
      <div className="react-provider-stats">
        <span><Clock3 size={16}/> {provider.availability === "available" ? "Available" : provider.availability === "weekend" ? "Weekends" : provider.availability === "24hr" ? "24-hour availability" : "Availability not confirmed"}</span>
        {Number(provider.experienceYears) > 0 && <span>{provider.experienceYears} years experience</span>}
        {Number(provider.reviewCount) > 0 && <span>{Number(provider.rating || 0).toFixed(1)} / 5 · {provider.reviewCount} reviews</span>}
      </div>
      {provider.bio && <div className="react-provider-section"><h2>About</h2><p>{provider.bio}</p></div>}
      {provider.skills?.length > 0 && <div className="react-provider-section"><h2>Skills</h2><div className="react-provider-skills">{provider.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}
      {provider.price && <p className="react-provider-price">Listed pricing: {provider.price} {provider.per || ""}</p>}
      <p className="react-provider-disclaimer"><ShieldCheck size={15}/> Information comes from the provider profile. A verification badge is not a guarantee of quality or safety.</p>
      {sent ? <div className="react-provider-sent"><CheckCircle2 size={21}/><strong>Hire request sent</strong><p>The provider can accept or decline your request in their dashboard.</p><button type="button" onClick={onViewRequests}>View sent requests <ArrowRight size={15}/></button></div> : (
        user?.role === "customer" ? <>
          <button type="button" className="react-provider-hire" onClick={() => setShowForm((open) => !open)}><BriefcaseBusiness size={17}/> {showForm ? "Close request form" : "Request this service"}</button>
          {showForm && <form className="react-provider-request" onSubmit={requestHire}>
            <label>Service needed<input maxLength={100} required value={service} onChange={(event) => setService(event.target.value)} placeholder="e.g. Electrical repairs" /></label>
            <label>Describe the job<textarea rows={5} minLength={20} maxLength={2000} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What needs fixing, where, and when? Include at least 20 characters." /></label>
            <p>Only the selected provider will receive your request and the contact phone saved on your customer account. Do not share passwords or payment codes.</p>
            <button type="submit" disabled={busy || service.trim().length === 0 || description.trim().length < 20}>{busy ? "Sending…" : "Send hire request"}</button>
          </form>}
        </> : <p className="react-provider-disclaimer"><UserRound size={15}/> Only customer accounts can send hire requests.</p>
      )}
    </div>}
  </section>;
}
