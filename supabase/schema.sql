-- ============================================================
-- POINTAGE BAR — Schéma Supabase
-- À exécuter dans SQL Editor de ton projet Supabase
-- ============================================================

-- TABLE : salariés
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- TABLE : entrées de temps (pointages, congés, absences)
-- type : 'work' | 'conge' | 'absence'
-- start_time / end_time : null pour conge/absence
-- end_time : null si pointage en cours
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  employee text not null,
  work_date date not null,
  type text not null check (type in ('work', 'conge', 'absence')),
  start_time text,
  end_time text,
  created_at timestamptz default now()
);

create index if not exists idx_time_entries_employee_date
  on time_entries (employee, work_date);

-- TABLE : planning prévisionnel
-- week_start : date du mardi de la semaine (clé de semaine)
-- day_index : 0=mardi, 1=mercredi, ... 5=dimanche
-- employees : array de prénoms prévus ce jour
create table if not exists planning (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  day_index int not null check (day_index between 0 and 5),
  employees text[] not null default '{}',
  updated_at timestamptz default now(),
  unique (week_start, day_index)
);

create index if not exists idx_planning_week on planning (week_start);

-- ============================================================
-- DONNÉES PAR DÉFAUT : 4 salariés
-- ============================================================
insert into employees (name) values
  ('Benoit'),
  ('Marelle'),
  ('Corentin'),
  ('Adel')
on conflict (name) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- Pour une équipe restreinte (bar), on autorise tout depuis
-- la clé anon. Pour un usage plus sensible, mettre en place
-- Supabase Auth et restreindre.
-- ============================================================

alter table employees enable row level security;
alter table time_entries enable row level security;
alter table planning enable row level security;

-- employees
drop policy if exists "anon all" on employees;
create policy "anon all" on employees for all to anon using (true) with check (true);

-- time_entries
drop policy if exists "anon all" on time_entries;
create policy "anon all" on time_entries for all to anon using (true) with check (true);

-- planning
drop policy if exists "anon all" on planning;
create policy "anon all" on planning for all to anon using (true) with check (true);
