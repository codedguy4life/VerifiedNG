import { useState } from "react";
import "./brand-logo.css";

/**
 * Uses the exact official image from /public/branding.
 * A square icon gets accompanying text; a wide logo stands on its own.
 * Never stretch, crop, recolour or replace the user's artwork.
 */
export default function BrandLogo({ className = "", light = false, tagline = false }) {
  const [shape, setShape] = useState("loading");
  const wide = shape === "wide";
  const failed = shape === "failed";
  return (
    <span className={[
      "vng-brand",
      wide ? "vng-brand-wide" : "vng-brand-symbol-layout",
      light ? "vng-brand-light" : "",
      className
    ].filter(Boolean).join(" ")} role="img" aria-label="VerifiedNG">
      {!failed && (
        <span className="vng-brand-art">
          <img
            src="/branding/verifiedng-logo.png"
            alt=""
            decoding="async"
            onLoad={(event) => {
              const img = event.currentTarget;
              setShape(img.naturalWidth / Math.max(1, img.naturalHeight) >= 1.8 ? "wide" : "symbol");
            }}
            onError={() => setShape("failed")}
          />
        </span>
      )}
      {!wide && (
        <span className="vng-brand-name" aria-hidden="true">Verified<span>NG</span></span>
      )}
      {tagline && !wide && <small className="vng-brand-tagline" aria-hidden="true">YOUR COMMUNITY</small>}
    </span>
  );
}
