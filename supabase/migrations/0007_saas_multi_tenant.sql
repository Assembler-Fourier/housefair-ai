create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_id uuid references public.profiles(id) on delete set null,
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Dublin',
  member_limit integer not null default 8 check (member_limit between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  display_name text not null,
  room_name text,
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, profile_id)
);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text,
  invite_code text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  unique (household_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'incomplete' check (
    status in (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired'
    )
  ),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id)
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.task_templates_global (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'heavy')),
  estimated_minutes integer not null check (estimated_minutes > 0),
  points integer not null check (points > 0),
  default_frequency text not null check (default_frequency in ('daily', 'every_second_day', 'weekly', 'monthly')),
  checklist jsonb not null default '[]',
  proof_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.grocery_templates_global (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.money_categories_global (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default 'circle',
  created_at timestamptz not null default now()
);

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  household_id uuid references public.households(id) on delete cascade,
  event_name text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  ai_requests integer not null default 0,
  receipt_scans integer not null default 0,
  proof_reviews integer not null default 0,
  storage_mb integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, period_start)
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  source text not null,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

insert into public.task_templates_global
  (name, category, difficulty, estimated_minutes, points, default_frequency, checklist, proof_required)
values
  ('Dish duty', 'Kitchen', 'easy', 12, 3, 'daily', '["Wash shared dishes","Dry or stack dishes","Reset sink area"]', false),
  ('Kitchen reset', 'Kitchen', 'medium', 20, 6, 'daily', '["Wipe counters","Clean sink","Check stove","Empty food waste"]', false),
  ('Trash check', 'Trash', 'easy', 8, 3, 'every_second_day', '["Check kitchen bin","Check food waste","Replace bag if needed"]', false),
  ('Clean bathroom', 'Bathroom', 'heavy', 40, 8, 'weekly', '["Toilet cleaned","Sink cleaned","Mirror cleaned","Floor cleaned","Toilet paper checked"]', true),
  ('Vacuum and mop', 'Shared areas', 'heavy', 45, 8, 'weekly', '["Vacuum floor","Mop floor","Return cleaning tools"]', true),
  ('Kitchen deep clean', 'Kitchen', 'heavy', 50, 8, 'weekly', '["Clean shelves","Clean stove","Clean sink","Wipe appliances","Empty food waste"]', true)
on conflict (name) do nothing;

insert into public.grocery_templates_global (name, category) values
  ('Milk', 'Dairy'),
  ('Bread', 'Bakery'),
  ('Eggs', 'Dairy'),
  ('Chicken', 'Meat'),
  ('Dishwashing liquid', 'Cleaning'),
  ('Bin bags', 'Cleaning'),
  ('Tissue rolls', 'Household')
on conflict (name) do nothing;

insert into public.money_categories_global (name, icon) values
  ('Food', 'utensils'),
  ('Cleaning', 'spray-can'),
  ('Bills', 'receipt'),
  ('Internet', 'wifi'),
  ('Electricity', 'zap'),
  ('Transport', 'car'),
  ('Entertainment', 'party-popper'),
  ('Emergency', 'badge-alert'),
  ('Other', 'circle')
on conflict (name) do nothing;

insert into public.households (id, name, slug, currency, timezone, member_limit)
values (
  '00000000-0000-4000-8000-000000009001',
  'Legacy HouseFair Demo',
  'legacy-housefair-demo',
  'EUR',
  'Europe/Dublin',
  8
)
on conflict (id) do nothing;

do $$
declare
  table_name text;
  tenant_tables text[] := array[
    'rooms',
    'areas',
    'users',
    'tasks',
    'task_history',
    'points_ledger',
    'complaints',
    'complaint_votes',
    'groceries',
    'notifications',
    'availability',
    'ai_recommendations',
    'proof_images',
    'user_devices',
    'task_swaps',
    'rewards',
    'audit_logs',
    'recurring_task_rules',
    'shopping_sessions',
    'house_announcements',
    'guest_status',
    'expenses',
    'expense_splits',
    'settlements',
    'recurring_expenses',
    'budgets',
    'money_comments',
    'receipts',
    'push_subscriptions',
    'weekly_reports',
    'house_settings',
    'house_rule_acceptances',
    'user_preferences'
  ];
begin
  foreach table_name in array tenant_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I add column if not exists household_id uuid references public.households(id) on delete cascade', table_name);
      execute format(
        'update public.%I set household_id = %L where household_id is null',
        table_name,
        '00000000-0000-4000-8000-000000009001'
      );
      execute format('create index if not exists %I on public.%I (household_id)', table_name || '_household_id_idx', table_name);
    end if;
  end loop;
end $$;

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.profile_id = auth.uid()
      and hm.status = 'active'
  );
$$;

create or replace function public.is_household_admin(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.profile_id = auth.uid()
      and hm.status = 'active'
      and hm.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.profile_id = auth.uid()
      and hm.status = 'active'
      and hm.role = 'owner'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.app_events enable row level security;
alter table public.usage_counters enable row level security;
alter table public.system_logs enable row level security;
alter table public.task_templates_global enable row level security;
alter table public.grocery_templates_global enable row level security;
alter table public.money_categories_global enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "households_read_members" on public.households;
create policy "households_read_members" on public.households
  for select to authenticated
  using (public.is_household_member(id));

drop policy if exists "households_update_admins" on public.households;
create policy "households_update_admins" on public.households
  for update to authenticated
  using (public.is_household_admin(id))
  with check (public.is_household_admin(id));

drop policy if exists "household_members_read_members" on public.household_members;
create policy "household_members_read_members" on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "household_members_manage_admins" on public.household_members;
create policy "household_members_manage_admins" on public.household_members
  for all to authenticated
  using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));

drop policy if exists "household_invites_manage_admins" on public.household_invites;
create policy "household_invites_manage_admins" on public.household_invites
  for all to authenticated
  using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));

drop policy if exists "subscriptions_read_members" on public.subscriptions;
create policy "subscriptions_read_members" on public.subscriptions
  for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "billing_customers_read_owners" on public.billing_customers;
create policy "billing_customers_read_owners" on public.billing_customers
  for select to authenticated
  using (public.is_household_owner(household_id));

drop policy if exists "billing_events_read_owners" on public.billing_events;
create policy "billing_events_read_owners" on public.billing_events
  for select to authenticated
  using (public.is_household_owner(household_id));

drop policy if exists "app_events_insert_members" on public.app_events;
create policy "app_events_insert_members" on public.app_events
  for insert to authenticated
  with check (profile_id = auth.uid() and public.is_household_member(household_id));

drop policy if exists "usage_counters_read_admins" on public.usage_counters;
create policy "usage_counters_read_admins" on public.usage_counters
  for select to authenticated
  using (public.is_household_admin(household_id));

drop policy if exists "templates_read_authenticated_tasks" on public.task_templates_global;
create policy "templates_read_authenticated_tasks" on public.task_templates_global
  for select to authenticated
  using (true);

drop policy if exists "templates_read_authenticated_groceries" on public.grocery_templates_global;
create policy "templates_read_authenticated_groceries" on public.grocery_templates_global
  for select to authenticated
  using (true);

drop policy if exists "templates_read_authenticated_money" on public.money_categories_global;
create policy "templates_read_authenticated_money" on public.money_categories_global
  for select to authenticated
  using (true);

create index if not exists household_members_profile_id_idx on public.household_members(profile_id);
create index if not exists household_invites_invite_code_idx on public.household_invites(invite_code);
create index if not exists subscriptions_household_status_idx on public.subscriptions(household_id, status);
create index if not exists app_events_household_created_idx on public.app_events(household_id, created_at desc);
