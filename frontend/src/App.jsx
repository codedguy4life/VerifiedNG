import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight, Bell, Check, ChevronDown, Compass, Globe2, Heart,
  Home, MapPin, MessageCircle, Search, ShieldCheck, ShoppingBag,
  Users, X, LogOut, RefreshCw
} from "lucide-react";
import { api, getToken } from "./lib/api.js";
import PostComposer from "./components/PostComposer.jsx";
import PostCard from "./components/PostCard.jsx";

const scopes = [
  { id: "for-you", label: "For you", icon: Compass },
  { id: "nearby", label: "Near me", icon: MapPin },
  { id: "nigeria", label: "Across Nigeria", icon: Globe2 },
];

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "providers", label: "Providers", icon: Users },
  { id: "sale", label: "For Sale", icon: ShoppingBag },
  { id: "faves", label: "Local Faves", icon: Heart },
];

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [scope, setScope] = useState("for-you");
  const [activeTab, setActiveTab] = useState("home");
  const [area, setArea] = useState(() => localStorage.getItem("verifiedng-area") || "");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadFeed = useCallback(async ({ append = false, requestedPage = 1 } = {}) => {
    if (!getToken()) { setToken(null); return; }
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/community/feed?scope=${encodeURIComponent(scope)}&page=${requestedPage}&limit=10`);
      setPosts((current) => append ? [...current, ...(data.posts || [])] : (data.posts || []));
      setPage(requestedPage);
      setHasMore(Boolean(data.hasMore));
    } catch (cause) {
      setError(cause.message || "Could not load the community.");
    } finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { if (token) loadFeed(); }, [loadFeed, token]);
  useEffect(() => {
    const onStorage = () => {
      setToken(getToken());
      try { setUser(JSON.parse(localStorage.getItem("user") || "null")); } catch { setUser(null); }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function publishPost(payload) {
    setPublishing(true); setMessage(""); setError("");
    try {
      await api("/api/community/posts", { method: "POST", body: JSON.stringify(payload) });
      setMessage("Your post has been published.");
      if (scope === "nigeria" && payload.audience === "local") {
        setMessage("Post published. Switch to For you or Near me to see local posts.");
      } else await loadFeed();
      return true;
    } catch (cause) {
      setError(cause.message || "Could not publish your post.");
      return false;
    } finally { setPublishing(false); }
  }

  async function reactToPost(postId) {
    try { await api(`/api/community/posts/${encodeURIComponent(postId)}/reactions`, { method: "POST", body: JSON.stringify({}) }); await loadFeed({ requestedPage: page }); }
    catch (cause) { setError(cause.message); }
  }
  async function addComment(postId, text) {
    try { await api(`/api/community/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", body: JSON.stringify({ text }) }); await loadFeed({ requestedPage: page }); return true; }
    catch (cause) { setError(cause.message); return false; }
  }
  async function editPost(post) {
    const text = window.prompt("Edit your post", post.text);
    if (text === null || !text.trim()) return;
    try { await api(`/api/community/posts/${encodeURIComponent(post._id)}`, { method: "PUT", body: JSON.stringify({ text: text.trim(), category: post.category }) }); await loadFeed({ requestedPage: page }); setMessage("Post updated."); }
    catch (cause) { setError(cause.message); }
  }
  async function deletePost(postId) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try { await api(`/api/community/posts/${encodeURIComponent(postId)}`, { method: "DELETE" }); setPosts((current) => current.filter((post) => post._id !== postId)); setMessage("Post deleted."); }
    catch (cause) { setError(cause.message); }
  }
  async function reportPost(postId, payload) {
    try { const result = await api(`/api/community/posts/${encodeURIComponent(postId)}/reports`, { method: "POST", body: JSON.stringify(payload) }); setMessage(result.message || "Report sent for review."); return true; }
    catch (cause) { setError(cause.message); return false; }
  }
  async function signIn(event) {
    event.preventDefault();
    setLoginBusy(true); setError("");
    try {
      const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword }) });
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setToken(result.token); setUser(result.user); setLoginPassword("");
    } catch (cause) { setError(cause.message || "Could not sign in."); }
    finally { setLoginBusy(false); }
  }
  function signOut() {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    setToken(null); setUser(null); setPosts([]);
  }
  function chooseArea() {
    const nextArea = window.prompt("Which neighbourhood or area should VerifiedNG show?", area);
    if (nextArea === null) return;
    const cleanArea = nextArea.trim();
    if (cleanArea) {
      localStorage.setItem("verifiedng-area", cleanArea);
      setArea(cleanArea);
    } else {
      localStorage.removeItem("verifiedng-area");
      setArea("");
    }
  }
  function chooseTab(id) {
    setActiveTab(id);
    if (id !== "home") {
      const label = tabs.find((tab) => tab.id === id)?.label || "This section";
      setMessage(`${label} is next on our build list. We're focusing on Home first.`);
    } else setMessage("");
  }

  if (!token) return <main className="login-wall"><form className="login-card card" onSubmit={signIn}><div className="brand">Verified<span>NG</span></div><h1>Your community is waiting.</h1><p>Sign in with your existing VerifiedNG email or phone number.</p>{error && <div className="notice error-notice" role="alert">{error}</div>}<label className="login-label">Email or phone<input autoComplete="username" value={loginIdentifier} onChange={(event) => setLoginIdentifier(event.target.value)} required /></label><label className="login-label">Password<input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label><button className="primary-button login-submit" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in"} <ArrowRight size={16} /></button><p className="muted small">Your existing account is used. This does not create a new account or change your role.</p><a className="muted small" href="https://codedguy4life.github.io/VerifiedNG/">Back to the existing website</a></form></main>;

  const activeLabel = scopes.find((item) => item.id === scope)?.label || "For you";
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="https://codedguy4life.github.io/VerifiedNG/" aria-label="VerifiedNG home">Verified<span>NG</span><small> YOUR COMMUNITY</small></a>
      <div className="header-actions">
        <button className="header-icon" type="button" aria-label="Messages" onClick={() => setMessage("Your chats inbox will be connected in a later step.")}><MessageCircle size={20} /><span className="notification-dot" /></button>
        <button className="header-icon" type="button" aria-label="Notifications" onClick={() => setMessage("Your notifications will be connected in a later step.")}><Bell size={20} /></button>
        <button className="profile-button" type="button" onClick={signOut} title="Sign out">
          <span className="avatar">{user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials(user?.fullName)}</span>
          <span className="profile-name">{user?.fullName || "Your account"}</span>
          <LogOut size={15} />
        </button>
      </div>
    </header>
    <div className="location-strip">
      <div className="location-details">
        <span className="location-pin"><MapPin size={17} /></span>
        <div><span className="location-caption">YOUR COMMUNITY</span><strong>{area || "Choose your neighbourhood"}</strong></div>
        <button className={area ? "area-status active" : "area-status"} type="button" onClick={chooseArea}>{area ? <><Check size={13} /> Active here</> : "Set location"}</button>
      </div>
      <button className="change-area" type="button" onClick={chooseArea}>{area ? "Change" : "Choose area"} <ChevronDown size={14} /></button>
    </div>
    <main className="home-layout">
      <section className="feed-column">
        <div className="feed-heading"><div><span className="eyebrow">LOCAL PEOPLE. REAL CONNECTIONS.</span><h1>Home</h1><p>What's happening around your community?</p></div><button className="icon-button" aria-label="Refresh feed" onClick={() => loadFeed()}><RefreshCw size={17} /></button></div>
        <div className="scope-tabs" role="tablist" aria-label="Choose your feed">
          {scopes.map(({ id, label, icon: Icon }) => <button type="button" role="tab" aria-selected={scope === id} className={scope === id ? "scope-tab active" : "scope-tab"} key={id} onClick={() => setScope(id)}><Icon size={15} />{label}</button>)}
        </div>
        <PostComposer user={user} onPublish={publishPost} busy={publishing} />
        {message && <div className="notice success-notice" role="status">{message}<button type="button" className="notice-close" aria-label="Dismiss message" onClick={() => setMessage("")}><X size={15} /></button></div>}
        {error && <div className="notice error-notice" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
        <div className="feed-caption">{scope === "nearby" ? "Posts from your area and nearby conversations" : scope === "nigeria" ? "Conversations shared across Nigeria" : "Conversations from your community"}</div>
        {loading && !posts.length && <div className="empty-state card">Loading your community…</div>}
        {!loading && error && !posts.length && <div className="empty-state card">We couldn't load the feed. Check your connection and try again.</div>}
        {!loading && !error && !posts.length && <div className="empty-state card"><div className="empty-icon"><Users size={22} /></div><h3>Your community starts here.</h3><p>Ask a question, share something useful or help a neighbour find what they need.</p></div>}
        <div className="posts-list">{posts.map((post) => <PostCard key={post._id} post={post} currentUser={user} onReact={reactToPost} onComment={addComment} onEdit={editPost} onDelete={deletePost} onReport={reportPost} />)}</div>
        {hasMore && <button className="load-more" type="button" disabled={loading} onClick={() => loadFeed({ append: true, requestedPage: page + 1 })}>{loading ? "Loading…" : "Load more posts"}</button>}
        {loading && posts.length > 0 && <p className="muted small centered">Refreshing feed…</p>}
      </section>
      <aside className="home-side">
        <section className="side-card community-tip"><div className="side-card-icon"><ShieldCheck size={20} /></div><h2>A community built on trust</h2><p>Share useful information, treat neighbours with respect, and report suspicious posts.</p><a href="https://codedguy4life.github.io/VerifiedNG/safety.html">Read our safety tips <ArrowRight size={14} /></a></section>
        <section className="side-card"><span className="eyebrow">A GOOD PLACE TO START</span><h2>What can you share?</h2><ul><li>Ask your neighbours for advice</li><li>Recommend a trusted provider</li><li>Share local news or opportunities</li><li>Help someone find what they need</li></ul></section>
      </aside>
    </main>
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeTab === id ? "bottom-tab active" : "bottom-tab"} aria-current={activeTab === id ? "page" : undefined} onClick={() => chooseTab(id)}><Icon size={21} strokeWidth={activeTab === id ? 2.4 : 1.8} /><span>{label}</span></button>)}
    </nav>
  </div>;
}

function initials(name = "V") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}
