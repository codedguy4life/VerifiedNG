import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, MapPin, Newspaper, ShieldAlert, Bell, Activity, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api.js";

const safetyWords = /\b(fire|flood|accident|road closure|security alert|evacuation|outage|emergency|police warning)\b/i;

export default function CommunityNotifications({ area, filter, onOpenLocalNews, onOpenHireRequests, onNotificationChange }) {
  const [alerts, setAlerts] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [personal, setPersonal] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(true);
  const [personalError, setPersonalError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadPersonal = useCallback(async () => {
    setPersonalLoading(true); setPersonalError("");
    try {
      const data = await api("/api/notifications");
      setPersonal(data.notifications || []);
      onNotificationChange?.();
    } catch (cause) {
      setPersonalError(cause.message || "Could not load your activity.");
    } finally {
      setPersonalLoading(false);
    }
  }, [onNotificationChange]);

  useEffect(() => {
    if (filter !== "all" && filter !== "activity") return undefined;
    loadPersonal();
    return undefined;
  }, [filter, loadPersonal]);

  useEffect(() => {
    if (filter === "activity") { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError("");
    const areaQuery = filter === "neighbourhood" && area ? "&area=" + encodeURIComponent(area) : "";
    const jobs = [
      api("/api/community/search?category=Safety%20Alert&limit=12" + areaQuery)
        .then((data) => { if (!cancelled) setAlerts(data.posts || []); }),
      api("/api/community/search?limit=12" + areaQuery)
        .then((data) => { if (!cancelled) setUpdates(data.posts || []); }),
      api("/api/local-news?mode=nigeria")
        .then((data) => { if (!cancelled) setArticles(data.articles || []); }),
    ];
    Promise.allSettled(jobs).then((results) => {
      if (cancelled) return;
      if (results.every((result) => result.status === "rejected")) setError("Could not load updates. Check your connection and try again.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [area, filter]);

  async function openActivity(item) {
    if (busyId) return;
    setBusyId(item.id); setPersonalError("");
    try {
      if (!item.read) {
        await api("/api/notifications/hire/" + encodeURIComponent(item.id) + "/read", { method: "PATCH" });
        setPersonal((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
        onNotificationChange?.();
      }
      onOpenHireRequests?.();
    } catch (cause) {
      setPersonalError(cause.message || "Could not open this notification.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (busyId) return;
    setBusyId("all"); setPersonalError("");
    try {
      await api("/api/notifications/read-all", { method: "PATCH" });
      setPersonal((current) => current.map((entry) => ({ ...entry, read: true })));
      onNotificationChange?.();
    } catch (cause) {
      setPersonalError(cause.message || "Could not mark notifications as read.");
    } finally {
      setBusyId(null);
    }
  }

  const showPersonal = filter === "all" || filter === "activity";
  const newsAlerts = articles.filter((article) => safetyWords.test(article.title || ""));
  const communityUpdates = filter === "alerts" ? [] : updates.filter((post) => post.category !== "Safety Alert").slice(0, 6);
  const publisherUpdates = filter === "alerts" ? newsAlerts : articles.slice(0, 6);
  const relevantAlerts = filter === "neighbourhood" ? alerts.slice(0, 3) : alerts;
  const count = relevantAlerts.length + communityUpdates.length + publisherUpdates.length;

  return <div className="community-notifications">
    {showPersonal && <section className="notification-personal">
      <div className="notification-personal-heading">
        <h2><Activity size={18}/> My activity</h2>
        <div>
          {personal.some((item) => !item.read) && <button type="button" onClick={markAllRead} disabled={Boolean(busyId)}>Mark all as read</button>}
          <button type="button" onClick={loadPersonal} disabled={personalLoading}>Refresh</button>
        </div>
      </div>
      {personalLoading && <p className="muted small" role="status">Loading your activity…</p>}
      {personalError && <p className="notice error-notice" role="alert">{personalError}</p>}
      {!personalLoading && personal.length === 0 && !personalError && <div className="notification-empty card">
        <div className="notification-empty-icon"><Activity size={26}/></div>
        <h2>No personal notifications yet</h2>
        <p>New hire requests and responses from providers will appear here.</p>
      </div>}
      {personal.length > 0 && <div className="notification-story-list">
        {personal.map((item) => <button key={item.id} type="button"
          className={"notification-story notification-activity-item" + (item.read ? "" : " notification-unread")}
          onClick={() => openActivity(item)} disabled={Boolean(busyId)}>
          <span className="notification-story-symbol"><BriefcaseBusiness size={18}/></span>
          <div><strong>{item.title}</strong><p>{item.message}</p>
            <small>{item.createdAt ? new Date(item.createdAt).toLocaleString("en-NG") : ""} · {item.read ? "Read" : "New"} · View hire requests</small>
          </div>
          {!item.read && <span className="notification-activity-dot" aria-label="Unread"/>}
          <ArrowUpRight size={16}/>
        </button>)}
      </div>}
    </section>}

    {filter !== "activity" && <>
      <div className="notification-list-heading">
        <span><MapPin size={15}/> {filter === "neighbourhood" && area ? area : "Latest across Nigeria"}</span>
        <button type="button" onClick={onOpenLocalNews}>Open area map <ArrowUpRight size={15}/></button>
      </div>
      {loading && <p className="muted small">Loading community updates…</p>}
      {error && <p className="notice error-notice" role="alert">{error}</p>}
      {!loading && count === 0 && <section className="notification-empty card">
        <div className="notification-empty-icon">{filter === "alerts" ? <ShieldAlert size={28}/> : <Bell size={28}/>}</div>
        <h2>{filter === "alerts" ? "No safety alerts found" : "No updates for this area yet"}</h2>
        <p>There are no matching updates from the connected sources yet. Publisher headlines require the news API to be configured; member posts appear when people publish them.</p>
      </section>}
      {!loading && count > 0 && <div className="notification-story-list" aria-live="polite">
        {relevantAlerts.map((post) => <article key={post._id} className="notification-story">
          <span className="notification-story-symbol alert"><ShieldAlert size={18}/></span>
          <div><strong>Community safety report · unverified</strong><p>{post.text || "Media post"}</p><small>{post.author?.fullName || "Member"} · {[post.location?.city, post.location?.state].filter(Boolean).join(", ") || "Nigeria"}</small></div>
        </article>)}
        {publisherUpdates.map((article) => <a className="notification-story" key={article.url} href={article.url} target="_blank" rel="noopener noreferrer">
          <span className="notification-story-symbol"><Newspaper size={18}/></span>
          <div><strong>{filter === "alerts" ? "Publisher safety-related report" : "Publisher local news"}</strong><p>{article.title}</p><small>{article.source} · Check original report</small></div>
          <ArrowUpRight size={16}/>
        </a>)}
        {communityUpdates.map((post) => <article key={post._id} className="notification-story">
          <span className="notification-story-symbol"><MapPin size={18}/></span>
          <div><strong>{post.category || "Community update"}</strong><p>{post.text || "Community media post"}</p><small>{post.author?.fullName || "Member"} · {[post.location?.city, post.location?.state].filter(Boolean).join(", ") || "Nigeria"}</small></div>
        </article>)}
      </div>}
      <p className="notification-disclaimer">External headlines are publisher reports, not official VerifiedNG alerts. Community safety reports are unverified until independently confirmed.</p>
    </>}
  </div>;
}
