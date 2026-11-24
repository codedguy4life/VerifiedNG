// Second line of defence: prevent a Vercel PR preview from talking to
// production even if Vercel System Environment Variables are unavailable.
// The known production Vercel alias is intentionally excluded.
const PROD_VERCEL_HOST = "verified-ng-ten.vercel.app";
const PROD_API_HOST = "verifiedng-backend.onrender.com";

export function assertSafeApiOriginForBrowser({ hostname, configuredApi }) {
  const host = String(hostname || "").toLowerCase();
  if (!host.endsWith(".vercel.app") || host === PROD_VERCEL_HOST) return;

  const value = String(configuredApi || "").trim();
  if (!value) {
    throw new Error(
      "This preview is not connected to a staging backend. " +
      "Set VITE_API_BASE_URL for Vercel Preview, not Production."
    );
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("This preview's API URL is invalid.");
  }
  if (parsed.protocol !== "https:" || parsed.hostname === PROD_API_HOST || value !== parsed.origin) {
    throw new Error("Preview requests to the production API are disabled. Use an isolated staging backend.");
  }
}
