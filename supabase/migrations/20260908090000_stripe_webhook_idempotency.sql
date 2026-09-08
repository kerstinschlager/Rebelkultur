-- Prevent duplicate Stripe webhook deliveries from being processed repeatedly.
-- The webhook uses the service role, so no client-facing RLS policy is required.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from anon, authenticated, public;
