import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { ROUTES, PRIVATE_ROUTES, SITE_URL, pageUrl } from "../seo/routes.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const built = (pathname) => read("../dist/" + (pathname === "/" ? "" : pathname.slice(1) + "/") + "index.html");

test("every real public page is prerendered with unique metadata and visible text", () => {
  const titles = new Set();
  for (const [pathname, info] of Object.entries(ROUTES)) {
    const html = built(pathname);
    assert.match(html, /<div id="root">[\s\S]*<main|<div id="root">[\s\S]*public-hero/, "Missing public HTML at " + pathname);
    assert.ok(html.includes("<title>" + info.title.replaceAll("&", "&amp;") + "</title>"), "Wrong title " + pathname);
    assert.ok(html.includes('name="description" content="' + info.description + '"'), "Missing description " + pathname);
    assert.ok(html.includes('name="robots" content="' + (info.index ? "index,follow" : "noindex,follow")), "Wrong robots instruction " + pathname);
    assert.equal(titles.has(info.title), false, "Duplicate page title");
    titles.add(info.title);
    if (info.index) {
      assert.ok(html.includes('rel="canonical" href="' + pageUrl(pathname) + '"'), "Wrong canonical " + pathname);
      assert.ok(html.includes('property="og:url" content="' + pageUrl(pathname) + '"'), "Wrong social URL " + pathname);
      assert.match(html, /<script type="application\/ld\+json">/);
      const raw = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
      assert.ok(raw, "Missing JSON-LD at " + pathname);
      const schema = JSON.parse(raw[1]);
      assert.ok(schema["@graph"].some((entry) => entry["@type"] === "WebPage"), "Missing WebPage data");
      assert.ok(!schema["@graph"].some((entry) => entry["@type"] === "FAQPage"), "Deprecated FAQPage markup");
    } else {
      assert.doesNotMatch(html, /rel="canonical"/, "Draft legal pages should not claim canonical indexing");
    }
  }
});
test("only homepage provides the main site name and organization data", () => {
  const root = built("/");
  assert.match(root, /"@type":"WebSite"/);
  assert.match(root, /"@type":"Organization"/);
  assert.match(root, /"name":"VerifiedNG"/);
  assert.match(root, /branding\/verifiedng-logo\.png/);
});
test("FAQ guide is readable without JavaScript", () => {
  const html = built("/how-it-works");
  assert.match(html, /What is VerifiedNG\?/);
  assert.match(html, /Is it free to join VerifiedNG\?/);
  assert.match(html, /provider applications/i);
});
test("private account routes do not expose public SEO metadata", () => {
  for (const pathname of Object.keys(PRIVATE_ROUTES)) {
    const html = built(pathname);
    assert.ok(html.includes('name="robots" content="noindex,follow"'));
    assert.doesNotMatch(html, /rel="canonical"/);
    assert.doesNotMatch(html, /application\/ld\+json/);
    assert.match(html, /<div id="root"><\/div>/);
  }
});
test("sitemap and robots are aligned and exclude account pages and draft terms", () => {
  const map = read("../dist/sitemap.xml");
  const robots = read("../dist/robots.txt");
  assert.ok(robots.includes("Sitemap: " + SITE_URL + "/sitemap.xml"));
  const locs = [...map.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const expected = Object.entries(ROUTES).filter(([, info]) => info.index).map(([p]) => pageUrl(p));
  assert.deepEqual(locs, expected);
  assert.ok(!locs.some((url) => /login|signup|app|privacy|terms/.test(url)), "Private or draft pages leaked into sitemap");
});
test("social meta includes the real official PNG, not an invented company profile", () => {
  const html = built("/");
  assert.match(html, /og:image.*verifiedng-logo\.png/);
  assert.match(html, /twitter:card.*summary/);
  assert.doesNotMatch(html, /aggregateRating|reviewCount|FAQPage/);
});
test("every crawlable URL is routed to its prerendered file on Vercel", () => {
  const cfg = JSON.parse(read("../vercel.json"));
  for (const pathname of Object.keys(ROUTES).filter((p) => p !== "/")) {
    assert.ok(cfg.rewrites.some((rewrite) => rewrite.source === pathname && rewrite.destination === pathname + "/index.html"));
  }
});
