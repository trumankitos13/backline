-- Existing enum values must commit before later migrations can safely use them.
alter type public.booking_status add value if not exists 'disputed';
alter type public.booking_status add value if not exists 'refunded';
alter type public.payment_status add value if not exists 'capture_pending';
alter type public.notification_kind add value if not exists 'booking_disputed';
alter type public.notification_kind add value if not exists 'payment_released';
