-- Escrow lifecycle states (docs/V1_SPEC.md → Payments & escrow).
-- The old single 'paid' splits into 'held' (money committed, pre-gig) and
-- 'released' (money delivered, post-gig). 'paid' stays in the enum — Postgres
-- can't drop enum values — but the app no longer writes it and maps legacy
-- rows to 'held' at load time.

alter type public.booking_status add value if not exists 'held';
alter type public.booking_status add value if not exists 'released';
