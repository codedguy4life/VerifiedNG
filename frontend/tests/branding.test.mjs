import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const officialImage = new URL("../public/branding/verifiedng-logo.png", import.meta.url);

test("official PNG is present with valid image header and dimensions", () => {
  assert.ok(existsSync(officialImage), "Official branding file is missing");
  const png = readFileSync(officialImage);
  assert.deepEqual([...png.subarray(0, 8)], [137,80,78,71,13,10,26,10], "Logo must be a valid PNG");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.ok(width > 0 && height > 0, "Logo has invalid image dimensions");
  assert.ok(png.length < 3 * 1024 * 1024, "Keep the brand image below 3 MB for mobile");
});

test("brand component uses the real image and preserves its shape", () => {
  const brand = read("../src/components/BrandLogo.jsx");
  const css = read("../src/components/brand-logo.css");
  assert.match(brand, /src="\/branding\/verifiedng-logo\.png"/);
  assert.match(brand, /naturalWidth/);
  assert.match(brand, /naturalHeight/);
  assert.match(brand, /onError=/);
  assert.match(css, /object-fit:\s*contain/);
  assert.doesNotMatch(css, /object-fit:\s*cover/);
});

test("all major first-party pages use the official brand component", () => {
  for (const path of ["../src/App.jsx", "../src/components/PublicSite.jsx", "../src/components/AuthGate.jsx", "../src/components/PublicShowcase.jsx"]) {
    assert.match(read(path), /BrandLogo/, "Missing logo integration in " + path);
  }
});

test("favicon points to official branding instead of the old shield", () => {
  const html = read("../index.html");
  assert.match(html, /rel="icon" type="image\/png" href="\/branding\/verifiedng-logo\.png"/);
});
