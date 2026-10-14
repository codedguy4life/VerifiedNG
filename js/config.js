const hostname = window.location.hostname;
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

// Any local frontend (including VS Code Live Server on port 5500) talks to the
// local backend on port 5000. Never silently send local development requests
// to production.
const API_URL = isLocalHost
  ? `http://${hostname}:5000`
  : "https://verifiedng-backend.onrender.com";

// Send successful sign-ins and sign-ups to the React community app.
// Keep the current local Vite setup and GitHub Pages subfolder working.
function goToCommunityApp() {
  if (isLocalHost) {
    window.location.href = "http://localhost:5173/";
    return;
  }

  if (hostname === "codedguy4life.github.io") {
    window.location.href = `${window.location.origin}/VerifiedNG/community/`;
    return;
  }

  // For a same-domain deployment (including a future Vercel setup).
  window.location.href = `${window.location.origin}/community/`;
}
