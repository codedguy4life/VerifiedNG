# VerifiedNG — Safe development workflow (beginner guide)

This is our default workflow for VerifiedNG. **Never change `main` directly.**

## Where code goes

| Place | Branch / service | Purpose |
|---|---|---|
| Working code | feature branch, e.g. `feat/provider-dashboard` | Build one feature safely |
| Pull Request | `feat/provider-dashboard` → `main` | Code review and automatic tests |
| Vercel Preview | unique URL generated for PR | Test user interface on staging |
| Staging API + database | separate Render service + MongoDB database | Test actions on fake data |
| Production | `main` → Vercel + VerifiedNG-Backend Render | Live members |

**Critical:** A Vercel preview URL is a different frontend, but it is not
isolated unless it uses an isolated API. Our Preview build now requires an
explicit `VITE_API_BASE_URL` HTTPS origin other than the known production API.
Still verify the staging API uses a separate database before using it.

## One-time GitHub setup: protect main

Repository: https://github.com/codedguy4life/VerifiedNG

1. Open **Settings → Rules → Rulesets** and choose **New branch ruleset**.
2. Name it **Protect VerifiedNG main**, set enforcement to **Active**, and target **main** only.
3. Turn on **Require a pull request before merging**. As a solo developer,
   start with zero required *external* approvals; require your own explicit
   sign-off before any merge. Set reviewer approval requirements when teammates join.
4. Enable **Require status checks to pass** and choose the two exact check names:
   - `React production build`
   - `Backend syntax and integration tests`
5. Prevent branch deletion and force pushes. Do not add routine bypass permissions.
6. Save the ruleset and verify it is active.

GitHub rulesets are managed in the GitHub Settings UI. A file in the
repository does NOT activate protection automatically.

## Everyday PowerShell workflow

### Step A — create a branch

Open PowerShell in your VerifiedNG folder:

~~~powershell
git status
git switch main
git pull origin main
git switch -c feat/provider-dashboard
~~~

`git status` shows uncommitted work. Do not discard existing edits when
switching branches; commit or stash unfinished work safely first.

### Step B — edit and test

Build your feature in VS Code. For frontend code:

~~~powershell
cd frontend
npm ci
npm run test:theme
npm run test:branding
npm run test:navigation
npm run test:preview
npm run build
cd ..
~~~

Backend tests require a **separate MongoDB test database**. Never run
destructive automated tests against real users. GitHub Actions already
runs backend integration tests against an isolated CI database.

### Step C — push a branch and open a PR

~~~powershell
git add .
git commit -m "feat: improve provider dashboard"
git push -u origin feat/provider-dashboard
~~~

Go to https://github.com/codedguy4life/VerifiedNG/pulls and create
a PR with **Base: main** and **Compare: feat/provider-dashboard**.

Use **Draft** while unfinished. Follow the PR checklist; explain what
you changed. Every later push updates the same PR automatically.

### Step D — review and merge

1. Both GitHub Actions checks pass.
2. The preview/staging feature works, including login and data actions.
3. No production data or secrets were used during testing.
4. The project owner explicitly approves the PR.
5. **Squash and merge**. Verify Vercel/Render production status afterward.

After merge:

~~~powershell
git switch main
git pull origin main
git branch -d feat/provider-dashboard
~~~

The final command deletes only the completed local branch.

## Vercel and Render

Vercel Production = **main**. Production API:
`https://verifiedng-backend.onrender.com`.

Vercel Preview = PR branches. After creating the **separate staging
backend**, configure `VITE_API_BASE_URL` for **Preview only** under
Vercel → Project → Settings → Environment Variables. Use the exact
HTTPS origin of your **staging** Render backend, with no trailing slash.

**Do not copy the production Render URL into Preview.** The build
will reject that known production URL and missing Preview configuration.
Blocked previews indicate staging is not configured yet.

For backend PR changes, deploy those changes to an isolated staging
backend before testing them; a frontend PR pointed at an older staging
backend cannot test new backend routes.

Read [STAGING-SETUP.md](STAGING-SETUP.md) for the staged rollout steps.

## Important safety rules

- Never place `.env`, tokens, API keys, real user data, identity documents,
  MongoDB URIs, or private customer data in commits or PR comments.
- Never point `MONGO_TEST_URI` at production.
- Never approve production deployments just because the frontend looks good.
  Test protected backend behaviour first.
- Fix urgent bugs in a `fix/...` branch and make a reviewed PR.
- While Radix reviews the domain suspension, use separate preview URLs.
  Do not change production DNS as a workaround for registry suspension.
