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
  assert.ok(home.includes("window.location.href = '/login'"), "Login button must use the React login route");
  assert.ok(home.includes("window.location.href = '/signup'"), "Signup button must use the classic signup route");
  assert.match(home, /id="root"><main>/);
  assert.match(home, /class="public-showcase"/);
  assert.match(home, /public-showcase-frame/);
  assert.match(home, /Example screen/);
  assert.match(home, /Example item/);
  assert.match(home, /Community Feed/);
  assert.match(home, /id="homepageProviders"/);
  assert.match(home, /provider directory/);
  const homeScript = source("public/classic/js/homepage.js");
  assert.match(homeScript, /\/api\/providers/);
  assert.match(homeScript, /home-provider-card/);
  assert.match(homeScript, /provider-profile&provider=/);
  assert.match(homeScript, /\.textContent/);
  assert.doesNotMatch(homeScript, /\.innerHTML\s*=/);
  assert.match(home, /Local Faves/);
  for (const view of ["home","providers","sale","groups","local-news","faves","verification"]) {
    assert.ok(home.includes("/app?view=" + view), "Missing new app feature " + view);
  }
  assert.doesNotMatch(home, /<!-- PUBLIC SHOWCASE COMPONENT -->/);
  assert.doesNotMatch(home, /src="js\/config\.js"/);
  const customer = built("/signup/index.html");
  assert.match(customer, /Create Your Account/);
  assert.match(customer, /id="firstName"/);
  assert.match(customer, /id="lastName"/);
  assert.match(customer, /id="addressInput"/);
  assert.match(customer, /id="confirmPassword"/);
  assert.match(home, /\/reset-password.*window\.location\.search/);
  assert.match(customer, /<div id="root"><\/div>/);
  const provider = built("/become-a-provider/index.html");
  for (const field of ["categoryInput", "bioInput", "experienceInput", "voucherName", "voucherPhone", "referenceConsent", "providerPass2"]) {
    assert.ok(provider.includes('id="' + field + '"'), "Missing " + field);
  }
  assert.doesNotMatch(provider, /id="idUpload"/);
  assert.doesNotMatch(provider, /id="galleryUpload"/);
  assert.doesNotMatch(provider, /id="profilePhoto"/);
  assert.match(provider, /Apply to Become a Provider/);
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
  assert.match(config, /blockedPreviewApi/);
  assert.match(config, /productionApi/);
});

test("classic marketing page links use current app routes", () => {
  const home = source("public/classic/index.html");
  assert.doesNotMatch(home, /href="(?:login|signup-customer|signup-provider|search)\.html"/);
  assert.match(home, /\/app\?view=search/);
});

test("logout loads the classic homepage instead of swapping to React marketing", () => {
  const app = source("src/App.jsx");
  const signout = app.slice(app.indexOf("function signOut()"), app.indexOf("function chooseArea()"));
  assert.ok(signout.includes('window.location.replace("/")'), "Logout should navigate directly to classic home");
  assert.doesNotMatch(signout, /history\.replaceState/);
});

test("the classic homepage remains the default for anonymous visitors", () => {
  const app = source("src/App.jsx");
  assert.doesNotMatch(app, /path === "\/"\)\) return <PublicSite page="home"/);
});

test("classic screens use bundled SVG icons instead of remote font CDNs", () => {
  const pages = ["public/classic/index.html", "public/classic/signup-customer.html", "public/classic/signup-provider.html"];
  const icons = source("public/classic/js/bootstrap-icons-local.js");
  for (const path of pages) {
    const page = source(path);
    assert.ok(page.includes('src="/classic/js/bootstrap-icons-local.js"'), "Local icon script missing");
    assert.ok(!page.includes("cdn.jsdelivr.net/npm/bootstrap-icons"), "External icon CDN must not be needed");
  }
  for (const name of ["search", "shield-check", "camera", "whatsapp", "eye", "patch-check-fill"]) {
    assert.ok(icons.includes('"' + name + '":'), "Bundled icon missing: " + name);
  }
});
