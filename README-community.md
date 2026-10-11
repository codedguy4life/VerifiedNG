# VerifiedNG Community (MVP)

This branch adds a community feed alongside the existing service marketplace.

## What is included
- Authenticated community page at `community.html`
- Feed scopes: For you, Near me, and Across Nigeria
- Text posts with category and local/national audience
- MongoDB persistence through the existing Express/Mongoose backend
- Comments, helpful reactions, post-owner deletion, and user reports
- Server-side audience filtering using the signed-in user's profile location
- Responsive HTML/CSS/JavaScript frontend using the existing `js/config.js` API configuration

## API routes
- `GET /api/community/feed?scope=for-you&page=1&limit=10`
- `POST /api/community/posts`
- `POST /api/community/posts/:postId/comments`
- `POST /api/community/posts/:postId/reactions` (toggles the signed-in user's reaction)
- `DELETE /api/community/posts/:postId` (owner only)
- `POST /api/community/posts/:postId/reports`

All community routes require the existing JWT authentication middleware. The server derives the author and location from the signed-in account; it does not trust the browser to supply another user's ID or location.

## Local testing
1. Pull this branch locally.
2. Run `npm install` if needed.
3. Ensure your existing `.env` has the usual backend variables.
4. Run `npm test` and `npm run dev`.
5. Open `http://localhost:5000/community.html` and sign in first.

This is an initial working slice, not a replacement for production moderation. Reports are stored for review; an admin moderation queue, automated abuse controls, media uploads, and notifications are future work.
