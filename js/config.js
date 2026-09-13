const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_URL = isLocal
  ? window.location.origin
  : "https://verifiedng-backend.onrender.com";
