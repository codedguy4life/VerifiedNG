import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BellRing, Bookmark, CalendarDays, Check,
  ChevronDown, CircleHelp, Compass, Globe2, Heart, Home, MapPin,
  MessageCircle, Newspaper, Search, Settings, ShieldCheck, ShoppingBag,
  Users, UserCog, UserPlus, UserRound, X, LogOut, RefreshCw, ShieldAlert,
  Activity
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
  const [currentView, setCurrentView] = useState("home");
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
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
    setCurrentView("home");
    setProfileDrawerOpen(false);
    if (id !== "home") {
      const label = tabs.find((tab) => tab.id === id)?.label || "This section";
      setMessage(`${label} is on the build list. The Home feed is ready while we build this section.`);
    } else setMessage("");
  }

  function openNotifications() {
    setCurrentView("notifications");
    setNotificationFilter("all");
    setMessage("");
    setProfileDrawerOpen(false);
  }

  function openProfileItem(label) {
    setProfileDrawerOpen(false);
    if (label === "My profile") {
      setMessage("Your profile page is on the build list. Your account details remain available from your existing profile.");
    } else if (label === "Become a provider") {
      setMessage("Provider onboarding is coming next. We will connect this to VerifiedNG's provider registration flow.");
    } else if (label === "Local news") {
      setMessage("Local news will be connected to a trusted news source/API in a later build.");
    } else if (label === "Events") {
      setMessage("Neighbourhood events are on the build list.");
    } else if (label === "Groups") {
      setMessage("Community groups are on the build list.");
    } else if (label === "Invite neighbours") {
      setMessage("Neighbour invitations will be added when sharing links is connected.");
    } else if (label === "Saved posts") {
      setMessage("Saved posts are on the build list.");
    } else if (label === "Settings") {
      setMessage("Account, privacy, and notification settings will be added here.");
    } else if (label === "Help centre") {
      setMessage("The VerifiedNG Help Centre is on the build list.");
    } else if (label === "Safety and trust") {
      window.location.href = "https://codedguy4life.github.io/VerifiedNG/safety.html";
      return;
    }
    setCurrentView("home");
  }

  if (!token) return <main className="login-wall"><form className="login-card card" onSubmit={signIn}><div className="brand">Verified<span>NG</span></div><h1>Your community is waiting.</h1><p>Sign in with your existing VerifiedNG email or phone number.</p>{error && <div className="notice error-notice" role="alert">{error}</div>}<label className="login-label">Email or phone<input autoComplete="username" value={loginIdentifier} onChange={(event) => setLoginIdentifier(event.target.value)} required /></label><label className="login-label">Password<input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label><button className="primary-button login-submit" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in"} <ArrowRight size={16} /></button><p className="muted small">Your existing account is used. This does not create a new account or change your role.</p><a className="muted small" href="https://codedguy4life.github.io/VerifiedNG/">Back to the existing website</a></form></main>;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="https://codedguy4life.github.io/VerifiedNG/" aria-label="VerifiedNG home">Verified<span>NG</span><small> YOUR COMMUNITY</small></a>
      <div className="header-actions">
        <button className="header-icon" type="button" aria-label="Messages" onClick={() => setMessage("Your chats inbox is on the build list.")}><MessageCircle size={20} /><span className="notification-dot" /></button>
        <button className="header-icon" type="button" aria-label="Notifications" onClick={openNotifications}><Bell size={20} /></button>
        <button className="profile-button" type="button" onClick={() => setProfileDrawerOpen(true)} aria-label="Open profile menu" title="Profile and menu">
          <span className="avatar">{user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials(user?.fullName)}</span>
          <span className="profile-name">{user?.fullName || "Your account"}</span>
          <ChevronDown size={15} />
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
    {currentView === "notifications" ? (
      <main className="notifications-page">
        <header className="notifications-header">
          <button className="back-button" type="button" onClick={() => setCurrentView("home")}><ArrowLeft size={18} /> Back</button>
          <div><h1>Notifications</h1><p>Updates from your neighbourhood and your activity.</p></div>
          <button className="header-icon notification-settings" type="button" aria-label="Notification settings" onClick={() => openProfileItem("Settings")}><Settings size={19} /></button>
        </header>
        <div className="notification-filters" role="tablist" aria-label="Filter notifications">
          {[
            { id: "all", label: "All", icon: Bell },
            { id: "neighbourhood", label: "Neighbourhood", icon: MapPin },
            { id: "activity", label: "My activity", icon: Activity },
            { id: "alerts", label: "Alerts", icon: ShieldAlert },
          ].map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={notificationFilter === id} className={notificationFilter === id ? "notification-filter active" : "notification-filter"} onClick={() => setNotificationFilter(id)}><Icon size={16} /><span>{label}</span></button>)}
        </div>
        <section className="notification-empty card" aria-live="polite">
          <div className="notification-empty-icon">{notificationFilter === "alerts" ? <ShieldAlert size={30} /> : notificationFilter === "activity" ? <Activity size={30} /> : notificationFilter === "neighbourhood" ? <MapPin size={30} /> : <BellRing size={30} />}</div>
          <h2>{notificationFilter === "alerts" ? "No community alerts" : notificationFilter === "activity" ? "No activity yet" : notificationFilter === "neighbourhood" ? "No neighbourhood updates" : "You're all caught up"}</h2>
          <p>{notificationFilter === "alerts" ? "Important safety notices and community alerts will appear here." : notificationFilter === "activity" ? "Reaches, comments, and updates about your posts will show up here." : notificationFilter === "neighbourhood" ? "News and updates from your local area will appear here." : "When something new happens in your community, you'll see it here."}</p>
        </section>
      </main>
    ) : (
    <main className="home-layout">
      <section className="feed-column">
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
        <div className="posts-list">{posts.map((post) => <PostCard key={post._id} post={post} currentUser={user} onReach={reactToPost} onComment={addComment} onEdit={editPost} onDelete={deletePost} onReport={reportPost} />)}</div>
        {hasMore && <button className="load-more" type="button" disabled={loading} onClick={() => loadFeed({ append: true, requestedPage: page + 1 })}>{loading ? "Loading…" : "Load more posts"}</button>}
        {loading && posts.length > 0 && <p className="muted small centered">Refreshing feed…</p>}
      </section>
      <aside className="home-side">
        <section className="side-card community-tip"><div className="side-card-icon"><ShieldCheck size={20} /></div><h2>A community built on trust</h2><p>Share useful information, treat neighbours with respect, and report suspicious posts.</p><a href="https://codedguy4life.github.io/VerifiedNG/safety.html">Read our safety tips <ArrowRight size={14} /></a></section>
        <section className="side-card"><span className="eyebrow">A GOOD PLACE TO START</span><h2>What can you share?</h2><ul><li>Ask your neighbours for advice</li><li>Recommend a trusted provider</li><li>Share local news or opportunities</li><li>Help someone find what they need</li></ul></section>
      </aside>
    </main>
    )}
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeTab === id ? "bottom-tab active" : "bottom-tab"} aria-current={activeTab === id ? "page" : undefined} onClick={() => chooseTab(id)}><Icon size={21} strokeWidth={activeTab === id ? 2.4 : 1.8} /><span>{label}</span></button>)}
    </nav>

    {profileDrawerOpen && (
      <div className="profile-drawer-layer">
        <button className="drawer-scrim" type="button" aria-label="Close profile menu" onClick={() => setProfileDrawerOpen(false)} />
        <aside className="profile-drawer" aria-label="Profile menu">
          <div className="drawer-topline"><span className="drawer-eyebrow">YOUR ACCOUNT</span><button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setProfileDrawerOpen(false)}><X size={19} /></button></div>
          <div className="drawer-profile">
            <div className="drawer-avatar avatar">{user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials(user?.fullName)}</div>
            <h2>{user?.fullName || "VerifiedNG member"}</h2>
            <p>{initials(user?.fullName) || "V"} · VerifiedNG member</p>
            <span className="drawer-location"><MapPin size={14} /> {area || "Add your neighbourhood"}</span>
          </div>
          <div className="drawer-primary-links">
            <button type="button" onClick={() => openProfileItem("Become a provider")}><UserCog size={18} /><span>Become a provider</span><ArrowRight size={15} /></button>
            <button type="button" onClick={() => openProfileItem("My profile")}><UserRound size={18} /><span>My profile</span><ArrowRight size={15} /></button>
          </div>
          <div className="drawer-link-list">
            <span className="drawer-section-label">YOUR COMMUNITY</span>
            <button type="button" onClick={() => openProfileItem("Local news")}><Newspaper size={18} /><span>Local news</span></button>
            <button type="button" onClick={() => openProfileItem("Events")}><CalendarDays size={18} /><span>Events</span></button>
            <button type="button" onClick={() => openProfileItem("Groups")}><Users size={18} /><span>Groups</span></button>
            <button type="button" onClick={() => openProfileItem("Saved posts")}><Bookmark size={18} /><span>Saved posts</span></button>
            <button type="button" onClick={openNotifications}><Bell size={18} /><span>Notifications</span></button>
          </div>
          <div className="drawer-bottom-links">
            <button type="button" onClick={() => openProfileItem("Invite neighbours")}><UserPlus size={17} /><span>Invite neighbours</span></button>
            <button type="button" onClick={() => openProfileItem("Settings")}><Settings size={17} /><span>Settings</span></button>
            <button type="button" onClick={() => openProfileItem("Help centre")}><CircleHelp size={17} /><span>Help centre</span></button>
            <button type="button" onClick={() => openProfileItem("Safety and trust")}><ShieldCheck size={17} /><span>Safety and trust</span></button>
            <button type="button" onClick={signOut}><LogOut size={17} /><span>Sign out</span></button>
          </div>
        </aside>
      </div>
    )}
  </div>;
}

function initials(name = "V") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}
