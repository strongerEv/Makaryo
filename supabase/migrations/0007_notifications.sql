-- Makaryo — 0007: langganan web push, pusat notifikasi, dan penanda pengiriman.

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Menjaga agar satu pengingat hanya terkirim sekali per penugasan.
create table public.notification_deliveries (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.schedule_assignments (id) on delete cascade,
  offset_minutes smallint not null,
  sent_at        timestamptz not null default now(),
  unique (assignment_id, offset_minutes)
);

alter table public.push_subscriptions      enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "langganan push milik sendiri"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifikasi milik sendiri dibaca"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifikasi milik sendiri ditandai terbaca"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin membaca penanda pengiriman"
  on public.notification_deliveries for select
  using (public.is_admin());
