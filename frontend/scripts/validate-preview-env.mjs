// This runs during Vite's build (in Node), before any React code is shipped.
// Vercel previews must never silently fall back to the real production backend.
const PROD_API_HOSTS = new Set(["verifiedng-backend.onrender.com"]);

export function validatePreviewApiEnvironment(env) {
  const mode = env.VERCEL_ENV || env.VERCEL_TARGET_ENV;
  if (env.VERCEL === "1" && !mode) {
    throw new Error("Vercel environment not identified. Enable access to System Environment Variables in the Vercel project's Environment Variables settings.");
  }
  if (mode !== "preview") return;
  const value = String(env.VITE_API_BASE_URL || "").trim();
  if (!value) {
    throw new Error(
      "Unsafe Vercel Preview: set VITE_API_BASE_URL to the dedicated STAGING Render API " +
      "in Vercel Settings > Environment Variables > Preview before deploying this branch. " +
      "Do NOT use https://verifiedng-backend.onrender.com (production)."
    );
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Unsafe Vercel Preview: VITE_API_BASE_URL must be an absolute HTTPS origin.");
  }
  if (url.protocol !== "https:" || value !== url.origin || PROD_API_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      "Unsafe Vercel Preview: VITE_API_BASE_URL must be an HTTPS staging API origin " +
      "without a trailing slash, path, query or credentials; the production API is blocked."
    );
  }
}
