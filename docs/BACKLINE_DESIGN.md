# Backline redesign — implementation contract

The design **foundation is already built** (tokens, fonts, generative systems,
rating system, restyled primitives, app shell). Your job: restyle the app's
surfaces to the Backline identity using that foundation, and wire the two new
features (SOS flow, Uber-style ratings) where noted. Faithfully match the
handoff in `docs/…` spirit; the concrete tokens/APIs are below.

## Brand in one line
After-dark, stage-lit, insider. Amber is the single warm "stage light" — **use
it scarcely** (CTAs, brand, SOS, urgent). Cyan is the cool signal (verified /
held / info). Space Grotesk for UI; **Space Mono for every data atom** (labels,
money, timestamps, distances, counts) — usually uppercase, wide-tracked.

## Token utility classes (Tailwind v4 — these exist now)
Backgrounds/surfaces: `bg-ink` (page), `bg-ink-near`, `bg-surface-900` (cards),
`bg-surface-850`, `bg-surface-sheet` (sheets), `bg-surface-800` (chips/secondary
btns), `bg-surface-raised`.
Borders: `border-hairline-subtle` (cards), `border-hairline`, `border-hairline-strong`.
Text: `text-text-hi`, `text-text-mid`, `text-text-lo`, `text-text-faint`.
Amber: `bg-amber-500`/`text-amber-500` (base action), `text-amber-300` (bright/
active text), `text-amber-200`, `bg-amber-600`. Text on amber is always
`text-ink-near` (never white).
Cyan: `text-cyan-400`/`bg-cyan-400`, `text-cyan-300`.
Danger (sparse): `var(--color-danger)` `#e5675f`.

**Replace old zinc utilities** (`bg-zinc-950`→`bg-ink`, `bg-zinc-900*`→
`bg-surface-900`, `border-zinc-800`→`border-hairline-subtle`,
`text-zinc-400`→`text-text-mid`, `text-zinc-500`→`text-text-lo`,
`amber-400`→`amber-500`/`amber-300`, `emerald-*` "free tonight"→amber). Don't
leave zinc-* in your files.

Motion classes (already defined): `blink`, `pulse-ring`, `radar-ring`, `spin`,
`floaty`, `rise`, `arrow-nudge`, `sweep`, `grain`. Use `mono` class (or `<Mono>`)
for the data layer.

## Foundation components — `src/components/ui.tsx`
Existing (stable signatures): `Avatar{name,seed,size,square}` (now a generative
fingerprint), `Button{variant:'primary'|'secondary'|'ghost'|'danger'|'sos',size}`,
`Chip{active,onClick}`, `Card{onClick}`, `Modal{open,onClose,title,width}` (now a
bottom-sheet on mobile w/ grabber), `Toggle`, `SectionHeader` (renders mono),
`EmptyState`, `formatCount`, `formatDuration`.
New — use them:
- `<Wordmark size />` — the backlıne wordmark (amber standby dot). Use in brand spots.
- `<Mono>…</Mono>` / `className="mono"` — the mono data layer.
- `<Badge tone icon pulse>`, `<VerifiedBadge/>`, `<FreeTonightBadge/>`, `<UrgentBadge/>`.
- `<Stars rating size/>` — static star row.
- `<RatingNumber avg count size='sm'|'md'|'lg'/>` — the "4.9 ★ (127)" readout.
- `<RatingBreakdown breakdown/>` — 5→1 distribution bars.
- `<StarInput value onChange size/>` — interactive post-gig rating.
- `<SuccessCheck size/>` — cyan check disc for success states.
- Video: `<VideoTile clip onPlay/>`, `<ReelViewer clips startIndex ownerName onClose/>` (already Backline "alive" reels).

## Ratings — `src/lib/ratings.ts` + store
`ratingSummary(musician, extra?: number[])` → `{ avg, count, breakdown }`
(deterministic, believable). Pass the user's session ratings as `extra`:
`ratingSummary(m, state.ratingsGiven[m.id])`. `api.rateMusician(musicianId, stars)`
records a 1–5 post-gig rating (session-only). `ratingLabel(avg)` → "4.9".

## Data / store / routes (unchanged)
`useApp()` → `{ state, api, auth }`. Data + lookups in `src/lib/data.ts`
(`MUSICIANS/BANDS/VENUES/GIGS/FEED_POSTS`, `getMusician/getBand/getVenue/getGig`,
`bandsNeeding`). Routes unchanged: `/`, `/feed`, `/bands`, `/b/:id`, `/m/:id`,
`/v/:id`, `/profile`, `/messages`, `/messages/:id`, `/welcome`. Conversation ids
are `c-<musicianId>`. Instruments in `src/lib/instruments.ts`.

## Two features to wire
1. **SOS flow (Discover owns it).** The app shell's SOS button navigates to
   `/?sos=open`. Discover must read `useSearchParams()` and auto-open the SOS
   overlay when `sos=open`. SOS is a state machine over Discover:
   `idle → config (who bailed? / when?) → searching (radar-ring animation,
   ~2.1s) → results (ranked "who can get there fastest", fastest gets a ribbon,
   each row → Message / Send offer) → sent (cyan confirmation)`. Make it feel
   urgent-but-fun.
2. **Uber-style ratings.** Prominent on the musician profile hero (`RatingNumber
   size='lg'` + `RatingBreakdown`) and on player cards / SOS rows / message
   headers (`RatingNumber size='sm'`). **Post-gig rating entry** lives in the
   chat **BookingCard `paid` state** (Messages owns it): once paid, show
   "How was the gig?" + `<StarInput>` → `api.rateMusician(musicianId, stars)` →
   a small cyan "Thanks — rated ★★★★★" confirmation.

## Rules
- Mobile-first (390px) AND desktop. Bottom tab bar is `pb-24` tall on mobile —
  keep sticky CTAs clear of it (the profile CTA bar already uses `bottom-24`-ish;
  verify). Buttons/hit targets ≥44px.
- Color never the only signal: pair every status hue with an icon + word.
- Real copy in the mock-data voice. No lorem, no zinc-* leftovers.
- Only touch YOUR files. Run `npx tsc --noEmit`; fix errors in your files, ignore
  errors from other pages mid-edit. Don't touch ui.tsx/video.tsx/shell.tsx/
  index.css/generative.ts/ratings.ts/store.tsx/data.ts/types.ts — the foundation
  is frozen. If you need something there, note it in your report.
