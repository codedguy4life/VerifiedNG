# VerifiedNG: Search visibility checklist

Canonical domain: https://verifiedng.site
Frontend: React/Vite. Public pages are statically rendered during npm run build.

## Built into the website

- Useful, crawlable HTML on: /, /about, /how-it-works, /become-a-provider, /safety, /contact.
- Draft /privacy and /terms pages remain accessible but have noindex until legal review.
- /app, /login, /signup, /forgot-password, /reset-password use noindex metadata and HTTP headers.
- Page-specific titles, descriptions, canonical URLs, Open Graph and Twitter previews.
- Public WebSite, Organization and WebPage JSON-LD. No invented reviews, ratings or verification claims.
- Sitemap at /sitemap.xml. Robots file at /robots.txt.
- Optional /llms.txt links to official public pages. It is not required by Google.
- The official logo PNG is the current social preview; replace it with a properly designed 1200 × 630 OG card if approved. Keep the official logo artwork unchanged.

## After pushing/deployment (account-owner actions)

1. Visit these URLs in an incognito tab and check the full page, not just a loading spinner:
   - https://verifiedng.site/
   - https://verifiedng.site/how-it-works
   - https://verifiedng.site/about
   - https://verifiedng.site/become-a-provider
   - https://verifiedng.site/sitemap.xml
   - https://verifiedng.site/robots.txt
2. Run npm run build and npm run test:seo in frontend.
3. Open https://search.google.com/search-console and add a **Domain property** for verifiedng.site. Verify via the exact DNS TXT record shown to the owner by Google. Do not copy someone else's verification token into code.
4. Submit sitemap.xml in Search Console > Sitemaps. Use URL Inspection for the homepage and other public pages; test live URL and request indexing when needed.
5. Open https://www.bing.com/webmasters/ and verify verifiedng.site, then submit the same sitemap. Consider IndexNow only after a safe verification key and an authenticated update workflow exist.
6. Check deployment response source (View Page Source) on public pages: it must contain real page headings, descriptions, canonical and structured data even before JavaScript runs. Check that sign-in and private URLs have noindex.
7. Confirm https://www.verifiedng.site, https://verifiedng.site, Vercel preview and alternate hosting domains aren't producing duplicate indexed copies. Configure a single canonical host and redirects at the host/CDN level after DNS is confirmed.
8. Check search performance weekly (impressions, clicks, queries, indexed pages), and only then decide which content people actually want.
9. Obtain legal review of Privacy Policy and Terms before making them indexable or promoting a broad public launch.

## Content growth plan (separate from technical SEO)

- Publish genuinely useful Nigerian community guides and local resources with expert review and clear author/editor information.
- Examples: how to check a service provider before hiring; safe ways to buy second-hand items; what VerifiedNG verification means and does not mean.
- Add future public provider/listing pages only when server-side privacy/consent, moderation, unique content and correct indexing rules are implemented. Never expose private posts or messages to search crawlers for traffic.
- Track real Search Console data and improve low-performing pages rather than stuffing keywords or generating hundreds of thin location pages.

## Important limits

Technical SEO improves access and clarity; it cannot guarantee search ranking, ChatGPT citations, or visitors. Google does not require an llms.txt file or special schema for AI Overviews/AI Mode. The public FAQ is visible for users; don't add deprecated FAQPage rich-result markup. The generated sitemap should contain only indexable public pages.
