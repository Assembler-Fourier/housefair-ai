create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  floor text not null check (floor in ('ground', 'top')),
  capacity integer not null check (capacity > 0),
  privacy_level text not null check (privacy_level in ('shared', 'single', 'private_bathroom')),
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('Alex', 'Blair', 'Casey', 'Devin', 'Ellis', 'Finley')),
  room_id uuid not null references public.rooms(id) on delete restrict,
  room_name text not null,
  avatar_gradient text not null,
  current_points integer not null default 0,
  cleaning_streak integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  floor text not null check (floor in ('ground', 'top', 'private')),
  description text not null,
  everyone_uses boolean not null default true,
  excluded_members text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'heavy')),
  points integer not null check (points > 0),
  assigned_person uuid references public.users(id) on delete set null,
  completed_by uuid references public.users(id) on delete set null,
  due_date date not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'overdue')),
  proof_required boolean not null default false,
  photo_url text,
  before_photo_url text,
  after_photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  assigned_person uuid references public.users(id) on delete set null,
  completed_by uuid not null references public.users(id) on delete cascade,
  points_awarded integer not null check (points_awarded >= 0),
  difficulty text not null check (difficulty in ('easy', 'medium', 'heavy')),
  completed_at timestamptz not null default now(),
  photo_url text,
  ai_proof_status text check (ai_proof_status in ('pending', 'accepted', 'needs_clearer_proof')),
  notes text
);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  complaint_id uuid,
  points_delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.users(id) on delete cascade,
  person_involved uuid not null references public.users(id) on delete cascade,
  location text not null,
  category text not null check (category in ('Dirty dishes', 'Kitchen mess', 'Bathroom mess', 'Trash issue', 'Noise', 'Guest issue', 'Missed task', 'Other')),
  description text not null,
  image_url text,
  date date not null default current_date,
  status text not null default 'open' check (status in ('open', 'accepted', 'denied', 'disputed', 'resolved', 'confirmed', 'rejected')),
  confirm_votes integer not null default 0,
  reject_votes integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.points_ledger
  add constraint points_ledger_complaint_id_fkey
  foreign key (complaint_id) references public.complaints(id) on delete set null;

create table if not exists public.complaint_votes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  voter uuid not null references public.users(id) on delete cascade,
  supports_complaint boolean not null,
  created_at timestamptz not null default now(),
  unique (complaint_id, voter)
);

create table if not exists public.groceries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  status text not null default 'available' check (status in ('available', 'running_low', 'needed', 'bought')),
  added_by uuid references public.users(id) on delete set null,
  bought_by uuid references public.users(id) on delete set null,
  date date not null default current_date,
  price numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient uuid references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null check (type in ('task', 'complaint', 'ai', 'grocery', 'system')),
  scheduled_for timestamptz,
  read_at timestamptz,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  preferred_window text not null default 'Evening',
  unavailable boolean not null default false,
  notes text,
  unique (user_id, day_of_week)
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('weekly_plan', 'grocery_prediction', 'proof_review', 'reminder')),
  title text not null,
  summary text not null,
  recommendation jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'applied', 'dismissed')),
  generated_by text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.proof_images (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references public.users(id) on delete cascade,
  before_url text,
  after_url text,
  ai_status text not null default 'pending' check (ai_status in ('pending', 'accepted', 'needs_clearer_proof')),
  ai_feedback text not null default 'Please upload clearer proof',
  confidence_score integer check (confidence_score between 0 and 100),
  cleanliness_improvement_score integer check (cleanliness_improvement_score between 0 and 100),
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  person_id uuid not null references public.users(id) on delete cascade,
  pin_hash text not null,
  session_token_hash text,
  session_expires_at timestamptz,
  last_active_at timestamptz not null default now(),
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.task_swaps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete cascade,
  accepted_by uuid references public.users(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'cancelled')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('cleaning_champion', 'bathroom_hero', 'trash_master', 'helping_hand', 'perfect_week')),
  title text not null,
  description text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, kind, earned_at)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  device_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_task_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'heavy')),
  points integer not null check (points > 0),
  frequency text not null check (frequency in ('daily', 'every_second_day', 'weekly')),
  day_of_week integer check (day_of_week between 0 and 6),
  proof_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (title, location, frequency)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.prevent_invalid_bathroom_assignment()
returns trigger
language plpgsql
as $$
declare
  assignee_name text;
begin
  if new.location = 'Top floor bathroom' and new.assigned_person is not null then
    select name into assignee_name from public.users where id = new.assigned_person;
    if assignee_name = 'Blair' then
      raise exception 'Blair cannot be assigned to top floor bathroom cleaning';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_prevent_invalid_bathroom_assignment on public.tasks;
create trigger tasks_prevent_invalid_bathroom_assignment
before insert or update of assigned_person, location on public.tasks
for each row execute function public.prevent_invalid_bathroom_assignment();

insert into public.rooms (id, name, floor, capacity, privacy_level) values
  ('00000000-0000-4000-8000-000000000201', 'Alex-Blair Room', 'top', 2, 'shared'),
  ('00000000-0000-4000-8000-000000000202', 'Casey-Devin-Ellis Room', 'top', 3, 'shared'),
  ('00000000-0000-4000-8000-000000000203', 'Finley Room', 'top', 1, 'single')
on conflict (id) do update set
  name = excluded.name,
  floor = excluded.floor,
  capacity = excluded.capacity,
  privacy_level = excluded.privacy_level;

insert into public.users (id, name, room_id, room_name, avatar_gradient, current_points, cleaning_streak) values
  ('00000000-0000-4000-8000-000000000101', 'Alex', '00000000-0000-4000-8000-000000000201', 'Alex-Blair Room', 'from-emerald-400 via-teal-500 to-sky-500', 34, 5),
  ('00000000-0000-4000-8000-000000000102', 'Blair', '00000000-0000-4000-8000-000000000201', 'Alex-Blair Room', 'from-amber-300 via-orange-500 to-rose-500', 28, 2),
  ('00000000-0000-4000-8000-000000000103', 'Casey', '00000000-0000-4000-8000-000000000202', 'Casey-Devin-Ellis Room', 'from-cyan-400 via-blue-500 to-indigo-500', 31, 4),
  ('00000000-0000-4000-8000-000000000104', 'Devin', '00000000-0000-4000-8000-000000000202', 'Casey-Devin-Ellis Room', 'from-lime-300 via-green-500 to-emerald-600', 23, 1),
  ('00000000-0000-4000-8000-000000000105', 'Ellis', '00000000-0000-4000-8000-000000000202', 'Casey-Devin-Ellis Room', 'from-fuchsia-400 via-rose-500 to-red-500', 26, 3),
  ('00000000-0000-4000-8000-000000000106', 'Finley', '00000000-0000-4000-8000-000000000203', 'Finley Room', 'from-stone-300 via-zinc-500 to-neutral-800', 37, 6)
on conflict (name) do update set
  room_id = excluded.room_id,
  room_name = excluded.room_name,
  avatar_gradient = excluded.avatar_gradient,
  current_points = excluded.current_points,
  cleaning_streak = excluded.cleaning_streak;

insert into public.areas (id, name, floor, description, everyone_uses, excluded_members) values
  ('00000000-0000-4000-8000-000000000301', 'TV/main room', 'ground', 'Shared sitting space and guest area.', true, '{}'),
  ('00000000-0000-4000-8000-000000000302', 'Kitchen', 'ground', 'Food prep, shelves, sink, and shared counters.', true, '{}'),
  ('00000000-0000-4000-8000-000000000303', 'Ground floor bathroom', 'ground', 'Used by everyone and guests.', true, '{}'),
  ('00000000-0000-4000-8000-000000000304', 'Washing machine area', 'ground', 'Laundry and cleaning supply zone.', true, '{}'),
  ('00000000-0000-4000-8000-000000000305', 'Stairs', 'ground', 'Shared access between floors.', true, '{}'),
  ('00000000-0000-4000-8000-000000000306', 'Hallway', 'top', 'Top floor shared passage.', true, '{}'),
  ('00000000-0000-4000-8000-000000000307', 'Top floor bathroom', 'top', 'Shared bathroom used by everyone except Blair.', false, array['Blair']),
  ('00000000-0000-4000-8000-000000000308', 'Alex-Blair Room', 'top', 'Private room responsibility for Alex and Blair.', false, array['Casey', 'Devin', 'Ellis', 'Finley']),
  ('00000000-0000-4000-8000-000000000309', 'Casey-Devin-Ellis Room', 'top', 'Private room responsibility for Casey, Devin, and Ellis.', false, array['Alex', 'Blair', 'Finley']),
  ('00000000-0000-4000-8000-000000000310', 'Finley Room', 'top', 'Private room responsibility for Finley.', false, array['Alex', 'Blair', 'Casey', 'Devin', 'Ellis'])
on conflict (id) do update set
  name = excluded.name,
  floor = excluded.floor,
  description = excluded.description,
  everyone_uses = excluded.everyone_uses,
  excluded_members = excluded.excluded_members;

insert into public.tasks (id, title, description, location, difficulty, points, assigned_person, due_date, frequency, status, proof_required) values
  ('00000000-0000-4000-8000-000000000401', 'Wash dishes', 'Clear sink, wash shared dishes, and reset drying area.', 'Kitchen', 'easy', 3, '00000000-0000-4000-8000-000000000102', current_date, 'daily', 'pending', false),
  ('00000000-0000-4000-8000-000000000402', 'Kitchen cleanup', 'Wipe counters, check stove splashes, and reset shared surfaces.', 'Kitchen', 'medium', 6, '00000000-0000-4000-8000-000000000104', current_date, 'daily', 'pending', false),
  ('00000000-0000-4000-8000-000000000403', 'Trash checks', 'Check kitchen, bathroom, and food waste bags before night.', 'Kitchen', 'easy', 3, '00000000-0000-4000-8000-000000000105', current_date, 'daily', 'pending', false),
  ('00000000-0000-4000-8000-000000000404', 'Clean kitchen shelves', 'Wipe shared shelves, remove expired items, and keep labels visible.', 'Kitchen', 'easy', 4, '00000000-0000-4000-8000-000000000101', current_date + 1, 'weekly', 'pending', false),
  ('00000000-0000-4000-8000-000000000405', 'Clean sink', 'Scrub sink, taps, drain basket, and surrounding counter.', 'Kitchen', 'easy', 3, '00000000-0000-4000-8000-000000000103', current_date + 1, 'daily', 'pending', false),
  ('00000000-0000-4000-8000-000000000406', 'Take indoor trash', 'Move full indoor bins to outside bins and replace liners.', 'Kitchen', 'easy', 3, '00000000-0000-4000-8000-000000000106', current_date, 'daily', 'pending', false),
  ('00000000-0000-4000-8000-000000000407', 'Vacuum and mop ground floor', 'Vacuum the TV/main room, kitchen edges, and mop shared ground floor.', 'Ground floor', 'heavy', 8, '00000000-0000-4000-8000-000000000104', current_date + 2, 'weekly', 'pending', true),
  ('00000000-0000-4000-8000-000000000408', 'Clean ground floor bathroom', 'Toilet, sink, mirror, floor, bin, and guest-ready finish.', 'Ground floor bathroom', 'heavy', 7, '00000000-0000-4000-8000-000000000103', current_date + 3, 'weekly', 'pending', true),
  ('00000000-0000-4000-8000-000000000409', 'Clean top floor bathroom', 'Toilet, shower, sink, mirror, floor, and towel area. Blair is excluded.', 'Top floor bathroom', 'heavy', 8, '00000000-0000-4000-8000-000000000106', current_date + 4, 'weekly', 'pending', true),
  ('00000000-0000-4000-8000-000000000410', 'Deep kitchen cleaning', 'Shelves, stove, sink, appliances, floor edges, and shared food reset.', 'Kitchen', 'heavy', 8, '00000000-0000-4000-8000-000000000105', current_date + 5, 'monthly', 'pending', true),
  ('00000000-0000-4000-8000-000000000411', 'Bin responsibility', 'Put bins outside on collection night and bring them back.', 'Outside bins', 'heavy', 6, '00000000-0000-4000-8000-000000000101', current_date + 1, 'weekly', 'pending', false),
  ('00000000-0000-4000-8000-000000000412', 'Clean stairs', 'Vacuum stairs, wipe rail, and clear anything left on steps.', 'Stairs', 'medium', 4, '00000000-0000-4000-8000-000000000102', current_date + 2, 'weekly', 'pending', false),
  ('00000000-0000-4000-8000-000000000413', 'Clean hallway', 'Vacuum top hallway, clear shared clutter, and wipe visible marks.', 'Hallway', 'medium', 4, '00000000-0000-4000-8000-000000000106', current_date + 3, 'weekly', 'pending', false),
  ('00000000-0000-4000-8000-000000000414', 'Clean washing machine area', 'Wipe detergent marks, clear lint, and organize laundry supplies.', 'Washing machine area', 'medium', 3, '00000000-0000-4000-8000-000000000103', current_date + 4, 'weekly', 'pending', false)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  location = excluded.location,
  difficulty = excluded.difficulty,
  points = excluded.points,
  assigned_person = excluded.assigned_person,
  due_date = excluded.due_date,
  frequency = excluded.frequency,
  proof_required = excluded.proof_required;

insert into public.groceries (name, category, status) values
  ('Milk', 'Fresh', 'running_low'),
  ('Bread', 'Bakery', 'available'),
  ('Onions', 'Vegetables', 'available'),
  ('Tomatoes', 'Vegetables', 'needed'),
  ('Eggs', 'Fresh', 'running_low'),
  ('Naan', 'Bakery', 'available'),
  ('Chicken', 'Meat', 'needed'),
  ('Potatoes', 'Vegetables', 'available'),
  ('Oil bottle', 'Pantry', 'running_low'),
  ('Hand wash', 'Cleaning', 'available'),
  ('Laundry powder', 'Cleaning', 'available'),
  ('Dishwashing liquid', 'Cleaning', 'needed'),
  ('Sponges', 'Cleaning', 'running_low'),
  ('Metal dish scrubber', 'Cleaning', 'available'),
  ('Fries', 'Frozen', 'available'),
  ('Honey', 'Pantry', 'available'),
  ('Sugar', 'Pantry', 'available'),
  ('Garlic sauce', 'Sauces', 'needed'),
  ('Ketchup', 'Sauces', 'available'),
  ('Other sauces', 'Sauces', 'available'),
  ('Ice cream', 'Frozen', 'needed'),
  ('Tissue rolls', 'Household', 'running_low'),
  ('Bin bags', 'Household', 'needed'),
  ('Small white food waste bags', 'Household', 'running_low'),
  ('Spray cleaner', 'Cleaning', 'available')
on conflict (name) do update set
  category = excluded.category,
  status = excluded.status;

insert into public.availability (user_id, day_of_week, preferred_window, unavailable)
select u.id, d.day, case when d.day in (1, 3, 5) then 'Evening' else 'Afternoon' end, false
from public.users u
cross join (values (0),(1),(2),(3),(4),(5),(6)) as d(day)
on conflict (user_id, day_of_week) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proof-images',
  'proof-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.recurring_task_rules (title, location, difficulty, points, frequency, day_of_week, proof_required, active) values
  ('Dish responsibility', 'Kitchen', 'easy', 3, 'daily', null, false, true),
  ('Trash checks', 'Kitchen', 'easy', 3, 'every_second_day', null, false, true),
  ('Bathroom rotation', 'Bathrooms', 'heavy', 8, 'weekly', 6, true, true),
  ('Bins outside', 'Outside bins', 'heavy', 6, 'weekly', 4, false, true),
  ('Bring bins back', 'Outside bins', 'medium', 3, 'weekly', 5, false, true)
on conflict (title, location, frequency) do update set
  difficulty = excluded.difficulty,
  points = excluded.points,
  day_of_week = excluded.day_of_week,
  proof_required = excluded.proof_required,
  active = excluded.active;

insert into public.rewards (user_id, kind, title, description, earned_at) values
  ('00000000-0000-4000-8000-000000000106', 'cleaning_champion', 'Cleaning Champion', 'Highest balanced contribution this month.', now()),
  ('00000000-0000-4000-8000-000000000101', 'bathroom_hero', 'Bathroom Hero', 'Completed a heavy bathroom task with accepted proof.', now()),
  ('00000000-0000-4000-8000-000000000105', 'trash_master', 'Trash Master', 'Kept trash checks moving across the week.', now())
on conflict do nothing;

do $$
declare
  table_name text;
  protected_tables text[] := array[
    'users',
    'rooms',
    'areas',
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
    'push_subscriptions'
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

create index if not exists tasks_assigned_person_idx on public.tasks(assigned_person);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists complaints_person_involved_idx on public.complaints(person_involved);
create index if not exists groceries_status_idx on public.groceries(status);
create index if not exists notifications_recipient_idx on public.notifications(recipient);
create index if not exists user_devices_device_id_idx on public.user_devices(device_id);
create index if not exists task_swaps_task_id_idx on public.task_swaps(task_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
