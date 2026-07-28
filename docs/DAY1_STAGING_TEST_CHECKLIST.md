# Day 1 hosted beta test — 35 to 40 minutes

Use the deployed staging URL in one normal browser window for Account A and one
incognito/private window for Account B. Both accounts must complete onboarding
in the same scene for the discovery and messaging checks. Keep Stripe disabled;
do not enter payment details.

## 0:00–0:05 — deployment and route smoke

- Open the staging URL in both windows and confirm the footer/sidebar routes are
  `/` (Discover), `/feed`, `/bands`, `/messages`, `/notifications`, and
  `/profile`.
- On `/`, open SOS and confirm the URL becomes `/?sos=open`; close it.
- Hard-refresh `/feed`, `/bands`, `/messages`, `/notifications`, and `/profile`.
  Each refresh must remain on the same route without a platform 404.
- Fail the test if fictional catalog names or populated fictional feed/band
  records appear in cloud mode.

## 0:05–0:13 — sign-up, confirmation, and return path

- Create Account B in the incognito window and complete any email confirmation
  required by Supabase.
- Complete onboarding with a unique handle, at least one instrument, and the
  same scene as Account A.
- Sign out Account B, sign back in, and confirm it returns to `/` rather than
  restarting the “Who are you?” onboarding flow.
- Hard-refresh once while signed in and confirm the session and completed
  profile survive.

## 0:13–0:22 — live account discovery

- Return to Account A. If the tab was backgrounded, focus it and allow up to
  five seconds for the profile event.
- On `/`, search Account B’s exact handle. Confirm one real profile card appears
  even when Account B has no reel or video.
- Confirm Account A does not appear as its own search/message target.
- Clear search and filter by Account B’s instrument; confirm the profile remains
  discoverable.
- Switch Account B to a different scene, wait up to five seconds, and confirm it
  disappears from Account A’s current scene. Switch it back before messaging.

## 0:22–0:32 — two-way direct messaging

- From Account A’s result card, choose **Message** and send a unique line such
  as `A to B 21:30`.
- In Account B, open `/messages`; confirm the thread appears and the message is
  readable. Open it and reply with `B to A 21:32`.
- In Account A, confirm the reply appears without a hard refresh. Open
  `/messages`, verify the preview, then enter the thread and confirm unread state
  clears.
- Hard-refresh both thread URLs and confirm message history remains.
- Fail the test for a missing thread, duplicate first message, wrong sender, or
  any message visible to an unrelated third account.

## 0:32–0:37 — profile edit propagation

- In Account B, change one harmless public field such as bio or neighborhood
  and save.
- In Account A, reopen Account B’s profile from Discover and confirm the change
  appears without signing out.
- Confirm no email address, auth metadata, precise availability coordinates, or
  secret values appear anywhere in the UI or browser URL.

## 0:37–0:40 — capture evidence

- Record the deployed commit SHA and the newest local/remote migration ID.
- Capture pass/fail for: route refresh, returning sign-in, real-profile search,
  scene isolation, A→B message, B→A reply, unread clearing, persistence, and
  absence of fictional hosted data.
- Copy any browser console error and the exact action that produced it; do not
  copy tokens, keys, passwords, or full auth URLs.

## Requires owner account access

- Vercel: confirm the merged commit is the one deployed and all required
  publishable environment variables are set for Preview/Staging.
- Supabase Auth: inspect redirect allow-list and email confirmation settings.
- Supabase CLI or Dashboard: push and verify the newest migration, then check
  Realtime and security advisors.
- Email inboxes for both test accounts if confirmation is enabled.
- Any deletion of legacy hosted seed rows. That is intentionally outside this
  checklist and requires explicit approval plus a backup/rollback decision.
