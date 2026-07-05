# SitIn — prototype architecture

SitIn is a local-first social app for musicians, bands, venues, and gig techs.
Headline flow: **your drummer bails → find a sub nearby → message them → send a
booking offer → pay in-app**. Secondary pillars: profiles with short-form video
reels, bands/groups with open-slot recruiting, and a feed from venues and bands
you follow.

This is a **frontend prototype**: Vite + React 19 + TypeScript + Tailwind v4,
mock data + localStorage. No backend. Mobile-first layout (bottom tab bar) with
a desktop sidebar, because the roadmap is web now, native app later.

## Layout & conventions

- Dark theme only. Background `zinc-950`, cards `zinc-900/60` with `zinc-800`
  borders, primary accent `amber-400` ("stage light"), secondary accents
  `violet`/`emerald`. Buttons/chips/cards come from `src/components/ui.tsx` —
  use them instead of restyling from scratch.
- Pages live in `src/pages/`, one route each. Feature-specific components live
  in `src/components/<feature>/`.
- Navigation chrome is provided by `Shell` (already wired in `App.tsx`).
  Pages should render `<Page title=...>` from `src/components/shell.tsx`
  (or manage their own full-bleed layout, e.g. the chat thread).
- Icons: `src/components/icons.tsx` (including `InstrumentIcon`).
- Never hand-roll gradients for people/bands/venues — use `<Avatar name seed>`.

## Routes

| Path | Page file | Purpose |
| --- | --- | --- |
| `/welcome` | `Welcome.tsx` | Landing pitch + 3-step onboarding (creates `CurrentUser`) — rendered WITHOUT Shell |
| `/` | `Discover.tsx` | Find players: search, filters, SOS-sub mode |
| `/feed` | `Feed.tsx` | Posts from venues/bands you follow |
| `/bands` | `Bands.tsx` | Band directory + open slots |
| `/b/:id` | `BandDetail.tsx` | Band page |
| `/m/:id` | `MusicianProfile.tsx` | Musician profile + video reel |
| `/v/:id` | `VenueDetail.tsx` | Venue page |
| `/profile` | `MyProfile.tsx` | Current user's profile/settings |
| `/messages` | `Messages.tsx` | Conversation list |
| `/messages/:id` | `Thread.tsx` | Chat thread (`:id` = conversation id, e.g. `c-m-dre`); booking offers + payment happen here |

Cross-linking rules: musician cards/mentions link to `/m/:id`, bands to
`/b/:id`, venues to `/v/:id`. "Message" buttons navigate to
`/messages/c-<musicianId>` (the thread page resolves the musician from the
conversation id by stripping the `c-` prefix; a conversation may not exist in
the store yet — the thread page must handle that and create one lazily on
first send).

## Data (`src/lib/data.ts`, all mock)

Read-only catalogs: `MUSICIANS`, `BANDS`, `VENUES`, `GIGS`, `FEED_POSTS`,
`SEED_CONVERSATIONS`, lookups `getMusician/getBand/getVenue/getGig`,
`bandsNeeding(instrumentId)`. Types in `src/lib/types.ts`; instrument metadata
in `src/lib/instruments.ts` (`INSTRUMENTS`, `instrument(id)`,
`instrumentLabel(id)`).

## State (`src/lib/store.tsx`)

`useApp()` → `{ state, api }`.

- `state.user: CurrentUser | null` — set by onboarding.
- `state.following: string[]` — band/venue ids.
- `state.conversations`, `state.bookings`, `state.likedPosts`,
  `state.respondedSubPosts`.
- `api.sendMessage(musicianId, text)` — canned reply arrives ~2s later.
- `api.sendBookingOffer({musicianId, gigTitle, venueName, date, time, amount, note?})`
  → returns bookingId; the musician "accepts" ~3.5s later (status flips to
  `accepted` and a chat reply arrives).
- `api.payBooking(bookingId, musicianId)` — flips to `paid`, confirmation
  message follows. UI shows a mock payment sheet first (fake card form).
- `api.toggleFollow(id)`, `api.toggleLike(postId)`,
  `api.respondToSubPost(postId, bandName)`, `api.markRead(conversationId)`,
  `api.setUser(user)`, `api.updateUser(patch)`, `api.reset()`.
- Helpers: `useConversationWith(musicianId)`, `useUnreadCount()`.

Booking status lifecycle: `offer → accepted → paid` (or `declined`, unused in
the happy path). Bookings render inside chat threads via `Message.bookingId`.

## Video reels (`src/components/video.tsx`)

`<VideoTile clip onPlay>` renders a 9:16 placeholder tile (no real video
assets). `<ReelViewer clips startIndex ownerName onClose>` is the fullscreen
swipe-style player with simulated progress. Any surface showing clips should
open the ReelViewer on tap.

## Roadmap notes (why things are shaped this way)

- The store's `api` is the seam where a real backend lands (REST/WebSocket).
- Types in `types.ts` are the API contract for the future mobile app
  (React Native/Expo would consume the same shapes).
- Payments are mocked at the UI layer; production would use Stripe Connect
  (musician onboarding → destination charges + application fee).
