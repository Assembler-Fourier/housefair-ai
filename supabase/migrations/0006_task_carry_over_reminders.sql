alter table public.tasks
  add column if not exists deferral_count integer not null default 0,
  add column if not exists deferred_by uuid references public.users(id) on delete set null,
  add column if not exists deferred_at timestamptz,
  add column if not exists defer_reason text,
  add column if not exists next_reminder_at timestamptz,
  add column if not exists last_reminded_at timestamptz;

create index if not exists tasks_pending_reminder_idx
  on public.tasks(status, next_reminder_at)
  where status <> 'completed';

create index if not exists tasks_assignee_due_idx
  on public.tasks(assigned_person, due_date)
  where status <> 'completed';
