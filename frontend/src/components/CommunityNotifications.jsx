import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin, Newspaper, ShieldAlert, Bell, Activity } from "lucide-react";
import { api } from "../lib/api.js";

const safetyWords = /\b(fire|flood|accident|road closure|security alert|evacuation|outage|emergency|police warning)\b/i;

export default function CommunityNotifications({ area, filter, onOpenLocalNews }) {
  const [alerts, setAlerts] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const areaQuery = area ? "&area=" + encodeURIComponent(area) : "";
    const jobs = [
      api("/api/community/search?category=Safety%20Alert&limit=12" + areaQuery)
        .then((data) => { if (!cancelled) setAlerts(data.posts || []); }),
      api("/api/community/search?limit=12" + areaQuery)
        .then((data) => { if (!cancelled) setUpdates(data.posts || []); }),
      api("/api/local-news?mode=local&area=" + encodeURIComponent(area || ""))
        .then((data) => { if (!cancelled) setArticles(data.articles || []); }),
    ];
    Promise.allSettled(jobs).then((results) => {
      if (cancelled) return;
      if (results.every((result) => result.status === "rejected")) setError("Could not load updates. Check your connection and try again.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [area]);

  const newsAlerts = articles.filter((article) => safetyWords.test(article.title || ""));
  const communityUpdates = filter === "alerts" ? [] : updates.filter((post) => post.category !== "Safety Alert").slice(0, 6);
  const publisherUpdates = filter === "alerts" ? newsAlerts : articles.slice(0, 6);
  const relevantAlerts = filter === "neighbourhood" ? alerts.slice(0, 3) : alerts;
  const count = relevantAlerts.length + communityUpdates.length + publisherUpdates.length;

  if (filter === "activity") {
    return <section className="notification-empty card">
      <div className="notification-empty-icon"><Activity size={28} /></div>
      <h2>No activity notifications yet</h2>
      <p>Comments and reactions are stored with posts, but a personal notification inbox has not been connected yet.</p>
    </section>;
  }

  return (
    <div className="community-notifications">
      <div className="notification-list-heading">
        <span><MapPin size={15} /> {area || "Across Nigeria"}</span>
        <button type="button" onClick={onOpenLocalNews}>Open area map <ArrowUpRight size={15} /></button>
      </div>
      {loading && <p className="muted small">Loading community updates…</p>}
      {error && <p className="notice error-notice" role="alert">{error}</p>}
      {!loading && count === 0 && <section className="notification-empty card">
        <div className="notification-empty-icon">{filter === "alerts" ? <ShieldAlert size={28} /> : <Bell size={28} />}</div>
        <h2>{filter === "alerts" ? "No safety alerts found" : "No updates for this area yet"}</h2>
        <p>When community members post updates or publisher news is connected, available stories will appear here. Change area to explore another location.</p>
      </section>}
      {!loading && count > 0 && (
        <div className="notification-story-list" aria-live="polite">
          {relevantAlerts.map((post) => (
            <article key={post._id} className="notification-story">
              <span className="notification-story-symbol alert"><ShieldAlert size={18} /></span>
              <div><strong>Community safety report · unverified</strong><p>{post.text || "Media post"}</p><small>{post.author?.fullName || "Member"} · {[post.location?.city, post.location?.state].filter(Boolean).join(", ") || "Nigeria"}</small></div>
            </article>
          ))}
          {publisherUpdates.map((article) => (
            <a className="notification-story" key={article.url} href={article.url} target="_blank" rel="noopener noreferrer">
              <span className="notification-story-symbol"><Newspaper size={18} /></span>
              <div><strong>{filter === "alerts" ? "Publisher safety-related report" : "Publisher local news"}</strong><p>{article.title}</p><small>{article.source} · Check original report</small></div>
              <ArrowUpRight size={16} />
            </a>
          ))}
          {communityUpdates.map((post) => (
            <article key={post._id} className="notification-story">
              <span className="notification-story-symbol"><MapPin size={18} /></span>
              <div><strong>{post.category || "Community update"}</strong><p>{post.text || "Community media post"}</p><small>{post.author?.fullName || "Member"} · {[post.location?.city, post.location?.state].filter(Boolean).join(", ") || "Nigeria"}</small></div>
            </article>
          ))}
        </div>
      )}
      <p className="notification-disclaimer">External headlines are publisher reports, not official VerifiedNG alerts. Community safety reports are unverified until independently confirmed.</p>
    </div>
  );
}
