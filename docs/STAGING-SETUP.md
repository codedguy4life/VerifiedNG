# VerifiedNG — Staging setup (do this before feature previews)

**Status:** Documentation and build safeguards are prepared; the dedicated
staging backend, database and Vercel Preview variables must be configured
before the workflow is fully operational. This file does not create services.

## Stage 1 — create an isolated MongoDB database

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

## Stage 2 — create a GitHub staging branch

After the preview-safety PR is merged to `main`, create a long-lived
`staging` branch from the updated `main`. This is used by a separate Render
staging service. Do not change production's tracked `main` branch.

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

## Stage 3 — separate Render backend

In the Render dashboard, create a **new web service**, not an environment
change on `VerifiedNG-Backend`:

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
`FRONTEND_URL` (comma-separated) for CORS. A Vercel preview hostname must be
allowed there to make authenticated API requests from the browser.

**Important:** the sample hostname in this guide is not a created or verified
service. Copy the actual Render staging URL from your Render dashboard.

## Stage 4 — configure Vercel Preview

In the existing VerifiedNG Vercel project:

1. Check Git integration points to `codedguy4life/VerifiedNG`, root
   directory is `frontend`, and **Production Branch is main**.
2. Under **Environment Variables**, enable **access to System Environment Variables** so `VERCEL_ENV` is available during builds. The preview guard needs this setting; an additional runtime guard blocks the usual `*.vercel.app` preview URLs if it is absent.
3. Add an environment variable:
   - Name: `VITE_API_BASE_URL`
   - Environment: **Preview only**, not Production
   - Value: actual staging Render HTTPS origin, e.g.
     `https://verifiedng-staging-api.onrender.com` **only if that is your
     actual new service's URL**; no trailing slash.
4. Redeploy the affected Preview after saving the setting.
5. Open the preview URL created for a PR from the Vercel dashboard or PR checks.
6. Open browser DevTools → Network. Verify `/api/...` requests go to
   the STAGING Render service and never the production URL.
7. Create a dummy account, submit a provider application, and confirm the
   new records exist **only** in the staging MongoDB database.
8. Refresh a non-home tab and test mobile layout, browser Back/Forward,
   logout, login and role restrictions.

Without the Preview API variable, the frontend Vercel preview build will
**intentionally fail** rather than silently using production. This is a
safety feature; do not bypass it by adding the live Render URL.

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

- Preview environments and the separate staging service are not provisioned
  merely by adding these documents. They need account-level setup.
- CI tests already use an isolated temporary MongoDB instance in GitHub Actions.
- The Vercel preview guard checks the known production Render hostname and
  requires HTTPS, but cannot prove that a *different* hostname has a separate
  database. Verify Render's staging MongoDB configuration manually.
- GitHub branch protection needs an owner action in repository Settings.
- Do not enable Render PR service previews copied from production environment
  variables without first overriding all database and secrets to staging.
