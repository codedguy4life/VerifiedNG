// API config used by the restored signup pages. Preview deployments fail closed
// unless VITE_API_BASE_URL explicitly points at a separate staging backend.
const host = window.location.hostname;
const selected = document.querySelector('meta[name="verifiedng-api-base"]')?.content || "";
const preview = host.endsWith(".vercel.app") && host !== "verified-ng-ten.vercel.app";
const explicit = selected && selected !== "__VERIFIEDNG_API_BASE__";
const productionApi = "https://verifiedng-backend.onrender.com";
const API_URL = preview && (!explicit || selected.replace(/\\/$/, "") === productionApi) ? "" :
  explicit ? selected : ["localhost", "127.0.0.1"].includes(host) ? "http://" + host + ":5000" : productionApi;
function goToCommunityApp() { window.location.assign("/app"); }
function goToProviderSignup() { window.location.assign(localStorage.getItem("token") ? "/app?view=provider-apply" : "/become-a-provider"); }
