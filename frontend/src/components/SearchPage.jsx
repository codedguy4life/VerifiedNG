import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Search, ShieldCheck, Users, MessageCircle } from "lucide-react";
import { api } from "../lib/api.js";

const tabs = [
  { id: "all", label: "All results" },
  { id: "providers", label: "Providers" },
  { id: "community", label: "Community posts" },
];

export default function SearchPage({ area = "", initialTab = "all", onOpenProvider }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(initialTab);
  const [onlyArea, setOnlyArea] = useState(false);
  const [providers, setProviders] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setProviders([]);
      setPosts([]);
      setErrors([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setErrors([]);
      const jobs = [];
      if (tab !== "community") {
        const params = new URLSearchParams({ search: q });
        // The provider API filters by state, not arbitrary neighbourhood.
        if (onlyArea && area.includes(",")) params.set("state", area.split(",").at(-1).trim());
        jobs.push(api("/api/providers?" + params, { signal: controller.signal })
          .then((result) => { if (!controller.signal.aborted) setProviders(result.providers || []); })
          .catch((error) => { if (!controller.signal.aborted) { setProviders([]); setErrors((prev) => [...prev, "Providers: " + error.message]); } }));
      } else setProviders([]);

      if (tab !== "providers") {
        const params = new URLSearchParams({ q, limit: "20" });
        if (onlyArea && area) params.set("area", area);
        jobs.push(api("/api/community/search?" + params, { signal: controller.signal })
          .then((result) => { if (!controller.signal.aborted) setPosts(result.posts || []); })
          .catch((error) => { if (!controller.signal.aborted) { setPosts([]); setErrors((prev) => [...prev, "Community: " + error.message]); } }));
      } else setPosts([]);

      await Promise.all(jobs);
      if (!controller.signal.aborted) setLoading(false);
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, tab, onlyArea, area]);

  const ready = query.trim().length >= 2;
  const count = (tab === "community" ? 0 : providers.length) + (tab === "providers" ? 0 : posts.length);

  return (
    <div className="discovery-search">
      <label className="discovery-search-field">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Search providers and community posts</span>
        <input
          type="search"
          autoFocus
          maxLength={80}
          value={query}
          placeholder="Search services, providers or community updates..."
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="discovery-search-controls">
        <div className="discovery-switches" role="group" aria-label="Search categories">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "discovery-switch active" : "discovery-switch"}
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
            >{item.label}</button>
          ))}
        </div>
        <label className="discovery-area-filter">
          <input type="checkbox" checked={onlyArea} disabled={!area} onChange={(event) => setOnlyArea(event.target.checked)} />
          <MapPin size={15} /> {area ? "Filter to " + area : "Choose an area to filter"}
        </label>
      </div>
      {!ready ? (
        <div className="discovery-state">
          <Search size={28} />
          <h2>What are you looking for?</h2>
          <p>Try “electrician”, “plumber”, “photographer”, “road closure”, or a provider’s name.</p>
          <p className="muted small">Search results come from real VerifiedNG accounts and community posts.</p>
        </div>
      ) : (
        <>
          <p className="discovery-count" role="status">
            {loading ? "Searching…" : count + " result" + (count === 1 ? "" : "s") + " for “" + query.trim() + "”"}
          </p>
          {errors.map((error) => <p className="notice error-notice" role="alert" key={error}>{error}</p>)}
          {!loading && count === 0 && errors.length === 0 && (
            <div className="discovery-state"><Search size={28} /><h2>No matching results yet</h2><p>Try a different word or turn off the area filter.</p></div>
          )}
          {tab !== "community" && providers.length > 0 && (
            <section className="discovery-results" aria-label="Provider results">
              <h2><Users size={19} /> Providers <span>{providers.length}</span></h2>
              <div className="discovery-card-grid">
                {providers.slice(0, 30).map((provider) => (
                  <button key={provider._id} type="button" className="discovery-result-card" onClick={() => onOpenProvider(provider._id)}>
                    <span className="discovery-result-icon"><Users size={21} /></span>
                    <span className="discovery-result-info">
                      <strong>{provider.fullName || "Service provider"} {provider.isVerified && <ShieldCheck size={15} aria-label="Verified" />}</strong>
                      <small>{provider.category || "Services"} · {[provider.city, provider.state].filter(Boolean).join(", ") || "Nigeria"}</small>
                      <span>{(provider.bio || provider.skills?.join(", ") || "View provider profile").slice(0, 120)}</span>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {tab !== "providers" && posts.length > 0 && (
            <section className="discovery-results" aria-label="Community post results">
              <h2><MessageCircle size={19} /> Community posts <span>{posts.length}</span></h2>
              <div className="discovery-card-grid">
                {posts.map((post) => (
                  <article className="discovery-result-card" key={post._id}>
                    <span className="discovery-result-icon"><MessageCircle size={21} /></span>
                    <span className="discovery-result-info">
                      <strong>{post.category || "Community"} · {post.author?.fullName || "Member"}</strong>
                      <small>{[post.location?.city, post.location?.state].filter(Boolean).join(", ") || "Nigeria"} · {post.audience === "local" ? "Local audience" : "Across Nigeria"}</small>
                      <span>{post.text || (post.imageUrl || post.videoUrl ? "Media post" : "Community update")}</span>
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
