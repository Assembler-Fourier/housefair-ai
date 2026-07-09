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

update public.tasks set
  title = 'Dish duty',
  description = 'Everyone washes their own personal dishes. This duty covers shared mess: tea kettle, mugs, cooking pots, pans, utensils, and dishes created while preparing food for multiple people.',
  location = 'Kitchen',
  difficulty = 'easy',
  points = 3,
  frequency = 'daily',
  proof_required = false,
  estimated_minutes = 20,
  checklist_items = '[
    "Personal plates, cups, and cutlery stay personal",
    "Wash shared tea kettle, mugs, pots, pans, and cooking utensils",
    "Clear sink and drying rack",
    "Wipe splash area around sink"
  ]'::jsonb
where id = '00000000-0000-4000-8000-000000000401';

update public.tasks set
  title = 'Kitchen reset',
  description = 'Reset the shared kitchen after normal use: surfaces, stove splashes, shared food, crumbs, and sink area.',
  difficulty = 'medium',
  points = 5,
  frequency = 'daily',
  estimated_minutes = 25,
  checklist_items = '[
    "Wipe counters and stove",
    "Put shared food away",
    "Reset sink and drying area",
    "Sweep obvious crumbs"
  ]'::jsonb
where id = '00000000-0000-4000-8000-000000000402';

update public.tasks set
  title = 'Trash checks',
  description = 'Check shared bins before night and stop smells before they become a house issue.',
  difficulty = 'easy',
  points = 3,
  frequency = 'daily',
  estimated_minutes = 10,
  checklist_items = '[
    "Check kitchen bin",
    "Check bathroom bins",
    "Replace liners where needed",
    "Move full bags outside"
  ]'::jsonb
where id = '00000000-0000-4000-8000-000000000403';

update public.tasks set
  title = 'Food waste bin',
  description = 'Empty and reset the small food waste bin when it is half full, wet, or smelly.',
  difficulty = 'easy',
  points = 2,
  frequency = 'daily',
  estimated_minutes = 8,
  checklist_items = '[
    "Empty food waste bag if half full or smelly",
    "Replace small white food waste bag",
    "Wipe lid and surrounding area"
  ]'::jsonb
where id = '00000000-0000-4000-8000-000000000404';

update public.tasks set
  title = 'Clean ground floor bathroom',
  description = 'Clean the bathroom used by everyone and guests. Photo proof is required.',
  location = 'Ground floor bathroom',
  difficulty = 'heavy',
  points = 7,
  frequency = 'weekly',
  proof_required = true,
  estimated_minutes = 35,
  checklist_items = '[
    "Toilet cleaned",
    "Sink cleaned",
    "Mirror cleaned",
    "Floor cleaned",
    "Toilet paper checked"
  ]'::jsonb
where id = '00000000-0000-4000-8000-000000000408';

update public.tasks set
  title = 'Clean top floor bathroom',
  description = 'Clean the top floor bathroom. Blair is excluded from this task. Photo proof is required.',
  location = 'Top floor bathroom',
  difficulty = 'heavy',
  points = 8,
  frequency = 'weekly',
  proof_required = true,
  estimated_minutes = 40,
  checklist_items = '[
    "Toilet cleaned",
    "Sink cleaned",
    "Mirror cleaned",
    "Floor cleaned",
    "Toilet paper checked"
  ]'::jsonb
where id = '00000000-0000-4000-8000-000000000409';

update public.tasks set
  title = 'Kitchen deep clean',
  description = 'Deep reset shelves, sink, appliances, stove, and floor edges.',
  difficulty = 'heavy',
  points = 8,
  frequency = 'weekly',
  proof_required = true,
  estimated_minutes = 55,
  checklist_items = '[
    "Clean shelves and expired food",
    "Scrub sink and taps",
    "Wipe appliances",
    "Clean stove and floor edges"
  ]'::jsonb
where id = '00000000-0000-4000-8000-000000000410';

update public.tasks set
  checklist_items = '[
    "Vacuum TV/main room",
    "Vacuum kitchen edges",
    "Mop ground floor",
    "Move visible clutter before cleaning"
  ]'::jsonb,
  estimated_minutes = 45
where id = '00000000-0000-4000-8000-000000000407';

update public.tasks set
  checklist_items = '["Vacuum stairs", "Wipe rail", "Clear items left on steps"]'::jsonb,
  estimated_minutes = 18
where id = '00000000-0000-4000-8000-000000000412';

update public.tasks set
  checklist_items = '["Vacuum hallway", "Clear shared clutter", "Wipe visible marks"]'::jsonb,
  estimated_minutes = 20
where id = '00000000-0000-4000-8000-000000000413';

insert into public.tasks
  (id, title, description, location, difficulty, points, assigned_person, due_date, frequency, status, proof_required, estimated_minutes, checklist_items)
values
  ('00000000-0000-4000-8000-000000000415', 'Replace tissue', 'Quick restock when tissue rolls are empty or low.', 'Bathrooms', 'easy', 1, null, current_date, 'daily', 'pending', false, 3, '["Replace empty tissue roll", "Put spare roll nearby"]'::jsonb),
  ('00000000-0000-4000-8000-000000000416', 'Replace sponge', 'Swap old kitchen sponge when it smells or breaks down.', 'Kitchen', 'easy', 1, null, current_date, 'daily', 'pending', false, 3, '["Throw away old sponge", "Place fresh sponge by sink"]'::jsonb),
  ('00000000-0000-4000-8000-000000000417', 'Refill handwash', 'Refill handwash in shared bathrooms or kitchen.', 'Bathrooms', 'easy', 1, null, current_date, 'daily', 'pending', false, 4, '["Refill bottle", "Wipe bottle and counter"]'::jsonb),
  ('00000000-0000-4000-8000-000000000418', 'Empty small bin', 'Empty a small bathroom or bedroom-adjacent shared bin.', 'Bathrooms', 'easy', 1, null, current_date, 'daily', 'pending', false, 5, '["Empty small bin", "Replace liner if needed"]'::jsonb),
  ('00000000-0000-4000-8000-000000000419', 'Replace cleaning supplies', 'Put out missing shared cleaning supplies.', 'Kitchen', 'easy', 1, null, current_date, 'daily', 'pending', false, 5, '["Check spray, dish liquid, bags, sponge", "Replace whichever is missing"]'::jsonb),
  ('00000000-0000-4000-8000-000000000420', 'Deep cleaning rotation', 'Monthly deep clean for a neglected shared area.', 'Shared areas', 'heavy', 8, null, current_date + 14, 'monthly', 'pending', true, 75, '["Pick one neglected shared area", "Move items and clean behind them", "Wipe skirting or edges", "Upload before and after photos"]'::jsonb)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  location = excluded.location,
  difficulty = excluded.difficulty,
  points = excluded.points,
  due_date = excluded.due_date,
  frequency = excluded.frequency,
  status = excluded.status,
  proof_required = excluded.proof_required,
  estimated_minutes = excluded.estimated_minutes,
  checklist_items = excluded.checklist_items;

insert into public.guest_status (user_id, guest_staying, guest_count, notes)
select id, false, 0, null from public.users
on conflict (user_id) do nothing;

do $$
declare
  table_name text;
  protected_tables text[] := array[
    'shopping_sessions',
    'house_announcements',
    'guest_status'
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

create index if not exists shopping_sessions_user_id_idx on public.shopping_sessions(user_id);
create index if not exists house_announcements_created_at_idx on public.house_announcements(created_at);
create index if not exists guest_status_user_id_idx on public.guest_status(user_id);
