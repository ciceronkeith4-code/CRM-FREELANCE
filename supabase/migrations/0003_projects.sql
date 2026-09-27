-- Projects and everything nested under a project.

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  description text,
  project_type text check (project_type in ('Website','Website redesign','Web app/System','E-commerce','Mobile app','Maintenance','Other')),
  pricing_model text not null default 'Fixed price' check (pricing_model in ('Fixed price','Hourly','Retainer')),
  base_price numeric(12,2) not null default 0,
  hourly_rate numeric(12,2),
  estimated_hours numeric(8,2),
  status text not null default 'Planning' check (status in ('Planning','In Progress','On Hold','For Review','Completed','Cancelled')),
  start_date date,
  deadline date,
  completion_date date,
  warranty_end_date date,
  tech_stack text[] not null default '{}',
  live_url text,
  staging_url text,
  repository_url text,
  hosting_provider text,
  domain_registrar text,
  quotation_id uuid references quotations(id) on delete set null,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "projects_select" on projects for select using (user_id = auth.uid());
create policy "projects_insert" on projects for insert with check (user_id = auth.uid());
create policy "projects_update" on projects for update using (user_id = auth.uid());
create policy "projects_delete" on projects for delete using (user_id = auth.uid());

create index projects_user_status_idx on projects (user_id, status);
create index projects_client_idx on projects (client_id);

alter table quotations
  add constraint quotations_project_fkey foreign key (project_id) references projects(id) on delete set null;

-- ============================================================
-- PROJECT ACCESS INFO
-- ============================================================
create table project_access_info (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  url text,
  username text,
  credential_location text,
  created_at timestamptz not null default now()
);

alter table project_access_info enable row level security;

create policy "project_access_info_select" on project_access_info for select using (user_id = auth.uid());
create policy "project_access_info_insert" on project_access_info for insert with check (user_id = auth.uid());
create policy "project_access_info_update" on project_access_info for update using (user_id = auth.uid());
create policy "project_access_info_delete" on project_access_info for delete using (user_id = auth.uid());

create index project_access_info_project_idx on project_access_info (project_id);

-- ============================================================
-- MILESTONES
-- ============================================================
create table milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null default 0,
  due_date date,
  status text not null default 'Pending' check (status in ('Pending','Invoiced','Paid')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table milestones enable row level security;

create policy "milestones_select" on milestones for select using (user_id = auth.uid());
create policy "milestones_insert" on milestones for insert with check (user_id = auth.uid());
create policy "milestones_update" on milestones for update using (user_id = auth.uid());
create policy "milestones_delete" on milestones for delete using (user_id = auth.uid());

create index milestones_project_idx on milestones (project_id);

-- ============================================================
-- CHANGE REQUESTS
-- ============================================================
create table change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  date_requested date not null default current_date,
  requested_via text check (requested_via in ('Messenger','Viber','Email','Call','Meeting','Other')),
  extra_charge numeric(12,2) not null default 0,
  estimated_hours numeric(8,2),
  status text not null default 'Requested' check (status in ('Requested','Approved','In Progress','Done','Declined')),
  date_completed date,
  created_at timestamptz not null default now()
);

alter table change_requests enable row level security;

create policy "change_requests_select" on change_requests for select using (user_id = auth.uid());
create policy "change_requests_insert" on change_requests for insert with check (user_id = auth.uid());
create policy "change_requests_update" on change_requests for update using (user_id = auth.uid());
create policy "change_requests_delete" on change_requests for delete using (user_id = auth.uid());

create index change_requests_project_idx on change_requests (project_id);

-- ============================================================
-- TIME LOGS
-- ============================================================
create table time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  change_request_id uuid references change_requests(id) on delete set null,
  date date not null default current_date,
  hours numeric(6,2) not null default 0,
  description text,
  created_at timestamptz not null default now()
);

alter table time_logs enable row level security;

create policy "time_logs_select" on time_logs for select using (user_id = auth.uid());
create policy "time_logs_insert" on time_logs for insert with check (user_id = auth.uid());
create policy "time_logs_update" on time_logs for update using (user_id = auth.uid());
create policy "time_logs_delete" on time_logs for delete using (user_id = auth.uid());

create index time_logs_project_idx on time_logs (project_id);
