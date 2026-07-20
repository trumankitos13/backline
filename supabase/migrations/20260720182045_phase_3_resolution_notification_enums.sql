-- Enum values must commit before the next migration uses them.
alter type public.notification_kind add value if not exists 'payment_refunded';
