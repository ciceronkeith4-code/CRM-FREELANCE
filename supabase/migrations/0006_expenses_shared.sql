-- Expenses, plus the shared polymorphic tables: activities, tasks, files.

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  category text not null check (category in ('Hosting','Domain','Software/Subscription','Hardware','Internet','Transportation','Outsourcing','Other')),
  amount numeric(12,2) not null default 0,
  vendor text,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  receipt_path text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

create policy "expenses_select" on expenses for select using (user_id = auth.uid());
create policy "expenses_insert" on expenses for insert with check (user_id = auth.uid());
create policy "expenses_update" on expenses for update using (user_id = auth.uid());
create policy "expenses_delete" on expenses for delete using (user_id = auth.uid());

create index expenses_user_date_idx on expenses (user_id, date);
create index expenses_project_idx on expenses (project_id);
create index expenses_client_idx on expenses (client_id);

-- ============================================================
-- ACTIVITY TIMELINE (polymorphic: lead, client, or project)
-- ============================================================
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('lead','client','project')),
  entity_id uuid not null,
  type text not null check (type in ('Call','Meeting','Message','Email','Note','Agreement')),
  date date not null default current_date,
  content text,
  created_at timestamptz not null default now()
);

alter table activities enable row level security;

create policy "activities_select" on activities for select using (user_id = auth.uid());
create policy "activities_insert" on activities for insert with check (user_id = auth.uid());
create policy "activities_update" on activities for update using (user_id = auth.uid());
create policy "activities_delete" on activities for delete using (user_id = auth.uid());

create index activities_entity_idx on activities (entity_type, entity_id);

-- ============================================================
-- TASKS / REMINDERS
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  entity_type text check (entity_type in ('lead','client','project')),
  entity_id uuid,
  done boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "tasks_select" on tasks for select using (user_id = auth.uid());
create policy "tasks_insert" on tasks for insert with check (user_id = auth.uid());
create policy "tasks_update" on tasks for update using (user_id = auth.uid());
create policy "tasks_delete" on tasks for delete using (user_id = auth.uid());

create index tasks_user_due_idx on tasks (user_id, due_date);
create index tasks_entity_idx on tasks (entity_type, entity_id);

-- ============================================================
-- FILES (attached to a client or project)
-- ============================================================
create table files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('client','project')),
  entity_id uuid not null,
  name text not null,
  storage_path text not null,
  upload_date timestamptz not null default now()
);

alter table files enable row level security;

create policy "files_select" on files for select using (user_id = auth.uid());
create policy "files_insert" on files for insert with check (user_id = auth.uid());
create policy "files_update" on files for update using (user_id = auth.uid());
create policy "files_delete" on files for delete using (user_id = auth.uid());

create index files_entity_idx on files (entity_type, entity_id);
