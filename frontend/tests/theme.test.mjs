import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  THEME_STORAGE_KEY, normalizeTheme, readThemePreference,
  resolveTheme, nextManualTheme, applyTheme, saveThemePreference,
} from "../src/lib/theme.js";

test("accepts exactly Light, Dark and System options", () => {
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("system"), "system");
  assert.equal(normalizeTheme("blue"), "light");
});
test("defaults to light on a fresh browser, but respects a saved choice", () => {
  assert.equal(readThemePreference({ getItem: () => null }), "light");
});
test("reads a stored preference and rejects invalid values", () => {
  assert.equal(readThemePreference({ getItem: () => "dark" }), "dark");
  assert.equal(readThemePreference({ getItem: () => "not-a-theme" }), "light");
});
test("survives blocked browser storage", () => {
  assert.equal(readThemePreference({ getItem: () => { throw Error("blocked"); } }), "light");
  assert.equal(saveThemePreference("dark", { setItem: () => { throw Error("blocked"); } }), "dark");
});
test("System follows OS preference while explicit choices override it", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});
test("applies resolved colours to the HTML root", () => {
  const root = { dataset: {}, style: {} };
  assert.equal(applyTheme("system", root, true), "dark");
  assert.equal(root.dataset.theme, "dark");
  assert.equal(root.style.colorScheme, "dark");
  assert.equal(applyTheme("light", root, true), "light");
  assert.equal(root.dataset.theme, "light");
  assert.equal(root.style.colorScheme, "light");
});
test("saves the preference with one shared storage key", () => {
  let saved;
  const storage = { setItem: (key, value) => { saved = [key, value]; } };
  assert.equal(saveThemePreference("dark", storage), "dark");
  assert.deepEqual(saved, [THEME_STORAGE_KEY, "dark"]);
});

test("one-click toggle switches to the opposite visible mode", () => {
  assert.equal(nextManualTheme("dark"), "light");
  assert.equal(nextManualTheme("light"), "dark");
  assert.equal(nextManualTheme(resolveTheme("system", true)), "light");
  assert.equal(nextManualTheme(resolveTheme("system", false)), "dark");
});
test("appearance switch is in the account drawer, not the top bar", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const header = app.slice(app.indexOf('<header'), app.indexOf('</header>'));
  assert.doesNotMatch(header, /ThemePicker|ThemeToggleButton/);
  assert.match(app, /className="drawer-appearance"/);
  assert.match(app, /<ThemeToggleButton resolvedTheme={resolvedTheme}/);
});
test("dark theme styles cover important screens and controls", () => {
  const css = readFileSync(new URL("../src/theme.css", import.meta.url), "utf8");
  for (const selector of [
    ".header-icon", ".profile-menu-button", ".drawer-close",
    ".marketplace-pill", ".marketplace-sort select",
    ".sale-inbox-messages p.mine", ".groups-create",
    ".provider-apply-form", ".auth-entry-card",
    ".public-site", ".public-menu-toggle"
  ]) {
    assert.ok(css.includes(selector), "Dark theme missing selector: " + selector);
  }
});
