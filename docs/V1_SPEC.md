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
