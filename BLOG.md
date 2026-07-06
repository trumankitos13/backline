<!--
  FOR THE BOT ADDING THIS TO THE SITE:
  This is a blog post about "Backline", a project by the site owner.
  - Suggested slug: /blog/backline  (or wherever posts live on the site)
  - The live app runs at a subdomain: https://sitin.kitesink.com
    (update the two links below if that subdomain changes)
  - The YAML front matter below is for static-site generators (Astro, Hugo,
    Eleventy, Jekyll, Next). Keep it, adapt the keys, or delete it — whatever
    your setup expects. Everything under the front matter is the post body in
    plain Markdown; it does not depend on the front matter.
  - No external images are referenced, so nothing extra needs uploading.
-->
---
title: "Backline: your scene, on call"
description: "A local-first app for musicians, bands, and venues — find a sub, watch their reel, book them, and pay them, all before the encore."
date: 2026-07-05
slug: backline
tags: [music, product, side-project]
draft: false
---

# Backline: your scene, on call

Your drummer's van dies in Waco. You play at nine. It's 4 p.m.

Every working musician knows some version of that phone call — the frantic
group chat, the favor you have to cash in, the "does anyone know a bass player
who's free *tonight*." The talent is always out there. Finding it in the ninety
minutes before soundcheck is the hard part.

**Backline** is the app I built to close that gap: a local-first network for
musicians, bands, venues, and gig techs, where you can find the players who can
cover your set, watch them actually play, book them, and pay them — all in one
place, all in time for the downbeat.

## What it does

**Find a player, fast.** Search every role a stage needs — guitar, bass, drums,
keys, vocals, horns, strings, DJ, sound tech, lighting tech — and filter by
genre, neighborhood, rate, and who's *available tonight*. An SOS mode cuts
straight to the people who can cover a gig in the next few hours.

**Reels, not resumes.** Every player has a short vertical video reel. Thirty
seconds of someone in the pocket tells a bandleader more than any bio ever
could. You get found because people can *hear* you.

**Bands and open slots.** Band pages list members, upcoming gigs, and open
slots — "need a weekend drummer," "looking for FOH" — that anyone can answer
with one tap.

**A feed for your town.** Follow the venues and bands you care about and keep up
with your scene: show announcements, open mics, new reels, and the urgent
"need a sub" posts you can respond to on the spot.

**Message → book → get paid.** DM any player, send a structured booking offer
right in the thread — gig, venue, date, amount — and when they accept, settle up
through the app. The money's handled before you've coiled your cables.

**Onboarding in under a minute.** Pick your instruments, your neighborhood, and
flip on "available tonight" to show up when someone's drummer bails.

## How it's built

Backline is a mobile-first web app — React and TypeScript on the front end,
with a Postgres backend on [Supabase](https://supabase.com) handling accounts,
profiles, messaging, and bookings. It's designed so the same screens translate
directly to the native iOS and Android apps that come next.

The whole thing ships continuously: every change lands on the live site
automatically, so the app you're using is always the latest one.

## Where it's headed

The prototype you can try today runs on a demo scene set in Austin, Texas — a
fictional cast of drummers, horn players, honky-tonk bands, and listening rooms,
so you can feel how the whole flow works without needing a crowd already on it.
Next up: real reel uploads, push notifications for SOS calls, distance-aware
"near me" search, and in-app payouts with escrow so nobody chases the door guy
for cash again.

The bigger idea is simple. Local music runs on a web of favors and phone
numbers, and that web breaks exactly when you need it most. Backline turns it
into something you can actually search — so the next time a van dies in Waco,
the show still goes on.

## Try it

Backline is live and open to poke around:

**→ [sitin.kitesink.com](https://sitin.kitesink.com)**

Open it, find a drummer two neighborhoods over, watch their reel, message them,
book them. Tonight — not next week.
