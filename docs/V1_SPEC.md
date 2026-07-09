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
swap the mock for Stripe at the `api.payBooking` seam.

## Ratings
Keep the **Uber-style rating** as-is: prominent average + count + distribution
on Player profiles, post-gig `StarInput` after a paid booking. **v1: Players
only** for the talent-side star rating. The **hiring-side** signal ("paid on
time") from the roles model attaches to the paying party (person/band/venue) and
can surface as a badge before the full rating system extends to it. Schema stays
open to rate Venues/Events later.

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
