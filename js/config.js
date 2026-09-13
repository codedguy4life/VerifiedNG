const hostname = window.location.hostname;
const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

// Any local frontend (including VS Code Live Server on port 5500) talks to the
// local backend on port 5000. Never silently send local development requests
// to production.
const API_URL = isLocalHost
  ? `http://${hostname}:5000`
  : "https://verifiedng-backend.onrender.com";
