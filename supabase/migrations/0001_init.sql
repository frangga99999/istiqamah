-- Personal Prayer Discipline Assistant — initial schema (PRD §70–78) + RLS (§110).
-- Identity comes from Supabase auth.users; every table is scoped by user_id and
-- protected by row-level security so prayer history is strictly private (§91).
--
-- Intentionally NOT stored: prayer_schedule (PRD §73). Prayer times are deterministic
-- from settings, so they are computed client-side and cached in the browser for offline
-- (PRD §89/§105) rather than duplicated per-user per-day in Postgres.

-- ── helpers ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ── user_profiles (§71) ────────────────────────────────────────────────────
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activity_type text,
  starting_condition text,
  mosque_frequency text,
  sunnah_frequency text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── user_prayer_settings (§72) + goal/reminder preferences (§67) ────────────
create table public.user_prayer_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  timezone text not null default 'Asia/Jakarta',
  location_label text,
  calculation_method text not null default 'kemenag',
  asr_method text not null default 'standard',
  fajr_offset int not null default 0,
  dhuhr_offset int not null default 0,
  asr_offset int not null default 0,
  maghrib_offset int not null default 0,
  isha_offset int not null default 0,
  mosque_priority boolean not null default true,
  sunnah_tracking boolean not null default true,
  adaptive_reminders boolean not null default true,
  manual_lead_minutes int,                 -- set only when adaptive is off (§68)
  max_reminders int not null default 3,    -- §48
  sound boolean not null default true,
  vibration boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ── prayer_logs (§74) ──────────────────────────────────────────────────────
create table public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  prayer_start_at timestamptz not null,
  reminder_first_at timestamptz,
  preparation_started_at timestamptz,
  performed_at timestamptz,
  performed_location text check (performed_location in ('mosque','congregation','alone')),
  congregational boolean,
  sunnah_before boolean not null default false,
  sunnah_after boolean not null default false,
  manual_time boolean not null default false,   -- user corrected the time (§29)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, prayer)
);
create index prayer_logs_user_date_idx on public.prayer_logs (user_id, date desc);

-- ── reminder_events (§75) ──────────────────────────────────────────────────
create table public.reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer text not null,
  date date not null,
  scheduled_at timestamptz,
  sent_at timestamptz,
  lead_time_minutes int,
  reminder_type text,
  opened_at timestamptz,
  action_taken text,
  created_at timestamptz not null default now()
);
create index reminder_events_user_idx on public.reminder_events (user_id, date desc);

-- ── behavior_profiles (§76) — cached rolling profile per prayer ─────────────
create table public.behavior_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer text not null,
  average_delay int not null default 0,
  average_preparation_time int not null default 0,
  optimal_lead_time int not null default 0,
  risk_level text not null default 'MEDIUM',
  consistency_score real not null default 0,
  sample_size int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, prayer)
);

-- ── goals / weekly focus (§77) ─────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null,
  prayer text,
  target_value int,
  start_date date not null default current_date,
  status text not null default 'active',   -- active | done | dismissed
  created_at timestamptz not null default now()
);
create index goals_user_status_idx on public.goals (user_id, status);

-- ── weekly_reviews (§78) ───────────────────────────────────────────────────
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  prayer_completion real,
  early_prayer_rate real,
  mosque_rate real,
  average_delay int,
  primary_focus text,
  generated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ── push_subscriptions — Web Push endpoints (§87) ──────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ── updated_at triggers ────────────────────────────────────────────────────
create trigger t_user_profiles_updated before update on public.user_profiles
  for each row execute function public.set_updated_at();
create trigger t_user_prayer_settings_updated before update on public.user_prayer_settings
  for each row execute function public.set_updated_at();
create trigger t_prayer_logs_updated before update on public.prayer_logs
  for each row execute function public.set_updated_at();

-- ── auto-provision profile + settings on signup ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.user_prayer_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security: every table, owner-only (§91/§110) ──────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','user_prayer_settings','prayer_logs','reminder_events',
    'behavior_profiles','goals','weekly_reviews','push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_owner', t);
  end loop;
end $$;
