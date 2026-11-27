import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2,
  Clock3, Edit3, MapPin, MessageSquare, Save, ShieldCheck, Star, UserRound, Wrench,
} from "lucide-react";
import { api } from "../lib/api.js";
import "./provider-profile.css";

const availabilityLabels = {
  available: "Available for work",
  weekend: "Available on weekends",
  "24hr": "Offers 24-hour service",
  offline: "Availability not confirmed",
};

const blankForm = {
  category: "", bio: "", skills: "", experienceYears: "0",
  availability: "offline", price: "", per: "/job",
};

function fieldsFor(provider) {
  return {
    category: provider.category || "",
    bio: provider.bio || "",
    skills: Array.isArray(provider.skills) ? provider.skills.join(", ") : "",
    experienceYears: String(provider.experienceYears ?? 0),
    availability: provider.availability || "offline",
    price: provider.price || "",
    per: provider.per || "/job",
  };
}

export default function ProviderProfile({ providerId, user, onBack, onViewRequests, onUpdated, onNotificationChange }) {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [service, setService] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let active = true;
    setProvider(null); setLoading(true); setError(""); setSent(false);
    setShowForm(false); setEditing(false); setSaveMessage("");
    api("/api/providers/" + encodeURIComponent(providerId))
      .then((result) => {
        if (!active) return;
        setProvider(result.provider);
        setService(result.provider?.category || "");
        setForm(fieldsFor(result.provider || {}));
      })
      .catch((cause) => { if (active) setError(cause.message || "Could not load provider."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [providerId]);

  const ownId = String(user?._id || user?.id || "");
  const isOwner = Boolean(provider && user?.role === "provider" && ownId === String(provider._id));

  async function saveServices(event) {
    event.preventDefault();
    if (!isOwner || saving) return;
    const years = Number(form.experienceYears);
    const skills = [...new Set(form.skills.split(",").map((s) => s.trim()).filter(Boolean))];
    if (!form.category.trim() || !form.bio.trim() || !Number.isFinite(years) || years < 0 || years > 80 || skills.length > 30 || skills.some(s => s.length > 80)) {
      setError("Please add your service category and description, and check your skills and years of experience.");
      return;
    }
    setSaving(true); setError(""); setSaveMessage("");
    try {
      const data = await api("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          category: form.category.trim(), bio: form.bio.trim(), skills,
          experienceYears: years, availability: form.availability,
          price: form.price.trim(), per: form.per,
        }),
      });
      if (!data.user) throw new Error("Profile save response was incomplete.");
      // Update public content using only provider-facing fields.
      setProvider((current) => ({
        ...current, category: data.user.category, bio: data.user.bio,
        skills: data.user.skills, experienceYears: data.user.experienceYears,
        availability: data.user.availability, price: data.user.price, per: data.user.per,
      }));
      setService(data.user.category || "");
      onUpdated?.(data.user);
      setEditing(false);
      setSaveMessage("Your provider profile has been updated.");
    } catch (cause) {
      setError(cause.message || "We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function requestHire(event) {
    event.preventDefault();
    if (!provider || busy || description.trim().length < 20 || !service.trim()) return;
    setBusy(true); setError("");
    try {
      await api("/api/hire", {
        method: "POST",
        body: JSON.stringify({
          providerId: provider._id, serviceNeeded: service.trim(),
          description: description.trim(),
        }),
      });
      setSent(true); setShowForm(false); setDescription("");
      onNotificationChange?.();
    } catch (cause) {
      setError(cause.message || "Could not send hire request.");
    } finally {
      setBusy(false);
    }
  }

  const photoUrl = typeof provider?.profilePhoto === "string" &&
    provider.profilePhoto.startsWith("https://res.cloudinary.com/")
    ? provider.profilePhoto : "";
  const reviews = Number(provider?.reviewCount) || 0;
  const jobs = Number(provider?.jobs) || 0;
  const experience = Number(provider?.experienceYears) || 0;

  return <section className="react-provider-profile">
    <button type="button" className="react-provider-back" onClick={onBack}>
      <ArrowLeft size={16}/> {isOwner ? "Back to community" : "Back to results"}
    </button>
    {loading && <p className="marketplace-loading" role="status">Opening provider profile…</p>}
    {error && <p className="marketplace-error" role="alert">{error}</p>}
    {!loading && !provider && <p>We couldn't find that provider. Try searching again.</p>}
    {provider && <div className="react-provider-card">
      <header className="react-provider-hero">
        <span className="react-provider-avatar">
          {photoUrl ? <img src={photoUrl} alt="" loading="lazy"/> : (provider.fullName || "P").trim().slice(0, 1).toUpperCase()}
        </span>
        <div className="react-provider-hero-content">
          <span className="eyebrow">{isOwner ? "YOUR PROFESSIONAL PROFILE" : "PROFESSIONAL PROFILE"}</span>
          <h1>{provider.fullName}</h1>
          <div className="react-provider-badges">
            <span className="react-provider-approved"><CheckCircle2 size={14}/> Approved provider</span>
            {provider.isVerified && <span className="react-provider-verified"><BadgeCheck size={14}/> Community verified</span>}
          </div>
          <p><BriefcaseBusiness size={16}/> {provider.category || "Service provider"}</p>
          <p><MapPin size={16}/> {[provider.city, provider.state].filter(Boolean).join(", ") || "Location not listed"}</p>
          {isOwner && <button type="button" className="react-provider-edit-button" onClick={() => { setEditing((v) => !v); setError(""); setSaveMessage(""); }}>
            <Edit3 size={16}/> {editing ? "Close editor" : "Edit my service details"}
          </button>}
        </div>
      </header>

      {saveMessage && <p className="react-provider-saved" role="status"><CheckCircle2 size={16}/> {saveMessage}</p>}

      <div className="react-provider-stats" aria-label="Provider details">
        <span><Clock3 size={16}/>{availabilityLabels[provider.availability] || availabilityLabels.offline}</span>
        <span><BriefcaseBusiness size={16}/>{experience > 0 ? experience + (experience === 1 ? " year" : " years") + " experience" : "Experience not listed"}</span>
        <span><CheckCircle2 size={16}/>{jobs} {jobs === 1 ? "job" : "jobs"} recorded</span>
        <span><Star size={16}/>{reviews > 0 ? Number(provider.rating || 0).toFixed(1) + "/5 from " + reviews + " reviews" : "No reviews yet"}</span>
      </div>

      {isOwner && editing && <form className="react-provider-edit-form" onSubmit={saveServices}>
        <div className="react-provider-edit-heading"><div><h2>Update your service profile</h2><p>These details help people understand what you do. Don't include your home address or ID numbers.</p></div></div>
        <label>Service category<input required maxLength={80} value={form.category} onChange={e => setForm(v => ({...v,category:e.target.value}))} placeholder="e.g. Electrical services"/></label>
        <label>About your work<textarea required maxLength={1000} rows={5} value={form.bio} onChange={e => setForm(v => ({...v,bio:e.target.value}))} placeholder="Tell people about the services you offer."/></label>
        <label>Skills (separate with commas)<input maxLength={2500} value={form.skills} onChange={e => setForm(v => ({...v,skills:e.target.value}))} placeholder="Wiring, repairs, installation"/></label>
        <div className="react-provider-edit-grid">
          <label>Years of experience<input type="number" min={0} max={80} step={1} required value={form.experienceYears} onChange={e => setForm(v => ({...v,experienceYears:e.target.value}))}/></label>
          <label>Availability<select value={form.availability} onChange={e => setForm(v => ({...v,availability:e.target.value}))}>
            <option value="offline">Not confirmed</option><option value="available">Available now</option>
            <option value="weekend">Weekends</option><option value="24hr">24-hour service</option>
          </select></label>
        </div>
        <div className="react-provider-edit-grid">
          <label>Price or starting rate (optional)<input maxLength={80} value={form.price} onChange={e => setForm(v => ({...v,price:e.target.value}))} placeholder="e.g. From ₦5,000"/></label>
          <label>Price is per<select value={form.per} onChange={e => setForm(v => ({...v,per:e.target.value}))}>
            <option value="/job">Job</option><option value="/hour">Hour</option>
            <option value="/day">Day</option><option value="/week">Week</option>
            <option value="/month">Month</option>
          </select></label>
        </div>
        <div className="react-provider-edit-actions"><button type="button" onClick={() => { setEditing(false); setForm(fieldsFor(provider)); }} disabled={saving}>Cancel</button>
          <button type="submit" disabled={saving}><Save size={16}/>{saving ? "Saving…" : "Save service details"}</button></div>
      </form>}

      <div className="react-provider-layout">
        <div className="react-provider-main">
          <section className="react-provider-section">
            <h2><UserRound size={18}/> About {isOwner ? "my" : "this"} provider</h2>
            <p>{provider.bio || "This provider hasn't added a description yet."}</p>
          </section>
          <section className="react-provider-section">
            <h2><Wrench size={18}/> Skills & services</h2>
            {provider.skills?.length > 0
              ? <div className="react-provider-skills">{provider.skills.map((skill, index) => <span key={index}>{skill}</span>)}</div>
              : <p>No skills have been listed yet.</p>}
          </section>
          <section className="react-provider-section">
            <h2><BriefcaseBusiness size={18}/> Work experience</h2>
            <p>{experience > 0 ? "This provider has listed " + experience + (experience === 1 ? " year" : " years") + " of experience." : "Experience details have not been added yet."}</p>
            <p className="react-provider-helper">Work history and portfolio photos are not available on profiles yet. We won't show sample jobs or made-up photos.</p>
          </section>
          <section className="react-provider-section">
            <h2><Star size={18}/> Customer reviews</h2>
            {reviews > 0
              ? <p>Average rating: {Number(provider.rating || 0).toFixed(1)} out of 5 from {reviews} {reviews === 1 ? "review" : "reviews"}.</p>
              : <p>No customer reviews have been recorded yet.</p>}
          </section>
          <p className="react-provider-disclaimer"><ShieldCheck size={16}/> Provider approval means the account was reviewed by VerifiedNG. Community verification is separate. Please check details and agree on terms before hiring.</p>
        </div>

        <aside className="react-provider-service-panel">
          <h2>Service information</h2>
          <div><span>Service</span><strong>{provider.category || "Not listed"}</strong></div>
          <div><span>Area</span><strong>{[provider.city, provider.state].filter(Boolean).join(", ") || "Not listed"}</strong></div>
          <div><span>Availability</span><strong>{availabilityLabels[provider.availability] || availabilityLabels.offline}</strong></div>
          <div><span>Price</span><strong>{provider.price ? provider.price + " " + (provider.per || "/job") : "Ask for a quote"}</strong></div>
          {isOwner ? <button type="button" className="react-provider-requests-button" onClick={onViewRequests}><MessageSquare size={17}/> View my hire requests</button> : (
            sent ? <div className="react-provider-sent"><CheckCircle2 size={21}/><strong>Request sent</strong><p>The provider can accept or decline your request.</p><button type="button" onClick={onViewRequests}>View sent requests <ArrowRight size={15}/></button></div> : user?.role === "customer" ? <>
              <button type="button" className="react-provider-hire" onClick={() => setShowForm(v => !v)}><BriefcaseBusiness size={17}/>{showForm ? "Close request form" : "Request this service"}</button>
              {showForm && <form className="react-provider-request" onSubmit={requestHire}>
                <label>Service needed<input maxLength={100} required value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Electrical repairs"/></label>
                <label>Describe the job<textarea rows={5} minLength={20} maxLength={2000} required value={description} onChange={e => setDescription(e.target.value)} placeholder="What do you need help with? Write at least 20 characters."/></label>
                <p>Only this provider receives your request and your account phone number. Don't share passwords or payment codes.</p>
                <button type="submit" disabled={busy || !service.trim() || description.trim().length < 20}>{busy ? "Sending…" : "Send hire request"}</button>
              </form>}
            </> : <p className="react-provider-helper"><UserRound size={15}/> Only customer accounts can send hire requests.</p>
          )}
        </aside>
      </div>
    </div>}
  </section>;
}
