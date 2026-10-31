import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  Globe2,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  UserCog,
  UserPlus,
  UserRound,
  X,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Activity,
  Menu,
} from "lucide-react";
import { api, getToken } from "./lib/api.js";
import PostComposer from "./components/PostComposer.jsx";
import ProfileEditor from "./components/ProfileEditor.jsx";
import PostCard from "./components/PostCard.jsx";
import SearchPage from "./components/SearchPage.jsx";
import LocalNewsPage from "./components/LocalNewsPage.jsx";
import CommunityNotifications from "./components/CommunityNotifications.jsx";

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
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [scope, setScope] = useState("for-you");
  const [activeTab, setActiveTab] = useState("home");
  const [currentView, setCurrentView] = useState("home");
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [postingBlocked, setPostingBlocked] = useState(false);
  const [area, setArea] = useState(
    () => localStorage.getItem("verifiedng-area") || "",
  );
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

  const loadFeed = useCallback(
    async ({ append = false, requestedPage = 1 } = {}) => {
      if (!getToken()) {
        setToken(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await api(
          `/api/community/feed?scope=${encodeURIComponent(scope)}&area=${encodeURIComponent(area)}&page=${requestedPage}&limit=10`,
        );

        setPosts((current) =>
          append ? [...current, ...(data.posts || [])] : data.posts || [],
        );
        setPage(requestedPage);
        setHasMore(Boolean(data.hasMore));
      } catch (cause) {
        setError(cause.message || "Could not load the community.");
      } finally {
        setLoading(false);
      }
    },
    [scope, area],
  );

  useEffect(() => {
    if (token) loadFeed();
  }, [loadFeed, token]);
  useEffect(() => {
    const onStorage = () => {
      setToken(getToken());
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api("/api/user/profile")
      .then((result) => {
        if (!active || !result?.user) return;
        localStorage.setItem("user", JSON.stringify(result.user));
        setUser(result.user);
      })
      .catch(() => {
        // Keep the current session and let the normal API requests report auth errors.
      });
    return () => { active = false; };
  }, [token]);

  function requestProfileLocation() {
    setPostingBlocked(true);
    setProfileEditorOpen(true);
  }

  function saveProfileChanges(updatedUser) {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    const updatedArea = [updatedUser.city, updatedUser.state].filter(Boolean).join(", ");
    if (updatedArea) {
      localStorage.setItem("verifiedng-area", updatedArea);
      setArea(updatedArea);
    }
    setProfileEditorOpen(false);
    setPostingBlocked(false);
    setMessage("Profile saved. You can now publish your local post.");
    setError("");
  }

  async function publishPost(payload) {
    setPublishing(true);
    setMessage("");
    setError("");
    try {
      await api("/api/community/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Your post has been published.");
      if (scope === "nigeria" && payload.audience === "local") {
        setMessage(
          "Post published. Switch to For you or Near me to see local posts.",
        );
      } else await loadFeed();
      return true;
    } catch (cause) {
      setError(cause.message || "Could not publish your post.");
      return false;
    } finally {
      setPublishing(false);
    }
  }

  async function reactToPost(postId) {
    try {
      await api(
        `/api/community/posts/${encodeURIComponent(postId)}/reactions`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await loadFeed({ requestedPage: page });
    } catch (cause) {
      setError(cause.message);
    }
  }
  async function addComment(postId, text) {
    try {
      await api(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      await loadFeed({ requestedPage: page });
      return true;
    } catch (cause) {
      setError(cause.message);
      return false;
    }
  }
  async function editPost(post) {
    const text = window.prompt("Edit your post", post.text);
    if (text === null || !text.trim()) return;
    try {
      await api(`/api/community/posts/${encodeURIComponent(post._id)}`, {
        method: "PUT",
        body: JSON.stringify({ text: text.trim(), category: post.category }),
      });
      await loadFeed({ requestedPage: page });
      setMessage("Post updated.");
    } catch (cause) {
      setError(cause.message);
    }
  }
  async function deletePost(postId) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await api(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });
      setPosts((current) => current.filter((post) => post._id !== postId));
      setMessage("Post deleted.");
    } catch (cause) {
      setError(cause.message);
    }
  }
  async function reportPost(postId, payload) {
    try {
      const result = await api(
        `/api/community/posts/${encodeURIComponent(postId)}/reports`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      setMessage(result.message || "Report sent for review.");
      return true;
    } catch (cause) {
      setError(cause.message);
      return false;
    }
  }
  async function signIn(event) {
    event.preventDefault();
    setLoginBusy(true);
    setError("");
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setLoginPassword("");
    } catch (cause) {
      setError(cause.message || "Could not sign in.");
    } finally {
      setLoginBusy(false);
    }
  }
  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setPosts([]);
    setProfileEditorOpen(false);
    setPostingBlocked(false);
  }
  function chooseArea() {
    const nextArea = window.prompt(
      "Which neighbourhood or area should VerifiedNG show?",
      area,
    );
    if (nextArea === null) return;
    const cleanArea = nextArea.trim();
    if (cleanArea) {
      localStorage.setItem("verifiedng-area", cleanArea);
      setArea(cleanArea);
      setPage(1);
    } else {
      localStorage.removeItem("verifiedng-area");
      setArea("");
      setPage(1);
    }
  }
  function chooseTab(id) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveTab(id);
    setProfileDrawerOpen(false);
    setError("");
    if (id === "search" || id === "providers" || id === "sale") {
      setCurrentView(id);
      setMessage("");
      return;
    }
    setCurrentView("home");
    if (id !== "home") {
      const label = tabs.find((tab) => tab.id === id)?.label || "This section";
      setMessage(
        `${label} is on the build list. The Home feed is ready while we build this section.`,
      );
    } else setMessage("");
  }

  function openNotifications() {
    setActiveTab("home");
    setCurrentView("notifications");
    setNotificationFilter("all");
    setMessage("");
    setProfileDrawerOpen(false);
  }

  function openLegacyPage(page) {
    // Legacy account pages live at the repository root, outside the Vite app.
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      window.location.href = `http://localhost:5500/${page}`;
      return;
    }
    if (window.location.hostname === "codedguy4life.github.io") {
      window.location.href = `${window.location.origin}/VerifiedNG/${page}`;
      return;
    }
    window.location.href = `${window.location.origin}/${page}`;
  }

  function openProfileItem(label) {
    setActiveTab("home");
    setProfileDrawerOpen(false);
    setMessage("");
    setError("");
    const views = {
      "Local news": "local-news",
      Events: "events",
      Groups: "groups",
      "Saved posts": "saved-posts",
      Settings: "settings",
      "Invite neighbours": "invite",
      "Help centre": "help",
    };
    if (label === "My profile") {
      setPostingBlocked(false);
      setProfileEditorOpen(true);
      return;
    }
    if (label === "Become a provider") {
      openLegacyPage("upgrade-to-provider.html");
      return;
    }
    if (label === "Safety and trust") {
      window.location.href =
        "https://codedguy4life.github.io/VerifiedNG/safety.html";
      return;
    }
    setCurrentView(views[label] || "home");
  }

  function returnHome() {
    setCurrentView("home");
    setActiveTab("home");
    setMessage("");
    setError("");
  }

  function saveInviteLink() {
    const inviteUrl = window.location.origin + window.location.pathname;
    const text = `Join me on VerifiedNG, our community for neighbours: ${inviteUrl}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() =>
          setMessage("Invite message copied. Send it to your neighbours!"),
        )
        .catch(() => window.prompt("Copy this invite message", text));
    } else {
      window.prompt("Copy this invite message", text);
    }
  }

  function updateSetting(key, value) {
    localStorage.setItem(`verifiedng-setting-${key}`, value ? "true" : "false");
    setMessage("Your setting has been saved on this device.");
  }

  if (!token)
    return (
      <main className="login-wall">
        <form className="login-card card" onSubmit={signIn}>
          <div className="brand">
            Verified<span>NG</span>
          </div>
          <h1>Your community is waiting.</h1>
          <p>Sign in with your existing VerifiedNG email or phone number.</p>
          {error && (
            <div className="notice error-notice" role="alert">
              {error}
            </div>
          )}
          <label className="login-label">
            Email or phone
            <input
              autoComplete="username"
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
              required
            />
          </label>
          <label className="login-label">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              required
            />
          </label>
          <button className="primary-button login-submit" disabled={loginBusy}>
            {loginBusy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
          </button>
          <p className="muted small">
            Your existing account is used. This does not create a new account or
            change your role.
          </p>
          <a
            className="muted small"
            href="https://codedguy4life.github.io/VerifiedNG/"
          >
            Back to the existing website
          </a>
        </form>
      </main>
    );

  return (
    <div className="app-shell">
      <header
        className={
          currentView === "notifications"
            ? "topbar notifications-topbar"
            : "topbar"
        }
      >
        <a
          className="brand"
          href="https://codedguy4life.github.io/VerifiedNG/"
          aria-label="VerifiedNG home"
        >
          Verified<span>NG</span>
          <small> YOUR COMMUNITY</small>
        </a>
        <div className="header-actions">
          <button
            className="header-icon"
            type="button"
            aria-label="Messages"
            onClick={() => setMessage("Your chats inbox is on the build list.")}
          >
            <MessageCircle size={20} />
            <span className="notification-dot" />
          </button>
          <button
            className="header-icon"
            type="button"
            aria-label="Notifications"
            onClick={openNotifications}
          >
            <Bell size={20} />
          </button>
          <button
            className="profile-menu-button"
            type="button"
            onClick={() => setProfileDrawerOpen(true)}
            aria-label="Open options menu"
            title="Options"
          >
            <Menu size={23} strokeWidth={2} />
          </button>
        </div>
      </header>
      {currentView === "home" && (
      <div
        className={
          currentView === "notifications"
            ? "location-strip notifications-location-strip"
            : "location-strip"
        }
      >
        <div className="location-details">
          <span className="location-pin">
            <MapPin size={17} />
          </span>
          <div>
            <span className="location-caption">YOUR COMMUNITY</span>
            <strong>{area || "Choose your neighbourhood"}</strong>
          </div>
          <button
            className={area ? "area-status active" : "area-status"}
            type="button"
            onClick={chooseArea}
          >
            {area ? (
              <>
                <Check size={13} /> Active here
              </>
            ) : (
              "Set location"
            )}
          </button>
        </div>
        <button className="change-area" type="button" onClick={chooseArea}>
          {area ? "Change" : "Choose area"} <ChevronDown size={14} />
        </button>
      </div>
      )}
      {currentView !== "home" && currentView !== "notifications" ? (
        <main key={currentView} className={currentView === "local-news" ? "section-page section-page-map" : "section-page"}>
          <header className="section-page-header">
            <button className="back-button subtle-back" type="button" onClick={returnHome}>
              <ArrowLeft size={16} /> Back
            </button>
            <h1>
              {{
                "local-news": "Local news & alerts",
                search: "Explore VerifiedNG",
                providers: "Find service providers",
                sale: "For Sale",
                events: "Neighbourhood events",
                groups: "Community groups",
                "saved-posts": "Saved posts",
                invite: "Invite neighbours",
                settings: "Settings",
                help: "Help centre",
              }[currentView] || "Your community"}
            </h1>
            <p>
              {{
                "local-news":
                  "Explore your area map, publisher news, community updates and safety reports.",
                search: "Search your community, discover trending services and explore what is happening nearby.",
                providers: "Browse service professionals, explore skills and find someone to help.",
                sale: "Discover items offered by neighbours.",
                events:
                  "Find and share things happening around your neighbourhood.",
                groups: "Connect with neighbours who share your interests.",
                "saved-posts": "Keep useful community posts close at hand.",
                invite: "Help your neighbours discover VerifiedNG.",
                settings: "Manage your community preferences on this device.",
                help: "Get help using your VerifiedNG community.",
              }[currentView] || ""}
            </p>
          </header>
          {message && (
            <div className="notice success-notice" role="status">
              {message}
              <button
                type="button"
                className="notice-close"
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {currentView === "local-news" && (
            <LocalNewsPage area={area} onChangeArea={chooseArea} />
          )}
          {(currentView === "search" || currentView === "providers") && (
            <SearchPage
              key={currentView}
              mode={currentView}
              area={area}
              initialTab={currentView === "providers" ? "providers" : "all"}
              onExplore={(destination) => {
                if (destination === "providers") chooseTab("providers");
                else if (destination === "sale") chooseTab("sale");
                else {
                  setCurrentView(destination);
                  setActiveTab("search");
                  setMessage("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              onOpenProvider={(providerId) =>
                openLegacyPage("all-providers-profile.html?id=db_" + encodeURIComponent(providerId))
              }
            />
          )}
          {currentView === "sale" && (
            <section className="section-card">
              <div className="section-icon"><ShoppingBag size={24} /></div>
              <h2>Neighbourhood marketplace</h2>
              <p>Buy and sell listings are not connected to the VerifiedNG backend yet. This section will show real local listings when marketplace features are ready.</p>
              <button className="primary-button" type="button" onClick={() => chooseTab("search")}>Explore community search <Search size={16} /></button>
            </section>
          )}
          {currentView === "events" && (
            <section className="section-card">
              <div className="section-icon">
                <CalendarDays size={24} />
              </div>
              <h2>What's happening nearby?</h2>
              <p>
                This space is ready for neighbourhood meetups, workshops,
                markets, and community activities. Event creation and listings
                need to be connected to the backend next.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  setMessage(
                    "Event listings are the next step for this section.",
                  )
                }
              >
                Plan an event <CalendarDays size={16} />
              </button>
            </section>
          )}
          {currentView === "groups" && (
            <section className="section-card">
              <div className="section-icon">
                <Users size={24} />
              </div>
              <h2>Find your people</h2>
              <p>
                Groups will help neighbours gather around interests like estate
                updates, parents, sports, learning, and local business. Group
                creation and membership are not connected yet.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  setMessage(
                    "Group creation and membership are queued for the next build.",
                  )
                }
              >
                Create a group <Users size={16} />
              </button>
            </section>
          )}
          {currentView === "saved-posts" && (
            <section className="section-card">
              <div className="section-icon">
                <Bookmark size={24} />
              </div>
              <h2>Your saved posts</h2>
              <p>
                Save useful posts to find them later. The saved-post storage and
                bookmark action still need to be connected, so nothing is being
                saved yet.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={returnHome}
              >
                Browse the feed <ArrowRight size={16} />
              </button>
            </section>
          )}
          {currentView === "invite" && (
            <section className="section-card">
              <div className="section-icon">
                <UserPlus size={24} />
              </div>
              <h2>Good communities grow together</h2>
              <p>Invite people who live around you to join the conversation.</p>
              <div className="invite-preview">
                Join me on VerifiedNG, our community for neighbours.
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={saveInviteLink}
              >
                <UserPlus size={16} /> Copy invite message
              </button>
            </section>
          )}

          {currentView === "settings" && (
            <section className="section-card settings-card">
              <div className="section-icon">
                <Settings size={24} />
              </div>
              <h2>Your preferences</h2>
              <p>These preferences are saved in this browser on this device.</p>
              <label className="setting-row">
                <span>
                  <strong>Community notifications</strong>
                  <small>
                    Show community activity notifications when available.
                  </small>
                </span>
                <input
                  type="checkbox"
                  defaultChecked={
                    localStorage.getItem("verifiedng-setting-notifications") !==
                    "false"
                  }
                  onChange={(event) =>
                    updateSetting("notifications", event.target.checked)
                  }
                />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Neighbourhood feed</strong>
                  <small>Prefer posts relevant to your selected area.</small>
                </span>
                <input
                  type="checkbox"
                  defaultChecked={
                    localStorage.getItem("verifiedng-setting-local-feed") !==
                    "false"
                  }
                  onChange={(event) =>
                    updateSetting("local-feed", event.target.checked)
                  }
                />
              </label>
              <button
                className="secondary-button"
                type="button"
                onClick={chooseArea}
              >
                <MapPin size={16} /> Change neighbourhood
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setProfileDrawerOpen(false);
                  signOut();
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </section>
          )}

          {currentView === "help" && (
            <section className="section-card">
              <div className="section-icon">
                <CircleHelp size={24} />
              </div>
              <h2>How can we help?</h2>
              <p>
                Use the menu to open your profile, apply to become a provider,
                manage preferences, and explore your community.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={returnHome}
              >
                Return to community <ArrowRight size={16} />
              </button>
            </section>
          )}
        </main>
      ) : currentView === "notifications" ? (
        <main key="notifications" className="notifications-page">
          <header className="notifications-header">
            <button
              className="back-button subtle-back"
              type="button"
              onClick={returnHome}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <div>
              <h1>Notifications</h1>
              <p>Updates from your neighbourhood and your activity.</p>
            </div>
            <button
              className="header-icon notification-settings"
              type="button"
              aria-label="Notification settings"
              onClick={() => openProfileItem("Settings")}
            >
              <Settings size={19} />
            </button>
          </header>
          <div
            className="notification-filters"
            role="tablist"
            aria-label="Filter notifications"
          >
            {[
              { id: "all", label: "All", icon: Bell },
              { id: "neighbourhood", label: "Neighbourhood", icon: MapPin },
              { id: "activity", label: "My activity", icon: Activity },
              { id: "alerts", label: "Alerts", icon: ShieldAlert },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={notificationFilter === id}
                className={
                  notificationFilter === id
                    ? "notification-filter active"
                    : "notification-filter"
                }
                onClick={() => setNotificationFilter(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <CommunityNotifications
            area={area}
            filter={notificationFilter}
            onOpenLocalNews={() => setCurrentView("local-news")}
          />
        </main>
      ) : (
        <main key="home" className="home-layout">
          <section className="feed-column">
            <div
              className="scope-tabs"
              role="tablist"
              aria-label="Choose your feed"
            >
              {scopes.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === id}
                  className={scope === id ? "scope-tab active" : "scope-tab"}
                  key={id}
                  onClick={() => setScope(id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <PostComposer
              user={user}
              onPublish={publishPost}
              onRequireLocation={requestProfileLocation}
              busy={publishing}
            />
            {message && (
              <div className="notice success-notice" role="status">
                {message}
                <button
                  type="button"
                  className="notice-close"
                  aria-label="Dismiss message"
                  onClick={() => setMessage("")}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {error && (
              <div className="notice error-notice" role="alert">
                {error}
                <button type="button" onClick={() => setError("")}>
                  Dismiss
                </button>
              </div>
            )}
            <div className="feed-caption">
              {scope === "nearby"
                ? "Posts from your area and nearby conversations"
                : scope === "nigeria"
                  ? "Conversations shared across Nigeria"
                  : "Conversations from your community"}
            </div>
            {loading && !posts.length && (
              <div className="empty-state card">Loading your community…</div>
            )}
            {!loading && error && !posts.length && (
              <div className="empty-state card">
                We couldn't load the feed. Check your connection and try again.
              </div>
            )}
            {!loading && !error && !posts.length && (
              <div className="empty-state card">
                <div className="empty-icon">
                  <Users size={22} />
                </div>
                <h3>Your community starts here.</h3>
                <p>
                  Ask a question, share something useful or help a neighbour
                  find what they need.
                </p>
              </div>
            )}
            <div className="posts-list">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  currentUser={user}
                  onReach={reactToPost}
                  onComment={addComment}
                  onEdit={editPost}
                  onDelete={deletePost}
                  onReport={reportPost}
                />
              ))}
            </div>
            {hasMore && (
              <button
                className="load-more"
                type="button"
                disabled={loading}
                onClick={() =>
                  loadFeed({ append: true, requestedPage: page + 1 })
                }
              >
                {loading ? "Loading…" : "Load more posts"}
              </button>
            )}
            {loading && posts.length > 0 && (
              <p className="muted small centered">Refreshing feed…</p>
            )}
          </section>
          <aside className="home-side">
            <section className="side-card community-tip">
              <div className="side-card-icon">
                <ShieldCheck size={20} />
              </div>
              <h2>A community built on trust</h2>
              <p>
                Share useful information, treat neighbours with respect, and
                report suspicious posts.
              </p>
              <a href="https://codedguy4life.github.io/VerifiedNG/safety.html">
                Read our safety tips <ArrowRight size={14} />
              </a>
            </section>
            <section className="side-card">
              <span className="eyebrow">A GOOD PLACE TO START</span>
              <h2>What can you share?</h2>
              <ul>
                <li>Ask your neighbours for advice</li>
                <li>Recommend a trusted provider</li>
                <li>Share local news or opportunities</li>
                <li>Help someone find what they need</li>
              </ul>
            </section>
          </aside>
        </main>
      )}
      <nav className="bottom-nav" aria-label="Main navigation">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={activeTab === id ? "bottom-tab active" : "bottom-tab"}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => chooseTab(id)}
          >
            <Icon size={21} strokeWidth={activeTab === id ? 2.4 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {profileEditorOpen && (
        <ProfileEditor
          user={user}
          postingBlocked={postingBlocked}
          onClose={() => {
            setProfileEditorOpen(false);
            setPostingBlocked(false);
          }}
          onSaved={saveProfileChanges}
        />
      )}
      {profileDrawerOpen && (
        <div className="profile-drawer-layer">
          <button
            className="drawer-scrim"
            type="button"
            aria-label="Close profile menu"
            onClick={() => setProfileDrawerOpen(false)}
          />
          <aside className="profile-drawer" aria-label="Profile menu">
            <div className="drawer-topline">
              <span className="drawer-eyebrow">YOUR ACCOUNT</span>
              <button
                className="drawer-close"
                type="button"
                aria-label="Close menu"
                onClick={() => setProfileDrawerOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
            <div className="drawer-profile">
              <div className="drawer-avatar avatar">
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt="" />
                ) : (
                  initials(user?.fullName)
                )}
              </div>
              <h2>{user?.fullName || "VerifiedNG member"}</h2>
              <p>{initials(user?.fullName) || "V"} · VerifiedNG member</p>
              <span className="drawer-location">
                <MapPin size={14} /> {area || "Add your neighbourhood"}
              </span>
            </div>
            <div className="drawer-primary-links">
              <button
                type="button"
                onClick={() => openProfileItem("Become a provider")}
              >
                <UserCog size={18} />
                <span>Become a provider</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => openProfileItem("My profile")}
              >
                <UserRound size={18} />
                <span>My profile</span>
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="drawer-link-list">
              <span className="drawer-section-label">YOUR COMMUNITY</span>
              <button
                type="button"
                onClick={() => openProfileItem("Local news")}
              >
                <Newspaper size={18} />
                <span>Local news &amp; alerts</span>
              </button>
              <button type="button" onClick={() => openProfileItem("Events")}>
                <CalendarDays size={18} />
                <span>Events</span>
              </button>
              <button type="button" onClick={() => openProfileItem("Groups")}>
                <Users size={18} />
                <span>Groups</span>
              </button>
              <button
                type="button"
                onClick={() => openProfileItem("Saved posts")}
              >
                <Bookmark size={18} />
                <span>Saved posts</span>
              </button>
              <button type="button" onClick={openNotifications}>
                <Bell size={18} />
                <span>Notifications</span>
              </button>
            </div>
            <div className="drawer-bottom-links">
              <button
                type="button"
                onClick={() => openProfileItem("Invite neighbours")}
              >
                <UserPlus size={17} />
                <span>Invite neighbours</span>
              </button>
              <button type="button" onClick={() => openProfileItem("Settings")}>
                <Settings size={17} />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => openProfileItem("Help centre")}
              >
                <CircleHelp size={17} />
                <span>Help centre</span>
              </button>
              <button
                type="button"
                onClick={() => openProfileItem("Safety and trust")}
              >
                <ShieldCheck size={17} />
                <span>Safety and trust</span>
              </button>
              <button type="button" onClick={signOut}>
                <LogOut size={17} />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function initials(name = "V") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}
