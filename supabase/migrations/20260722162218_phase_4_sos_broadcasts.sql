-- Enum values must commit before the following migration can use them.
alter type public.notification_kind add value if not exists 'sos_request';
alter type public.notification_kind add value if not exists 'sos_accepted';
alter type public.notification_kind add value if not exists 'sos_missed';
