import { assertSafeApiOriginForBrowser } from "./preview-origin.js";
// Use localhost during development, but never bundle localhost as the production API.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://verifiedng-backend.onrender.com"
    : "http://localhost:5000");

export const getToken = () => localStorage.getItem("token");

export async function api(endpoint, options = {}) {
  // Guard API calls from preview URLs even if build-time Vercel system
  // variables were not enabled. Navigation/UI is unaffected.
  assertSafeApiOriginForBrowser({
    hostname: typeof window === "undefined" ? "" : window.location.hostname,
    configuredApi: import.meta.env.VITE_API_BASE_URL,
  });
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
}
