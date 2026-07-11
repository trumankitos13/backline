-- Backline — catalog seed data (generated from src/lib/data.ts).
-- Regenerate with: node scripts/gen-seed.ts > supabase/seed.sql
-- Catalog tables have public-read/no-write RLS, so this runs as the table
-- owner (SQL editor / service role / `supabase db reset`), which bypasses RLS.

begin;

insert into public.musicians (id, name, handle, bio, genres, gear, neighborhood, distance_miles, rate_min, rate_max, available_tonight, availability, response_mins, gigs_played, verified, links, reels, seed) values
  ('m-dre', 'Dre Okafor', 'dreonthedrums', 'Pocket-first drummer. 12 years touring and session work — if the groove doesn''t move you, I''m not done yet. Sub-friendly: send me a setlist and I''m chart-ready in a day.', ARRAY['Funk', 'Soul', 'Hip-Hop'], ARRAY['Gretsch Brooklyn 4-pc', 'Istanbul Agop cymbals', 'SPD-SX pad', 'In-ears + own mics'], 'East Austin', 1.2, 120, 200, true, ARRAY['Thu', 'Fri', 'Sat', 'Sun'], 8, 214, true, '[{"kind":"instagram","url":"https://instagram.com/dreonthedrums","label":"@dreonthedrums"},{"kind":"spotify","url":"https://open.spotify.com/artist/dreokafor"},{"kind":"youtube","url":"https://youtube.com/@dreonthedrums"}]'::jsonb, null, 1),
  ('m-sam', 'Sam Reyes', 'samreyespercussion', 'Drummer + percussionist (timbales, congas, cajón). Comfortable singing backups. I keep a car kit packed — can be anywhere in town within the hour.', ARRAY['Latin', 'Rock', 'Cumbia'], ARRAY['Yamaha Stage Custom', 'Timbales + congas', 'Cajón for acoustic sets'], 'South Congress', 3.4, 100, 160, true, ARRAY['Wed', 'Fri', 'Sat'], 15, 156, true, null, null, 2),
  ('m-katie', 'Katie Lindqvist', 'katiehitsthings', 'Loud, fast, tasteful when required. Day job in tech so weeknights after 7 and all weekend. I learn sets from voice memos, no charts needed.', ARRAY['Indie', 'Punk', 'Garage'], ARRAY['Ludwig Breakbeats (small stages)', 'C&C 4-pc (big rooms)'], 'Hyde Park', 2.8, 75, 120, false, ARRAY['Fri', 'Sat', 'Sun'], 42, 88, false, null, null, 3),
  ('m-jbird', 'J-Bird Tolliver', 'jbirdbass', 'Bass is a service industry and I''m here to serve the song. 15 years holding it down. Upright available for jazz/acoustic dates (+$40).', ARRAY['Funk', 'R&B', 'Gospel'], ARRAY['Fender P-Bass ''73', 'Upright (3/4)', 'Ampeg rig or DI, your call'], 'East Austin', 1.9, 130, 220, true, ARRAY['Thu', 'Fri', 'Sat'], 12, 302, true, null, null, 4),
  ('m-nina', 'Nina Vo', 'ninavobass', 'Bass + lead or backup vocals. I bring the pedals and the harmonies. Currently playing with Moontower Revival, open to fill-ins on off nights.', ARRAY['Indie', 'Dream Pop', 'Shoegaze'], ARRAY['Fender Mustang bass', 'Pedalboard (chorus-heavy, sorry)'], 'Cherrywood', 2.1, 80, 140, false, ARRAY['Sun', 'Mon', 'Tue'], 55, 74, false, null, null, 5),
  ('m-marcus', 'Marcus Dell', 'marcusdellblues', 'Two decades of Texas blues. Lead or rhythm, slide on request. I know every blues standard in every key, and I mean that literally.', ARRAY['Blues', 'Rock', 'Country'], ARRAY['''62 Strat reissue', '335 clone', 'Deluxe Reverb'], 'South Lamar', 4.6, 110, 180, true, ARRAY['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 20, 460, true, null, null, 6),
  ('m-luz', 'Luz Herrera', 'luzsteel', 'Guitar and pedal steel for your two-steppin'' needs. Founding member of Cedar & Rye. Steel adds instant heartbreak to any ballad — booking me is cheaper than therapy.', ARRAY['Country', 'Americana', 'Honky-Tonk'], ARRAY['Telecaster (obviously)', 'GFI pedal steel', 'Princeton Reverb'], 'Bouldin Creek', 3.9, 120, 190, false, ARRAY['Fri', 'Sat'], 35, 240, true, null, null, 7),
  ('m-theo', 'Theo Park', 'theoparkkeys', 'Keys for jazz trios, soul revues, and everything between. Berklee dropout (best decision I ever made). Rhodes, organ, synth bass if your bassist bails too.', ARRAY['Jazz', 'Soul', 'Neo-Soul'], ARRAY['Nord Stage 3', 'Crumar Mojo organ', 'Own PA for small rooms'], 'Mueller', 2.5, 130, 210, true, ARRAY['Mon', 'Thu', 'Fri', 'Sat'], 10, 275, true, null, null, 8),
  ('m-ada', 'Ada Osei', 'adaosei', 'Music director, keys, and vocals. I run Brass House ATX''s horn-driven soul machine. Available for MD work, session dates, and the occasional wedding that pays properly.', ARRAY['Gospel', 'Soul', 'R&B'], ARRAY['Yamaha CP88', 'Full charts library'], 'Windsor Park', 3.1, 150, 250, false, ARRAY['Sat', 'Sun'], 25, 330, true, '[{"kind":"instagram","url":"https://instagram.com/adaosei","label":"@adaosei"},{"kind":"website","url":"https://adaosei.com"}]'::jsonb, null, 9),
  ('m-cass', 'Cass Monroe', 'cassmonroe', 'Jazz vocalist. Standards, torch songs, and the occasional Bowie cover when the room earns it. Fronting Velvet Hour Thursdays at the Rattlesnake Room.', ARRAY['Jazz', 'Soul', 'Standards'], ARRAY['Own mic (SM58 Beta + vintage ribbon for studio)'], 'Clarksville', 4.2, 140, 230, true, ARRAY['Thu', 'Fri', 'Sat'], 18, 190, true, null, null, 10),
  ('m-ray', 'Ray Delgado', 'raydelgadosax', 'Tenor and alto sax. Horn section arranger — book me and I''ll bring charts for your whole section. Ska past, no regrets.', ARRAY['Funk', 'Jazz', 'Ska'], ARRAY['Selmer Mark VI tenor', 'Yamaha alto', 'Wireless clip mic'], 'East Austin', 1.5, 100, 170, true, ARRAY['Wed', 'Fri', 'Sat'], 30, 265, true, null, null, 11),
  ('m-belle', 'Belle Tran', 'belletran', 'Trumpet + flugelhorn. UT music grad. I read anything you put in front of me and I show up warmed up.', ARRAY['Funk', 'Latin', 'Indie'], ARRAY['Bach Stradivarius', 'Flugelhorn', 'Harmon mute for the moody stuff'], 'North Loop', 3.6, 80, 140, false, ARRAY['Fri', 'Sat', 'Sun'], 40, 95, false, null, null, 12),
  ('m-ivy', 'Ivy Nakamura', 'ivyfiddle', 'Fiddle for barn dances, violin for weddings — same instrument, different invoice. Harmony vocals included free of charge.', ARRAY['Folk', 'Americana', 'Bluegrass'], ARRAY['5-string fiddle', 'Own pickup + preamp'], 'Zilker', 4.8, 90, 160, true, ARRAY['Thu', 'Sat', 'Sun'], 22, 178, true, null, null, 13),
  ('m-kilo', 'DJ Kilowatt', 'djkilowatt', 'Open-format DJ + Ableton live sets. I do club nights, band interludes, and after-parties. Own controller, own lights, zero requests for ''Mr. Brightside'' honored.', ARRAY['House', 'Disco', 'Hip-Hop'], ARRAY['Pioneer DDJ-1000', 'Ableton Push', 'Small LX rig'], 'Downtown', 2.9, 150, 300, true, ARRAY['Thu', 'Fri', 'Sat'], 14, 320, true, '[{"kind":"soundcloud","url":"https://soundcloud.com/djkilowatt"},{"kind":"instagram","url":"https://instagram.com/djkilowatt","label":"@djkilowatt"},{"kind":"spotify","url":"https://open.spotify.com/artist/kilowatt"}]'::jsonb, null, 14),
  ('m-gus', 'Gus Ferreira', 'gusfoh', 'FOH engineer. I''ve mixed everything from punk basements to 1,200-cap rooms. Your band sounds better when the person behind the desk cares — I care.', ARRAY['Live Sound', 'FOH', 'Monitors'], ARRAY['Own mic locker', 'X32 rack for DIY rooms', 'RF coordination'], 'St. Johns', 5.2, 150, 275, true, ARRAY['Wed', 'Thu', 'Fri', 'Sat'], 16, 410, true, null, null, 15),
  ('m-pri', 'Priya Anand', 'priyalights', 'Lighting design + live visuals. I make your $200 bar gig look like a $20 ticket. Touring rig fits in a hatchback.', ARRAY['Lighting', 'Visuals', 'Projection'], ARRAY['4x moving heads', 'Hazer', 'Resolume rig for projections'], 'Riverside', 3.8, 90, 180, false, ARRAY['Fri', 'Sat'], 50, 120, false, null, null, 16)
on conflict (id) do nothing;

insert into public.musician_instruments (musician_id, instrument, level, years) values
  ('m-dre', 'drums', 'pro', 12),
  ('m-sam', 'drums', 'pro', 9),
  ('m-sam', 'vocals', 'semi-pro', 4),
  ('m-katie', 'drums', 'semi-pro', 6),
  ('m-jbird', 'bass', 'pro', 15),
  ('m-nina', 'bass', 'semi-pro', 7),
  ('m-nina', 'vocals', 'semi-pro', 7),
  ('m-marcus', 'guitar', 'pro', 20),
  ('m-luz', 'guitar', 'pro', 11),
  ('m-luz', 'pedal-steel', 'pro', 8),
  ('m-theo', 'keys', 'pro', 14),
  ('m-ada', 'keys', 'pro', 16),
  ('m-ada', 'vocals', 'pro', 16),
  ('m-cass', 'vocals', 'pro', 10),
  ('m-ray', 'sax', 'pro', 18),
  ('m-belle', 'trumpet', 'semi-pro', 8),
  ('m-ivy', 'violin', 'pro', 13),
  ('m-kilo', 'dj', 'pro', 10),
  ('m-gus', 'sound-tech', 'pro', 17),
  ('m-pri', 'lighting-tech', 'semi-pro', 5)
on conflict (musician_id, instrument) do nothing;

insert into public.videos (id, musician_id, title, duration_sec, plays, likes, palette_from, palette_to, tags) values
  ('v-dre-1', 'm-dre', 'Pocket groove @ 92bpm', 34, 12800, 1430, '#f59e0b', '#7c2d12', ARRAY['funk', 'pocket']),
  ('v-dre-2', 'm-dre', 'Half-time shuffle breakdown', 51, 8900, 990, '#ef4444', '#1e1b4b', ARRAY['shuffle', 'lesson']),
  ('v-dre-3', 'm-dre', 'Live at Sunset Ballroom', 45, 21400, 2100, '#8b5cf6', '#0c0a09', ARRAY['live']),
  ('v-sam-1', 'm-sam', 'Cumbia groove, full kit', 28, 6400, 720, '#10b981', '#78350f', ARRAY['cumbia']),
  ('v-sam-2', 'm-sam', 'Timbales solo (loud!)', 39, 15200, 1800, '#f97316', '#312e81', ARRAY['latin', 'solo']),
  ('v-katie-1', 'm-katie', 'Garage beat, one take', 22, 3100, 410, '#ec4899', '#134e4a', ARRAY['punk']),
  ('v-jbird-1', 'm-jbird', 'Gospel chops but tasteful', 41, 18700, 2400, '#3b82f6', '#422006', ARRAY['gospel', 'groove']),
  ('v-jbird-2', 'm-jbird', 'Upright: ''Autumn Leaves''', 58, 5200, 610, '#a16207', '#1c1917', ARRAY['jazz', 'upright']),
  ('v-nina-1', 'm-nina', 'Bass + vox live loop', 47, 4400, 580, '#8b5cf6', '#164e63', ARRAY['dreampop']),
  ('v-marcus-1', 'm-marcus', 'Slow blues in G, one take', 55, 9800, 1200, '#0ea5e9', '#450a0a', ARRAY['blues', 'slide']),
  ('v-marcus-2', 'm-marcus', 'Chicken pickin'' warm-up', 31, 7600, 890, '#eab308', '#14532d', ARRAY['country']),
  ('v-luz-1', 'm-luz', 'Steel solo: ''Crying Time''', 44, 11300, 1500, '#f43f5e', '#1e3a8a', ARRAY['pedalsteel']),
  ('v-theo-1', 'm-theo', 'Rhodes over neo-soul changes', 38, 14100, 1900, '#14b8a6', '#4c1d95', ARRAY['neosoul', 'rhodes']),
  ('v-theo-2', 'm-theo', 'Organ trio burner', 49, 6800, 750, '#f59e0b', '#0f172a', ARRAY['jazz', 'organ']),
  ('v-ada-1', 'm-ada', 'Vocal run breakdown 🔥', 26, 22800, 3400, '#d946ef', '#713f12', ARRAY['vocals', 'gospel']),
  ('v-cass-1', 'm-cass', '''Round Midnight (live)', 60, 9400, 1300, '#6366f1', '#1c1917', ARRAY['jazz', 'live']),
  ('v-ray-1', 'm-ray', 'Tenor solo over ''Cissy Strut''', 36, 8100, 940, '#f97316', '#064e3b', ARRAY['funk', 'sax']),
  ('v-belle-1', 'm-belle', 'Flugel over lofi changes', 33, 5600, 720, '#22d3ee', '#7c2d12', ARRAY['chill']),
  ('v-ivy-1', 'm-ivy', 'Fiddle tune medley', 42, 7300, 850, '#84cc16', '#581c87', ARRAY['bluegrass']),
  ('v-kilo-1', 'm-kilo', 'Disco edit set, rooftop', 57, 16900, 2200, '#e11d48', '#0c4a6e', ARRAY['house', 'live']),
  ('v-gus-1', 'm-gus', 'Ringing out monitors 101', 48, 4900, 640, '#64748b', '#701a75', ARRAY['tech', 'lesson']),
  ('v-pri-1', 'm-pri', 'Before/after: bar stage glow-up', 29, 10300, 1600, '#a855f7', '#0e7490', ARRAY['lighting'])
on conflict (id) do nothing;

insert into public.reviews (id, musician_id, author, role, rating, body, review_date) values
  ('r-dre-1', 'm-dre', 'Cass Monroe', 'Bandleader, Velvet Hour', 5, 'Called Dre at 4pm for an 8pm downbeat. He walked in with the set memorized. Unreal.', 'Jun 2026'),
  ('r-dre-2', 'm-dre', 'Prickly Pear Listening Room', 'Venue', 5, 'Professional, on time, great with our sound tech. Booked him three more times.', 'May 2026'),
  ('r-sam-1', 'm-sam', 'Luz Herrera', 'Guitarist, Cedar & Rye', 5, 'Sat in with zero rehearsal and nailed a 2-hour set. Crowd loved the timbales feature.', 'Jun 2026'),
  ('r-katie-1', 'm-katie', 'Moontower Revival', 'Band', 5, 'Katie''s our permanent drummer for a reason. Hits like a truck, shows up early.', 'Apr 2026'),
  ('r-jbird-1', 'm-jbird', 'Ada Osei', 'MD, Brass House ATX', 5, 'The most reliable low end in the city. Reads, improvises, never overplays.', 'Jun 2026'),
  ('r-marcus-1', 'm-marcus', 'The Blue Armadillo', 'Venue', 5, 'Marcus has bailed out three bands on our stage this year alone. A scene treasure.', 'May 2026'),
  ('r-luz-1', 'm-luz', 'Rattlesnake Room', 'Venue', 5, 'Our Wednesday honky-tonk residency wouldn''t exist without Luz.', 'Jun 2026'),
  ('r-theo-1', 'm-theo', 'Velvet Hour', 'Band', 5, 'Theo is the reason people think our trio has four members. Huge sound.', 'Jun 2026'),
  ('r-ada-1', 'm-ada', 'J-Bird Tolliver', 'Bassist', 5, 'Best MD I''ve worked with. Rehearsals run on time and the charts are immaculate.', 'May 2026'),
  ('r-ivy-1', 'm-ivy', 'Cedar & Rye', 'Band', 5, 'Ivy turned our duo set into a real string band. Books fast on weekends.', 'Jun 2026'),
  ('r-gus-1', 'm-gus', 'Warehouse 512', 'Venue', 5, 'Gus is our first-call FOH sub. Bands ask for him by name afterward.', 'Apr 2026')
on conflict (id) do nothing;

insert into public.venues (id, name, neighborhood, capacity, followers, vibe, managers, backline, hiring, links, seed) values
  ('v-armadillo', 'The Blue Armadillo', 'East Austin', 250, 5200, 'Sticky floors, perfect sound, the best Tuesday crowd in town.', '{}', ARRAY['House drum kit (Gretsch 4-pc)', 'Full PA + monitors', 'Two guitar amps + bass rig', 'Backline mics + DIs'], '{"role":"sound-tech","note":"Tuesday house FOH — weekly, reliable pay."}'::jsonb, '[{"kind":"website","url":"https://bluearmadillo.com"},{"kind":"instagram","url":"https://instagram.com/bluearmadilloatx","label":"@bluearmadilloatx"}]'::jsonb, 31),
  ('v-rattlesnake', 'Rattlesnake Room', 'Downtown', 180, 3900, 'Honky-tonk Wednesdays, jazz Thursdays, chaos Fridays.', '{}', ARRAY['House upright piano', 'PA + 4 monitor mixes', 'Guitar + bass amps on request'], null, '[{"kind":"website","url":"https://rattlesnakeroom.com"},{"kind":"bandsintown","url":"https://bandsintown.com/v/rattlesnake-room"}]'::jsonb, 32),
  ('v-sunset', 'Sunset Ballroom', 'South Congress', 900, 12400, 'The mid-size room every touring band remembers.', '{}', ARRAY['Line-array PA + in-ear support', 'Full backline (drums, amps, keys stand)', 'House lighting rig + LD available'], '{"role":"lighting-tech","note":"Sub lighting techs for touring dates — union-friendly."}'::jsonb, '[{"kind":"website","url":"https://sunsetballroom.com"},{"kind":"instagram","url":"https://instagram.com/sunsetballroom","label":"@sunsetballroom"}]'::jsonb, 33),
  ('v-prickly', 'Prickly Pear Listening Room', 'Clarksville', 120, 2100, 'Pin-drop quiet listening room. Phones away, hearts open.', '{}', ARRAY['Grand piano (tuned weekly)', 'Boutique PA, no monitors (it''s that quiet)'], null, '[{"kind":"website","url":"https://pricklypearroom.com"}]'::jsonb, 34),
  ('v-warehouse', 'Warehouse 512', 'Riverside', 1200, 8800, 'Big room, big system, late nights.', '{}', ARRAY['Massive PA + subs', 'DJ booth (Pioneer CDJs + mixer)', 'Full backline + risers'], '{"role":"sound-tech","note":"Weekend club-night monitor engineers."}'::jsonb, '[{"kind":"instagram","url":"https://instagram.com/warehouse512","label":"@warehouse512"}]'::jsonb, 35)
on conflict (id) do nothing;

insert into public.bands (id, name, genres, bio, neighborhood, followers, kind, owner_id, links, seed) values
  ('b-moontower', 'Moontower Revival', ARRAY['Indie Rock', 'Garage'], 'Four-piece indie rock. Loud guitars, louder feelings. Debut EP ''Porch Light'' out now — recorded live in a garage in Hyde Park, and it sounds like it (on purpose).', 'Hyde Park', 1840, null, null, '[{"kind":"spotify","url":"https://open.spotify.com/artist/moontower"},{"kind":"instagram","url":"https://instagram.com/moontowerrevival","label":"@moontowerrevival"},{"kind":"bandcamp","url":"https://moontowerrevival.bandcamp.com"}]'::jsonb, 21),
  ('b-brasshouse', 'Brass House ATX', ARRAY['Funk', 'Soul', 'Brass'], 'Nine-piece horn-driven funk machine, MD''d by Ada Osei. We play weddings that want to feel like block parties and block parties that want to feel like weddings.', 'East Austin', 4620, null, null, '[{"kind":"instagram","url":"https://instagram.com/brasshouseatx","label":"@brasshouseatx"},{"kind":"website","url":"https://brasshouseatx.com"}]'::jsonb, 22),
  ('b-cedarrye', 'Cedar & Rye', ARRAY['Country', 'Americana'], 'Honky-tonk with a songwriter''s heart. Wednesday residency at the Rattlesnake Room. Bring your boots, or don''t, we''re not the dress code police.', 'Bouldin Creek', 2310, null, null, '[{"kind":"spotify","url":"https://open.spotify.com/artist/cedarrye"},{"kind":"bandsintown","url":"https://bandsintown.com/a/cedar-rye"}]'::jsonb, 23),
  ('b-velvet', 'Velvet Hour', ARRAY['Jazz', 'Soul'], 'Late-night jazz for people who talk quietly in bars. Cass Monroe on vocals, Theo Park on keys. Thursdays at the Rattlesnake Room, occasionally somewhere fancier.', 'Clarksville', 1290, null, null, '[{"kind":"instagram","url":"https://instagram.com/velvethouratx","label":"@velvethouratx"},{"kind":"youtube","url":"https://youtube.com/@velvethour"}]'::jsonb, 24),
  ('b-nightmarket', 'Night Market', ARRAY['Electronic', 'Live House'], 'DJ Kilowatt + live drums + lights by Priya. Half DJ set, half live band, all sweat. If the floor isn''t shaking we issue refunds (we have never issued a refund).', 'Downtown', 3480, null, null, '[{"kind":"soundcloud","url":"https://soundcloud.com/nightmarketatx"},{"kind":"instagram","url":"https://instagram.com/nightmarketatx","label":"@nightmarketatx"}]'::jsonb, 25)
on conflict (id) do nothing;

insert into public.band_members (band_id, musician_id, role, admin, performing) values
  ('b-moontower', 'm-katie', 'Drums', false, null),
  ('b-moontower', 'm-nina', 'Bass / Vocals', false, null),
  ('b-moontower', 'm-marcus', 'Guitar', false, null),
  ('b-brasshouse', 'm-ada', 'MD / Keys / Vocals', true, null),
  ('b-brasshouse', 'm-dre', 'Drums', false, null),
  ('b-brasshouse', 'm-jbird', 'Bass', false, null),
  ('b-brasshouse', 'm-ray', 'Tenor Sax', false, null),
  ('b-brasshouse', 'm-belle', 'Trumpet', false, null),
  ('b-cedarrye', 'm-luz', 'Guitar / Pedal Steel', true, null),
  ('b-cedarrye', 'm-ivy', 'Fiddle', false, null),
  ('b-velvet', 'm-cass', 'Vocals', false, null),
  ('b-velvet', 'm-theo', 'Keys', false, null),
  ('b-nightmarket', 'm-kilo', 'DJ / Production', false, null),
  ('b-nightmarket', 'm-pri', 'Lighting / Visuals', false, null)
on conflict (band_id, musician_id) do nothing;

insert into public.band_open_slots (band_id, instrument, note) values
  ('b-moontower', 'keys', 'Synth/organ for fall tour. Must tolerate van smell.'),
  ('b-brasshouse', 'sound-tech', 'Regular FOH for 2-3 gigs/month. We travel with charts and stems.'),
  ('b-cedarrye', 'drums', 'URGENT: our drummer''s van died in Waco. Need a sub for TONIGHT, 9pm, Rattlesnake Room. Brushes-friendly.'),
  ('b-cedarrye', 'bass', 'Permanent slot. Upright a plus, harmony vocals a bigger plus.'),
  ('b-velvet', 'bass', 'Upright preferred for the trio dates. Standards repertoire required.'),
  ('b-nightmarket', 'vocals', 'Guest vocalists for club nights. House/disco vibes, tops-lines welcome.');

insert into public.gigs (id, title, venue_id, band_id, band_ids, player_ids, description, date, time, payout, ticket, ticket_url, sub_needed, links, source, external_url) values
  ('e-cedarrye-rattlesnake', 'Cedar & Rye — Honky-Tonk Night', 'v-rattlesnake', 'b-cedarrye', null, null, 'The Wednesday residency rolls on. Two-steppers welcome, brushes-and-upright energy, and a guest fiddle spot if Ivy''s feeling it. Doors 8:30, downbeat 9.', 'Tonight', '9:00 PM', 150, '$10', 'https://example.com/tix/cedar-rye', '{"instrument":"drums","payout":150,"note":"Drummer''s van died in Waco. Brushes-friendly, charts ready, soundcheck 7:30."}'::jsonb, '[{"kind":"bandsintown","url":"https://bandsintown.com/e/cedar-rye"}]'::jsonb, 'backline', null),
  ('e-moontower-armadillo', 'Moontower Revival — ''Porch Light'' EP Release', 'v-armadillo', 'b-moontower', null, null, 'Loud guitars, louder feelings. First 50 through the door get a kitchen-screen-printed poster. Local openers TBA.', 'Fri Jul 10', '10:00 PM', null, '$12', 'https://example.com/tix/moontower-ep', null, '[{"kind":"instagram","url":"https://instagram.com/moontowerrevival"}]'::jsonb, 'backline', null),
  ('e-brasshouse-sunset', 'Brass House ATX + guests', 'v-sunset', 'b-brasshouse', null, ARRAY['m-cass'], 'Nine-piece horn-driven funk turns the ballroom into a block party. Special guest vocal spot from Cass Monroe.', 'Sat Jul 11', '8:30 PM', null, '$18', 'https://example.com/tix/brasshouse', null, null, 'ticketmaster', 'https://ticketmaster.com/event/brasshouse'),
  ('e-velvet-prickly', 'Velvet Hour: Standards & Stories', 'v-prickly', 'b-velvet', null, null, 'Late-night jazz for people who talk quietly in bars. Torch songs, a Bowie cover if the room earns it.', 'Thu Jul 9', '7:30 PM', null, '$15', 'https://example.com/tix/velvet-hour', '{"instrument":"bass","payout":175,"note":"Upright bassist for the standards set — ''Autumn Leaves'' in two keys and you''re in."}'::jsonb, null, 'backline', null),
  ('e-nightmarket-warehouse', 'Night Market — All Night Long', 'v-warehouse', 'b-nightmarket', null, null, 'Half DJ set, half live band, all sweat. New live rig with real drums and a lighting system that has its own weather.', 'Sat Jul 11', '11:00 PM', null, '$20', 'https://example.com/tix/night-market', null, null, 'seatgeek', 'https://seatgeek.com/night-market-tickets'),
  ('e-openmic-armadillo', 'Tuesday Open Mic', 'v-armadillo', null, null, null, 'Sign-ups at 6, music at 7. Backline provided (real amps, we fixed the broken one). Three songs a slot.', 'Tue Jul 7', '7:00 PM', null, null, null, null, null, 'backline', null)
on conflict (id) do nothing;

insert into public.feed_posts (id, kind, author_type, author_id, text, ago, likes, comments, gig_id, video, video_owner_id, sub_for) values
  ('p-1', 'need-sub', 'band', 'b-cedarrye', 'SOS, Austin. Our drummer''s van gave out in Waco and tonight''s residency is NOT cancelling. Need a country-comfortable drummer, brushes a plus. Charts ready, soundcheck 7:30.', '2h', 34, 11, 'e-cedarrye-rattlesnake', null, null, '{"instrument":"drums","date":"Tonight · 9:00 PM","payout":150}'::jsonb),
  ('p-2', 'gig', 'band', 'b-moontower', 'EP RELEASE FRIDAY 🌙 ''Porch Light'' gets loud at the Blue Armadillo. First 50 through the door get a screen-printed poster Nina made in her kitchen.', '4h', 128, 23, 'e-moontower-armadillo', null, null, null),
  ('p-3', 'video', 'player', 'm-dre', 'New reel: half-time shuffle breakdown. This one took 30 takes and one noise complaint.', '5h', 412, 37, null, '{"id":"v-dre-2","title":"Half-time shuffle breakdown","durationSec":51,"plays":8900,"likes":990,"palette":["#ef4444","#1e1b4b"],"tags":["shuffle","lesson"]}'::jsonb, 'm-dre', null),
  ('p-4', 'open-mic', 'venue', 'v-armadillo', 'Tuesday Open Mic sign-ups open at 6, music at 7. Backline provided (yes, real amps, no, not the broken one from last month — we fixed it).', '8h', 56, 9, 'e-openmic-armadillo', null, null, null),
  ('p-5', 'gig', 'venue', 'v-sunset', 'SATURDAY: Brass House ATX turns our ballroom into a block party. Nine musicians, four horns, zero chill. A few tickets left.', '12h', 203, 31, 'e-brasshouse-sunset', null, null, null),
  ('p-6', 'news', 'venue', 'v-rattlesnake', 'We''re opening the back room for rehearsal rentals — $15/hr for Backline members, backline included. Weekday afternoons only for now.', '1d', 89, 17, null, null, null, null),
  ('p-7', 'video', 'player', 'm-ada', 'Someone asked how the run in the bridge works. Slowed it down. You''re welcome and I''m sorry.', '1d', 634, 52, null, '{"id":"v-ada-1","title":"Vocal run breakdown 🔥","durationSec":26,"plays":22800,"likes":3400,"palette":["#d946ef","#713f12"],"tags":["vocals","gospel"]}'::jsonb, 'm-ada', null),
  ('p-8', 'need-sub', 'band', 'b-velvet', 'Velvet Hour needs an upright bassist for Thursday at Prickly Pear. Standards set — if you know ''Autumn Leaves'' in two keys you''re 80% there.', '1d', 21, 6, 'e-velvet-prickly', null, null, '{"instrument":"bass","date":"Thu Jul 9 · 7:30 PM","payout":175}'::jsonb),
  ('p-9', 'gig', 'band', 'b-nightmarket', 'Saturday. Warehouse 512. New live set with real drums this time. Priya built a lighting rig that has its own weather system.', '2d', 176, 28, 'e-nightmarket-warehouse', null, null, null),
  ('p-10', 'news', 'venue', 'v-prickly', 'Reminder: we pay every artist a guarantee, every night, no ''exposure'' math. Booking November now — send your reel through your Backline profile.', '2d', 342, 44, null, null, null, null),
  ('p-11', 'video', 'player', 'm-pri', 'Before/after from Friday''s bar gig. Same stage, same band, $90 of haze and intention.', '3d', 289, 33, null, '{"id":"v-pri-1","title":"Before/after: bar stage glow-up","durationSec":29,"plays":10300,"likes":1600,"palette":["#a855f7","#0e7490"],"tags":["lighting"]}'::jsonb, 'm-pri', null),
  ('p-12', 'news', 'band', 'b-brasshouse', 'We''re looking for a regular FOH engineer — 2-3 gigs a month, real budget. Details on our open slots. Tell your favorite sound person.', '3d', 67, 12, null, null, null, null)
on conflict (id) do nothing;

commit;

