import { api } from "./api.js";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm"]);

// Request a fresh signed authorization for each upload; never put the API secret in React.
export async function uploadMedia(file, resourceType = "image") {
  if (!file) throw new Error("Select a photo or video.");
  if (resourceType !== "image" && resourceType !== "video") throw new Error("Unsupported file type.");
  const allowed = resourceType === "image" ? allowedImageTypes : allowedVideoTypes;
  const sizeLimit = resourceType === "image" ? 8 * 1024 * 1024 : 25 * 1024 * 1024;
  if (!allowed.has(file.type)) {
    throw new Error(resourceType === "image" ? "Please choose a JPG, PNG or WebP image." : "Please choose an MP4 or WebM video.");
  }
  if (file.size > sizeLimit) {
    throw new Error(resourceType === "image" ? "Images must be 8 MB or smaller." : "Videos must be 25 MB or smaller.");
  }
  const grant = await api("/api/uploads/sign", { method: "POST", body: JSON.stringify({ resourceType }) });
  const { cloudName, apiKey, timestamp, signature, uploadPreset } = grant;
  if (!cloudName || !apiKey || !timestamp || !signature || !uploadPreset) {
    throw new Error("Unable to authorize this upload. Try again.");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("upload_preset", uploadPreset);
  body.append("signature", signature);
  const response = await fetch(
    "https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloudName) + "/" + resourceType + "/upload",
    { method: "POST", body },
  );
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.secure_url) {
    throw new Error(result?.error?.message || "Cloudinary could not upload this file. Please try again.");
  }
  const url = new URL(result.secure_url);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" ||
      !url.pathname.startsWith("/" + cloudName + "/" + resourceType + "/upload/")) {
    throw new Error("Cloudinary returned an unexpected file URL.");
  }
  return result.secure_url;
}
