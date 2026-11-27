import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved providers see their real role and can open their own profile", () => {
  const app = read("src/App.jsx");
  const apply = read("src/components/ProviderApplyPage.jsx");
  assert.match(app, /user\?\.role === "provider" \? "My provider profile"/);
  assert.match(app, /You’re an approved provider/);
  assert.match(app, /setSelectedProviderId\(id\)/);
  assert.match(apply, /You’re now a Provider!/);
  assert.match(apply, /View my provider profile/);
  assert.match(app, /addEventListener\("focus", refreshAccount\)/);
  assert.match(app, /addEventListener\("visibilitychange", onVisible\)/);
});

test("professional profile has real details and a secure owner-only editor", () => {
  const profile = read("src/components/ProviderProfile.jsx");
  assert.match(profile, /user\?\.role === "provider" && ownId === String\(provider\._id\)/);
  assert.match(profile, /\/api\/providers\//);
  assert.match(profile, /\/api\/user\/profile/);
  assert.match(profile, /\/api\/hire/);
  for (const text of ["About", "Skills & services", "Work experience", "Customer reviews", "Service information", "Edit my service details", "Approved provider", "Community verified"]) {
    assert.ok(profile.includes(text), "Missing profile detail: " + text);
  }
  assert.doesNotMatch(profile, /98%|4\.5\s*\/\s*5|★★★★★/);
  assert.match(profile, /No customer reviews have been recorded yet/);
});
