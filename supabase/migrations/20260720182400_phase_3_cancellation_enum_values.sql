-- Commit before the next migration uses this queue state.
alter type public.payment_status add value if not exists 'cancellation_pending';
