import { useCallback, useEffect, useState } from "react";
import {
  Activity, ArrowLeft, BadgeCheck, BriefcaseBusiness, CheckCircle2,
  ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Inbox,
  LayoutDashboard, RefreshCw, Search, ShieldAlert, ShieldCheck, Users,
} from "lucide-react";
import { api } from "../lib/api.js";
import "./admin-dashboard.css";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "providers", label: "Provider applications", icon: BriefcaseBusiness },
  { id: "verification", label: "Member verification", icon: BadgeCheck },
  { id: "members", label: "Members", icon: Users },
  { id: "support", label: "Support inbox", icon: Inbox },
  { id: "history", label: "Review history", icon: Activity },
];

function dateLabel(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-NG");
}
function StatCard({ icon: Icon, label, value, onClick }) {
  return (
    <button className="vng-admin-stat" type="button" onClick={onClick}>
      <span className="vng-admin-stat-icon"><Icon size={20}/></span>
      <span className="vng-admin-stat-value">{value ?? "—"}</span>
      <span className="vng-admin-stat-label">{label}</span>
    </button>
  );
}

export default function AdminDashboard({ onBack }) {
  const [section, setSection] = useState("overview");
  const [counts, setCounts] = useState(null);
  const [providerQueue, setProviderQueue] = useState([]);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [support, setSupport] = useState([]);
  const [history, setHistory] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPages, setMemberPages] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [memberDraft, setMemberDraft] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [allowed, setAllowed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // This protected request is the authorization gate; a client role in
      // localStorage must never determine admin access.
      const summary = await api("/api/admin/overview");
      setAllowed(true);
      const [providerData, verificationData, supportData, historyData] = await Promise.all([
        api("/api/provider-applications/admin/pending"),
        api("/api/verification/admin/pending"),
        api("/api/public/contact/admin/inbox"),
        api("/api/provider-applications/admin/recent"),
      ]);
      setCounts(summary.counts || {});
      setProviderQueue(providerData.applications || []);
      setVerificationQueue(verificationData.requests || []);
      setSupport(supportData.messages || []);
      setHistory(historyData.applications || []);
    } catch (cause) {
      setAllowed(false);
      setError(cause.message || "Could not load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (section !== "members" || !allowed) return;
    let cancelled = false;
    setMembersLoading(true);
    api("/api/admin/members?page=" + memberPage + "&q=" + encodeURIComponent(memberSearch))
      .then((data) => {
        if (cancelled) return;
        setMembers(data.users || []);
        setMemberTotal(data.total || 0);
        setMemberPages(data.pages || 1);
      })
      .catch((cause) => { if (!cancelled) setError(cause.message || "Could not load members."); })
      .finally(() => { if (!cancelled) setMembersLoading(false); });
    return () => { cancelled = true; };
  }, [section, allowed, memberPage, memberSearch]);

  function switchSection(next) {
    setSection(next);
    setError("");
    setNotice("");
  }
  function updateNote(key, value) {
    setNotes((current) => ({ ...current, [key]: value }));
  }
  async function decide(type, id, decision) {
    if (busy) return;
    const note = (notes[type + id] || "").trim();
    if (note.length < 10 || note.length > 500) {
      setError("Enter a review note of 10–500 characters describing what you checked.");
      return;
    }
    const label = decision === "approved" ? "approve" : "decline";
    if (!window.confirm("Are you sure you want to " + label + " this " + type + " application? Make sure you independently checked the details.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const path = type === "provider"
        ? "/api/provider-applications/admin/" + encodeURIComponent(id)
        : "/api/verification/admin/requests/" + encodeURIComponent(id);
      const result = await api(path, {
        method: "PATCH",
        body: JSON.stringify({ decision, reviewerNote: note }),
      });
      await load();
      setNotice(result.message || "Review saved.");
    } catch (cause) {
      setError(cause.message || "Could not save review.");
    } finally { setBusy(false); }
  }
  async function handleContact(id) {
    if (busy || !window.confirm("Mark this message handled? Only continue if you followed it up.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/public/contact/admin/" + encodeURIComponent(id), {
        method: "PATCH", body: JSON.stringify({}),
      });
      await load();
      setNotice("Message marked handled.");
    } catch (cause) {
      setError(cause.message || "Could not update message.");
    } finally { setBusy(false); }
  }
  const metrics = counts || {};
  const active = sections.find((item) => item.id === section) || sections[0];

  if (!loading && !allowed) {
    return <section className="vng-admin-denied" role="alert">
      <ShieldAlert size={28}/>
      <h1>Admin access unavailable</h1>
      <p>{error || "This account is not authorised to open the VerifiedNG admin dashboard."}</p>
      <p className="vng-admin-muted">Only accounts approved on the backend can view administrative information.</p>
      <button type="button" onClick={onBack}><ArrowLeft size={16}/> Return to VerifiedNG</button>
    </section>;
  }

  return <main className="vng-admin">
    <header className="vng-admin-header">
      <div>
        <span className="vng-admin-eyebrow"><ShieldCheck size={15}/> VERIFIEDNG ADMINISTRATION</span>
        <h1>Control centre</h1>
        <p>Review applications, monitor platform activity and assist members.</p>
      </div>
      <div className="vng-admin-head-actions">
        <button type="button" onClick={load} disabled={loading || busy}><RefreshCw size={16}/> Refresh</button>
        <button type="button" onClick={onBack}><ArrowLeft size={16}/> Back to community</button>
      </div>
    </header>

    <div className="vng-admin-layout">
      <nav className="vng-admin-nav" aria-label="Administration sections">
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-current={section === id ? "page" : undefined}
            className={section === id ? "active" : ""} onClick={() => switchSection(id)}>
            <Icon size={18}/><span>{label}</span>
            {id === "providers" && metrics.providerPending > 0 && <b>{metrics.providerPending}</b>}
            {id === "verification" && metrics.verificationPending > 0 && <b>{metrics.verificationPending}</b>}
            {id === "support" && metrics.supportOpen > 0 && <b>{metrics.supportOpen}</b>}
          </button>
        ))}
        <p>Admin permission is checked by the server on every request.</p>
      </nav>

      <div className="vng-admin-main">
        {error && <div className="vng-admin-alert" role="alert">{error}</div>}
        {notice && <div className="vng-admin-notice" role="status"><CheckCircle2 size={17}/>{notice}</div>}
        {loading && <p className="vng-admin-muted" role="status">Loading administration data…</p>}
        {!loading && <section>
          <div className="vng-admin-title">
            <h2>{active.label}</h2>
            <span>{section === "overview" ? "Live database summary" : "Authorised review access"}</span>
          </div>

          {section === "overview" && <>
            <div className="vng-admin-stat-grid">
              <StatCard icon={Users} label="Total members" value={metrics.members} onClick={() => switchSection("members")}/>
              <StatCard icon={BriefcaseBusiness} label="Active providers" value={metrics.providers} onClick={() => switchSection("members")}/>
              <StatCard icon={BadgeCheck} label="Verified members" value={metrics.verifiedMembers} onClick={() => switchSection("members")}/>
              <StatCard icon={Clock3} label="Pending providers" value={metrics.providerPending} onClick={() => switchSection("providers")}/>
              <StatCard icon={ClipboardCheck} label="Verification requests" value={metrics.verificationPending} onClick={() => switchSection("verification")}/>
              <StatCard icon={Inbox} label="Unresolved messages" value={metrics.supportOpen} onClick={() => switchSection("support")}/>
            </div>
            <article className="vng-admin-panel">
              <h3>Attention needed</h3>
              <p className="vng-admin-muted">These are real pending counts from the backend, not example figures.</p>
              <div className="vng-admin-shortcuts">
                <button type="button" onClick={() => switchSection("providers")}>Review provider applications <strong>{metrics.providerPending || 0}</strong></button>
                <button type="button" onClick={() => switchSection("verification")}>Review member verification <strong>{metrics.verificationPending || 0}</strong></button>
                <button type="button" onClick={() => switchSection("support")}>Open support inbox <strong>{metrics.supportOpen || 0}</strong></button>
              </div>
            </article>
          </>}

          {section === "providers" && <>
            <p className="vng-admin-help">Approve only after reviewing the applicant's details outside this page. Provider status does not automatically grant community verification.</p>
            {!providerQueue.length ? <p className="vng-admin-empty">No provider applications are waiting for review.</p> :
              providerQueue.map((item) => <article className="vng-admin-panel" key={item._id}>
                <div className="vng-admin-card-head"><h3>{item.user?.fullName || "Unavailable member"}</h3><span>Provider application</span></div>
                <p><strong>{item.category}</strong> · {[item.city,item.state].filter(Boolean).join(", ")}</p>
                <p className="vng-admin-muted">{item.user?.email || "No email"} · {item.experienceYears || 0} years of experience</p>
                <p>{item.bio}</p>
                <p className="vng-admin-muted"><strong>Skills:</strong> {(item.skills || []).join(", ") || "Not provided"}</p>
                <label>Review note (required, 10–500 characters)
                  <textarea rows={3} maxLength={500} value={notes["provider" + item._id] || ""}
                    placeholder="What evidence did you review and why?" onChange={(e) => updateNote("provider" + item._id, e.target.value)}/>
                </label>
                <div className="vng-admin-card-actions">
                  <button disabled={busy || !item.user} type="button" onClick={() => decide("provider", item._id, "approved")}>Approve provider</button>
                  <button disabled={busy} className="secondary" type="button" onClick={() => decide("provider", item._id, "rejected")}>Decline application</button>
                </div>
              </article>)}
          </>}

          {section === "verification" && <>
            <p className="vng-admin-help">Community verification is separate from becoming a provider. Do not represent this review as formal identity or professional certification.</p>
            {!verificationQueue.length ? <p className="vng-admin-empty">No verification requests are waiting for review.</p> :
              verificationQueue.map((item) => <article className="vng-admin-panel" key={item._id}>
                <div className="vng-admin-card-head"><h3>{item.user?.fullName || "Unavailable member"}</h3><span>Verification request</span></div>
                <p className="vng-admin-muted">{item.user?.email || "No email"} · {[item.user?.city,item.user?.state].filter(Boolean).join(", ") || "Location unavailable"}</p>
                <p>{item.note}</p>
                <label>Review note (required, 10–500 characters)
                  <textarea rows={3} maxLength={500} value={notes["verification" + item._id] || ""}
                    placeholder="What was checked? Explain the decision." onChange={(e) => updateNote("verification" + item._id, e.target.value)}/>
                </label>
                <div className="vng-admin-card-actions">
                  <button disabled={busy || !item.user} type="button" onClick={() => decide("verification", item._id, "approved")}>Approve verification</button>
                  <button disabled={busy} className="secondary" type="button" onClick={() => decide("verification", item._id, "rejected")}>Decline request</button>
                </div>
              </article>)}
          </>}

          {section === "members" && <>
            <p className="vng-admin-help">Read-only account directory. Account suspension, role changes, and deletion are intentionally not enabled until they have a separate audited workflow.</p>
            <form className="vng-admin-member-search" onSubmit={(event) => {event.preventDefault(); setMemberPage(1); setMemberSearch(memberDraft.trim());}}>
              <input aria-label="Search members" maxLength={80} value={memberDraft} onChange={(event) => setMemberDraft(event.target.value)} placeholder="Search name, email or area"/>
              <button type="submit"><Search size={16}/> Search</button>
            </form>
            <p className="vng-admin-muted">{memberTotal} matching members</p>
            {membersLoading ? <p className="vng-admin-muted">Loading members…</p> : members.length === 0 ?
              <p className="vng-admin-empty">No members matched your search.</p> :
              <div className="vng-admin-members">
                {members.map((member) => <div className="vng-admin-member" key={member._id}>
                  <div><strong>{member.fullName}</strong><small>{member.email} · {[member.city,member.state].filter(Boolean).join(", ") || "No location"}</small></div>
                  <span>{member.role === "provider" ? "Provider" : "Member"}{member.isVerified ? " · Verified" : ""}</span>
                  <small>Joined {dateLabel(member.createdAt)}</small>
                </div>)}
              </div>}
            <div className="vng-admin-pagination">
              <button type="button" disabled={memberPage <= 1 || membersLoading} onClick={() => setMemberPage((n) => n - 1)}><ChevronLeft size={16}/> Previous</button>
              <span>Page {memberPage} of {memberPages}</span>
              <button type="button" disabled={memberPage >= memberPages || membersLoading} onClick={() => setMemberPage((n) => n + 1)}>Next <ChevronRight size={16}/></button>
            </div>
          </>}

          {section === "support" && <>
            <p className="vng-admin-help">Contact messages sent through the public VerifiedNG form. Only mark a message handled after following up.</p>
            {!support.length ? <p className="vng-admin-empty">No unresolved support messages.</p> :
              support.map((item) => <article className="vng-admin-panel" key={item._id}>
                <div className="vng-admin-card-head"><h3>{item.topic}</h3><span>{dateLabel(item.createdAt)}</span></div>
                <p><strong>{item.name}</strong> · <a href={"mailto:" + item.email}>{item.email}</a></p>
                <p className="vng-admin-support-message">{item.message}</p>
                <button disabled={busy} type="button" onClick={() => handleContact(item._id)}>Mark handled</button>
              </article>)}
          </>}

          {section === "history" && <>
            <p className="vng-admin-help">Recent provider approvals and declines recorded by the existing system (latest 30). A wider audit log will be added separately.</p>
            {!history.length ? <p className="vng-admin-empty">No provider review decisions recorded yet.</p> :
              history.map((item) => <article className="vng-admin-panel" key={item._id}>
                <div className="vng-admin-card-head"><h3>{item.applicant?.fullName || "Deleted account"}</h3><span>{item.status === "approved" ? "Approved" : "Declined"}</span></div>
                <p className="vng-admin-muted">{item.category} · {dateLabel(item.reviewedAt)} · Reviewed by {item.reviewerName}</p>
                <p>{item.reviewerNote || "No note recorded."}</p>
              </article>)}
          </>}
        </section>}
      </div>
    </div>
  </main>;
}
