import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, MapPin, Search, ShieldCheck, Users, MessageCircle, RefreshCw, Newspaper, ShoppingBag, Compass, TrendingUp } from "lucide-react";
import { api } from "../lib/api.js";

const tabs = [
  { id: "all", label: "All" },
  { id: "providers", label: "Providers" },
  { id: "community", label: "Posts" },
];

const quickSearches = ["Electrician", "Plumber", "Hair stylist", "Photographer", "Caterer", "Cleaner", "Developer"];
const exploreCards = [
  { id: "local-news", label: "News & alerts", detail: "Local headlines and updates", icon: Newspaper },
  { id: "events", label: "Events", detail: "What is happening nearby", icon: CalendarDays },
  { id: "groups", label: "Groups", detail: "Meet your community", icon: Users },
  { id: "sale", label: "For Sale", detail: "Neighbourhood marketplace", icon: ShoppingBag },
  { id: "providers", label: "Providers", detail: "Find a local professional", icon: ShieldCheck },
  { id: "community", label: "Other posts", detail: "Explore community discussions", icon: MessageCircle },
];
const directoryTerms = new Set(["provider", "providers", "povider", "poviders", "service", "services", "all", "everyone"]);

export default function SearchPage({ area = "", initialTab = "all", mode = "search", onOpenProvider, onExplore }) {
  const isSearchHub = mode === "search";
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(initialTab);
  const [onlyArea, setOnlyArea] = useState(false);
  const [providers, setProviders] = useState([]);
  const [directoryCount, setDirectoryCount] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // Fetch the real directory so "Providers" is useful without typing.
  useEffect(() => {
    if (isSearchHub) return;
    let cancelled = false;
    api("/api/providers")
      .then((data) => { if (!cancelled) setDirectoryCount((data.providers || []).length); })
      .catch(() => { if (!cancelled) setDirectoryCount(null); });
    return () => { cancelled = true; };
  }, [refresh, isSearchHub]);

  useEffect(() => {
    const q = query.trim();
    const browse = !q || directoryTerms.has(q.toLowerCase());
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      const jobs = [];
      if (tab !== "community" && (!isSearchHub || q.length >= 2)) {
        const params = new URLSearchParams();
        if (!browse) params.set("search", q);
        if (onlyArea && area) {
          const parts = area.split(",").map((part) => part.trim()).filter(Boolean);
          if (parts.length > 1) {
            params.set("state", parts.at(-1));
            params.set("location", parts[0]);
          } else if (parts.length) params.set("location", parts[0]);
        }
        jobs.push(api("/api/providers" + (params.size ? "?" + params : ""), { signal: abort.signal })
          .then((data) => { if (!abort.signal.aborted) setProviders(data.providers || []); })
          .catch((cause) => { if (!abort.signal.aborted) { setProviders([]); setError((prev) => prev ? prev + " " + cause.message : "Providers: " + cause.message); } }));
      } else setProviders([]);

      if (tab !== "providers" && q.length >= 2 && !directoryTerms.has(q.toLowerCase())) {
        const params = new URLSearchParams({ q, limit: "20" });
        if (onlyArea && area) params.set("area", area);
        jobs.push(api("/api/community/search?" + params, { signal: abort.signal })
          .then((data) => { if (!abort.signal.aborted) setPosts(data.posts || []); })
          .catch((cause) => { if (!abort.signal.aborted) { setPosts([]); setError((prev) => prev ? prev + " " + cause.message : "Community: " + cause.message); } }));
      } else setPosts([]);

      await Promise.all(jobs);
      if (!abort.signal.aborted) setLoading(false);
    }, query.trim().length >= 2 ? 300 : 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query, tab, onlyArea, area, refresh, isSearchHub]);

  const hasQuery = query.trim().length >= 2;
  const count = providers.length + posts.length;
  const directoryEmpty = directoryCount === 0;
  const showHub = isSearchHub && !query.trim() && tab !== "community";
  function chooseExplore(id) {
    if (id === "community") {
      setTab("community");
      document.querySelector(".discovery-search-field input")?.focus();
      return;
    }
    onExplore?.(id);
  }

  return (
    <div className={isSearchHub ? "discovery-search discovery-search-hub" : "discovery-search discovery-provider-directory"}>
      {isSearchHub ? (
        <div className="discovery-hero">
          <span className="discovery-eyebrow"><Compass size={15} /> DISCOVER YOUR COMMUNITY</span>
          <h2>What are you looking for?</h2>
          <p>Search for a service, skill, business or conversation across VerifiedNG.</p>
        </div>
      ) : (
        <div className="discovery-hero discovery-provider-hero">
          <span className="discovery-eyebrow"><Users size={15} /> PROVIDER DIRECTORY</span>
          <h2>Find the right person for the job.</h2>
          <p>Browse registered providers or search by service, skill or name.</p>
        </div>
      )}
      <label className="discovery-search-field">
        <Search size={19} aria-hidden="true" />
        <span className="sr-only">Search VerifiedNG</span>
        <input
          type="search"
          value={query}
          maxLength={80}
          placeholder={!isSearchHub ? "Search a service, skill or provider…" : "Try plumber, jobs, neighbourhood news…"}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {showHub && (
        <>
          <section className="discovery-trending" aria-label="Trending search suggestions">
            <h3><TrendingUp size={17} /> Popular searches</h3>
            <div className="discovery-quick-searches">
              {quickSearches.map((service) => <button key={service} type="button" onClick={() => setQuery(service)}>{service} <ArrowRight size={13} /></button>)}
            </div>
          </section>
          <section className="discovery-explore" aria-label="Explore VerifiedNG categories">
            <div className="discovery-explore-heading"><h3>Explore more</h3><p>Jump into what matters to you.</p></div>
            <div className="discovery-explore-grid">
              {exploreCards.map(({ id, label, detail, icon: Icon }) => (
                <button key={id} className="discovery-explore-card" type="button" onClick={() => chooseExplore(id)}>
                  <span className="discovery-explore-icon"><Icon size={21} /></span>
                  <strong>{label}</strong><small>{detail}</small><ArrowRight className="discovery-explore-arrow" size={16} />
                </button>
              ))}
            </div>
          </section>
        </>
      )}
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
          <MapPin size={14} /> {area ? "Only " + area : "All areas"}
        </label>
      </div>

      {!isSearchHub && !hasQuery && tab !== "community" && (
        <div className="discovery-quick-searches" aria-label="Popular service searches">
          {quickSearches.map((service) => (
            <button key={service} type="button" onClick={() => setQuery(service)}>{service}</button>
          ))}
        </div>
      )}

      {loading && <p className="discovery-count" role="status"><RefreshCw size={14} /> Searching VerifiedNG…</p>}
      {error && <div className="notice error-notice" role="alert">{error} Check that the backend is running on port 5000.</div>}
      {!loading && !error && (
        <>
          {!showHub && tab === "community" && !hasQuery && (
            <div className="discovery-state"><MessageCircle size={27} /><h2>Search community posts</h2><p>Type a topic, place or keyword to find conversations you can access.</p></div>
          )}
          {tab !== "community" && providers.length > 0 && (
            <section className="discovery-results" aria-label="Provider results">
              <h2><Users size={18} /> {hasQuery ? "Matching providers" : "Browse providers"} <span>{providers.length}</span></h2>
              <div className="discovery-card-grid">
                {providers.slice(0, 40).map((provider) => (
                  <button key={provider._id} type="button" className="discovery-result-card" onClick={() => onOpenProvider(provider._id)}>
                    <span className="discovery-result-icon"><Users size={20} /></span>
                    <span className="discovery-result-info">
                      <strong>{provider.fullName || "Service provider"} {provider.isVerified && <ShieldCheck size={15} aria-label="Verified" />}</strong>
                      <small>{provider.category || "Services"} · {[provider.city, provider.state].filter(Boolean).join(", ") || "Nigeria"}</small>
                      <span>{(provider.bio || provider.skills?.join(", ") || "View provider profile").slice(0, 130)}</span>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {tab !== "providers" && posts.length > 0 && (
            <section className="discovery-results" aria-label="Community post results">
              <h2><MessageCircle size={18} /> Matching posts <span>{posts.length}</span></h2>
              <div className="discovery-card-grid">
                {posts.map((post) => (
                  <article className="discovery-result-card" key={post._id}>
                    <span className="discovery-result-icon"><MessageCircle size={20} /></span>
                    <span className="discovery-result-info">
                      <strong>{post.category || "Community"} · {post.author?.fullName || "Member"}</strong>
                      <small>{[post.location?.city, post.location?.state].filter(Boolean).join(", ") || "Nigeria"}</small>
                      <span>{post.text || (post.imageUrl || post.videoUrl ? "Media post" : "Community update")}</span>
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}
          {!showHub && count === 0 && (tab !== "community" || hasQuery) && (
            <div className="discovery-state">
              <Search size={27} />
              <h2>{directoryEmpty && tab !== "community" ? "No providers registered yet" : hasQuery ? "Nothing matched your search" : "No providers available yet"}</h2>
              <p>{directoryEmpty && tab !== "community"
                ? "This connected VerifiedNG database has no provider accounts at the moment. Search can only display real registered providers."
                : "Try another service name or remove the location filter. Results only include data currently saved in VerifiedNG."}</p>
              {hasQuery && <button type="button" className="secondary-button" onClick={() => { setQuery(""); setOnlyArea(false); setTab("providers"); }}>Browse all providers <ArrowRight size={15} /></button>}
              <button type="button" className="discovery-retry" onClick={() => setRefresh((v) => v + 1)}><RefreshCw size={14} /> Retry</button>
            </div>
          )}
          {!showHub && count > 0 && <p className="discovery-count">{hasQuery ? count + " result(s) for “" + query.trim() + "”" : "Showing available listings from your connected database"}</p>}
        </>
      )}
    </div>
  );
}
