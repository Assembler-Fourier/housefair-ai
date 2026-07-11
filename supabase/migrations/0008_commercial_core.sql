create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  area text not null default 'Shared area',
  difficulty text not null check (difficulty in ('easy', 'medium', 'heavy')),
  difficulty_reason text not null default '',
  estimated_minutes integer not null check (estimated_minutes between 1 and 480),
  points integer not null check (points between 1 and 100),
  points_reason text not null default '',
  frequency text not null check (frequency in ('once', 'daily', 'every_second_day', 'weekly', 'monthly')),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'overdue', 'deferred')),
  assigned_member_id uuid references public.household_members(id) on delete set null,
  completed_by_member_id uuid references public.household_members(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  completed_items jsonb not null default '[]'::jsonb check (jsonb_typeof(completed_items) = 'array'),
  proof_required boolean not null default false,
  completion_notes text,
  completed_at timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_task_proofs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.household_tasks(id) on delete cascade,
  uploaded_by_member_id uuid not null references public.household_members(id) on delete cascade,
  before_path text,
  after_path text,
  confidence_score integer check (confidence_score between 0 and 100),
  cleanliness_improvement_score integer check (cleanliness_improvement_score between 0 and 100),
  recommendation text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'clearer_proof_requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, uploaded_by_member_id)
);

create table if not exists public.household_groceries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'Other',
  status text not null default 'needed' check (status in ('available', 'running_low', 'needed', 'bought')),
  quantity text,
  added_by_member_id uuid references public.household_members(id) on delete set null,
  bought_by_member_id uuid references public.household_members(id) on delete set null,
  price numeric(12,2) check (price is null or price >= 0),
  notes text,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  category text not null default 'Other',
  paid_by_member_id uuid not null references public.household_members(id) on delete restrict,
  split_method text not null default 'equal' check (split_method in ('equal', 'exact', 'percentage', 'shares')),
  expense_date date not null default current_date,
  notes text,
  receipt_path text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_expense_splits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  expense_id uuid not null references public.household_expenses(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  owed_amount numeric(12,2) not null check (owed_amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, member_id)
);

create table if not exists public.household_settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  paid_by_member_id uuid not null references public.household_members(id) on delete restrict,
  paid_to_member_id uuid not null references public.household_members(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'bank_transfer' check (method in ('cash', 'bank_transfer', 'other')),
  settled_at timestamptz not null default now(),
  notes text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (paid_by_member_id <> paid_to_member_id)
);

create table if not exists public.household_issues (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null default 'report' check (kind in ('report', 'cleanup_request', 'reminder')),
  category text not null,
  location text not null default 'Shared area',
  description text not null check (char_length(description) between 4 and 1000),
  reporter_member_id uuid not null references public.household_members(id) on delete cascade,
  person_involved_member_id uuid references public.household_members(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'accepted', 'denied', 'disputed', 'resolved', 'confirmed', 'rejected')),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_activity (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_member_id uuid references public.household_members(id) on delete set null,
  event_type text not null,
  title text not null,
  detail text,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.household_ai_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  generated_by_member_id uuid references public.household_members(id) on delete set null,
  plan_type text not null default 'weekly',
  summary text not null,
  recommendations jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.household_notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipient_member_id uuid references public.household_members(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'system',
  read_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists household_groceries_name_idx
  on public.household_groceries (household_id, lower(name));
create index if not exists household_tasks_due_idx
  on public.household_tasks (household_id, due_date, status);
create index if not exists household_tasks_assignee_idx
  on public.household_tasks (assigned_member_id, due_date);
create index if not exists household_expenses_date_idx
  on public.household_expenses (household_id, expense_date desc);
create index if not exists household_activity_feed_idx
  on public.household_activity (household_id, created_at desc);
create index if not exists household_issues_status_idx
  on public.household_issues (household_id, status, created_at desc);

drop trigger if exists household_tasks_touch_updated_at on public.household_tasks;
create trigger household_tasks_touch_updated_at before update on public.household_tasks
for each row execute function public.set_updated_at();
drop trigger if exists household_task_proofs_touch_updated_at on public.household_task_proofs;
create trigger household_task_proofs_touch_updated_at before update on public.household_task_proofs
for each row execute function public.set_updated_at();
drop trigger if exists household_groceries_touch_updated_at on public.household_groceries;
create trigger household_groceries_touch_updated_at before update on public.household_groceries
for each row execute function public.set_updated_at();
drop trigger if exists household_expenses_touch_updated_at on public.household_expenses;
create trigger household_expenses_touch_updated_at before update on public.household_expenses
for each row execute function public.set_updated_at();
drop trigger if exists household_issues_touch_updated_at on public.household_issues;
create trigger household_issues_touch_updated_at before update on public.household_issues
for each row execute function public.set_updated_at();

do $$
declare
  table_name text;
  tenant_tables text[] := array[
    'household_tasks',
    'household_task_proofs',
    'household_groceries',
    'household_expenses',
    'household_expense_splits',
    'household_settlements',
    'household_issues',
    'household_activity',
    'household_ai_plans',
    'household_notifications'
  ];
begin
  foreach table_name in array tenant_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "household_members_read" on public.%I', table_name);
    execute format(
      'create policy "household_members_read" on public.%I for select to authenticated using (public.is_household_member(household_id))',
      table_name
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'household-uploads',
  'household-uploads',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
