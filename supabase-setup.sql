create table if not exists public.projects (
  id text primary key,
  name text not null,
  start_date text,
  duration_weeks integer not null default 0,
  disciplines jsonb not null default '[]'::jsonb,
  team jsonb not null default '[]'::jsonb,
  project_admins jsonb not null default '[]'::jsonb,
  deliverables jsonb,
  created_by_email text,
  imported_task_csv_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional future project metadata can be stored in board_states.state JSONB.

create table if not exists public.board_states (
  project_id text primary key references public.projects(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_accounts (
  email text primary key,
  password text not null default '123',
  company text,
  position text,
  telephone_numbers jsonb not null default '[]'::jsonb,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  email text primary key,
  auth_user_id uuid,
  full_name text not null,
  company text not null,
  discipline_trade text not null,
  phone_number text,
  address text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.board_states enable row level security;
alter table public.admin_accounts enable row level security;
alter table public.user_profiles enable row level security;

drop policy if exists "Prototype full access projects" on public.projects;
create policy "Prototype full access projects"
  on public.projects
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Prototype full access board states" on public.board_states;
create policy "Prototype full access board states"
  on public.board_states
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Prototype full access admin accounts" on public.admin_accounts;
create policy "Prototype full access admin accounts"
  on public.admin_accounts
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Prototype full access user profiles" on public.user_profiles;
create policy "Prototype full access user profiles"
  on public.user_profiles
  for all
  to anon, authenticated
  using (true)
  with check (true);
