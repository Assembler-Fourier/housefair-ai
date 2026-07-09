create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  task_style text not null default 'evening' check (task_style in ('heavy', 'light', 'weekend', 'evening')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.house_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.house_rule_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  accepted_at timestamptz not null default now()
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  report jsonb not null,
  created_at timestamptz not null default now()
);

insert into public.house_settings (key, value)
values ('house_mode', '{"mode":"normal"}'::jsonb)
on conflict (key) do nothing;

do $$
declare
  table_name text;
  protected_tables text[] := array[
    'user_preferences',
    'house_settings',
    'house_rule_acceptances',
    'weekly_reports'
  ];
begin
  foreach table_name in array protected_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "deny_direct_client_access" on public.%I', table_name);
    execute format(
      'create policy "deny_direct_client_access" on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name
    );
  end loop;
end $$;

create index if not exists user_preferences_user_id_idx on public.user_preferences(user_id);
create index if not exists house_rule_acceptances_user_id_idx on public.house_rule_acceptances(user_id);
create index if not exists weekly_reports_week_start_idx on public.weekly_reports(week_start);
