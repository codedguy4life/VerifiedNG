// Single source of truth for public search pages.
// Only pages with content that visitors can actually read are indexable.
export const SITE_URL = "https://verifiedng.site";
export const SITE_NAME = "VerifiedNG";
export const LOGO_URL = SITE_URL + "/branding/verifiedng-logo.png";
export const ROUTES = Object.freeze({
  "/": {
    page: "home",
    title: "VerifiedNG | Nigerian Communities, Local Services & Marketplace",
    description: "Join community conversations across Nigeria. Discover local service providers, explore items for sale and connect with people on VerifiedNG.",
    index: true
  },
  "/about": {
    page: "about",
    title: "About VerifiedNG | A Community Platform for Nigeria",
    description: "Learn why VerifiedNG brings community conversations, local discovery, service providers and marketplace listings together in Nigeria.",
    index: true
  },
  "/how-it-works": {
    page: "how-it-works",
    title: "How VerifiedNG Works | Questions & Answers",
    description: "Find out how to join VerifiedNG, explore community posts, discover services, buy and sell, apply as a provider and stay safer online.",
    index: true
  },
  "/become-a-provider": {
    page: "become-a-provider",
    title: "Become a Service Provider in Nigeria | VerifiedNG",
    description: "Apply to offer your services on VerifiedNG. Create a free member account, describe your work and submit an application for manual review.",
    index: true
  },
  "/safety": {
    page: "safety",
    title: "Community & Marketplace Safety Tips | VerifiedNG",
    description: "Stay safer on VerifiedNG: check provider profiles, protect your account, take care with payments and report suspicious posts or listings.",
    index: true
  },
  "/contact": {
    page: "contact",
    title: "Contact VerifiedNG | Support, Safety & Enquiries",
    description: "Contact the VerifiedNG team about your account, local community activity, provider applications, safety reports or privacy questions.",
    index: true
  },
  "/privacy": {
    page: "privacy",
    title: "Privacy Policy | VerifiedNG",
    description: "Read how VerifiedNG handles account details, messages, public posts, marketplace listings, uploaded media and privacy requests.",
    // The visible policy is explicitly marked as a legal draft.
    index: false
  },
  "/terms": {
    page: "terms",
    title: "Terms of Service | VerifiedNG",
    description: "Read the community rules, account responsibilities, provider conditions and marketplace terms for using VerifiedNG.",
    // Review the operational legal draft before allowing indexing.
    index: false
  }
});

export const PRIVATE_ROUTES = Object.freeze({
  "/app": "Your Community",
  "/login": "Sign in",
  "/signup": "Create an account",
  "/forgot-password": "Reset your password",
  "/reset-password": "Reset your password"
});

export function pageUrl(path) {
  return SITE_URL + (path === "/" ? "/" : path);
}

export function getStructuredData(path) {
  const info = ROUTES[path];
  if (!info || !info.index) return [];
  const page = {
    "@type": "WebPage",
    "@id": pageUrl(path) + "#webpage",
    "url": pageUrl(path),
    "name": info.title,
    "description": info.description,
    "inLanguage": "en-NG",
    "isPartOf": { "@id": SITE_URL + "/#website" }
  };
  if (path !== "/") return [page];
  return [
    {
      "@type": "WebSite",
      "@id": SITE_URL + "/#website",
      "url": SITE_URL + "/",
      "name": SITE_NAME,
      "inLanguage": "en-NG",
      "publisher": { "@id": SITE_URL + "/#organization" }
    },
    {
      "@type": "Organization",
      "@id": SITE_URL + "/#organization",
      "name": SITE_NAME,
      "url": SITE_URL + "/",
      "logo": { "@type": "ImageObject", "url": LOGO_URL },
      "description": "A Nigerian platform for community conversations, local discovery, service providers and marketplace listings.",
      "areaServed": { "@type": "Country", "name": "Nigeria" }
    },
    page
  ];
}
