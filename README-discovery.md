# VerifiedNG discovery, area news, map and alerts

Development branch: `feature/community-home-redesign`. The original `main` site stays unchanged.

## What is connected

- **Search** (bottom bar): uses `GET /api/providers?search=...` for real providers and authenticated `GET /api/community/search?q=...` for community posts. The Providers tab opens the same provider search with the provider filter selected.
- **Local news** (account/options drawer): shows an embeddable, interactive OpenStreetMap map and a collapsible news sheet. Desktop: news cards below the wide map. Mobile: panel overlays the bottom of the map and can be expanded or collapsed with its handle.
- **Alerts and Notifications**: show safety-alert community posts, local community updates, and available publisher news. The My activity tab explicitly explains that a personal events inbox is not built yet.
- **Publisher news**: authenticated `GET /api/local-news?area=Ikeja,Lagos&mode=local` and `?mode=nigeria`; backend calls GNews only after `GNEWS_API_KEY` is configured. Responses are cached for 20 minutes and per-account requests are limited. The backend does not send the key to the browser.

## Set up on Windows

1. From the VerifiedNG root, run `git status`; check your edits first, then `git pull origin feature/community-home-redesign`.
2. In the **root** `.env` (not `frontend/.env`) add `GNEWS_API_KEY=your_actual_gnews_key` if you want publisher news. Keep `.env` private. **Do not use `VITE_GNEWS_API_KEY`.**
3. Start the existing backend at the root: `npm run dev`. Ensure the normal MongoDB and JWT environment settings are already configured.
4. In a second PowerShell window, run `cd frontend` and `npm run dev`.
5. Open `http://localhost:5173/`, sign in, and test Search, Providers, Local news (from Options), and Notifications.

You can test the map, community search, community updates and safety reports **without any GNews key**. Publisher cards remain empty with an honest configuration message until a key is added.

### GNews account and limitations

Create an account at https://gnews.io/ and get an API key from the provider console. The current integration uses GNews Search and Top Headlines for Nigeria. Their Free plan is intended for development/testing, can delay news by approximately 12 hours, and is not a production real-time or guaranteed neighbourhood-level feed. For commercial/public launch, verify the provider licence, fees, country coverage, latency and quotas. Add the key to hosting service's **backend environment variables** when deploying, not to any client-side Vite environment variable.

The selected-area news search can return no headlines for small neighbourhoods; this is expected. We do not generate fictional news stories or invent incident coordinates. The current map uses approximate known Nigerian city/neighbourhood centres, and falls back to a **Nigeria overview** when a city cannot be mapped. Map data attribution and the OpenStreetMap tile usage policy must be followed; for production at scale choose an appropriate hosted map-tile provider or permitted alternative.

## Smoke test checklist

- Search `plumber` / `electrician`: results are from the backend, not mock data; tap a card to open a provider profile on the original site.
- Search `road` under Community: matching visible community posts appear.
- Toggle Search's area filter; results narrow. Local-only posts from unrelated areas must not become visible.
- Open Options > Local news, pick `Ikeja, Lagos`, confirm the map changes; open/close the lower sheet and switch News / Alerts / Community / Across Nigeria.
- Open Notifications and select All / Neighbourhood / My activity / Alerts. Safety reports are clearly labelled **unverified** and publisher articles link to their original sources.
- On mobile, verify the menu width, bold notification labels and the map-panel layout.
- Without a GNews key, news shows a configuration state instead of a fake feed.
- With a GNews key, use a local backend test and check for publisher articles. A blank local search is not necessarily a bug; try Across Nigeria.

## Automated tests

The new `tests/community-discovery.test.js` exercises privacy and the missing-key fallback. The repository's existing test suite requires `MONGO_TEST_URI` pointing to a **dedicated test database**. Do not run `npm test` against a production MongoDB database.

## Later phases

- Dynamic geocoding for all Nigerian locations and actual geocoded alert locations, with user privacy, verification and moderation controls.
- Moderated local publishers and verified official alerts, stronger sources and deduplication.
- Persisted user notifications, read/unread state and subscriptions.
- Replace external map embed with fully custom marker/cluster map and a production-suitable tile service.
- Complete conversion of the original account, marketplace and provider pages to the new React design.

## UI polish and troubleshooting

- The **Providers** bottom tab now opens a browseable directory; typing `provider` also browses all. Try service phrases such as `electrician`, `plumber` or `photographer` when data exists.
- If the connected database has no registered `role: "provider"` users, no real provider cards can appear. To check the connected backend, open `http://localhost:5000/api/providers` and inspect the `providers` array. If that endpoint shows `[]`, the backend currently has no provider accounts. Do not seed fake listings in production.
- The Local News map follows the selected area, **but the Latest and Alerts cards now default to nationwide updates**. The old This area / Across Nigeria controls are removed. Publisher news still requires the server-side GNews API key.
- The duplicate community area strip is hidden on sub-pages, Back is compact, and the mobile bottom navigation is a centred rounded floating pill with the page scrolling underneath it.
- The sidebar has a short slide-in animation and pages have subtle transition animations; reduced-motion preferences are respected.
- If an area map changes but Latest shows no publisher stories, confirm `GNEWS_API_KEY` is present in the **root** backend `.env`, restart the backend, then try the API request in the browser while signed in. GNews's free tier has a documented 12-hour delay.
- Check the latest API `/api/providers` before diagnosing missing results: blank data is different from a broken search request.

### Local smoke checks

1. Run `git status` before pulling. Do not lose local uncommitted changes.
2. Start backend `npm run dev` in the repo root and frontend `npm run dev` in `frontend/` (separate windows).
3. On `localhost:5173`, open Providers without typing and see whether actual provider records load.
4. Search `electrician`; if none show, inspect `http://localhost:5000/api/providers`.
5. Open Local news, change the map to Ikeja, and verify that Latest/Alerts remain nationwide while the map moves.
6. Check the compact Back link, sidebar animation, floating five-tab navigation and reduced vertical spacing.

## Area-first news and Cloudinary troubleshooting

- Local News now defaults to the **selected area** when one has been set on the community/map page. The map area and news coverage normally match. Without a selected area, it defaults to Across Nigeria until a location is chosen.
- Use the compact **Coverage** dropdown beside Refresh in the news sheet to switch between the current area and Across Nigeria. The Latest / Alerts tabs remain unchanged.
- Headlines matching a small neighbourhood may be unavailable in GNews. If there are no results, try the Coverage dropdown rather than assuming an API failure. The page does not invent incident locations or news reports.
- If posting an image says Cloudinary isn't configured, the message comes from `frontend/src/components/PostComposer.jsx` **before any network upload**. It means Vite cannot read `VITE_CLOUDINARY_CLOUD_NAME` or `VITE_CLOUDINARY_UPLOAD_PRESET`. This is a frontend build-time configuration issue, not a MongoDB or GNews issue.
- On Windows, run `cd frontend`, then `notepad .env.local` and add the **actual** cloud name and unsigned preset name:
  ```dotenv
  VITE_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
  VITE_CLOUDINARY_UPLOAD_PRESET=your_actual_unsigned_preset
  ```
  Replace these example placeholders with actual settings. Stop Vite using Ctrl+C and run `npm run dev` again; Vite does not automatically reload environment files during a running dev server.
- Do not put Cloudinary API secrets in the Vite frontend. For an online GitHub Pages build, frontend `VITE_*` variables must be supplied to the **build/deployment environment** and the site rebuilt; a local `.env.local` won't change a previously published build.
- Unsigned direct uploads should be constrained by Cloudinary upload preset policies and replaced with authenticated backend-issued upload signatures for public, abuse-resistant production use.

## Profile onboarding and posting fix

The community app now provides a **My profile** editor directly in the React interface (Options → My profile). You can save your full name, Nigerian state/FCT, city or neighbourhood, and bio. It uses the existing authenticated `PUT /api/user/profile` endpoint and updates the cached account and selected map/feed area after saving.

When a user tries to publish a **My neighbourhood** post without a saved state or city, the composer opens the location editor **before uploading any media**. The post draft and selected image/video stay in the composer while the editor is open. Save the state and retry **Post**. This avoids uploading a file to Cloudinary only to have the API reject the post for missing location.

The profile location is a server-side user setting, distinct from the map's temporary area selector. Choosing an area on the map does not grant access to another neighbourhood's private posts.

### Quick manual acceptance test

1. Pull `feature/community-home-redesign`, then restart the backend and frontend.
2. Sign in with a test account missing state/city. Start a local post and attach an image.
3. Click Post: the location editor should appear without uploading the file.
4. Choose your state (e.g. Lagos), enter a city (e.g. Ikeja), save; confirm the post draft and attachment remain.
5. Click Post again; the media should upload, and the post should publish to the selected local area.
6. Open Options → My profile, edit your location, save and refresh; changes should persist.
7. Check that an unrelated user's local-only post cannot be commented on, reacted to or reported using a guessed post ID.

A GitHub Actions workflow in `.github/workflows/quality.yml` now attempts a frontend production build and backend integration tests against an isolated MongoDB service on branch pushes and pull requests. A committed workflow is **not proof that CI has passed**; check the Actions tab for results. No full browser/production end-to-end test has been executed in this environment.

## Remaining launch blockers

The app is **not yet a finished production platform**. Notably, the React For Sale and Local Faves tabs still have placeholder behaviour, Events and Groups are placeholders, the messages inbox is a placeholder, notifications lack a persisted personal activity feed, the provider onboarding workflow is gated and needs admin operations, and unsigned Cloudinary uploads need stronger production controls. These require separate implementation and validation, plus real account and deployment testing. Never represent placeholders as complete features.

## For Sale — first functional marketplace version

The floating **For Sale** tab now opens `frontend/src/components/ForSalePage.jsx` instead of the previous placeholder.

- Compact `Search all listings` field, expandable category/subcategory filters, Free toggle, distance selection in kilometres/miles, and Most relevant/Newest/Price/Nearest sorting.
- Two responsive product cards per row with real images (when provided), naira price, brief description, posting time and saved city/state; approximate distance appears only with seller opt-in coordinates and buyer location consent.
- **Sell** opens a listing form and stores items via authenticated MongoDB endpoints. Seller must save a city or state in My profile first. Photos use the same existing Cloudinary unsigned upload configuration as community posts; without a configured preset, listings can still be created without photos.
- Only actual active listings are displayed: no fabricated seed products. Sellers can open their own item and mark it sold. An empty list means no matching active listings were returned.

API: `GET /api/sales/categories`, `GET /api/sales`, `POST /api/sales`, `PATCH /api/sales/:id/status`. The list endpoint accepts `search`, `category`, `subcategory`, `free=true`, `sort=relevant|newest|price_low|price_high|nearest`, `page`, `limit`, and optional `lat`, `lng`, `distanceKm` (up to 250 km). Distance queries use a MongoDB geospatial index, require browser location consent, and return only items with seller-supplied approximate coordinates. Geolocation is rounded to 2 decimals **before saving**; precise buyer location is used only to perform the request and is not stored on their profile.

**Important limitations:** Buyer/seller chat and payments are not built; no payment is requested by this feature. There are no production seller-verification or marketplace moderation/admin tools yet. Approximate coordinates can expose an approximate listing area, so sellers should not share their exact home address or location without considering privacy. Add `CLOUDINARY_CLOUD_NAME` to the server environment in production to restrict marketplace listing photo URLs to the intended Cloudinary account; the browser Cloudinary settings remain in `frontend/.env.local`.

### Test this feature
1. Pull the feature branch and restart backend and Vite frontend.
2. Open For Sale; verify that the list is empty until real products have been created.
3. Click Sell. Fill item name, category, price (0 means Free), and your description. Save location in My profile if prompted.
4. Publish and confirm it appears as a compact card in the two-column grid. Add a photo if Cloudinary is configured.
5. Search for the item, choose Free or a category, and compare sorting options. Click a card to see its details.
6. For distance filtering, sellers must explicitly add approximate item location, and buyers must allow browser location. Without either, distance is unavailable rather than invented.
7. Test marking your own item sold, and confirm it disappears from active listings.
8. With `MONGO_TEST_URI` pointed to a **dedicated, disposable test database**, run `npm test` and `cd frontend && npm run build` separately. Do not point automated tests at your main application database.

The backend JS syntax has been checked, but the full Vite build and database tests still need to run and pass in your environment/CI.

## Search, Ask Your Area, groups and manual verification

The Search tab now prioritizes its search box instead of a large intro or Explore grid. Under the box, **Ask [your saved city]** offers a conversational-style card, example prompts and **Choose for me**. The backend endpoint `POST /api/discovery/ask` matches the question against real registered providers, active For Sale items and group names. A dinner question searches dining-related service categories in the user's saved city/state; an empty result is reported honestly. **This is a database-backed recommendation/search assistant, not a generative AI model**. It does not invent restaurants or external businesses, and it is not connected to a live restaurant reservation provider. The compact trending chips come from `GET /api/discovery/trending` (top registered provider and sale listing categories); when there is no activity, they are clearly labelled suggested searches. Search results deep-link to a provider profile, a marketplace item or group details.

The Providers tab is kept as a compact provider directory with its search and real results visible immediately; the duplicate introductory hero and large Explore grid were removed. Search also has small links to News, Groups and For Sale.

### Groups

Routes: `GET/POST /api/groups`, `GET /api/groups/:id`, `POST /api/groups/:id/join`, `POST /api/groups/:id/leave`, `GET/POST /api/groups/:id/posts`, and member-only post actions for comments, reactions, edits, deletes and reports.

Signed-in users may browse the group directory and read basic group descriptions. A green verification banner explains the requirement. **Joining a group, creating a group, and accessing or posting in its discussion require a server-confirmed verified account.** Group posts can only be read by verified members who have joined; guessing a group/post ID does not grant access. Group discussions reuse the homepage PostCard design (including comments, reaches, editing/deleting your own posts and reports). Group creation sets the signed-in author as creator and first member.

**Privacy/trust note:** These are members-only groups, not end-to-end encrypted private conversations. The platform database administrators could access stored posts. Group content is text-only in this stage; no group photo/video uploads, group admin moderation dashboard, bans or invitations are implemented yet.

### Verification

The in-app **Get verified** page shows status, a manual review request form and (for authorized administrators) a pending-review queue. Users cannot set `isVerified` through profile editing or approve themselves. Requests do not contain ID documents or passwords. An account must first save a state or city. A pending request cannot be repeatedly resubmitted; rejected requests may be resubmitted after 24 hours.

**You must configure `VERIFICATION_ADMIN_USER_IDS` in the backend's own `.env` / Render environment**, as a comma-separated list of MongoDB User _id values belonging to authorized VerifiedNG administrators. Example:

```env
VERIFICATION_ADMIN_USER_IDS=64f000000000000000000000
```

Replace the example with an actual existing administrator's MongoDB user _id and keep this setting on the backend only. To find that ID as the database owner, open **MongoDB Atlas → Browse Collections → your VerifiedNG database → users**, find the intended admin account, and copy its document's **_id** value. Do not use the email address here. Restart the backend after changing this setting. The server compares the signed-in user's immutable database _id to the allowlist on every admin request. Admins can open **Get verified** to review/approve/reject requests. Verified badges and group access are enabled **only after an admin approves** the request. This is a manual account review, not an independently verified national-ID check, a licence check or a guarantee of safety. Build stronger evidence collection, anti-fraud checks, moderation, revocation and audit tooling before claiming high-assurance identity verification.

### Suggested checks

1. Pull the feature branch, restart the backend and Vite frontend. Visit Search and verify the Ask card and compact trending layout, then Providers and confirm real provider results appear immediately.
2. Ask "a nice dinner place". If no registered dining providers exist in your saved area, the response should state this instead of showing invented places.
3. Open Groups while unverified. Check the banner, group directory and group preview; trying to join/create should go to Get verified or receive HTTP 403.
4. Submit a verification request. An allowlisted admin should review the pending request in their verification page. Never approve a user without following your own review process.
5. After approval, open Groups, create a group, join and publish a post. Confirm the post appears in the homepage-style card and that another unjoined user cannot access it via the API.
6. Run `npm test` against your dedicated `MONGO_TEST_URI` test database and `cd frontend && npm run build`. Check the GitHub Actions tab. Backend JS syntax has been checked in this conversation, but complete integration/browser testing still must pass; do not deploy without it.
