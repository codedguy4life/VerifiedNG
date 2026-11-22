import test from "node:test";
import assert from "node:assert/strict";
import {
  THEME_STORAGE_KEY, normalizeTheme, readThemePreference,
  resolveTheme, applyTheme, saveThemePreference,
} from "../src/lib/theme.js";

test("accepts exactly Light, Dark and System options", () => {
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("system"), "system");
  assert.equal(normalizeTheme("blue"), "system");
});
test("defaults to device theme on fresh browser", () => {
  assert.equal(readThemePreference({ getItem: () => null }), "system");
});
test("reads a stored preference and rejects invalid values", () => {
  assert.equal(readThemePreference({ getItem: () => "dark" }), "dark");
  assert.equal(readThemePreference({ getItem: () => "not-a-theme" }), "system");
});
test("survives blocked browser storage", () => {
  assert.equal(readThemePreference({ getItem: () => { throw Error("blocked"); } }), "system");
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
