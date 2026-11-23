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
  ClipboardList,
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
import { readAppLocation, appUrlFor } from "./lib/navigation.js";
import { applyTheme, normalizeTheme, readThemePreference, resolveTheme, saveThemePreference, systemPrefersDark, THEME_STORAGE_KEY } from "./lib/theme.js";
import ThemePicker from "./components/ThemePicker.jsx";
import ThemeToggleButton from "./components/ThemeToggleButton.jsx";
import AuthGate from "./components/AuthGate.jsx";
import PublicSite from "./components/PublicSite.jsx";
import BrandLogo from "./components/BrandLogo.jsx";
import ProviderApplyPage from "./components/ProviderApplyPage.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import "./components/public-site.css";
import PostComposer from "./components/PostComposer.jsx";
import ProfileEditor from "./components/ProfileEditor.jsx";
import ForSalePage from "./components/ForSalePage.jsx";
import GroupsPage from "./components/GroupsPage.jsx";
import VerificationPage from "./components/VerificationPage.jsx";
import PostCard from "./components/PostCard.jsx";
import SearchPage from "./components/SearchPage.jsx";
import LocalNewsPage from "./components/LocalNewsPage.jsx";
import LocalFavesPage from "./components/LocalFavesPage.jsx";
import ProviderProfile from "./components/ProviderProfile.jsx";
import HireRequestsPage from "./components/HireRequestsPage.jsx";
import CommunityNotifications from "./components/CommunityNotifications.jsx";

const scopes = [
  { id: "for-you", label: "All posts", icon: Compass },
  { id: "nearby", label: "By area", icon: MapPin },
];

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "providers", label: "Providers", icon: Users },
  { id: "sale", label: "For Sale", icon: ShoppingBag },
  { id: "faves", label: "Local Faves", icon: Heart },
];

// Solid active icons: Lucide is an outline icon set; filling its paths directly
// can make the line-art unreadable. These shapes are intentionally drawn solid.
function FilledNavIcon({ name }) {
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true" focusable="false">
    {name === "home" && <path d="M11.3 2.7a1 1 0 0 1 1.4 0l9 8.7a1 1 0 0 1-1.4 1.4l-1.3-1.3V20a2 2 0 0 1-2 2h-3v-6h-4v6H7a2 2 0 0 1-2-2v-8.5l-1.3 1.3a1 1 0 0 1-1.4-1.4z"/>}
    {name === "search" && <path fillRule="evenodd" clipRule="evenodd" d="M10.5 2a8.5 8.5 0 1 0 5.2 15.2l4.1 4.1a1.5 1.5 0 1 0 2.1-2.1l-4.1-4.1A8.5 8.5 0 0 0 10.5 2Zm0 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/>}
    {name === "providers" && <><circle cx="9" cy="7" r="3.7"/><path d="M1.5 20a7.5 7.5 0 0 1 15 0v1h-15z"/><circle cx="18" cy="8.5" r="2.8"/><path d="M17.5 14a6 6 0 0 1 5 6v1h-4.1v-1a9.6 9.6 0 0 0-.9-6z"/></>}
    {name === "sale" && <><path d="M5 7h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><path d="M7 8V6a5 5 0 0 1 10 0v2h-2V6a3 3 0 0 0-6 0v2z"/></>}
    {name === "faves" && <path d="M12 21.2 3.2 12.5C-1 8.3 5.4.8 10.5 5.2L12 6.6l1.5-1.4c5.1-4.4 11.5 3.1 7.3 7.3z"/>}
  </svg>;
}

const initialNavigation = readAppLocation(window.location);

export default function App() {
  const [theme, setTheme] = useState(readThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(readThemePreference(), systemPrefersDark()));
  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
    const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const updateSystemTheme = () => {
      if (theme === "system") setResolvedTheme(applyTheme("system"));
    };
    const syncOtherTabs = (event) => {
      if (event.key === THEME_STORAGE_KEY) setTheme(readThemePreference());
    };
    media?.addEventListener?.("change", updateSystemTheme);
    window.addEventListener("storage", syncOtherTabs);
    return () => {
      media?.removeEventListener?.("change", updateSystemTheme);
      window.removeEventListener("storage", syncOtherTabs);
    };
  }, [theme]);
  function changeTheme(choice) {
    const next = normalizeTheme(choice);
    saveThemePreference(next);
    setResolvedTheme(applyTheme(next));
    setTheme(next);
  }
  const [token, setToken] = useState(getToken());
  const [adminAccess, setAdminAccess] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [scope, setScope] = useState(initialNavigation.scope);
  const [activeTab, setActiveTab] = useState(initialNavigation.activeTab);
  const [currentView, setCurrentView] = useState(initialNavigation.view);
  const [notificationFilter, setNotificationFilter] = useState(initialNavigation.notificationFilter);
  const [searchTab, setSearchTab] = useState(initialNavigation.searchTab);
  const [recommendedItem, setRecommendedItem] = useState(initialNavigation.recommendedItem);
  const [selectedProviderId, setSelectedProviderId] = useState(initialNavigation.providerId);
  const [providerReturnView, setProviderReturnView] = useState(initialNavigation.providerReturnView);
  const [saleInboxRequested, setSaleInboxRequested] = useState(initialNavigation.inbox);
  const [unreadSaleCount, setUnreadSaleCount] = useState(0);
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
  const [resetMode, setResetMode] = useState(() => new URLSearchParams(window.location.search).has("reset_token"));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Restore pages when people use Back/Forward instead of leaving React's
  // temporary state stuck on a different tab.
  useEffect(() => {
    const restore = () => {
      const route = readAppLocation(window.location);
      setCurrentView(route.view);
      setActiveTab(route.activeTab);
      setSelectedProviderId(route.providerId);
      setProviderReturnView(route.providerReturnView);
      setRecommendedItem(route.recommendedItem);
      setSaleInboxRequested(route.inbox);
      setScope(route.scope);
      setSearchTab(route.searchTab);
      setNotificationFilter(route.notificationFilter);
      setProfileDrawerOpen(false);
      setMessage("");
      setError("");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  // A refresh reads the URL, while ordinary clicks write the URL. This is
  // navigation only, never an authorization check or permission grant.
  useEffect(() => {
    if (!token || resetMode) return;
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    if (["/about", "/how-it-works", "/safety", "/privacy", "/terms", "/contact"].includes(pathname)) return;
    if (currentView === "admin" && pathname === "/admin") return; // AdminDashboard manages ?section.
    const target = appUrlFor({
      view: currentView,
      providerId: selectedProviderId,
      providerReturnView,
      recommendedItem,
      inbox: saleInboxRequested,
      scope,
      searchTab,
      notificationFilter,
    });
    if (window.location.pathname + window.location.search !== target) {
      window.history.pushState(null, "", target);
    }
  }, [token, resetMode, currentView, selectedProviderId, providerReturnView,
      recommendedItem, saleInboxRequested, scope, searchTab, notificationFilter]);

  const refreshUnreadSale = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) { setUnreadSaleCount(0); return; }
    try {
      const result = await api("/api/sales/inquiries/unread");
      if (getToken() === currentToken) setUnreadSaleCount(Math.max(0, Number(result.unreadConversations) || 0));
    } catch {
      // Inbox availability must not prevent the Home feed from loading.
    }
  }, []);

  useEffect(() => {
    if (!token) { setUnreadSaleCount(0); return undefined; }
    refreshUnreadSale();
    const timer = window.setInterval(refreshUnreadSale, 60000);
    window.addEventListener("focus", refreshUnreadSale);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshUnreadSale);
    };
  }, [token, refreshUnreadSale]);

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
      setArea(localStorage.getItem("verifiedng-area") || "");
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

  // The menu is visible only after server confirmation. AdminDashboard checks
  // server permission again; no local state can authorize admin API calls.
  useEffect(() => {
    if (!token) { setAdminAccess(false); return undefined; }
    let active = true;
    api("/api/admin/overview")
      .then(() => { if (active) setAdminAccess(true); })
      .catch(() => { if (active) setAdminAccess(false); });
    return () => { active = false; };
  }, [token]);

  const syncUserProfile = useCallback((updated) => {
    if (!updated) return;
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  }, []);

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
      setMessage("Your post has been published for everyone on VerifiedNG.");
      if (scope === "nearby") {
        // A new public post outside the chosen area belongs in All posts.
        setScope("for-you");
      } else {
        await loadFeed();
      }
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
  async function sharePostPublicly(post) {
    if (!window.confirm("Share this neighbourhood post with everyone on VerifiedNG? Anyone on VerifiedNG will be able to view it.")) return;
    try {
      await api(`/api/community/posts/${encodeURIComponent(post._id)}`, {
        method: "PUT",
        body: JSON.stringify({ audience: "national" }),
      });
      await loadFeed({ requestedPage: 1 });
      setMessage("Your post is now visible to everyone on VerifiedNG.");
    } catch (cause) {
      setError(cause.message || "Could not make this post public.");
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
  function onAuthenticated(result) {
    localStorage.setItem("token", result.token);
    localStorage.setItem("user", JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user);
    const location = [result.user?.city, result.user?.state].filter(Boolean).join(", ");
    if (location) localStorage.setItem("verifiedng-area", location);
    else localStorage.removeItem("verifiedng-area");
    setArea(location);
    setScope("for-you");
    setUnreadSaleCount(0);
    const destination = readAppLocation(window.location);
    setCurrentView(destination.view);
    setActiveTab(destination.activeTab);
    setSelectedProviderId(destination.providerId);
    setProviderReturnView(destination.providerReturnView);
    setRecommendedItem(destination.recommendedItem);
    setSaleInboxRequested(destination.inbox);
    setScope(destination.scope);
    setSearchTab(destination.searchTab);
    setNotificationFilter(destination.notificationFilter);
    setError("");
    window.history.replaceState(null, "", appUrlFor({
      view: destination.view,
      providerId: destination.providerId,
      providerReturnView: destination.providerReturnView,
      recommendedItem: destination.recommendedItem,
      inbox: destination.inbox,
      scope: destination.scope,
      searchTab: destination.searchTab,
      notificationFilter: destination.notificationFilter,
    }));
  }
  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("verifiedng-area");
    setArea("");
    setUnreadSaleCount(0);
    setToken(null);
    setUser(null);
    setPosts([]);
    setProfileEditorOpen(false);
    setPostingBlocked(false);
    window.history.replaceState(null, "", "/");
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
  function openProvider(id) {
    setSelectedProviderId(id);
    setProviderReturnView(currentView);
    setCurrentView("provider-profile");
    setActiveTab("providers");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseTab(id) {
    setSaleInboxRequested(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveTab(id);
    setRecommendedItem(null);
    setProfileDrawerOpen(false);
    setError("");
    if (id === "search" || id === "providers" || id === "sale" || id === "faves") {
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
      "Hire requests": "hire-requests",
      Events: "events",
      Groups: "groups",
      Verification: "verification",
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
    if (label === "Admin dashboard") {
      setCurrentView("admin");
      return;
    }
    if (label === "Become a provider") {
      setCurrentView("provider-apply");
      return;
    }
    if (label === "Safety and trust") {
      window.location.href = "/safety";
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

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const publicInfo = {
    "/about": "about", "/how-it-works": "how-it-works", "/safety": "safety", "/privacy": "privacy",
    "/terms": "terms", "/contact": "contact",
  };
  if (!resetMode && publicInfo[path]) return <PublicSite page={publicInfo[path]} loggedIn={Boolean(token)} theme={theme} onThemeChange={changeTheme} />;
  if (!resetMode && !token && (path === "/" || (path === "/app" && !window.location.search))) return <PublicSite page="home" theme={theme} onThemeChange={changeTheme} />;
  if (!resetMode && !token && path === "/become-a-provider") return <PublicSite page="become-a-provider" theme={theme} onThemeChange={changeTheme} />;
  if (!token || resetMode) {
    return <AuthGate theme={theme} onThemeChange={changeTheme} onAuthenticated={onAuthenticated} onResetFinished={() => {
      window.history.replaceState(null, "", window.location.pathname);
      setResetMode(false);
      signOut();
    }}/>;
  }
  if (currentView === "admin") return <div className="app-shell"><AdminDashboard onBack={returnHome}/></div>;

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
          href="/"
          aria-label="VerifiedNG home"
        >
          <BrandLogo tagline />
        </a>
        <div className="header-actions">
          <button
            className="header-icon"
            type="button"
            aria-label={unreadSaleCount ? "Messages (" + unreadSaleCount + " unread conversations)" : "Messages"}
            onClick={() => { setSaleInboxRequested(true); setCurrentView("sale"); setActiveTab("sale"); setProfileDrawerOpen(false); refreshUnreadSale(); }}
          >
            <MessageCircle size={20} />
            {unreadSaleCount > 0 && <span className="notification-dot" aria-hidden="true" />}
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
          {["search", "sale", "faves"].includes(currentView) ? (
            <button className="back-button subtle-back section-compact-back" type="button" onClick={returnHome}><ArrowLeft size={16} /> Back</button>
          ) : (
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
                verification: "Account verification",
                events: "Neighbourhood events",
                groups: "Community groups",
                "saved-posts": "Saved posts",
                "provider-profile": "Provider profile",
                "hire-requests": "Hire requests",
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
                verification: "Request a manual review to unlock members-only features.",
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
          )}
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
            <LocalNewsPage area={area} profileArea={[user?.city, user?.state].filter(Boolean).join(", ")} onChangeArea={chooseArea} />
          )}
          {(currentView === "search" || currentView === "providers") && (
            <SearchPage
              key={currentView}
              mode={currentView}
              area={area}
              user={user}
              initialTab={currentView === "providers" ? "providers" : searchTab}
              onTabChange={setSearchTab}
              onExplore={(destination, item) => {
                if (destination === "providers") chooseTab("providers");
                else if (destination === "sale") {
                  chooseTab("sale");
                  setRecommendedItem(item || null);
                } else {
                  setRecommendedItem(item || null);
                  setCurrentView(destination);
                  setActiveTab("search");
                  setMessage("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              onOpenProvider={openProvider}
            />
          )}
          {currentView === "provider-profile" && (
            <ProviderProfile providerId={selectedProviderId} user={user} onBack={() => {
              const view = providerReturnView || "providers";
              setCurrentView(view);
              setActiveTab(["search", "providers", "faves", "sale"].includes(view) ? view : "home");
            }} onViewRequests={() => { setCurrentView("hire-requests"); setActiveTab("home"); }} />
          )}
          {currentView === "hire-requests" && (
            <HireRequestsPage user={user} onOpenProvider={openProvider} />
          )}
          {currentView === "sale" && (
            <ForSalePage
              user={user}
              initialShowInbox={saleInboxRequested}
              onUnreadChange={refreshUnreadSale}
              onInboxClose={() => setSaleInboxRequested(false)}
              onInboxChange={setSaleInboxRequested}
              initialListingId={recommendedItem?.type === "sale" ? recommendedItem._id : null}
              onSelectedListingChange={(id) => setRecommendedItem(id ? { type: "sale", _id: id } : null)}
              onEditProfile={() => {
                setPostingBlocked(false);
                setProfileEditorOpen(true);
              }}
            />
          )}
          {currentView === "faves" && (
            <LocalFavesPage area={[user?.city, user?.state].filter(Boolean).join(", ") || area} onOpenResult={(item) => {
              if (item.type === "providers") {
                openProvider(item._id);
                return;
              }
              setRecommendedItem(item);
              setCurrentView(item.type === "sale" ? "sale" : "groups");
              setActiveTab(item.type === "sale" ? "sale" : "home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}/>
          )}
          {currentView === "provider-apply" && (
            <ProviderApplyPage
              user={user}
              onBack={returnHome}
              onUpdated={syncUserProfile}
            />
          )}
          {currentView === "groups" && (
            <GroupsPage user={user} initialGroupId={recommendedItem?.type === "groups" ? recommendedItem._id : null} onSelectedGroupChange={(id) => setRecommendedItem(id ? { type: "groups", _id: id } : null)} onOpenVerification={() => { setCurrentView("verification"); setMessage(""); }} />
          )}
          {currentView === "verification" && (
            <VerificationPage
              user={user}
              onUpdated={syncUserProfile}
              onEditProfile={() => { setPostingBlocked(false); setProfileEditorOpen(true); }}
              onOpenGroups={() => setCurrentView("groups")}
            />
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
              <div className="setting-theme">
                <strong>Appearance</strong>
                <small>Choose how VerifiedNG looks on this device.</small>
                <ThemePicker theme={theme} onChange={changeTheme} />
              </div>
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
                ? "Showing posts from " + (area || [user?.city, user?.state].filter(Boolean).join(", ") || "your selected area") + ". Change the area using the location bar above."
                : "Latest public posts from across Nigeria. Choose By area only when you want posts from a specific place."}
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
                  {scope === "nearby"
                    ? "No posts found for this area. Choose another area above or switch to All posts."
                    : "No public posts yet. Create one and everyone on VerifiedNG will be able to see it."}
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
                  onSharePublic={sharePostPublicly}
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
              <a href="/safety">
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
            {activeTab === id ? <FilledNavIcon name={id} /> : <Icon size={21} strokeWidth={1.8} aria-hidden="true" />}
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
            <div className="drawer-appearance">
              <span className="drawer-section-label">APPEARANCE</span>
              <ThemeToggleButton resolvedTheme={resolvedTheme} onChange={changeTheme} />
            </div>
            <div className="drawer-primary-links">
              {adminAccess && <button type="button" onClick={() => openProfileItem("Admin dashboard")}>
                <ShieldCheck size={18}/><span>Admin dashboard</span><ArrowRight size={15}/>
              </button>}
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
              <button type="button" onClick={() => openProfileItem("Hire requests")}>
                <ClipboardList size={18}/>
                <span>Hire requests</span>
                <ArrowRight size={15}/>
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
              <button type="button" onClick={() => openProfileItem("Verification")}>
                <ShieldCheck size={17} />
                <span>Get verified</span>
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
              <div className="drawer-info-links">
                <a href="/about">About</a>
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                <a href="/contact">Contact</a>
              </div>
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
