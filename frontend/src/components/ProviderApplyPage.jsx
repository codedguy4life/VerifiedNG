import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, ClipboardList, Clock3, MapPin, ShieldCheck, Wrench } from "lucide-react";
import { api } from "../lib/api.js";
import "./provider-apply.css";

const empty = { category: "", bio: "", skills: "", experienceYears: "0", state: "", city: "" };

export default function ProviderApplyPage({ user, onBack, onUpdated }) {
  const [form, setForm] = useState(() => ({ ...empty, state: user?.state || "", city: user?.city || "" }));
  const [confirm, setConfirm] = useState(false);
  const [application, setApplication] = useState(null);
  const [isProvider, setIsProvider] = useState(user?.role === "provider");
  const [isVerified, setIsVerified] = useState(Boolean(user?.isVerified));
  const [canReview, setCanReview] = useState(false);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api("/api/provider-applications/me");
      setApplication(data.application || null);
      setIsProvider(Boolean(data.isProvider));
      setIsVerified(Boolean(data.verified));
      // Approval can happen while the member is still signed in. Refresh the
      // profile used by App navigation without requiring logout or a reload.
      try {
        const latest = await api("/api/user/profile");
        if (latest?.user) onUpdated?.(latest.user);
      } catch {
        // Status is still available even if the profile refresh fails.
      }
      setCanReview(Boolean(data.canReview));
      if (data.application) {
        setForm({
          category: data.application.category || "",
          bio: data.application.bio || "",
          skills: (data.application.skills || []).join(", "),
          experienceYears: String(data.application.experienceYears || 0),
          state: data.application.state || "",
          city: data.application.city || "",
        });
      }
      if (data.canReview) {
        const [requests, decisions, support] = await Promise.all([
          api("/api/provider-applications/admin/pending"),
          api("/api/provider-applications/admin/recent"),
          api("/api/public/contact/admin/inbox"),
        ]);
        setQueue(requests.applications || []);
        setHistory(decisions.applications || []);
        setEnquiries(support.messages || []);
      } else { setQueue([]); setHistory([]); setEnquiries([]); }
    } catch (cause) { setError(cause.message || "Could not load provider application."); }
    finally { setLoading(false); }
  }, [onUpdated]);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = {
        category: form.category.trim(), bio: form.bio.trim(), state: form.state.trim(),
        city: form.city.trim(), experienceYears: Number(form.experienceYears),
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        confirmAccuracy: confirm,
      };
      const response = await api("/api/provider-applications", { method: "POST", body: JSON.stringify(payload) });
      setNotice(response.message || "Your application has been sent.");
      setConfirm(false);
      await load();
    } catch (cause) { setError(cause.message || "Could not submit provider application."); }
    finally { setBusy(false); }
  }

  async function review(id, decision) {
    if (busy) return;
    const note = (reviewNotes[id] || "").trim();
    if (note.length < 10) { setError("Write at least 10 characters explaining what was checked and why you made this decision."); return; }
    if (!window.confirm((decision === "approved" ? "Approve" : "Decline") + " this provider application? Confirm the details have been reviewed independently.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await api("/api/provider-applications/admin/" + encodeURIComponent(id), {
        method: "PATCH", body: JSON.stringify({ decision, reviewerNote: note }),
      });
      setNotice(response.message || "Review saved.");
      await load();
    } catch (cause) { setError(cause.message || "Could not save review."); }
    finally { setBusy(false); }
  }

  async function resolve(id) {
    if (busy || !window.confirm("Mark this enquiry handled? Only do this after following it up.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/public/contact/admin/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({}) });
      setNotice("Enquiry marked handled.");
      await load();
    } catch (cause) { setError(cause.message || "Could not update the enquiry."); }
    finally { setBusy(false); }
  }

  return <div className="provider-apply-page">
    <button type="button" className="provider-apply-back" onClick={onBack}><ArrowLeft size={16}/> Back to Home</button>
    <header className="provider-apply-heading"><span className="provider-apply-icon"><Wrench size={24}/></span><div><span className="provider-apply-eyebrow">VERIFIEDNG PROFESSIONALS</span><h1>Become a provider</h1><p>Show your skills to your community. Your application is reviewed before provider status is granted.</p></div></header>
    {loading && <p className="provider-apply-notice" role="status">Checking your provider application…</p>}
    {error && <p className="provider-apply-error" role="alert">{error}</p>}
    {notice && <p className="provider-apply-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}
    {!loading && isProvider && <section className="provider-apply-status"><BadgeCheck size={27}/><div><h2>Your account has provider access</h2><p>Approved — your provider role is now active. You can appear in service searches and use provider features. Provider status is separate from community verification. {isVerified ? "Your account is also a verified member." : "You can request community verification separately."}</p>
      {application?.reviewedAt && <small>Reviewed {new Date(application.reviewedAt).toLocaleDateString("en-NG")}</small>}
      {application?.reviewerNote && <small>Team note: {application.reviewerNote}</small>}</div></section>}
    {!loading && !isProvider && application?.status === "pending" && <section className="provider-apply-status pending"><Clock3 size={27}/><div><h2>Your application is under review</h2><p>We received your application for <strong>{application.category}</strong>. A VerifiedNG reviewer must check it and decide whether to approve or decline it. You can continue using the community while you wait.</p><small>Submitted {new Date(application.createdAt).toLocaleDateString("en-NG")}</small></div></section>}
    {!loading && !isProvider && application?.status === "approved" && <section className="provider-apply-status"><CheckCircle2 size={27}/><div><h2>Your application was approved</h2><p>Refresh your profile or sign in again to see your updated provider access.</p></div></section>}
    {!loading && !isProvider && application?.status !== "pending" && application?.status !== "approved" && <section className="provider-apply-form-card">
      {application?.status === "rejected" && <div className="provider-apply-rejected"><strong>Previous application not approved</strong><p>{application.reviewerNote || "Please check your details before applying again."}</p>{application.reviewedAt && <small>Reviewed {new Date(application.reviewedAt).toLocaleDateString("en-NG")} · You can reapply after 24 hours.</small>}</div>}
      <h2>{application ? "Update your application" : "Tell us about your work"}</h2>
      <p>Give accurate information. Do not upload ID documents here or include sensitive personal information in your description.</p>
      <form onSubmit={submit} className="provider-apply-form">
        <label>Service category <input required maxLength={80} minLength={2} value={form.category} onChange={update("category")} placeholder="e.g. Electrical repairs, catering, tutoring" /></label>
        <div className="provider-apply-fields"><label>State <input required maxLength={80} value={form.state} onChange={update("state")} placeholder="Lagos" /></label><label>City / area <input required maxLength={80} value={form.city} onChange={update("city")} placeholder="Ikeja" /></label></div>
        <label>Tell us about your services <textarea required minLength={50} maxLength={1000} rows={5} value={form.bio} onChange={update("bio")} placeholder="Describe the work you do, who you serve and your relevant experience (at least 50 characters)." /></label>
        <div className="provider-apply-fields"><label>Relevant skills (comma-separated) <input maxLength={400} value={form.skills} onChange={update("skills")} placeholder="Installation, wiring, repairs" /></label><label>Years of experience <input required type="number" min="0" max="60" step="1" value={form.experienceYears} onChange={update("experienceYears")} /></label></div>
        <label className="provider-apply-consent"><input type="checkbox" required checked={confirm} onChange={(event)=>setConfirm(event.target.checked)} /><span>I confirm the details are accurate and understand approval requires manual review. I've read the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</span></label>
        <button className="provider-apply-submit" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit application"} <ArrowRight size={17}/></button>
      </form>
    </section>}
    <div className="provider-apply-info"><ShieldCheck size={20}/><div><strong>How provider approval works</strong>
      <ol className="provider-review-steps">
        <li><b>Apply:</b> Create a free account and describe your services, skills, experience and area.</li>
        <li><b>Team review:</b> An authorised VerifiedNG reviewer checks your submitted information. Approval is not automatic.</li>
        <li><b>Decision:</b> See Approved or Declined here with the review note. An email may also arrive when notifications are configured.</li>
        <li><b>Access:</b> If approved, your account changes to Provider and appears in service searches. Community verification is a separate application.</li>
      </ol><p>Do not send identity documents through this form or pay anyone promising guaranteed approval.</p></div></div>
    {canReview && !loading && <div className="provider-apply-admin">
      <div className="provider-apply-admin-heading"><ClipboardList size={22}/><div><h2>Team review desk</h2><p>Visible only to reviewer accounts authorised on the backend. Check applicants independently. Each decision needs a written reason (10–500 characters).</p></div><button type="button" onClick={load}>Refresh</button></div>
      <h3>Provider applications ({queue.length})</h3>
      {!queue.length && <p className="provider-apply-admin-empty">No provider applications waiting.</p>}
      {queue.map((item)=><article className="provider-apply-review" key={item._id}><strong>{item.user?.fullName || "Member"} · {item.category}</strong><small>{item.city}, {item.state} · {item.experienceYears} years · {item.user?.email}</small><p>{item.bio}</p><small>{item.skills.join(", ") || "No skills specified"}</small><textarea aria-label={"Review note for " + (item.user?.fullName || "member")} maxLength={500} rows={2} value={reviewNotes[item._id] || ""} onChange={(e)=>setReviewNotes((all)=>({...all,[item._id]:e.target.value}))} placeholder="What did you check and why? Required for both decisions (10–500 characters)" /><div className="provider-apply-review-actions"><button type="button" disabled={busy} onClick={()=>review(item._id,"approved")}>Approve provider</button><button type="button" disabled={busy} className="decline" onClick={()=>review(item._id,"rejected")}>Decline</button></div></article>)}
      <h3>Recent application decisions ({history.length})</h3>
      {!history.length && <p className="provider-apply-admin-empty">No reviewed applications yet.</p>}
      {history.map((entry) => <article className="provider-apply-review provider-apply-history" key={entry._id}>
        <strong>{entry.applicant?.fullName || "Deleted account"} · {entry.category}</strong>
        <small>{entry.status === "approved" ? "Approved" : "Declined"} · {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleDateString("en-NG") : "Review date unavailable"} · Reviewed by {entry.reviewerName}</small>
        <p>{entry.reviewerNote || "No note recorded."}</p>
      </article>)}
      <h3>Public contact enquiries ({enquiries.length})</h3>
      {!enquiries.length && <p className="provider-apply-admin-empty">No unresolved contact messages.</p>}
      {enquiries.map((item)=><article className="provider-apply-review" key={item._id}><strong>{item.topic} · {item.name}</strong><small>{item.email} · {new Date(item.createdAt).toLocaleDateString("en-NG")}</small><p>{item.message}</p><button className="provider-apply-handle" type="button" disabled={busy} onClick={()=>resolve(item._id)}>Mark handled</button></article>)}
    </div>}
  </div>;
}
