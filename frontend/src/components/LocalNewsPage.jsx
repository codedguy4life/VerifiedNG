import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, Globe2, MapPin, Newspaper, RefreshCw, ShieldAlert, Users } from "lucide-react";
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
  const [section, setSection] = useState("news");
  const [newsMode, setNewsMode] = useState("local");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [articles, setArticles] = useState([]);
  const [community, setCommunity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [newsStatus, setNewsStatus] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  const centre = useMemo(() => getCentre(area), [area]);
  const iframeSrc = useMemo(() => mapUrl(centre), [centre]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ area: area || "", limit: "12" });
    const newsParams = new URLSearchParams({ mode: newsMode, area: area || "" });
    setLoading(true);
    setErrors([]);
    const jobs = [
      api("/api/local-news?" + newsParams)
        .then((data) => { if (!cancelled) { setArticles(data.articles || []); setNewsStatus(data.status || ""); } })
        .catch((error) => { if (!cancelled) { setArticles([]); setNewsStatus("unavailable"); setErrors((all) => [...all, error.message]); } }),
      api("/api/community/search?" + params)
        .then((data) => { if (!cancelled) setCommunity(data.posts || []); })
        .catch((error) => { if (!cancelled) { setCommunity([]); setErrors((all) => [...all, error.message]); } }),
      api("/api/community/search?" + new URLSearchParams({ area: area || "", category: "Safety Alert", limit: "12" }))
        .then((data) => { if (!cancelled) setAlerts(data.posts || []); })
        .catch((error) => { if (!cancelled) { setAlerts([]); setErrors((all) => [...all, error.message]); } }),
    ];
    Promise.all(jobs).then(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [area, newsMode, refreshCount]);

  const activeItems = section === "news" ? articles : section === "alerts" ? alerts : community;
  const hasArea = Boolean(area && area.trim());
  const locationLabel = centre.known ? area : "Nigeria overview";

  return (
    <div className="local-news-experience">
      <div className="local-map-toolbar">
        <div>
          <strong><MapPin size={17} /> {hasArea ? area : "Explore Nigeria"}</strong>
          <small>{centre.known ? "Approximate area centre, not incident locations" : "Choose a supported city or neighbourhood for a closer map"}</small>
        </div>
        <button type="button" className="secondary-button" onClick={onChangeArea}>Change area <ChevronDown size={15} /></button>
      </div>
      <div className="local-map-stage">
        <iframe title={"Interactive map — " + locationLabel} src={iframeSrc} loading="lazy" className="local-map-frame" referrerPolicy="strict-origin-when-cross-origin" />
        <span className="local-map-caption"><MapPin size={14} /> {locationLabel} · Map data © OpenStreetMap contributors</span>
        <div className={sheetOpen ? "local-news-sheet open" : "local-news-sheet collapsed"}>
          <button type="button" className="local-sheet-handle" onClick={() => setSheetOpen((open) => !open)} aria-expanded={sheetOpen} aria-controls="local-sheet-content">
            <span className="local-sheet-grip" />
            <span>Local news & alerts</span>
            {sheetOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <div id="local-sheet-content" className="local-sheet-content" hidden={!sheetOpen}>
            <div className="local-news-tabs" role="group" aria-label="Local updates">
              <button type="button" className={section === "news" ? "active" : ""} onClick={() => setSection("news")}><Newspaper size={15} /> News</button>
              <button type="button" className={section === "alerts" ? "active" : ""} onClick={() => setSection("alerts")}><ShieldAlert size={15} /> Alerts</button>
              <button type="button" className={section === "community" ? "active" : ""} onClick={() => setSection("community")}><Users size={15} /> Community</button>
            </div>
            {section === "news" && (
              <div className="local-news-scope">
                <button type="button" className={newsMode === "local" ? "active" : ""} onClick={() => setNewsMode("local")}><MapPin size={14} /> This area</button>
                <button type="button" className={newsMode === "nigeria" ? "active" : ""} onClick={() => setNewsMode("nigeria")}><Globe2 size={14} /> Across Nigeria</button>
              </div>
            )}
            <div className="local-news-items" aria-live="polite">
              {loading ? <p className="muted small">Loading updates…</p> : (
                <>
                  {errors.length > 0 && <p className="muted small">Some updates could not load. {errors[0]}</p>}
                  {section === "news" && newsStatus === "not_configured" && <p className="local-news-hint">Publisher news is not connected yet. Add the GNews API key to the backend; community alerts already work.</p>}
                  {section === "news" && newsStatus === "choose_area" && <p className="local-news-hint">Choose a neighbourhood to see matching publisher articles, or select Across Nigeria.</p>}
                  {activeItems.map((item) => section === "news" ? (
                    <a className="local-story-card" key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                      <span className="local-story-head"><span className="local-story-type"><Newspaper size={14} /> Publisher news</span><ArrowUpRight size={16} /></span>
                      <strong>{item.title}</strong>
                      {item.description && <p>{item.description}</p>}
                      <small>{item.source} · {timeLabel(item.publishedAt)}</small>
                    </a>
                  ) : (
                    <article className="local-story-card" key={item._id}>
                      <span className="local-story-head"><span className="local-story-type">{section === "alerts" ? <ShieldAlert size={14} /> : <Users size={14} />}{section === "alerts" ? "Community report · unverified" : "Community post"}</span></span>
                      <strong>{item.category || "Community update"}</strong>
                      <p>{item.text || "Attached media"}</p>
                      <small>{item.author?.fullName || "Member"} · {timeLabel(item.createdAt)}</small>
                    </article>
                  ))}
                  {activeItems.length === 0 && <p className="local-news-hint">{section === "alerts" ? "No community safety alerts found for this selection." : section === "community" ? "No community posts found for this area. Local-only posts remain restricted to authorised neighbours." : "No publisher headlines available for this selection yet."}</p>}
                </>
              )}
              <button type="button" className="local-refresh-button" onClick={() => setRefreshCount((value) => value + 1)} disabled={loading}><RefreshCw size={15} /> Check for updates</button>
              <p className="local-news-disclaimer">News comes from external publishers; member alerts are unverified reports. Never treat an unconfirmed report as an official emergency warning.</p>
            </div>
          </div>
        </div>
      </div>
      <p className="muted small">The map marker shows an approximate area centre, not the location of an alert. A map tile or story source may be unavailable without internet access.</p>
    </div>
  );
}
