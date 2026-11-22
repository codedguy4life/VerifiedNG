const crypto = require("node:crypto");

// Guard how often one user can request an upload signature.
// This per-process limiter suits the current one-instance deployment.
const MAX_SIGNATURES = 12;
const WINDOW_MS = 15 * 60 * 1000;
const requests = new Map();

function permitSignature(id, now) {
  for (const [key, record] of requests) {
    if (record.expiresAt <= now) requests.delete(key);
  }
  const key = String(id);
  const record = requests.get(key);
  if (!record || record.expiresAt <= now) {
    requests.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_SIGNATURES) return false;
  record.count += 1;
  return true;
}

function signUpload(req, res) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || "verifiedng_community";
  if (![cloudName, apiKey, apiSecret, preset].every((value) =>
    typeof value === "string" && value.trim().length > 0 && !value.startsWith("your_"))) {
    return res.status(503).json({
      message: "Photo and video uploads are not configured yet. Please contact VerifiedNG support.",
    });
  }
  const resourceType = req.body?.resourceType;
  if (resourceType !== "image" && resourceType !== "video") {
    return res.status(400).json({ message: "Choose an image or video file." });
  }
  if (!permitSignature(req.user.id, Date.now())) {
    return res.status(429).json({ message: "Too many upload requests. Try again later." });
  }
  // Cloudinary authenticates the exact alphabetically ordered parameters.
  // It validates this digest; the API secret stays private on Render.
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = "timestamp=" + timestamp + "&upload_preset=" + preset;
  const signature = crypto.createHash("sha1").update(stringToSign + apiSecret).digest("hex");
  return res.json({ cloudName, apiKey, timestamp, signature, uploadPreset: preset, resourceType });
}

module.exports = { signUpload };
