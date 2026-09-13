const hostname = window.location.hostname;
const port = window.location.port;

const isLocalApp =
  (hostname === "localhost" || hostname === "127.0.0.1") && port === "5000";

const API_URL = isLocalApp
  ? window.location.origin
  : "https://verifiedng-backend.onrender.com";
