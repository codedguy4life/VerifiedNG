import test from "node:test";
import assert from "node:assert/strict";
import { validatePreviewApiEnvironment } from "../scripts/validate-preview-env.mjs";
import { assertSafeApiOriginForBrowser } from "../src/lib/preview-origin.js";

const preview = (url) => ({ VERCEL_ENV: "preview", VITE_API_BASE_URL: url });

test("production and local builds do not require a preview API", () => {
  assert.doesNotThrow(() => validatePreviewApiEnvironment({ VERCEL_ENV: "production" }));
  assert.doesNotThrow(() => validatePreviewApiEnvironment({}));
});

test("Vercel previews cannot silently use the production backend", () => {
  assert.throws(() => validatePreviewApiEnvironment(preview("")), /Unsafe Vercel Preview/);
  assert.throws(() => validatePreviewApiEnvironment(preview("https://verifiedng-backend.onrender.com")), /production API is blocked/);
  assert.throws(() => validatePreviewApiEnvironment(preview("https://verifiedng-backend.onrender.com/")), /production API is blocked/);
});

test("preview API URLs must be clean HTTPS origins", () => {
  for (const bad of [
    "http://verifiedng-staging-api.onrender.com",
    "https://verifiedng-staging-api.onrender.com/",
    "https://verifiedng-staging-api.onrender.com/admin",
    "https://user:password@verifiedng-staging-api.onrender.com",
    "https://verifiedng-staging-api.onrender.com/?token=secret",
    "not a url",
  ]) assert.throws(() => validatePreviewApiEnvironment(preview(bad)), /Unsafe Vercel Preview/, bad);
});

test("an explicitly configured staging API is allowed", () => {
  assert.doesNotThrow(() => validatePreviewApiEnvironment(
    preview("https://verifiedng-staging-api.onrender.com")
  ));
});

test("Vercel deployment with missing environment classification is rejected", () => {
  assert.throws(() => validatePreviewApiEnvironment({ VERCEL: "1" }), /Vercel environment not identified/);
  assert.doesNotThrow(() => validatePreviewApiEnvironment({
    VERCEL: "1", VERCEL_TARGET_ENV: "preview",
    VITE_API_BASE_URL: "https://verifiedng-staging-api.onrender.com"
  }));
});

test("runtime also blocks production API access from PR preview hostnames", () => {
  const host = "verified-ng-ten-git-feat-sample-team.vercel.app";
  assert.throws(() => assertSafeApiOriginForBrowser({ hostname: host }), /not connected to a staging backend/);
  assert.throws(() => assertSafeApiOriginForBrowser({
    hostname: host, configuredApi: "https://verifiedng-backend.onrender.com"
  }), /production API are disabled/);
  assert.doesNotThrow(() => assertSafeApiOriginForBrowser({
    hostname: host, configuredApi: "https://verifiedng-staging-api.onrender.com"
  }));
  assert.doesNotThrow(() => assertSafeApiOriginForBrowser({
    hostname: "verified-ng-ten.vercel.app", configuredApi: undefined
  }));
  assert.doesNotThrow(() => assertSafeApiOriginForBrowser({
    hostname: "verifiedng.site", configuredApi: undefined
  }));
});
