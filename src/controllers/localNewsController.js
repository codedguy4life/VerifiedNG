// Publisher news is optional. Keep its API key server-side, never in VITE_*.
const CACHE_TTL_MS = 20 * 60 * 1000;
const cache = new Map();
const requests = new Map();

function permittedRequest(userId) {
  const now = Date.now();
  const state = requests.get(userId) || { count: 0, until: now + 60_000 };
  if (now > state.until) { state.count = 0; state.until = now + 60_000; }
  state.count += 1;
  requests.set(userId, state);
  if (requests.size > 5000) {
    for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  }
  return state.count <= 15;
}

function cleanArea(value) {
  return String(value || "").replace(/[^\p{L}\p{N},. '\-]/gu, "").trim().slice(0, 80);
}

function safeArticle(article) {
  if (!article || typeof article !== "object") return null;
  try {
    const url = new URL(article.url);
    if (url.protocol !== "https:") return null;
    const imageUrl = typeof article.image === "string" && /^https:\/\//.test(article.image) ? article.image : "";
    return {
      title: String(article.title || "").slice(0, 220),
      description: String(article.description || "").slice(0, 400),
      url: url.toString(),
      imageUrl,
      source: String(article.source?.name || url.hostname).slice(0, 80),
      publishedAt: article.publishedAt || null,
    };
  } catch {
    return null;
  }
}

async function getLocalNews(req, res) {
  if (!permittedRequest(String(req.user.id))) {
    return res.status(429).json({ message: "Too many requests. Try again shortly." });
  }
  const mode = req.query.mode === "nigeria" ? "nigeria" : "local";
  const area = cleanArea(req.query.area);
  if (mode === "local" && !area) {
    return res.json({ articles: [], status: "choose_area", mode, area, source: "gnews" });
  }
  if (!process.env.GNEWS_API_KEY) {
    return res.json({ articles: [], status: "not_configured", mode, area, source: "gnews" });
  }
  const key = JSON.stringify([mode, area.toLowerCase()]);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return res.json(cached.payload);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      const query = new URLSearchParams({ lang: "en", country: "ng", max: "10" });
      const endpoint = mode === "nigeria" ? "top-headlines" : "search";
      if (mode === "nigeria") query.set("category", "general");
      else {
        // GNews treats whitespace as AND: "Ikeja Lagos Nigeria" is often too restrictive.
        // Quoted OR terms discover city or state stories without claiming an exact incident location.
        const terms = area.split(",").map((part) => part.trim()).filter(Boolean).slice(0, 2);
        query.set("q", terms.map((term) => '"' + term.replace(/"/g, "") + '"').join(" OR "));
      }
      response = await fetch("https://gnews.io/api/v4/" + endpoint + "?" + query, {
        headers: { "X-Api-Key": process.env.GNEWS_API_KEY },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("GNews request failed: " + response.status);
    const body = await response.json();
    const articles = Array.isArray(body.articles) ? body.articles.map(safeArticle).filter(Boolean) : [];
    const payload = {
      articles,
      status: "ok",
      mode,
      area,
      source: "gnews",
      fetchedAt: new Date().toISOString(),
      // GNews free-plan news may be delayed; never label this a breaking-news alert.
      note: mode === "local" && area.includes(",")
        ? "Headlines can mention either the chosen city or state; not every story is from the exact neighbourhood."
        : "Publisher headlines may be delayed and are not independently verified by VerifiedNG.",
    };
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
    if (cache.size > 150) cache.delete(cache.keys().next().value);
    return res.json(payload);
  } catch (error) {
    console.error("Local news provider unavailable:", error.message);
    // Do not leak provider error details or API credentials to the browser.
    return res.status(502).json({ message: "Publisher news is temporarily unavailable. Community updates may still be available." });
  }
}

module.exports = { getLocalNews };
