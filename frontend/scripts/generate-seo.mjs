import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SITE_URL, SITE_NAME, LOGO_URL, ROUTES, PRIVATE_ROUTES, pageUrl, getStructuredData } from "../seo/routes.mjs";

// Render public HTML at build time so search engines and link previews can
// read accurate text and metadata even without running React.
const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = path.join(rootDir, "dist");
const baseHtml = await readFile(path.join(distDir, "index.html"), "utf8");

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
function headFor(pathname, info) {
  const title = escapeHtml(info.title);
  const description = escapeHtml(info.description);
  const isPublic = Boolean(info.index);
  const robots = isPublic ? "index,follow,max-image-preview:large" : "noindex,follow";
  let tags = '<meta name="robots" content="' + robots + '" />\n';
  if (isPublic) {
    const canonical = escapeHtml(pageUrl(pathname));
    tags += '<link rel="canonical" href="' + canonical + '" />\n';
    tags += '<meta property="og:type" content="website" />\n';
    tags += '<meta property="og:locale" content="en_NG" />\n';
    tags += '<meta property="og:site_name" content="' + SITE_NAME + '" />\n';
    tags += '<meta property="og:url" content="' + canonical + '" />\n';
    tags += '<meta property="og:title" content="' + title + '" />\n';
    tags += '<meta property="og:description" content="' + description + '" />\n';
    tags += '<meta property="og:image" content="' + LOGO_URL + '" />\n';
    tags += '<meta property="og:image:alt" content="VerifiedNG official logo" />\n';
    tags += '<meta name="twitter:card" content="summary" />\n';
    tags += '<meta name="twitter:title" content="' + title + '" />\n';
    tags += '<meta name="twitter:description" content="' + description + '" />\n';
    tags += '<meta name="twitter:image" content="' + LOGO_URL + '" />\n';
    tags += '<script type="application/ld+json">' + safeJson({
      "@context": "https://schema.org",
      "@graph": getStructuredData(pathname)
    }) + '</script>\n';
  }
  return tags;
}
function buildHtml(pathname, info, body = "") {
  if (!baseHtml.includes('<div id="root"></div>')) {
    throw new Error("Cannot locate React root in built index.html");
  }
  return baseHtml
    .replace(/<html\s+lang="[^"]*"/, '<html lang="en-NG"')
    .replace(/<title>[^<]*<\/title>/i, "<title>" + escapeHtml(info.title) + "</title>")
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, '<meta name="description" content="' + escapeHtml(info.description) + '" />')
    .replace("</head>", headFor(pathname, info) + "</head>")
    .replace('<div id="root"></div>', '<div id="root">' + body + '</div>');
}
async function saveRoute(pathname, html) {
  const folder = pathname === "/" ? distDir : path.join(distDir, pathname.slice(1));
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "index.html"), html, "utf8");
}
const server = await createServer({
  root: rootDir,
  configFile: path.join(rootDir, "vite.config.js"),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});
try {
  const { default: PublicSite } = await server.ssrLoadModule("/src/components/PublicSite.jsx");
  for (const [pathname, info] of Object.entries(ROUTES)) {
    const body = renderToString(React.createElement(PublicSite, {
      page: info.page, loggedIn: false, theme: "light"
    }));
    const html = buildHtml(pathname, info, body);
    await saveRoute(pathname, html);
    process.stdout.write("SEO rendered " + pathname + " (" + body.length + " characters)\n");
  }
  for (const [pathname, label] of Object.entries(PRIVATE_ROUTES)) {
    const html = buildHtml(pathname, {
      title: label + " | VerifiedNG",
      description: "Use your VerifiedNG account to access the community.",
      index: false
    });
    await saveRoute(pathname, html);
  }
  const publicUrls = Object.entries(ROUTES).filter(([, info]) => info.index)
    .map(([pathname]) => "  <url><loc>" + escapeHtml(pageUrl(pathname)) + "</loc></url>")
    .join("\n");
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    publicUrls + '\n</urlset>\n';
  await writeFile(path.join(distDir, "sitemap.xml"), sitemap, "utf8");
  process.stdout.write("SEO sitemap has " + Object.values(ROUTES).filter((route) => route.index).length + " indexable URLs\n");
} finally {
  await server.close();
}
