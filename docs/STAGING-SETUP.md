# VerifiedNG — Staging setup (do this before feature previews)

**Status (27 November 2026):** The staging MongoDB Atlas project, free cluster,
database-specific application user, GitHub `staging` branch, and free Render
staging backend **have been created and successfully connected**.

- Atlas project: `VerifiedNG Staging` (separate from the live `VerifiedNG` project)
- Cluster: `VerifiedNGStaging` (free, AWS EU_WEST_1)
- Staging database: `verifiedng_staging` (scoped `readWrite` application user)
- GitHub backend branch: `staging`
- Render service: https://verifiedng-staging-api.onrender.com (free, Frankfurt)
- Render logs: `MongoDB connected` and `Your service is live`
- **Pending:** Vercel Preview `VITE_API_BASE_URL` setting, preview login
  verification, and GitHub `main` branch ruleset.

The database credentials and JWT secret were configured directly as private
Render environment variables. Never put them in GitHub or chat messages.

## Stage 1 — isolated MongoDB database (completed)

1. In MongoDB Atlas create a **separate staging cluster/project** if practical.
   At minimum, create an independent database, e.g. `verifiedng_staging`,
   on an existing cluster. A separate cluster offers better isolation.
2. Create a **separate database user** whose access is limited to
   `readWrite` on the staging database only. Do not reuse the production
   database user or MongoDB URI.
3. Use dummy accounts and fake content only. Never import real user
   records into staging.
4. Store the connection string privately in the Render staging service.
   Do not paste it into GitHub, Vercel or the frontend.

Production and staging must not share the database, JWT secret, provider invite
code, admin reviewer IDs, transactional email credentials, or media-storage
secrets. Using different database names with one superuser is not strong isolation.

## Stage 2 — GitHub staging branch (completed)

The long-lived `staging` branch has already been created from the latest
`main` at the time of provisioning (including PR #16). Keep `staging` in
sync with `main` after PR #12 merges, without changing production's tracked
`main` branch.

Suggested backend feature cycle:

1. Develop in `feat/short-description`.
2. Open a PR **from the feature branch into staging** and run CI.
3. After approval, merge into `staging`. Render staging deploys this build.
4. Test the feature using a Vercel PR Preview pointing to the staging API.
5. Open a separate PR **from the feature branch into main** (or sync from
   staging if changes are controlled) and release only after confirmation.
6. Keep staging in sync with production when releases finish. Avoid merging
   other untested features from staging into production unintentionally.

For frontend-only PRs, you can test against a staging API matching the
current production backend without the extra backend promotion step.

## Stage 3 — separate Render backend (completed)

The separate **free** staging web service is already created and running.
Its build uses `npm ci` and its start command uses `npm start`. Never replace
or edit the production `VerifiedNG-Backend` environment with staging secrets.

Original staging configuration checklist:

| Setting | Staging value |
|---|---|
| Repo | `codedguy4life/VerifiedNG` |
| Branch | `staging` |
| Root | repository root |
| Build command | `npm ci` |
| Start command | `npm start` |
| Service name | `verifiedng-staging-api` (example only) |
| Health endpoint | `/api/health` |
| MongoDB URI | private staging URI only |
| JWT_SECRET | new independent random secret |
| FRONTEND_URL | exact Vercel preview origin(s), when known |
| RESET_FRONTEND_URL | staging frontend origin |
| VERIFICATION_ADMIN_USER_IDS | empty until you make a staging-only admin |

Keep production service configuration unchanged:
`https://dashboard.render.com/web/srv-d70mpbn5gffc73e0l690`.

Do not enable real email sending, real third-party payments, or production
Cloudinary credentials on staging. Use test accounts and separate credentials.
The Node backend already accepts explicitly configured origins listed in
`FRONTEND_URL` (comma-separated) for CORS. The initial preview origin
`https://verified-ng-git-chore-safe-pr-preview-workflow-codedguy4life.vercel.app`
was configured in staging Render. When you create a new feature preview,
add its *exact HTTPS origin* to staging `FRONTEND_URL` if needed; do not
open production CORS to arbitrary Vercel subdomains.

**Network security note:** Atlas staging currently allows `0.0.0.0/0`
because the free Render service uses dynamic outbound network addresses.
This is limited to a separate staging Atlas project with an independent,
database-scoped credential; it is not a reason to use production data there.
Tighten the Atlas access list if/when fixed egress IPs become available.


**Important:** the sample hostname in this guide is not a created or verified
service. Copy the actual Render staging URL from your Render dashboard.

## Stage 4 — connect Vercel Preview (action needed)

In the existing VerifiedNG Vercel project:

1. Check Git integration points to `codedguy4life/VerifiedNG`, root
   directory is `frontend`, and **Production Branch is main**.
2. Under **Environment Variables**, enable **access to System Environment Variables** so `VERCEL_ENV` is available during builds. This helps identify Vercel's environment; the runtime API guard also blocks normal `*.vercel.app` preview URLs if staging is not configured.
3. Add an environment variable:
   - Name: `VITE_API_BASE_URL`
   - Environment: **Preview only**, not Production
   - Value: `https://verifiedng-staging-api.onrender.com`
   - Do not add a trailing slash, and do NOT set this in Production.
4. Redeploy the affected Preview after saving the setting.
5. Open the preview URL created for a PR from the Vercel dashboard or PR checks.
6. Open browser DevTools → Network. Verify `/api/...` requests go to
   the STAGING Render service and never the production URL.
7. Create a dummy account, submit a provider application, and confirm the
   new records exist **only** in the staging MongoDB database.
8. Refresh a non-home tab and test mobile layout, browser Back/Forward,
   logout, login and role restrictions.

Without the Preview API variable, the frontend Vercel preview build will
**still build**, but sign-in and other API actions will show an explanatory
blocked-preview error instead of silently using production. Do not bypass this safety check by adding the live Render URL.

Vercel can produce preview URLs independently of the suspended
`verifiedng.site` registration.

## Stage 5 — protect main and confirm release workflow

Follow [DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md) to create a GitHub
ruleset that requires Pull Requests and passing
`React production build` and `Backend syntax and integration tests` checks.

Before any merge, review:
- Which frontend Preview and backend build were tested?
- Were the staging DB and production DB isolated?
- Did tests pass, including the auth / verification boundary tests?
- Did the owner approve the merge?
- Can the release be reverted without losing member data?

## Known limitations / next steps

- The Atlas staging cluster and Render staging backend are already provisioned.
  Vercel's Preview environment variable still needs to be configured by the
  project owner in the Vercel dashboard before preview login can be tested.
- CI tests already use an isolated temporary MongoDB instance in GitHub Actions.
- The Vercel runtime preview guard checks the known production Render hostname and
  requires HTTPS, but cannot prove that a *different* hostname has a separate
  database. Verify Render's staging MongoDB configuration manually.
- GitHub branch protection needs an owner action in repository Settings.
- Do not enable Render PR service previews copied from production environment
  variables without first overriding all database and secrets to staging.

## Enable photo/video uploads on staging

The React uploader asks `POST /api/uploads/sign` for signed Cloudinary authorization. This endpoint deliberately refuses uploads if the staging backend lacks the Cloudinary settings.

1. Create a **separate staging Cloudinary product environment** (do not store test images in the production media library).
2. Create a **signed** upload preset, e.g. `verifiedng_staging`, for the supported image and video types with safe upload limits.
3. In Render → `verifiedng-staging-api` → Environment, add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_UPLOAD_PRESET` from that staging Cloudinary environment. Keep the API secret only in Render, never Vercel or source code.
4. Save/redeploy staging Render and test one dummy JPG and a short MP4 from the PR preview. Verify that media reaches the staging Cloudinary library.

Without these credentials, staging text-only posts work and media uploads remain intentionally disabled. Production Cloudinary settings are unchanged.
