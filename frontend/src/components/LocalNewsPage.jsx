import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, MapPin, Newspaper, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { api } from "../lib/api.js";

// Approximate city/neighbourhood centres, NOT coordinates of reported incidents.
// An unknown area falls back to a clearly labelled Nigeria overview.
const places = [
  ["abule egba", 6.6506, 3.2967], ["victoria island", 6.4281, 3.4219],
  ["port harcourt", 4.8156, 7.0498], ["lagos island", 6.4531, 3.3958],
  ["sangotedo", 6.4737, 3.6329], ["surulere", 6.5009, 3.3485],
  ["lekki", 6.4474, 3.4731], ["ikeja", 6.6018, 3.3515],
  ["yaba", 6.5126, 3.3784], ["ajah", 6.4678, 3.5677],
  ["ikorodu", 6.6194, 3.5105], ["agege", 6.6208, 3.3249],
  ["lagos", 6.5244, 3.3792], ["abuja", 9.0765, 7.3986],
  ["fct", 9.0765, 7.3986], ["ibadan", 7.3775, 3.9470],
  ["abeokuta", 7.1475, 3.3619], ["ilorin", 8.4799, 4.5418],
  ["kano", 12.0022, 8.5920], ["kaduna", 10.5105, 7.4165],
  ["enugu", 6.4584, 7.5464], ["benin city", 6.3350, 5.6037],
  ["warri", 5.5167, 5.7500], ["asaba", 6.2059, 6.6959],
  ["maiduguri", 11.8311, 13.1510], ["jos", 9.8965, 8.8583],
  ["uyo", 5.0389, 7.9095], ["owerri", 5.4850, 7.0353],
];

function getCentre(area) {
  const normalized = String(area || "").toLowerCase();
  const found = places.find(([name]) => normalized.includes(name));
  if (found) return { lat: found[1], lng: found[2], known: true };
  return { lat: 9.0820, lng: 8.6753, known: false };
}

function mapUrl(centre) {
  const spread = centre.known ? 0.065 : 3.9;
  const params = new URLSearchParams({
    bbox: [centre.lng - spread, centre.lat - spread, centre.lng + spread, centre.lat + spread].join(","),
    layer: "mapnik",
  });
  if (centre.known) params.set("marker", centre.lat + "," + centre.lng);
  return "https://www.openstreetmap.org/export/embed.html?" + params;
}

function timeLabel(value) {
  if (!value) return "Date not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not available" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function LocalNewsPage({ area, onChangeArea }) {
  const [section, setSection] = useState("latest");
  const [sheetOpen, setSheetOpen] = useState(true);
  const touchStartY = useRef(null);
  const wasSwiped = useRef(false);
  const [articles, setArticles] = useState([]);
  const [community, setCommunity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [newsStatus, setNewsStatus] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  const centre = useMemo(() => getCentre(area), [area]);
  const iframeSrc = useMemo(() => mapUrl(centre), [centre]);
  const safetyWords = /\b(fire|flood|accident|road closure|security alert|evacuation|outage|emergency|police warning)\b/i;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrors([]);

    // The map follows the chosen area; news and alerts cover Nigeria by default.
    // Local-only community posts still obey the viewer's server-side permissions.
    const jobs = [
      api("/api/local-news?mode=nigeria")
        .then((data) => { if (!cancelled) { setArticles(data.articles || []); setNewsStatus(data.status || ""); } })
        .catch((error) => { if (!cancelled) { setArticles([]); setNewsStatus("unavailable"); setErrors((all) => [...all, "Publisher news: " + error.message]); } }),
      api("/api/community/search?limit=20")
        .then((data) => { if (!cancelled) setCommunity(data.posts || []); })
        .catch((error) => { if (!cancelled) { setCommunity([]); setErrors((all) => [...all, "Community: " + error.message]); } }),
      api("/api/community/search?category=Safety%20Alert&limit=20")
        .then((data) => { if (!cancelled) setAlerts(data.posts || []); })
        .catch((error) => { if (!cancelled) { setAlerts([]); setErrors((all) => [...all, "Alerts: " + error.message]); } }),
    ];
    Promise.allSettled(jobs).then(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshCount]);

  const publisherSafety = articles.filter((item) => safetyWords.test(item.title || ""));
  const latestItems = useMemo(() => [
    ...articles.map((item) => ({ ...item, kind: "publisher", date: item.publishedAt })),
    ...community.map((item) => ({ ...item, kind: "community", date: item.createdAt })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [articles, community]);
  const alertItems = useMemo(() => [
    ...publisherSafety.map((item) => ({ ...item, kind: "publisher", date: item.publishedAt })),
    ...alerts.map((item) => ({ ...item, kind: "alert", date: item.createdAt })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [articles, alerts]);
  const activeItems = section === "alerts" ? alertItems : latestItems;

  return (
    <div className="local-news-experience">
      <div className="local-map-toolbar">
        <p>Explore an area on the map. Latest updates below cover Nigeria.</p>
        <button type="button" className="local-change-area" onClick={onChangeArea}>
          <MapPin size={15} /> Change map area <ChevronDown size={14} />
        </button>
      </div>
      <div className="local-map-stage">
        <iframe
          title={"Interactive map — " + (centre.known ? area : "Nigeria")}
          src={iframeSrc}
          loading="lazy"
          className="local-map-frame"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <span className="local-map-caption">
          <MapPin size={14} /> {centre.known ? area : "Nigeria overview"} · Map data © OpenStreetMap contributors
        </span>
        <section className={sheetOpen ? "local-news-sheet open" : "local-news-sheet collapsed"}>
          <button
            type="button"
            className="local-sheet-handle"
            aria-expanded={sheetOpen}
            aria-controls="local-sheet-content"
            onClick={() => {
              if (wasSwiped.current) { wasSwiped.current = false; return; }
              setSheetOpen((open) => !open);
            }}
            onTouchStart={(event) => { wasSwiped.current = false; touchStartY.current = event.touches[0]?.clientY ?? null; }}
            onTouchEnd={(event) => {
              const endY = event.changedTouches[0]?.clientY;
              if (touchStartY.current === null || endY === undefined) return;
              const delta = endY - touchStartY.current;
              touchStartY.current = null;
              if (Math.abs(delta) > 35) { wasSwiped.current = true; setSheetOpen(delta < 0); }
            }}
          >
            <span className="local-sheet-grip" aria-hidden="true" />
            <span>Latest news & alerts</span>
            {sheetOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <div id="local-sheet-content" className="local-sheet-content" hidden={!sheetOpen}>
            <div className="local-news-sheet-header">
              <div className="local-news-tabs" role="group" aria-label="Choose updates">
                <button type="button" className={section === "latest" ? "active" : ""} aria-pressed={section === "latest"} onClick={() => setSection("latest")}><Newspaper size={15} /> Latest</button>
                <button type="button" className={section === "alerts" ? "active" : ""} aria-pressed={section === "alerts"} onClick={() => setSection("alerts")}><ShieldAlert size={15} /> Alerts</button>
              </div>
              <button type="button" className="local-refresh-button" onClick={() => setRefreshCount((v) => v + 1)} disabled={loading}><RefreshCw size={14} /> Refresh</button>
            </div>
            <p className="local-news-caption">Recent publisher headlines and community updates from across Nigeria</p>
            {errors.length > 0 && <p className="local-news-hint" role="status">{errors[0]}</p>}
            {newsStatus === "not_configured" && (
              <p className="local-news-hint">Publisher news is not connected yet. Add a GNews API key to the backend to see real headlines. Community updates still show when available.</p>
            )}
            <div className="local-news-items" aria-live="polite">
              {loading ? <p className="muted small">Loading latest updates…</p> : (
                <>
                  {activeItems.map((item) => item.kind === "publisher" ? (
                    <a className="local-story-card" key={"publisher-" + item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                      <span className="local-story-head"><span className="local-story-type"><Newspaper size={14} /> Publisher report</span><ArrowUpRight size={16} /></span>
                      <strong>{item.title}</strong>
                      {item.description && <p>{item.description}</p>}
                      <small>{item.source} · {timeLabel(item.publishedAt)}</small>
                    </a>
                  ) : (
                    <article className="local-story-card" key={"community-" + item._id}>
                      <span className="local-story-head"><span className="local-story-type">{item.kind === "alert" ? <ShieldAlert size={14} /> : <Users size={14} />}{item.kind === "alert" || item.category === "Safety Alert" ? "Member safety report · unverified" : "Community update"}</span></span>
                      <strong>{item.category || "Community post"}</strong>
                      <p>{item.text || "Photo or video shared with the community"}</p>
                      <small>{[item.location?.city, item.location?.state].filter(Boolean).join(", ") || "Nigeria"} · {timeLabel(item.createdAt)}</small>
                    </article>
                  ))}
                  {activeItems.length === 0 && (
                    <div className="local-news-empty">
                      {section === "alerts" ? <ShieldAlert size={23} /> : <Newspaper size={23} />}
                      <strong>{section === "alerts" ? "No safety reports available yet" : "No recent updates available yet"}</strong>
                      <p>{section === "alerts" ? "There are no accessible member safety reports or safety-related publisher headlines in the connected sources." : "No publisher articles or community updates were returned. A news API key is required for publisher headlines."}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="local-news-disclaimer">Publisher stories can be delayed. Member alerts are unverified reports, not confirmed official emergency warnings.</p>
          </div>
        </section>
      </div>
      <p className="local-news-map-note">Map pins show approximate area centres, not the locations of reported incidents.</p>
    </div>
  );
}
