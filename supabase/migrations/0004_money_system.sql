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

insert into public.budgets (category, monthly_limit) values
  ('Food', 300),
  ('Cleaning', 50),
  ('Bills', 0),
  ('Internet', 0),
  ('Electricity', 0)
on conflict (category) do nothing;

insert into public.recurring_expenses (title, amount, category, paid_by, frequency, next_due_date, split_type, active, notes) values
  ('Rent', 0, 'Bills', null, 'monthly', (date_trunc('month', current_date)::date + interval '1 month')::date, 'equal', true, 'Set rent amount when the house wants rent tracking.'),
  ('Internet', 0, 'Internet', null, 'monthly', (date_trunc('month', current_date)::date + interval '1 month')::date, 'equal', true, 'Monthly shared internet.'),
  ('Electricity', 0, 'Electricity', null, 'monthly', (date_trunc('month', current_date)::date + interval '1 month')::date, 'equal', true, 'Monthly/periodic electricity bill.'),
  ('Cleaning supplies', 0, 'Cleaning', null, 'weekly', current_date + 7, 'equal', true, 'Weekly check for shared cleaning supplies.')
on conflict (title, frequency) do nothing;

do $$
declare
  table_name text;
  protected_tables text[] := array[
    'expenses',
    'expense_splits',
    'settlements',
    'recurring_expenses',
    'budgets',
    'money_comments',
    'receipts'
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

create index if not exists expenses_paid_date_idx on public.expenses(paid_date);
create index if not exists expenses_paid_by_idx on public.expenses(paid_by);
create index if not exists expense_splits_expense_id_idx on public.expense_splits(expense_id);
create index if not exists settlements_payer_idx on public.settlements(payer);
create index if not exists settlements_receiver_idx on public.settlements(receiver);
create index if not exists money_comments_expense_id_idx on public.money_comments(expense_id);
