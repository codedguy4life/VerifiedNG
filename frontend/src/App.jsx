import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Globe2, MapPin, Plus, RefreshCw, ShieldCheck, Sparkles, Users, BriefcaseBusiness, LogOut } from "lucide-react";
import { api, getToken } from "./lib/api.js";
import PostComposer from "./components/PostComposer.jsx";
import PostCard from "./components/PostCard.jsx";

const scopes = [
  { id: "for-you", label: "For you", icon: Sparkles },
  { id: "nearby", label: "Near me", icon: MapPin },
  { id: "nigeria", label: "Across Nigeria", icon: Globe2 },
];

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [scope, setScope] = useState("for-you");
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

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useEffect(() => {
    const onStorage = () => { setToken(getToken()); try { setUser(JSON.parse(localStorage.getItem("user") || "null")); } catch { setUser(null); } };
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
      setError(cause.message);
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
    localStorage.removeItem("token"); localStorage.removeItem("user"); setToken(null); setUser(null); setPosts([]);
  }

  if (!token) return <main className="login-wall"><form className="login-card card" onSubmit={signIn}><div className="brand">Verified<span>NG</span></div><h1>Your community is waiting.</h1><p>Sign in with your existing VerifiedNG email or phone number.</p>{error && <div className="notice error-notice" role="alert">{error}</div>}<label className="login-label">Email or phone<input autoComplete="username" value={loginIdentifier} onChange={(event) => setLoginIdentifier(event.target.value)} required /></label><label className="login-label">Password<input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label><button className="primary-button login-submit" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in"} <ArrowRight size={16} /></button><p className="muted small">Your existing account is used. This does not create a new account or change your role.</p><a className="muted small" href="https://codedguy4life.github.io/VerifiedNG/">Back to the existing website</a></form></main>;

  const activeLabel = scopes.find((item) => item.id === scope)?.label || "For you";
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="https://codedguy4life.github.io/VerifiedNG/">Verified<span>NG</span><small> COMMUNITY</small></a>
      <nav className="top-nav"><a href="https://codedguy4life.github.io/VerifiedNG/search.html"><BriefcaseBusiness size={16} /><span>Find services</span></a><a href="https://codedguy4life.github.io/VerifiedNG/dashboard.html"><Users size={16} /><span>Dashboard</span></a><button type="button" onClick={signOut}><LogOut size={16} /><span>Sign out</span></button></nav>
    </header>
    <main className="page-layout">
      <aside className="left-rail">
        <section className="welcome-panel"><span className="eyebrow">YOUR PEOPLE. YOUR PLACE.</span><h1>Good things happen when we connect.</h1><p>Ask questions, share opportunities and find trusted people across Nigeria.</p><a className="white-link" href="#composer"><Plus size={16} /> Start a conversation</a></section>
        <section className="rail-card"><h2>Explore</h2>{scopes.map(({ id, label, icon: Icon }) => <button className={`scope-button ${scope === id ? "active" : ""}`} key={id} onClick={() => setScope(id)}><Icon size={17} /> {label}</button>)}<p className="privacy-note"><ShieldCheck size={15} /> Your exact address is never shown on posts.</p></section>
      </aside>
      <section className="feed-column">
        <div className="feed-heading"><div><span className="eyebrow">VERIFIEDNG COMMUNITY</span><h2>{activeLabel}</h2></div><button className="icon-button" aria-label="Refresh feed" onClick={() => loadFeed()}><RefreshCw size={17} /></button></div>
        <PostComposer user={user} onPublish={publishPost} busy={publishing} />
        {message && <div className="notice success-notice" role="status">{message}</div>}
        {error && <div className="notice error-notice" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
        <div className="feed-caption">{scope === "nearby" ? "Posts from your area, plus national conversations" : scope === "nigeria" ? "Conversations shared with people across Nigeria" : "Useful conversations from your community"}</div>
        {loading && !posts.length && <div className="empty-state card">Loading your community…</div>}
        {!loading && error && !posts.length && <div className="empty-state card">We couldn't load the feed. Check your connection and try again.</div>}
        {!loading && !error && !posts.length && <div className="empty-state card"><div className="empty-icon"><Users size={22} /></div><h3>Be part of the first conversation.</h3><p>There aren't any posts in this feed yet. Share something helpful to get things started.</p></div>}
        <div className="posts-list">{posts.map((post) => <PostCard key={post._id} post={post} currentUser={user} onReact={reactToPost} onComment={addComment} onEdit={editPost} onDelete={deletePost} onReport={reportPost} />)}</div>
        {hasMore && <button className="load-more" type="button" disabled={loading} onClick={() => loadFeed({ append: true, requestedPage: page + 1 })}>{loading ? "Loading…" : "Load more posts"}</button>}
        {loading && posts.length > 0 && <p className="muted small centered">Refreshing feed…</p>}
      </section>
      <aside className="right-rail">
        <section className="rail-card trust-card"><div className="trust-icon"><ShieldCheck size={22} /></div><h2>Community with trust at its core</h2><p>Be respectful. Verify opportunities. Never share passwords, verification codes or sensitive banking details.</p><a href="https://codedguy4life.github.io/VerifiedNG/safety.html">Community safety tips <ArrowUpRight size={14} /></a></section>
        <section className="rail-card"><span className="eyebrow">WHAT BELONGS HERE?</span><h2>Useful beats viral.</h2><ul className="ideas-list"><li>Jobs and opportunities</li><li>Local questions and advice</li><li>Trusted service recommendations</li><li>Updates that help your community</li></ul></section>
      </aside>
    </main>
    <footer className="app-footer">VerifiedNG · Connecting communities, building trust.</footer>
  </div>;
}
