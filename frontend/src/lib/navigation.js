// A URL is the durable source of navigation state. React state alone vanishes
// on refresh, and private views remain protected by their backend APIs.
const VIEWS = new Set([
  "home", "search", "providers", "sale", "faves", "local-news",
  "provider-profile", "hire-requests", "provider-apply", "groups",
  "verification", "events", "saved-posts", "invite", "settings",
  "help", "notifications", "admin",
]);
const IDS = /^[a-f0-9]{24}$/i;
const SEARCH_TABS = new Set(["all", "providers", "community"]);
const NOTIFICATION_FILTERS = new Set(["all", "neighbourhood", "activity", "alerts"]);
const PROVIDER_SOURCES = new Set(["home", "search", "providers", "sale", "faves", "hire-requests"]);

export function readAppLocation(location) {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(location.search);
  let view = path === "/admin" ? "admin" :
    path === "/become-a-provider" || params.get("next") === "provider"
      ? "provider-apply" : params.get("view") || "home";
  if (!VIEWS.has(view)) view = "home";

  const providerId = IDS.test(params.get("provider") || "") ? params.get("provider") : null;
  if (view === "provider-profile" && !providerId) view = "providers";

  const providerReturnView = PROVIDER_SOURCES.has(params.get("from"))
    ? params.get("from") : "providers";
  const groupId = view === "groups" && IDS.test(params.get("group") || "")
    ? params.get("group") : null;
  const listingId = view === "sale" && IDS.test(params.get("listing") || "")
    ? params.get("listing") : null;
  const recommendedItem = groupId ? { type: "groups", _id: groupId } :
    listingId ? { type: "sale", _id: listingId } : null;
  const searchTab = view === "search" && SEARCH_TABS.has(params.get("tab"))
    ? params.get("tab") : "all";
  const notificationFilter = view === "notifications" && NOTIFICATION_FILTERS.has(params.get("filter"))
    ? params.get("filter") : "all";

  return {
    view,
    activeTab: ["home", "search", "providers", "sale", "faves"].includes(view) ? view
      : view === "provider-profile" ? "providers" : "home",
    providerId,
    providerReturnView,
    recommendedItem,
    inbox: view === "sale" && params.get("inbox") === "1",
    scope: view === "home" && params.get("feed") === "nearby" ? "nearby" : "for-you",
    searchTab,
    notificationFilter,
  };
}

export function appUrlFor({
  view = "home", providerId = null, providerReturnView = "providers",
  recommendedItem = null, inbox = false, scope = "for-you",
  searchTab = "all", notificationFilter = "all",
} = {}) {
  if (view === "admin") return "/admin";
  if (!VIEWS.has(view)) view = "home";
  if (view === "provider-profile" && !IDS.test(providerId || "")) view = "providers";

  const params = new URLSearchParams();
  if (view !== "home") params.set("view", view);
  if (view === "home" && scope === "nearby") params.set("feed", "nearby");
  if (view === "search" && SEARCH_TABS.has(searchTab) && searchTab !== "all")
    params.set("tab", searchTab);
  if (view === "notifications" && NOTIFICATION_FILTERS.has(notificationFilter) && notificationFilter !== "all")
    params.set("filter", notificationFilter);
  if (view === "provider-profile") {
    params.set("provider", providerId);
    if (PROVIDER_SOURCES.has(providerReturnView) && providerReturnView !== "providers")
      params.set("from", providerReturnView);
  }
  if (view === "sale") {
    if (recommendedItem?.type === "sale" && IDS.test(recommendedItem._id || ""))
      params.set("listing", recommendedItem._id);
    if (inbox) params.set("inbox", "1");
  }
  if (view === "groups" && recommendedItem?.type === "groups" && IDS.test(recommendedItem._id || ""))
    params.set("group", recommendedItem._id);

  const query = params.toString();
  return "/app" + (query ? "?" + query : "");
}
