import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, ClipboardCheck, Clock3, LockKeyhole, MapPin, ShieldCheck, X } from "lucide-react";
import { api } from "../lib/api.js";

export default function VerificationPage({ user, onEditProfile, onUpdated, onOpenGroups }) {
  const [status, setStatus] = useState(null);
  const [note, setNote] = useState("");
  const [queue, setQueue] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api("/api/verification/status");
      setStatus(result);
      if (result.canReview) {
        const pending = await api("/api/verification/admin/pending");
        setQueue(pending.requests || []);
      } else setQueue([]);
      const profile = await api("/api/user/profile");
      if (profile?.user) onUpdated?.(profile.user);
    } catch (cause) {
      setError(cause.message || "Could not load verification details.");
    } finally { setLoading(false); }
  }, [onUpdated]);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api("/api/verification/requests", {
        method: "POST", body: JSON.stringify({ note: note.trim() }),
      });
      setNote(""); setMessage(result.message || "Request submitted.");
      await load();
    } catch (cause) { setError(cause.message || "Could not submit request."); }
    finally { setBusy(false); }
  }

  async function review(id, decision) {
    if (!window.confirm((decision === "approved" ? "Approve" : "Reject") + " this request? Confirm the account has been reviewed outside this page before approving.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api("/api/verification/admin/requests/" + encodeURIComponent(id), {
        method: "PATCH", body: JSON.stringify({ decision, reviewerNote: (reviewNotes[id] || "").trim() }),
      });
      setMessage(result.message || "Request reviewed.");
      await load();
    } catch (cause) { setError(cause.message || "Could not review request."); }
    finally { setBusy(false); }
  }

  const verified = Boolean(status?.verified);
  return (
    <div className="verification-page">
      <header className="verification-intro">
        <div className="verification-badge"><ShieldCheck size={25}/></div>
        <div><span className="discovery-eyebrow">ACCOUNT TRUST</span><h2>VerifiedNG verification</h2><p>Apply for a manual account review to unlock members-only groups and trusted community features.</p></div>
      </header>
      {loading && <p className="muted small">Checking your verification status…</p>}
      {error && <p className="marketplace-error" role="alert">{error} <button type="button" onClick={() => setError("")}><X size={14}/></button></p>}
      {message && <p className="groups-success" role="status"><CheckCircle2 size={15}/> {message}</p>}
      {!loading && status && (
        <div className="verification-status">
          {verified ? <BadgeCheck size={22}/> : status.request?.status === "pending" ? <Clock3 size={22}/> : <LockKeyhole size={22}/>}
          <div><strong>{verified ? "Your account is verified" : status.request?.status === "pending" ? "Review in progress" : status.request?.status === "rejected" ? "Your last request wasn't approved" : "Not verified yet"}</strong>
            <p>{verified ? "You can join, create and post in groups." : status.request?.status === "pending" ? "Your request is saved for the admin review queue. A badge is not granted automatically." : "Complete your profile and request a manual review."}</p>
            {status.request?.reviewerNote && <small>Review note: {status.request.reviewerNote}</small>}
          </div>
        </div>
      )}
      {verified ? <button className="groups-join-button verification-next" type="button" onClick={onOpenGroups}>Explore groups <ArrowRight size={15}/></button> : (
        <>
          <div className="verification-requirements">
            <h3><ClipboardCheck size={18}/> Before you apply</h3>
            <p>Use your real profile name, add your city or state, and explain why you want to join trusted community features. The platform team must review the request before approval.</p>
            <span><MapPin size={14}/> Profile location: {[user?.city, user?.state].filter(Boolean).join(", ") || "Not added"}</span>
            <button type="button" onClick={onEditProfile}>Edit profile <ArrowRight size={14}/></button>
          </div>
          {status?.request?.status !== "pending" && (
            <form className="verification-request-form" onSubmit={submit}>
              <label htmlFor="verification-note">Tell us about yourself and your community involvement</label>
              <textarea id="verification-note" value={note} onChange={(event) => setNote(event.target.value)} rows={4} minLength={15} maxLength={700} required placeholder="I live in ... and would like to join local groups to ..." />
              <small>{note.length}/700 · Do not submit passwords, ID numbers, government documents or payment details here.</small>
              <button className="groups-join-button" type="submit" disabled={busy || note.trim().length < 15 || (!user?.state && !user?.city)}>{busy ? "Submitting…" : "Request verification"} <ArrowRight size={15}/></button>
            </form>
          )}
        </>
      )}
      <p className="verification-disclaimer">Verification means an administrator reviewed the account under VerifiedNG's current process. It is not a government identity certification, a guarantee of safety, or proof of professional competence. No fee or identity document is collected by this form.</p>
      {status?.canReview && <section className="verification-admin">
        <h3>Admin review queue <span>{queue.length}</span></h3>
        <p>Approvals are restricted by the server's VERIFICATION_ADMIN_EMAILS setting. Review account evidence independently before deciding.</p>
        {queue.length === 0 ? <p className="muted small">No requests waiting for review.</p> : queue.map((item) => (
          <article key={item._id} className="verification-review-card">
            <strong>{item.user?.fullName || "Unavailable account"}</strong>
            <small>{item.user?.email || "No email"} · {[item.user?.city, item.user?.state].filter(Boolean).join(", ")}</small>
            <p>{item.note}</p>
            <textarea value={reviewNotes[item._id] || ""} maxLength={500} rows={2} placeholder="Internal review decision note (optional)" onChange={(event) => setReviewNotes((prev) => ({ ...prev, [item._id]: event.target.value }))}/>
            <div><button disabled={busy || !item.user} type="button" onClick={() => review(item._id, "approved")}>Approve</button><button disabled={busy} type="button" onClick={() => review(item._id, "rejected")}>Reject</button></div>
          </article>
        ))}
      </section>}
    </div>
  );
}
