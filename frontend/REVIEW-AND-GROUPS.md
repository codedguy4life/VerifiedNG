# VerifiedNG — Provider approval, verification, and Groups

This document describes the implemented workflow. Both provider approval and community verification use **manual** decisions from a server-authorised reviewer. No browser-side role switch can approve an applicant.

## 1. How a provider applies

1. A person creates a regular VerifiedNG member account.
2. In the app, open **Become a provider** (or visit /become-a-provider while signed in).
3. Enter service category, city/state, experience, at least 50 characters describing the work, relevant skills and the accuracy confirmation.
4. The application becomes **Pending**. It does **not** grant provider access, a verified badge or public service-provider visibility.
5. The reviewer sees it in **Become a provider → Team review desk**. Only accounts configured as reviewers on the backend can access the queue.
6. The reviewer checks the details independently and enters a written review reason (10–500 characters) before selecting Approve or Decline.
7. **Approve** promotes the account to the `provider` role and copies approved professional details to the user's profile. The applicant should appear in provider searches, with no automatic community-verification badge.
8. **Decline** leaves the account as a regular member. The reason is visible in the application page. The member may reapply 24 hours after the review.
9. The member sees the decision and its note when opening the application page. It refreshes their saved user profile automatically so a freshly approved provider does not need to sign out. If the Resend backend email settings are configured, they may also receive an email; email delivery is optional and does not determine the approval result.
10. Reviewers can see the last 30 decisions and their notes in the same Team review desk.

**Important:** Approval is an administrative review of submitted information, not a promise of certification, identity authentication, customer safety or service quality. Do not claim that a provider's identity or qualification was validated unless you actually performed the required checks.

## 2. Authorise your reviewer account in Render (one-time)

Until `VERIFICATION_ADMIN_USER_IDS` is configured, no one can open either reviewer queue. This fail-closed behaviour is intentional.

1. Sign into **your own** VerifiedNG account in your browser.
2. Get your MongoDB account ID. For example, from the browser's DevTools Console while on VerifiedNG, run:

   ```js
   const u = JSON.parse(localStorage.getItem("user") || "null");
   console.log(u?._id || u?.id);
   ```

   Alternatively, in DevTools → Network → the authenticated `/api/user/profile` response, inspect the `user._id` value. **Do not share your session token, password or full profile response.**
3. In the **Render** dashboard open the VerifiedNG backend service (not Vercel/frontend), then **Environment**.
4. Add or update `VERIFICATION_ADMIN_USER_IDS` with the account's MongoDB user ID. Multiple trusted reviewer accounts use comma-separated IDs, with no spaces required.
5. Save/deploy the backend environment change. Never add this value to frontend `VITE_...` variables, public JavaScript or GitHub.
6. Refresh the app while signed in as that account. Visit **Become a provider** to see the provider review desk; visit **Get verified** to see the verification request review queue.

Important: Use only account IDs that you personally control and trust. This env setting grants approval power for both provider applications and community verification. Registration emails are **not** trusted as admin identifiers because registration does not prove mailbox ownership.

## 3. How community verification works

1. A member opens **Get verified**, completes their profile location and writes a short application note.
2. The request remains **Pending** until a backend-authorised reviewer decides.
3. The reviewer can approve or reject. A rejection requires a written explanation of at least 10 characters.
4. Approval sets `isVerified: true` in MongoDB. This is separate from `role: provider`.
5. Verified members may **create groups**, **join groups**, **read member-only discussions**, and **post/comment/react**. Unverified accounts may discover groups but cannot join or read private group posts.
6. A rejection does not grant a badge and can be resubmitted after 24 hours.

No identity documents or government certification are collected through the current simple verification request form. Do not imply that they were checked.

## 4. Group reports and moderation

- A verified group creator can select **Review reported posts** in their group.
- The creator sees report reasons and details but **not the reporters' account IDs**.
- The creator can remove a reported post. Normal members can remove only their own posts.
- Hidden posts disappear from group feeds and the open-report list.
- These are basic MVP tools, not a replacement for platform-wide anti-abuse moderation, group ownership transfer or escalation.

## 5. Quick test before public launch

- Test with two different members and one reviewer account.
- Apply as a regular member; confirm the status is Pending and the role remains Customer.
- Confirm the normal member cannot see the admin queue or approve applications using API requests.
- As reviewer, enter a reason and approve; confirm the role becomes Provider.
- Confirm the new provider can see the result without logging out and that `isVerified` did **not** change.
- Submit another application and decline; confirm the member sees the review reason and a 24-hour reapplication delay.
- Verify a member, create a group, report a post from another member and review it as the creator.
- Confirm unrelated group members cannot view the report queue or delete someone else's post.

## Future launch requirements

A stronger production verification programme should define evidence requirements, review records, appeal/revocation, protection against compromised reviewers and platform-wide content moderation. Review the legal terms and privacy policy before broad public launch.
