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
