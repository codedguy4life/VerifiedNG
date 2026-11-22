# VerifiedNG React + Vite frontend

This is the first migration slice. It adds a separate React/Vite frontend for the Community experience while leaving the existing HTML pages and root Express backend intact.

## Run locally
From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). The app calls the existing backend at `http://localhost:5000` when running on localhost, or `https://verifiedng-backend.onrender.com` otherwise. The backend feature branch permits local Vite requests from port 5173. The app has its own sign-in form so the token is stored on the same origin as the React preview.

## Build
```powershell
npm run build
npm run preview
```

## Deploy the new main site on Cloudflare Pages

The new React app is the primary VerifiedNG frontend at `https://verifiedng.site/`. Vite's production base path is `/`, not the former GitHub Pages subdirectory.

Set up a Cloudflare Pages project connected to `codedguy4life/VerifiedNG`:

- Production branch: `main`
- Root directory: `frontend`
- Framework: React (Vite)
- Build command: `npm run build`
- Build output directory: `dist`
- Optional frontend environment variable: `VITE_API_BASE_URL=https://verifiedng-backend.onrender.com` (or the actual HTTPS backend host)

The backend must deploy the matching `main` branch and permit the frontend origin. It always permits `https://verifiedng.site` and `https://www.verifiedng.site`; configure `FRONTEND_URL` with the exact Cloudflare `*.pages.dev` hostname when testing there. Never commit `MONGO_URI`, `JWT_SECRET`, news-provider keys, or other secrets.

**Before connecting the production domain:** test login, new-account onboarding, provider hiring, group permissions, buyer-seller messaging, image uploads, and mobile layout on the temporary `pages.dev` URL. Registration and some legal/legacy links still use the old HTML website and need migration before public launch. Changes to the default GitHub branch do not, by themselves, configure Cloudflare or Render deployments.

The domain is registered through Namecheap. To use the apex domain on Cloudflare Pages, first add `verifiedng.site` to Cloudflare DNS and carefully copy any existing DNS records, especially MX/TXT records; then set Namecheap's Custom DNS nameservers to the exact pair assigned by Cloudflare. Add `verifiedng.site` as a custom domain in Cloudflare Pages after the Pages deployment succeeds.

## Migration approach
Migrate one existing experience at a time, starting with Community. Keep the existing HTML pages until their React replacements are tested. The Express/MongoDB API and root backend package remain separate and unchanged by this frontend package.
