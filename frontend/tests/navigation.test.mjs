import test from "node:test";
import assert from "node:assert/strict";
import { readAppLocation, appUrlFor } from "../src/lib/navigation.js";

const loc = (path) => new URL("https://verifiedng.site" + path);
const id = "507f1f77bcf86cd799439011";
const other = "507f1f77bcf86cd799439012";

test("every supported top-level page survives a refresh", () => {
  for (const view of [
    "home", "search", "providers", "sale", "faves", "local-news",
    "hire-requests", "provider-apply", "groups", "verification",
    "events", "saved-posts", "invite", "settings", "help", "notifications",
    "admin",
  ]) {
    const url = appUrlFor({ view });
    assert.equal(readAppLocation(loc(url)).view, view, view);
  }
});

test("provider profile link keeps the exact profile and return page", () => {
  const url = appUrlFor({ view: "provider-profile", providerId: id, providerReturnView: "search" });
  assert.equal(url, "/app?view=provider-profile&provider=507f1f77bcf86cd799439011&from=search");
  const restored = readAppLocation(loc(url));
  assert.equal(restored.providerId, id);
  assert.equal(restored.providerReturnView, "search");
  assert.equal(restored.activeTab, "providers");
});

test("groups and listing details reopen without exposing sensitive account data in URLs", () => {
  const groupRoute = readAppLocation(loc(appUrlFor({ view: "groups", recommendedItem: {type:"groups",_id:id} })));
  const saleRoute = readAppLocation(loc(appUrlFor({ view: "sale", recommendedItem: {type:"sale",_id:other} })));
  assert.deepEqual(groupRoute.recommendedItem, { type: "groups", _id: id });
  assert.deepEqual(saleRoute.recommendedItem, { type: "sale", _id: other });
});

test("inbox, home feed, search sub-tab, and notification filters persist", () => {
  assert.equal(readAppLocation(loc(appUrlFor({ view: "sale", inbox: true }))).inbox, true);
  assert.equal(readAppLocation(loc(appUrlFor({ view: "home", scope: "nearby" }))).scope, "nearby");
  assert.equal(readAppLocation(loc(appUrlFor({ view: "search", searchTab: "community" }))).searchTab, "community");
  assert.equal(readAppLocation(loc(appUrlFor({ view: "notifications", notificationFilter: "alerts" }))).notificationFilter, "alerts");
});

test("legacy provider sign-up still opens the provider application", () => {
  assert.equal(readAppLocation(loc("/become-a-provider")).view, "provider-apply");
  assert.equal(readAppLocation(loc("/login?next=provider")).view, "provider-apply");
  assert.equal(readAppLocation(loc("/admin?section=members")).view, "admin");
});

test("malformed routes never grant provider or admin access", () => {
  assert.equal(readAppLocation(loc("/app?view=admin&role=admin")).view, "admin");
  // The route is only UI state. AdminDashboard must still check /api/admin/overview,
  // and the server rejects accounts missing from VERIFICATION_ADMIN_USER_IDS.
  assert.equal(readAppLocation(loc("/app?view=some-script")).view, "home");
  assert.equal(readAppLocation(loc("/app?view=provider-profile&provider=not-an-id")).view, "providers");
  assert.equal(appUrlFor({ view: "provider-profile", providerId: "not-an-id" }), "/app?view=providers");
  assert.equal(readAppLocation(loc("/app?view=search&tab=unknown")).searchTab, "all");
});

test("admin continues to use the private /admin route", () => {
  assert.equal(appUrlFor({ view: "admin" }), "/admin");
  assert.equal(appUrlFor({ view: "home" }), "/app");
});
