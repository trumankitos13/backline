# Backline — v1.0 spec

**v1.0 launches on Web + iOS** (Android follows on the same native codebase).
Guiding principle: **integrate existing tools; don't build what we can rent.**

## The object model — exactly four things

Everything in the system is one of four objects, and **each has its own profile
page**. Everything else (bookings, ratings, messages, feed posts, follows,
reels) is a *record or relationship* attached to these — never a standalone
object with a page.

| Object | Page | Is | Key relationships |
| --- | --- | --- | --- |
| **Player** | `/p/:id` | a person who gigs (any role incl. techs) | in Bands; rated; booked for Events; has links + reels |
| **Band** | `/b/:id` | a group of Players | has members (Players), open slots, plays Events; has links |
| **Venue** | `/v/:id` | a place shows happen | hosts Events; has links |
| **Event** | `/e/:id` | a show / gig | at a Venue, performed by Band(s)/Player(s); has ticket link + links |

Relationships & records (not objects): **Booking** (a Player hired for a gig),
**Rating** (Uber-style, on Players), **Message/Conversation**, **FeedPost**,
**Follow**, **Reel** (an embedded short-form video on a profile).

### What changes from the prototype
- `Musician` → **`Player`** (catalog `PLAYERS`, `getPlayer`). It always included
  techs, so "player" fits.
- `Gig` → **`Event`**, promoted to **first-class with its own page** (`/e/:id`,
  ids `e-*`). Events gain a lineup (bands + players), venue, date/time, a ticket
  URL, and links. Previously gigs were only embeds.
- Every object gains **`links: ExternalLink[]`** (Spotify, Instagram, website,
  Bandcamp, YouTube, TikTok, Bandsintown…).
- **Reels become embeds, not hosted files** (see below).
- Persistence-layer id field stays `musicianId` in the DB columns
  (`musician_id`) but is `playerId` at the app/type layer; `supabase.ts` maps
  between them so no migration is needed now.

## Roles & capabilities — no Booker/Player split

> **Decision:** we do **not** adopt the design handoff's hard Player ⇄ Booker
> role toggle. "Booker" is a **hat, not an identity.** In the real scene the
> person hiring is almost always also a player (the bandleader whose drummer
> bailed); a binary role imposes a "which am I today?" question nobody thinks in.

**Identity = Player (a person/account).** Hiring and posting openings are
**capabilities** exercised in a **context** — *"acting as"*: yourself, a band you
run, or a venue you manage. This reuses the four objects (openings already live
on Band/Venue/Event) instead of adding a parallel account type.

**Relationships that grant the capability**
- `Band.members[]` gains `admin?: boolean` — band admins can post/hire **as the band**.
- `Venue` gains `managers: playerId[]` — managers can post/hire **as the venue**.
- A Player can always post/hire **as themselves** (self fill-in / solo artist
  assembling a backing band).

**Unified `Opening`** — one concept behind today's `Band.openSlots`,
`Venue.hiring`, and `Event.subNeeded`:
```ts
interface Opening {
  id: string;
  instrument: InstrumentId;
  postedBy: { kind: "player" | "band" | "venue"; id: string }; // the "acting as" context
  eventId?: string;      // optional: tie the opening to a specific show
  when: string;          // "Tonight", "Fri Jul 10", …
  fee: number;           // held on accept
  note?: string;
  urgent?: boolean;      // SOS-grade
}
```
Posting an opening (and the SOS flow) gets an **"Acting as"** selector: *Me ·
[bands you admin] · [venues you manage]*. That selector replaces the role toggle.

**Persona coverage** (all one account type):
- Bandleader, drummer bailed → post *as the band* (or SOS).
- Solo artist wanting a backing band → post fill-in openings *as themselves*.
- Band recruiting a permanent member → band admin posts an open seat.
- Venue talent buyer → manages a venue, posts *as the venue*.
- Wedding/corporate client or promoter who doesn't play → a Player account with
  no instruments, opted out of talent search: they *hire* but never appear as
  talent. ("Do you also play?" in onboarding is a **preference**, not a role.)

**Reputation is two-sided but on one person.** Keep the player rating (below) and
add a **hiring-side signal** — "paid on time," "pays through Backline" — attached
to **whoever paid** (the person, or the band/venue they acted as), *not* a
separate Booker account. A profile can show both "★4.9 as a player" and "100%
paid on time as a booker."

### "Acting as" — the posting & SOS UX
Context, not configuration — it should feel like picking up a different phone.
- A persistent **"acting as" chip** (avatar + name, e.g. `◐ Cedar & Rye ▾`) sits
  at the top of the Post and SOS sheets. Same affordance in both, learned once.
- **Never show a picker with one option.** Solo players only ever act as
  themselves → the chip is inert. The picker (You · bands you admin · venues you
  manage · + New project) only becomes interactive for people who actually have
  more than one context.
- **Context is inherited from where you tapped** and sticky: post an open seat
  from a band page → as the band; SOS from the tab bar → as you.
- **The context does real work in exactly one place: the fee source** — "held
  from [context]'s card" — so the money is never ambiguous.
- **Attribution is always visible on the artifact** (feed post, offer card, chat
  header show the avatar you posted *as*), so reputation lands on the right party.
- In **SOS**, the context only recolors the copy and the *from*: "*Your* drummer
  bailed?" vs "*Cedar & Rye* needs a drummer" — same radar, same results.

## Projects, pickup bands & group chats

The solo-artist-assembling-a-backing-band case is a **first-class flow**, not a
special case — and the thing they assemble **persists** (posterity). A "project"
is just a **Band** (no new object) with a lifecycle. Decisions below are locked.

```ts
interface Band {
  // …existing…
  kind?: "standing" | "project"; // "project" = pickup/one-off; can be promoted
  ownerId?: string;              // creator = admin (may or may not perform)
  members: {
    playerId: string;
    role: string;                // "Drums", "Songwriter", "Bandleader"…
    admin?: boolean;             // can post/hire as the band
    performing?: boolean;        // false = organizer/writer/producer, not a seat
    stay?: "in" | "out";         // "Stay as a group?" ready-check (post-gig)
  }[];
}
```

**Group chat = a group Conversation tied to a Band.** The one net-new model
piece (today's `Conversation` is 1:1):
```ts
interface Conversation {
  id: string;
  kind: "dm" | "group";
  participantIds: string[]; // group: the roster; dm: the two people
  bandId?: string;          // group chats belong to a project/band
  title?: string;           // usually the band's name
  messages: Message[];
  unread: number;
}
interface Message { /* …existing… */ senderId?: string; } // who spoke (groups)
```

### Locked decisions
- **Fees are private; locks are public.** All money (offer amount, payment card,
  hold) lives ONLY in the 1:1 offer/booking thread. The group chat never shows
  an amount — only the *fact* of a lock ("🥁 Nia locked in on drums"). Players
  must never see what bandmates were paid.
- **Auto-named, editable.** Project is auto-named (event name, or
  "Alex Rivera's Pickup · Fri Jul 10") with inline rename. No naming gate.
- **The creator chooses whether they play.** At assemble they pick: *"Playing
  this one?"* → a **performing** member (pick instrument, counts as a filled
  seat) **or** just organizing (writer/producer/bandleader) → a non-performing
  admin. Seat progress reflects the choice.
- **"Stay as a group?" is an opt-in ready-check** (game-lobby style), not one
  person's call. See lifecycle step 5.

### Lifecycle
1. **Assemble** — from an Event, a profile, or Post/SOS, the creator taps
   "Assemble a band," answers *"Playing this one?"*, and we create a `project`
   Band (auto-named; creator = owner/admin) and usually the Event it's for.
2. **Post the lineup** — openings (drums/bass/keys…) `postedBy` the project,
   tied to the event. Candidates reply in normal **1:1 DM** offer threads
   (fees private here).
3. **Hold → join** — when a player is **held** (paid/accepted), they **join the
   roster** and are **added to the group chat**. The group chat **spins up on
   the first hold** (owner + first held player) and grows with each subsequent
   hold; each drops a public system line ("🎹 Theo locked in"), never a fee.
   "Lineup complete" when the last seat fills.
4. **Play the gig.**
5. **Stay as a group? (ready-check)** — after the gig, every member gets a
   "Stay as a group?" prompt shown inline in the group chat (each member's
   in/out state visible, like a lobby). The project becomes a **standing** band
   **only if the owner opts in AND ≥1 other member opts in**; the standing
   lineup = the members who voted **in** (those who voted **out** drop off — they
   were on the one gig). No consensus → it **archives** as a past project
   (still viewable, not "standing"). Threshold is tunable.

**Ties back to "acting as":** owning a standing project/band puts it in your
*acting-as* picker, so re-hiring next time is just "post as [your band]."

### UX sketch — assemble entry points & the group-chat screen
**Entry points to "Assemble a band"** (all lead to the same project flow):
- **You / profile:** a "Start a project" action.
- **Event page:** "Need a lineup? Assemble a band" (for the presenter).
- **Post/SOS "Acting as" picker:** a "+ New project" option at the bottom.
- **Upgrade an SOS:** on an SOS results screen, "add another seat" turns a
  1-seat SOS into a multi-seat project (SOS = 1 seat, Assemble = N).

**Group-chat screen** (a group Conversation, `kind:"group"`):
- **Header:** project avatar + name + a row of roster avatars + seat progress
  ("3/4 locked" / "4-piece"). Tap → the band/project page.
- **Body:** member messages with sender attribution (avatar + name); **system
  lines** for locks / "lineup complete" / the ready-check. Booking & payment
  cards do **not** appear here (they stay in each 1:1 thread).
- **Post-gig ready-check card:** an inline "Stay as a group?" card listing each
  member with an in/out toggle (game-lobby feel); the band promotes to standing
  when the threshold is met.
- **Composer:** normal.

## Integrate, don't build

### Short-form video = **embeds** (no media hosting)
A Reel is a URL to an existing post, not a file we store. This deletes the
entire media-pipeline problem.
```ts
interface Reel { id: string; platform: "tiktok" | "youtube" | "instagram"; url: string; caption?: string }
```
- **TikTok** — public oEmbed, no key. Easiest; lead here.
- **YouTube Shorts** — a normal YouTube video; iframe/oEmbed, no key.
- **Instagram Reels** — oEmbed now needs a Facebook app token (more friction);
  support after TikTok/YouTube.
Native (Expo) uses `react-native-webview` for the same embeds. The prototype's
generative "gel" tiles remain the **fallback** when a player has no reel yet.

### Live shows / events = **external feed + in-app**
Events can be *created in-app* or *pulled from an API*.
- **Bandsintown** — the obvious brand, but its API is **partner-gated**
  (approval, mostly artist-side). Design for it, don't block on it.
- **Ticketmaster Discovery API** & **SeatGeek API** — openly available; good for
  pulling local shows by city. Use one of these for the initial event feed.
- `Event.source: "backline" | "bandsintown" | "ticketmaster" | "seatgeek"` +
  `externalUrl` so imported events deep-link back to their origin.

### Payments = **Stripe Connect**
Marketplace model: Players onboard as **connected accounts**; bookers pay
in-app; platform takes an application fee. The "held until the gig" escrow feel =
**manual capture / delayed transfer**. Already mocked in the payment sheet;
swap the mock for Stripe at the `api.payBooking` seam. **The full flow — hold
mechanics, release timing, cancellation, disputes, fees — is specced in
[Payments & escrow](#payments--escrow) below.**

## Ratings
Keep the **Uber-style rating** as-is: prominent average + count + distribution
on Player profiles, post-gig `StarInput` after a paid booking. **v1: Players
only** for the talent-side star rating. The **hiring-side** signal ("paid on
time") from the roles model attaches to the paying party (person/band/venue) and
can surface as a badge before the full rating system extends to it. Schema stays
open to rate Venues/Events later.

## Payments & escrow

The whole promise — **"held until the gig"** — is a payments feature. It's what
makes an offer *credible to a stranger*: a player agrees to cover tonight because
the money is already committed, not a promise over DM. Stripe Connect does the
heavy lifting; our job is the **states, the timing, and the policy.**

### Roles, in Stripe terms
- **Player = connected account (Stripe Express).** Stripe-hosted onboarding
  handles KYC, bank details, payouts, and tax forms. Store `stripeAccountId` +
  `payoutReady` on the Player.
- **Booker = the payer** — a Player *acting as* self / band / venue. They attach a
  card. The card belongs to the person; when acting as a band/venue the receipt is
  **attributed** to that context (so reputation lands right) even if the person's
  card funds it.
- **Backline = the platform.** Takes an application fee; funds route through the
  platform balance during the hold.

### Onboarding is lazy — gated at the moment of money
Nobody sets up payouts to browse. Gate each side at first use:
- **Get-paid gate:** a player completes Express onboarding **the first time they
  accept a paid offer** ("Add payout details to get paid — 2 min"). They can apply
  and chat before this; they just can't be *released* funds until `payoutReady`.
- **Pay gate:** a booker adds a card **the first time they hire.**

### The hold — two mechanisms, one meaning
"Held" must mean the same thing to the player no matter how far out the gig is,
but Stripe gives two primitives with different constraints:

| Gig horizon | Mechanism | What actually happens |
| --- | --- | --- |
| **Near-term (≤ ~6 days)** — the SOS / this-week core | **Auth hold** — PaymentIntent, `capture_method: manual` | Booker's card is **authorized, not charged.** Capture at release. Cancel ⇒ we simply never capture — **no money ever moved.** Cleanest escrow, but **card auths expire in ~7 days.** |
| **Further out** | **Charge-to-escrow** — separate charge + transfer | Capture the amount to the **platform balance** now (the real escrow), then **Transfer** to the player's connected account at release. Works at any horizon; downside: the booker's money leaves immediately. |

One `api.holdBooking(id)` / `api.releaseBooking(id)` seam hides the choice; the UI
only ever says **"held."** (Today's mock `payBooking` becomes `holdBooking`.)

### Booking lifecycle (payments view)
Extends today's `BookingStatus = "offer" | "accepted" | "paid" | "declined"`:

```
offer ──accept──▶ accepted/HELD ──gig happens──▶ released(=paid) ──payout──▶ player's bank
  │                    │
  │ decline            ├─ cancel  ─▶ refunded
  ▼                    └─ no-show / dispute ─▶ disputed ─▶ resolve
declined
```

Proposed set: `offer → held → released → {refunded | disputed}` (+ terminal
`declined`). The old single **`paid`** splits into **`held`** (money committed) vs
**`released`** (money delivered) — that split *is* the escrow. *(Prototype note:
until cards-on-file exist, `accepted` remains as the awaiting-hold state between
offer and held — the payment sheet is the interactive stand-in for the
accept-triggers-hold moment.)*
- **accept ⇒ hold.** Acceptance and the hold are one event: the public **"lock"**
  (group chat "🥁 Nia locked in") and the private money move (amount/card only in
  the 1:1 thread) happen together.
- **release.** Auto-releases **24h after the gig's end time** unless a dispute is
  filed in that window. "Held until the gig" → in the player's account the day
  after; payout on Stripe's schedule.

### Cancellation — cancel-friendly up to 24h
> **Decided: 24h cutoff, 50% late-cancel fee** to the player on a late booker-cancel.

Deliberately generous; friction here kills the "just grab a sub" reflex. Cutoff =
**24h before showtime.**

| Who cancels | ≥24h before | <24h before ("late") |
| --- | --- | --- |
| **Booker** | Full void/refund, no fee, no ding. | **Late-cancel fee** — a portion (propose **50%**) releases to the player who cleared their night; the rest refunds. |
| **Player (bails)** | Hold **voided, booker fully refunded**, and we **re-open the opening / relaunch SOS** — the show still goes on. **Reliability signal** dinged (the anti-flake mechanic). | Same, heavier reliability ding — bailing day-of is the worst outcome for the scene. |

Platform fee is **refunded on ≥24h cancels and all player-bails** (we don't profit
from a gig that didn't happen); on a late booker-cancel we keep the fee only on the
portion that pays out. (Tunable.)

### No-show & disputes — kept human for v1
Volume will be tiny; automated arbitration is over-engineering.
- Either party can **file within the release window** (before the 24h auto-release,
  or shortly after). Filing **freezes** the transfer.
- **No-show** (player accepted, never played): booker reports → refund, player
  reliability hit. Corroboration is cheap — the group chat is an implicit record
  (the no-show never "arrived") and lineup-mates can confirm.
- **Quality dispute:** conversation first, then a lightweight structured claim →
  ops review. v1 leans refund-the-booker on genuine no-show, split/escalate on
  subjective quality. Not a court.
- **Card chargebacks** ride Stripe's own dispute flow. The hold model is the
  defense: **funds aren't released until after the gig**, so a chargeback rarely
  races an already-paid-out transfer. Residual risk (chargeback after release) →
  platform eats or claws back; low volume.

### Platform fee — and who pays it
> **Decided: the booker pays the fee.** The posted fee is the player's real
> take-home.

A "$200 opening" = $200 in the drummer's pocket. Backline's cut (propose **~10%** +
Stripe processing) is **added on top for the booker**, itemized on the offer:
`Fee $200 · Backline service $20 · Total $220`. Why this way:
- Kills fee haggling ("before or after the app's cut?") — the opening's number is
  unambiguous.
- Honors **fees-private**: the player only needs their guaranteed take-home; the
  service charge is the booker's line item.
- Musician-friendly — the talent is never surprised by a deduction.

### Fees private ↔ locks public (the payments side of the locked rule)
- **Amount + card + receipt** live ONLY in the **1:1 offer/booking thread** and the
  payer's own history. Never in a group chat, never on a public profile.
- What surfaces publicly is **states, not numbers**: "locked in," "paid on time,"
  "released." The **"100% paid on time"** booker badge and the **player ★ rating**
  both derive from these states — never from amounts.
- One booking = **one active hold.** Renegotiating replaces the offer (void + new
  hold), so there's never an ambiguous double-charge.

### Seam & mock → real
- **Types:** extend `BookingStatus` (`held`, `released`); add
  `Booking.stripePaymentIntentId?`, `Player.stripeAccountId?`, `Player.payoutReady?`.
- **API:** `api.holdBooking` (was `payBooking`) + `api.releaseBooking` +
  `api.cancelBooking` + `api.fileDispute`, all behind the existing backend seam.
  `PaymentSheet` is already titled **"Hold payment"** — aimed straight at this.
- **Local mode** keeps simulating; **Supabase/live mode** calls Stripe
  (PaymentIntents + Transfers + Connect onboarding links) from a server function.

## Notifications

Backline is **time-critical** — "your drummer bailed, tonight" only works if the
right person's phone buzzes in minutes. Notifications aren't a settings-screen
afterthought; they're the **delivery mechanism for the core loop.**

### Channels
- **Push** — Web Push (VAPID / service worker) + iOS APNs via Expo. The urgent
  channel; this is what makes SOS work.
- **In-app** — a notification center + unread badges (the Chats badge already
  exists). The **durable source of truth**; every push has an in-app twin.
- **Email / SMS** — deferred. Email for receipts + account only in v1. SMS is the
  obvious v2 for SOS reach (costs money, needs consent).

### Trigger set (person-addressed, context-named)
Notifications address the **person** but name the **acting-as context**, so the copy
is right — "*Cedar & Rye* needs a drummer," not "you need a drummer."

| Trigger | Recipient | Urgency | Copy names… |
| --- | --- | --- | --- |
| **SOS near you** (opening matches your instrument + area) | eligible players | **High · push** | the *from* ("Cedar & Rye needs a drummer, tonight") |
| **Offer received** | the player offered | High · push | who's hiring |
| **Offer accepted / held** | the booker | High · push | the player who locked in |
| **You're locked in** (accept + hold confirmed) | the player | Normal | the gig / context |
| **Opening filled / seat taken** | booker + watchers | Normal | which seat |
| **Lineup complete** | the whole project group | Normal | the band |
| **"Stay as a group?" ready-check** | every project member, post-gig | Normal | the project |
| **Someone grabbed your SOS** | the SOS poster | **High · push** | who grabbed it |
| **Payment released / paid out** | the player | Normal | amount — *to them only* |
| **Cancellation / bail** | the counterparty | **High · push** | who canceled + "re-opened / find another" |
| **New message** (DM or group) | participants | Normal · respects mute | sender |
| **Rating request** (post-gig) | booker (rate player) | Low | the player |
| **New follower / feed** | player | Low · digest | — |

### Rules that keep it from becoming noise
- **Urgency tiers gate push.** Only **High** fires a push by default (SOS, offers,
  holds, bails, "someone grabbed it"). Everything else is in-app + optional push.
- **Fees-private holds here too.** A release notification shows the amount **only to
  the person being paid**; the booker's copy says "paid out," no number. Group
  notifications never carry an amount.
- **Acting-as routing.** "As the band" events notify the **band admins** (the people
  who can act), not every member. Group-chat messages notify participants; a
  band-*management* event notifies admins.
- **Dedupe + mute.** Per-conversation mute (esp. group chats); collapse rapid-fire
  ("3 new messages"); a daily **digest** for Low-tier (follows, feed).
- **Quiet by default for the non-urgent.** Low-tier is in-app-only unless opted into
  push. High-tier defaults on because that *is* the product.

### SOS targeting & escalation — the smart part
A blast is only as good as *who it reaches*; good targeting is the difference
between "filled in 6 minutes" and spam.
- **Eligibility filter.** An opening notifies players who (1) **play the
  instrument**, (2) are **in range** (metro / radius of the venue), (3) are
  **available** (not marked busy; `availableTonight` for same-night), and (4)
  **haven't already declined** it. Optional booker-set **★ / reliability floor.**
- **Ranked, not sprayed.** Order by a match score — proximity, rating, response
  history ("usually replies fast"), and **people the booker follows/knows first.**
  A warm sub beats a random one.
- **Escalation loop (widen the net).** Fire to the **best tier first**; if
  unclaimed after a window (e.g. 10 min for a tonight gig), **widen** — bigger
  radius, lower floor, re-notify — until claimed or canceled. The poster sees live
  status: "sent to 8 · widening in 4:00."
- **First-claim-wins with a soft hold.** The first "I've got it" gets a short
  **soft reservation** to confirm; others see "being grabbed." Prevents two subs
  showing up. Confirm → normal offer/hold flow; timeout → back to the pool.

### Every notification deep-links — and acts inline when it can
- **Deep-link targets, no dead ends.** SOS → `SosFlow` with the role preselected
  (the existing `?sos=open&role=` contract); offer → the 1:1 thread with the offer
  card; ready-check → the group chat's "Stay as a group?" card; release → the
  receipt.
- **Inline actions** (iOS notification actions / web action buttons): **Accept /
  Decline** on an offer, **"I've got it"** on an SOS, **Mute** on a chat — resolved
  without opening the app where possible. The high-tempo ones must be one-tap.

### Quiet hours, rate limits & do-not-disturb
- **Quiet hours** (user-set; default ~10pm–8am) suppress **Normal/Low** push;
  **High** (a *tonight* SOS, a bail) can still break through — that's the emergency
  channel — with a per-user "hard mute everything" override.
- **Rate-limit + collapse** so a busy group chat or a feed burst can't machine-gun
  the lock screen; Low-tier batches into a **digest.**
- **Anti-spam:** a player can't be SOS-blasted more than N×/day; a booker can't
  blast beyond their eligible pool. Declining an opening suppresses re-notification.

### Architecture & reliability
- **Write first, then fan out.** Every trigger writes a `notifications` row
  (recipient, type, **dedupe-key**, payload, read, created) **in the same
  transaction** as the state change, then enqueues push. The **table is the source
  of truth**; push is a best-effort projection — if push fails, the in-app
  notification is still there.
- **At-least-once + idempotent.** Each notification carries a **dedupe key** (e.g.
  `sos:<openingId>:<playerId>`) so retries and multi-device fan-out never
  double-notify; the client dedupes on it too.
- **Cross-device read sync.** Read state lives on the row, not the device —
  mark-read on the phone clears the web badge. Unread counts (the Chats badge)
  derive from the table.
- **Token lifecycle.** Push tokens stored **per account, per device**; pruned on
  unregister / send-failure ("gone"). Three devices → three tokens; logout drops one.
- **Provider abstraction.** One `notify(recipient, type, payload)` seam over Web
  Push (VAPID) + APNs (via Expo), so triggers never know the channel; local mode
  stubs the same seam.
- **Surfaces.** v1 web = in-app center + badges (already modeled) + Web Push; v1
  iOS = `expo-notifications` + APNs.
- **Preferences.** Per-type × per-channel toggles (push / in-app / off) with the
  defaults above, plus quiet hours and per-conversation mute — one "Notifications"
  settings screen.

## Platform architecture (web + iOS + Android)

Treat the **portable core as the product**; each UI is a thin consumer.

```
packages/core     ← types, store logic, api client, Supabase, business rules
                    (ratings, booking lifecycle, SOS matching, embed/event adapters)
apps/web          ← React + Vite (this app) — ships v1 alongside iOS
apps/mobile       ← Expo / React Native — iOS for v1, Android next
```
- **Reused across all platforms:** everything in `packages/core`.
- **Rewritten per platform:** the UI (React DOM+Tailwind ≠ React Native).
- Web stays valuable as marketing/landing + desktop/booker surface + design reference.

Sequence: (1) this spec → (2) refactor web to the 4-object model + links +
embed-ready reels → (3) monorepo + Expo consuming the core → (4) wire real
integrations (Stripe Connect, an events API, oEmbeds) behind the existing
backend seam.

## Refactor rename-map (this pass)
`Musician`→`Player` · `MUSICIANS`→`PLAYERS` · `getMusician`→`getPlayer` ·
`Gig`→`Event` · `GIGS`→`EVENTS` · `getGig`→`getEvent` · gig ids `g-*`→`e-*` ·
`gigIds`→`eventIds` · `gigId`→`eventId` · `musicianId`→`playerId` (app layer;
DB columns unchanged) · add `ExternalLink`/`links[]` to all four objects · add
`Reel` (embed-ready) alongside existing generative fallback · new route `/e/:id`
+ `EventDetail` page · player route stays `/m/:id` (ids stay `m-*` to preserve
the `c-<playerId>` conversation-id convention).
