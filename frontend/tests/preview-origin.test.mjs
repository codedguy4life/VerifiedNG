import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeApiOriginForBrowser } from "../src/lib/preview-origin.js";

const preview = "verified-ng-git-feature-demo-codedguy4life.vercel.app";
const prod = "https://verifiedng-backend.onrender.com";

test("production, local development, and custom domains keep working", () => {
  for (const hostname of ["verified-ng-ten.vercel.app", "verifiedng.site", "localhost", "127.0.0.1"]) {
    assert.doesNotThrow(() => assertSafeApiOriginForBrowser({ hostname, configuredApi: undefined }));
  }
});
test("PR preview cannot silently reach production backend", () => {
  assert.throws(() => assertSafeApiOriginForBrowser({ hostname: preview }), /read-only until a staging backend/i);
  assert.throws(() => assertSafeApiOriginForBrowser({ hostname: preview, configuredApi: prod }), /production API are disabled/);
  assert.throws(() => assertSafeApiOriginForBrowser({ hostname: preview, configuredApi: prod + "/" }), /production API are disabled/);
});
test("preview requires an explicit HTTPS origin with no secret or path", () => {
  const bad = ["http://staging.example.test", "https://staging.example.test/", "https://staging.example.test/path", "https://user:secret@staging.example.test", "not a url"];
  for (const configuredApi of bad) assert.throws(() => assertSafeApiOriginForBrowser({ hostname: preview, configuredApi }), /invalid|disabled/i);
});
test("explicit staging API works on a preview", () => {
  assert.doesNotThrow(() => assertSafeApiOriginForBrowser({
    hostname: preview, configuredApi: "https://staging.example.test",
  }));
});
