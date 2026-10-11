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

The Vite production base path is `/VerifiedNG/community/` so the existing homepage at `/VerifiedNG/` can stay in place. Do not deploy this build until the GitHub Pages publishing workflow is updated to publish the Vite build under that subfolder and the backend CORS origin is checked.

## Migration approach
Migrate one existing experience at a time, starting with Community. Keep the existing HTML pages until their React replacements are tested. The Express/MongoDB API and root backend package remain separate and unchanged by this frontend package.
