import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const built = path => readFileSync(new URL("../dist" + path, import.meta.url), "utf8");

test("classic homepage and both signup pages are served as real static HTML", () => {
  const home = built("/index.html");
  assert.match(home, /How VerifiedNG Works/);
  assert.match(home, /\/classic\/styles\/homepage\.css/);
  assert.match(home, /href="\/login"/);
  assert.match(home, /href="\/signup"/);
  assert.match(home, /id="root"><main>/);
  assert.doesNotMatch(home, /src="js\/config\.js"/);
  const customer = built("/signup/index.html");
  assert.match(customer, /Create Your Account/);
  assert.match(customer, /id="firstName"/);
  assert.match(customer, /id="lastName"/);
  assert.match(customer, /id="addressInput"/);
  assert.match(customer, /<div id="root"><\/div>/);
  const provider = built("/become-a-provider/index.html");
  for (const field of ["categoryInput", "bioInput", "experienceInput", "voucherName", "voucherPhone", "referenceConsent", "providerPass2"]) {
    assert.ok(provider.includes('id="' + field + '"'), "Missing " + field);
  }
  assert.doesNotMatch(provider, /id="idUpload"/);
  assert.doesNotMatch(provider, /id="galleryUpload"/);
  assert.doesNotMatch(provider, /id="profilePhoto"/);
  assert.match(provider, /manual|approval is not automatic|application status/i);
});

test("classic scripts parse and do not attempt public provider role grants", () => {
  for (const file of ["config.js", "homepage.js", "signup-customer.js", "signup-provider.js"]) {
    assert.doesNotThrow(() => new vm.Script(source("public/classic/js/" + file)), "Script failed: " + file);
  }
  const provider = source("public/classic/js/signup-provider.js");
  assert.match(provider, /\/api\/auth\/register/);
  assert.match(provider, /\/api\/provider-applications/);
  assert.doesNotMatch(provider, /\/api\/auth\/register-provider/);
  const config = source("public/classic/js/config.js");
  assert.match(config, /preview && \(!explicit \|\| selected/);
  assert.match(config, /productionApi/);
});

test("classic marketing page links use current app routes", () => {
  const home = source("public/classic/index.html");
  assert.doesNotMatch(home, /href="(?:login|signup-customer|signup-provider|search)\.html"/);
  assert.match(home, /\/app\?view=search/);
});
