import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("bell has a numeric badge and refreshes unread count", () => {
  const app = read("src/App.jsx");
  assert.match(app, /api\("\/api\/notifications\/unread-count"\)/);
  assert.match(app, /notification-number-badge/);
  assert.match(app, /unreadNotificationCount > 99 \? "99\+" : unreadNotificationCount/);
  assert.match(app, /setInterval\(refreshUnreadNotifications, 30000\)/);
});

test("the existing notifications page renders hire events in All and My activity", () => {
  const app = read("src/App.jsx");
  const box = read("src/components/CommunityNotifications.jsx");
  assert.match(app, /onOpenHireRequests=/);
  assert.match(box, /filter === "all" \|\| filter === "activity"/);
  assert.match(box, /\/api\/notifications\/hire\//);
  assert.match(box, /\/api\/notifications\/read-all/);
  assert.match(box, /New hire requests and responses from providers/);
  assert.match(box, /View hire requests/);
});

test("hire decisions refresh the unread bell count", () => {
  const requests = read("src/components/HireRequestsPage.jsx");
  const provider = read("src/components/ProviderProfile.jsx");
  assert.match(requests, /onNotificationChange\?\.\(\)/);
  assert.match(provider, /onNotificationChange\?\.\(\)/);
});
