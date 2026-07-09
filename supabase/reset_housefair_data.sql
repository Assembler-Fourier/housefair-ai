begin;

alter table public.tasks
  add column if not exists checklist_items jsonb not null default '[]'::jsonb,
  add column if not exists estimated_minutes integer not null default 15;

alter table public.complaints
  add column if not exists issue_type text not null default 'report'
  check (issue_type in ('report', 'cleanup_request', 'reminder'));

create table if not exists public.shopping_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  is_active boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.house_announcements (
  id uuid primary key default gen_random_uuid(),
  author uuid references public.users(id) on delete set null,
  title text not null,
  body text not null,
  category text not null default 'message' check (category in ('guests', 'repairs', 'message')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  guest_staying boolean not null default false,
  guest_count integer not null default 0 check (guest_count between 0 and 8),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

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

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_name text not null default 'House Expenses' check (group_name = 'House Expenses'),
  title text not null,
  amount numeric(10,2) not null check (amount > 0),
  category text not null check (category in ('Food', 'Cleaning', 'Bills', 'Internet', 'Electricity', 'Transport', 'Entertainment', 'Emergency', 'Other')),
  paid_by uuid not null references public.users(id) on delete restrict,
  paid_date date not null default current_date,
  notes text,
  receipt_url text,
  split_type text not null default 'equal' check (split_type in ('equal', 'unequal', 'percentage', 'shares', 'exact')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  split_value numeric(10,4),
  amount_owed numeric(10,2) not null check (amount_owed >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  payer uuid not null references public.users(id) on delete cascade,
  receiver uuid not null references public.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'bank_transfer', 'other')),
  notes text,
  settled_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(10,2) not null check (amount >= 0),
  category text not null check (category in ('Food', 'Cleaning', 'Bills', 'Internet', 'Electricity', 'Transport', 'Entertainment', 'Emergency', 'Other')),
  paid_by uuid references public.users(id) on delete set null,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  next_due_date date not null,
  split_type text not null default 'equal' check (split_type in ('equal', 'unequal', 'percentage', 'shares', 'exact')),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (title, frequency)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  category text not null unique check (category in ('Food', 'Cleaning', 'Bills', 'Internet', 'Electricity', 'Transport', 'Entertainment', 'Emergency', 'Other')),
  monthly_limit numeric(10,2) not null check (monthly_limit >= 0),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_comments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  author uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete set null,
  uploaded_by uuid not null references public.users(id) on delete cascade,
  image_url text not null,
  store text,
  items jsonb not null default '[]',
  amount numeric(10,2),
  category text check (category in ('Food', 'Cleaning', 'Bills', 'Internet', 'Electricity', 'Transport', 'Entertainment', 'Emergency', 'Other')),
  ai_summary text,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists deferral_count integer not null default 0,
  add column if not exists deferred_by uuid references public.users(id) on delete set null,
  add column if not exists deferred_at timestamptz,
  add column if not exists defer_reason text,
  add column if not exists next_reminder_at timestamptz,
  add column if not exists last_reminded_at timestamptz;

delete from public.push_subscriptions;
delete from public.proof_images;
delete from public.complaint_votes;
delete from public.complaints;
delete from public.task_swaps;
delete from public.task_history;
delete from public.points_ledger;
delete from public.notifications;
delete from public.ai_recommendations;
delete from public.weekly_reports;
delete from public.house_rule_acceptances;
delete from public.user_preferences;
delete from public.user_devices;
delete from public.audit_logs;
delete from public.rewards;
delete from public.receipts;
delete from public.money_comments;
delete from public.expense_splits;
delete from public.settlements;
delete from public.expenses;
delete from public.recurring_expenses;
delete from public.budgets;
delete from public.house_settings;
delete from public.shopping_sessions;
delete from public.house_announcements;
delete from public.guest_status;
delete from public.tasks;

insert into public.rooms (id, name, floor, capacity, privacy_level) values
  ('00000000-0000-4000-8000-000000000201', 'Uzair-Sheraz Room', 'top', 2, 'shared'),
  ('00000000-0000-4000-8000-000000000202', 'Shahram-Hammad-Usama Room', 'top', 3, 'shared'),
  ('00000000-0000-4000-8000-000000000203', 'Ali Room', 'top', 1, 'single')
on conflict (id) do update set
  name = excluded.name,
  floor = excluded.floor,
  capacity = excluded.capacity,
  privacy_level = excluded.privacy_level;

insert into public.users (id, name, room_id, room_name, avatar_gradient, current_points, cleaning_streak) values
  ('00000000-0000-4000-8000-000000000101', 'Uzair', '00000000-0000-4000-8000-000000000201', 'Uzair-Sheraz Room', 'from-emerald-400 via-teal-500 to-sky-500', 0, 0),
  ('00000000-0000-4000-8000-000000000102', 'Sheraz', '00000000-0000-4000-8000-000000000201', 'Uzair-Sheraz Room', 'from-amber-300 via-orange-500 to-rose-500', 0, 0),
  ('00000000-0000-4000-8000-000000000103', 'Shahram', '00000000-0000-4000-8000-000000000202', 'Shahram-Hammad-Usama Room', 'from-cyan-400 via-blue-500 to-indigo-500', 0, 0),
  ('00000000-0000-4000-8000-000000000104', 'Hammad', '00000000-0000-4000-8000-000000000202', 'Shahram-Hammad-Usama Room', 'from-lime-300 via-green-500 to-emerald-600', 0, 0),
  ('00000000-0000-4000-8000-000000000105', 'Usama', '00000000-0000-4000-8000-000000000202', 'Shahram-Hammad-Usama Room', 'from-fuchsia-400 via-rose-500 to-red-500', 0, 0),
  ('00000000-0000-4000-8000-000000000106', 'Ali', '00000000-0000-4000-8000-000000000203', 'Ali Room', 'from-stone-300 via-zinc-500 to-neutral-800', 0, 0)
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
  ('00000000-0000-4000-8000-000000000307', 'Top floor bathroom', 'top', 'Shared bathroom used by everyone except Sheraz.', false, array['Sheraz']),
  ('00000000-0000-4000-8000-000000000308', 'Uzair-Sheraz Room', 'top', 'Private room responsibility for Uzair and Sheraz.', false, array['Shahram', 'Hammad', 'Usama', 'Ali']),
  ('00000000-0000-4000-8000-000000000309', 'Shahram-Hammad-Usama Room', 'top', 'Private room responsibility for Shahram, Hammad, and Usama.', false, array['Uzair', 'Sheraz', 'Ali']),
  ('00000000-0000-4000-8000-000000000310', 'Ali Room', 'top', 'Private room responsibility for Ali.', false, array['Uzair', 'Sheraz', 'Shahram', 'Hammad', 'Usama'])
on conflict (id) do update set
  name = excluded.name,
  floor = excluded.floor,
  description = excluded.description,
  everyone_uses = excluded.everyone_uses,
  excluded_members = excluded.excluded_members;

insert into public.tasks
  (id, title, description, location, difficulty, points, assigned_person, due_date, frequency, status, proof_required, completed_by, photo_url, before_photo_url, after_photo_url, estimated_minutes, checklist_items)
values
  ('00000000-0000-4000-8000-000000000401', 'Dish duty', 'Everyone washes their own personal dishes. This duty covers shared mess: tea kettle, mugs, cooking pots, pans, utensils, and dishes created while preparing food for multiple people.', 'Kitchen', 'easy', 3, '00000000-0000-4000-8000-000000000102', current_date, 'daily', 'pending', false, null, null, null, null, 20, '["Personal plates, cups, and cutlery stay personal", "Wash shared tea kettle, mugs, pots, pans, and cooking utensils", "Clear sink and drying rack", "Wipe splash area around sink"]'::jsonb),
  ('00000000-0000-4000-8000-000000000402', 'Kitchen reset', 'Reset the shared kitchen after normal use: surfaces, stove splashes, shared food, crumbs, and sink area.', 'Kitchen', 'medium', 5, '00000000-0000-4000-8000-000000000104', current_date, 'daily', 'pending', false, null, null, null, null, 25, '["Wipe counters and stove", "Put shared food away", "Reset sink and drying area", "Sweep obvious crumbs"]'::jsonb),
  ('00000000-0000-4000-8000-000000000403', 'Food waste bin', 'Empty and reset the small food waste bin when it is half full, wet, or smelly.', 'Kitchen', 'easy', 2, '00000000-0000-4000-8000-000000000105', current_date, 'daily', 'pending', false, null, null, null, null, 8, '["Empty food waste bag if half full or smelly", "Replace small white food waste bag", "Wipe lid and surrounding area"]'::jsonb),
  ('00000000-0000-4000-8000-000000000404', 'Trash checks', 'Check kitchen and bathroom bins before night and move full bags outside.', 'Kitchen', 'easy', 3, '00000000-0000-4000-8000-000000000106', current_date, 'daily', 'pending', false, null, null, null, null, 10, '["Check kitchen bin", "Check bathroom bins", "Replace liners where needed", "Move full bags outside"]'::jsonb),
  ('00000000-0000-4000-8000-000000000405', 'Clean ground floor bathroom', 'Clean the bathroom used by everyone and guests. Photo proof is required.', 'Ground floor bathroom', 'heavy', 7, '00000000-0000-4000-8000-000000000103', current_date + 2, 'weekly', 'pending', true, null, null, null, null, 35, '["Toilet cleaned", "Sink cleaned", "Mirror cleaned", "Floor cleaned", "Toilet paper checked"]'::jsonb),
  ('00000000-0000-4000-8000-000000000406', 'Clean top floor bathroom', 'Clean the top floor bathroom. Sheraz is excluded from this task. Photo proof is required.', 'Top floor bathroom', 'heavy', 8, '00000000-0000-4000-8000-000000000106', current_date + 3, 'weekly', 'pending', true, null, null, null, null, 40, '["Toilet cleaned", "Sink cleaned", "Mirror cleaned", "Floor cleaned", "Toilet paper checked"]'::jsonb),
  ('00000000-0000-4000-8000-000000000407', 'Vacuum and mop ground floor', 'Vacuum the TV/main room, kitchen edges, and mop shared ground floor.', 'Ground floor', 'heavy', 8, '00000000-0000-4000-8000-000000000104', current_date + 4, 'weekly', 'pending', true, null, null, null, null, 45, '["Vacuum TV/main room", "Vacuum kitchen edges", "Mop ground floor", "Move visible clutter before cleaning"]'::jsonb),
  ('00000000-0000-4000-8000-000000000408', 'Clean stairs', 'Vacuum stairs, wipe rail, and clear anything left on steps.', 'Stairs', 'medium', 4, '00000000-0000-4000-8000-000000000102', current_date + 2, 'weekly', 'pending', false, null, null, null, null, 18, '["Vacuum stairs", "Wipe rail", "Clear items left on steps"]'::jsonb),
  ('00000000-0000-4000-8000-000000000409', 'Clean hallway', 'Vacuum top hallway, clear shared clutter, and wipe visible marks.', 'Hallway', 'medium', 4, '00000000-0000-4000-8000-000000000101', current_date + 3, 'weekly', 'pending', false, null, null, null, null, 20, '["Vacuum hallway", "Clear shared clutter", "Wipe visible marks"]'::jsonb),
  ('00000000-0000-4000-8000-000000000410', 'Kitchen deep clean', 'Deep reset shelves, sink, appliances, stove, and floor edges.', 'Kitchen', 'heavy', 8, '00000000-0000-4000-8000-000000000105', current_date + 5, 'weekly', 'pending', true, null, null, null, null, 55, '["Clean shelves and expired food", "Scrub sink and taps", "Wipe appliances", "Clean stove and floor edges"]'::jsonb),
  ('00000000-0000-4000-8000-000000000411', 'Bin responsibility', 'Put bins outside on collection night and bring them back.', 'Outside bins', 'heavy', 6, '00000000-0000-4000-8000-000000000101', current_date + 1, 'weekly', 'pending', false, null, null, null, null, 15, '["Put bins outside Thursday evening", "Bring bins back after collection", "Check food waste bags"]'::jsonb),
  ('00000000-0000-4000-8000-000000000412', 'Deep cleaning rotation', 'Monthly deep clean for a neglected shared area.', 'Shared areas', 'heavy', 8, null, current_date + 14, 'monthly', 'pending', true, null, null, null, null, 75, '["Pick one neglected shared area", "Move items and clean behind them", "Wipe skirting or edges", "Upload before and after photos"]'::jsonb),
  ('00000000-0000-4000-8000-000000000415', 'Replace tissue', 'Quick restock when tissue rolls are empty or low.', 'Bathrooms', 'easy', 1, null, current_date, 'daily', 'pending', false, null, null, null, null, 3, '["Replace empty tissue roll", "Put spare roll nearby"]'::jsonb),
  ('00000000-0000-4000-8000-000000000416', 'Replace sponge', 'Swap old kitchen sponge when it smells or breaks down.', 'Kitchen', 'easy', 1, null, current_date, 'daily', 'pending', false, null, null, null, null, 3, '["Throw away old sponge", "Place fresh sponge by sink"]'::jsonb),
  ('00000000-0000-4000-8000-000000000417', 'Refill handwash', 'Refill handwash in shared bathrooms or kitchen.', 'Bathrooms', 'easy', 1, null, current_date, 'daily', 'pending', false, null, null, null, null, 4, '["Refill bottle", "Wipe bottle and counter"]'::jsonb),
  ('00000000-0000-4000-8000-000000000418', 'Empty small bin', 'Empty a small bathroom or shared-area bin.', 'Bathrooms', 'easy', 1, null, current_date, 'daily', 'pending', false, null, null, null, null, 5, '["Empty small bin", "Replace liner if needed"]'::jsonb),
  ('00000000-0000-4000-8000-000000000419', 'Replace cleaning supplies', 'Put out missing shared cleaning supplies.', 'Kitchen', 'easy', 1, null, current_date, 'daily', 'pending', false, null, null, null, null, 5, '["Check spray, dish liquid, bags, sponge", "Replace whichever is missing"]'::jsonb);

delete from public.groceries
where name not in (
  'Milk', 'Bread', 'Onions', 'Tomatoes', 'Eggs', 'Naan', 'Chicken',
  'Potatoes', 'Oil bottle', 'Hand wash', 'Laundry powder',
  'Dishwashing liquid', 'Sponges', 'Metal dish scrubber', 'Fries',
  'Honey', 'Sugar', 'Garlic sauce', 'Ketchup', 'Other sauces',
  'Ice cream', 'Tissue rolls', 'Bin bags', 'Small white food waste bags',
  'Spray cleaner'
);

insert into public.groceries (name, category, status, added_by, bought_by, price, notes) values
  ('Milk', 'Fresh', 'available', null, null, null, null),
  ('Bread', 'Bakery', 'available', null, null, null, null),
  ('Onions', 'Vegetables', 'available', null, null, null, null),
  ('Tomatoes', 'Vegetables', 'available', null, null, null, null),
  ('Eggs', 'Fresh', 'available', null, null, null, null),
  ('Naan', 'Bakery', 'available', null, null, null, null),
  ('Chicken', 'Meat', 'available', null, null, null, null),
  ('Potatoes', 'Vegetables', 'available', null, null, null, null),
  ('Oil bottle', 'Pantry', 'available', null, null, null, null),
  ('Hand wash', 'Cleaning', 'available', null, null, null, null),
  ('Laundry powder', 'Cleaning', 'available', null, null, null, null),
  ('Dishwashing liquid', 'Cleaning', 'available', null, null, null, null),
  ('Sponges', 'Cleaning', 'available', null, null, null, null),
  ('Metal dish scrubber', 'Cleaning', 'available', null, null, null, null),
  ('Fries', 'Frozen', 'available', null, null, null, null),
  ('Honey', 'Pantry', 'available', null, null, null, null),
  ('Sugar', 'Pantry', 'available', null, null, null, null),
  ('Garlic sauce', 'Sauces', 'available', null, null, null, null),
  ('Ketchup', 'Sauces', 'available', null, null, null, null),
  ('Other sauces', 'Sauces', 'available', null, null, null, null),
  ('Ice cream', 'Frozen', 'available', null, null, null, null),
  ('Tissue rolls', 'Household', 'available', null, null, null, null),
  ('Bin bags', 'Household', 'available', null, null, null, null),
  ('Small white food waste bags', 'Household', 'available', null, null, null, null),
  ('Spray cleaner', 'Cleaning', 'available', null, null, null, null)
on conflict (name) do update set
  category = excluded.category,
  status = excluded.status,
  added_by = excluded.added_by,
  bought_by = excluded.bought_by,
  date = current_date,
  price = excluded.price,
  notes = excluded.notes;

insert into public.guest_status (user_id, guest_staying, guest_count, notes)
select id, false, 0, null from public.users
on conflict (user_id) do update set
  guest_staying = false,
  guest_count = 0,
  notes = null,
  updated_at = now();

insert into public.house_settings (key, value) values
  ('house_mode', '{"mode":"normal"}'::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

delete from public.recurring_task_rules
where title not in (
  'Dish duty',
  'Kitchen reset',
  'Food waste bin',
  'Trash checks',
  'Bathroom rotation',
  'Bins outside',
  'Bring bins back'
);

insert into public.recurring_task_rules (title, location, difficulty, points, frequency, day_of_week, proof_required, active) values
  ('Dish duty', 'Kitchen', 'easy', 3, 'daily', null, false, true),
  ('Kitchen reset', 'Kitchen', 'medium', 5, 'daily', null, false, true),
  ('Food waste bin', 'Kitchen', 'easy', 2, 'daily', null, false, true),
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

insert into public.budgets (category, monthly_limit) values
  ('Food', 300),
  ('Cleaning', 50),
  ('Bills', 0),
  ('Internet', 0),
  ('Electricity', 0)
on conflict (category) do update set
  monthly_limit = excluded.monthly_limit,
  updated_at = now();

insert into public.recurring_expenses (title, amount, category, paid_by, frequency, next_due_date, split_type, active, notes) values
  ('Rent', 0, 'Bills', null, 'monthly', (date_trunc('month', current_date)::date + interval '1 month')::date, 'equal', true, 'Set rent amount when the house wants rent tracking.'),
  ('Internet', 0, 'Internet', null, 'monthly', (date_trunc('month', current_date)::date + interval '1 month')::date, 'equal', true, 'Monthly shared internet.'),
  ('Electricity', 0, 'Electricity', null, 'monthly', (date_trunc('month', current_date)::date + interval '1 month')::date, 'equal', true, 'Monthly/periodic electricity bill.'),
  ('Cleaning supplies', 0, 'Cleaning', null, 'weekly', current_date + 7, 'equal', true, 'Weekly check for shared cleaning supplies.')
on conflict (title, frequency) do update set
  amount = excluded.amount,
  category = excluded.category,
  next_due_date = excluded.next_due_date,
  split_type = excluded.split_type,
  active = excluded.active,
  notes = excluded.notes;

do $$
declare
  table_name text;
  protected_tables text[] := array[
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

commit;
