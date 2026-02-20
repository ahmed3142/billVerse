-- 0001_init.sql
-- Core schema for Building Bill Manager

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'charge_type') then
    create type public.charge_type as enum ('common', 'individual');
  end if;

  if not exists (select 1 from pg_type where typname = 'cycle_status') then
    create type public.cycle_status as enum ('draft', 'published', 'locked');
  end if;

  if not exists (select 1 from pg_type where typname = 'statement_status') then
    create type public.statement_status as enum ('paid', 'due', 'partial');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.flats (
  id uuid primary key default gen_random_uuid(),
  flat_no text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  flat_id uuid unique references public.flats(id) on delete set null,
  role public.app_role not null default 'user',
  full_name text,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.charge_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.charge_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, type)
);

create table if not exists public.billing_cycles (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  status public.cycle_status not null default 'draft',
  published_at timestamptz,
  locked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_cycles_month_first_day
    check (month = date_trunc('month', month)::date)
);

create table if not exists public.common_charges (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.billing_cycles(id) on delete cascade,
  category_id uuid not null references public.charge_categories(id) on delete restrict,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id, category_id)
);

create table if not exists public.individual_charges (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.billing_cycles(id) on delete cascade,
  flat_id uuid not null references public.flats(id) on delete cascade,
  category_id uuid not null references public.charge_categories(id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id, flat_id, category_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.billing_cycles(id) on delete cascade,
  flat_id uuid not null references public.flats(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  reference text,
  notes text,
  received_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.statements (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.billing_cycles(id) on delete cascade,
  flat_id uuid not null references public.flats(id) on delete cascade,
  opening_due numeric(12, 2) not null default 0,
  new_charges numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  closing_due numeric(12, 2) not null default 0,
  status public.statement_status not null default 'due',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id, flat_id)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.billing_cycles(id) on delete cascade,
  flat_id uuid references public.flats(id) on delete set null,
  email text not null,
  status text not null check (status in ('queued', 'sent', 'failed')),
  provider text,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_flat_id on public.profiles(flat_id);
create index if not exists idx_charge_categories_type_active on public.charge_categories(type, is_active);
create index if not exists idx_billing_cycles_month on public.billing_cycles(month);
create index if not exists idx_common_charges_cycle on public.common_charges(cycle_id);
create index if not exists idx_individual_charges_cycle_flat on public.individual_charges(cycle_id, flat_id);
create index if not exists idx_payments_cycle_flat on public.payments(cycle_id, flat_id);
create index if not exists idx_statements_cycle_flat on public.statements(cycle_id, flat_id);
create index if not exists idx_statements_flat on public.statements(flat_id);
create index if not exists idx_audit_log_table_created_at on public.audit_log(table_name, created_at desc);
create index if not exists idx_notifications_cycle on public.notifications(cycle_id);

create trigger trg_flats_updated_at
before update on public.flats
for each row
execute function public.set_updated_at();

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger trg_charge_categories_updated_at
before update on public.charge_categories
for each row
execute function public.set_updated_at();

create trigger trg_billing_cycles_updated_at
before update on public.billing_cycles
for each row
execute function public.set_updated_at();

create trigger trg_common_charges_updated_at
before update on public.common_charges
for each row
execute function public.set_updated_at();

create trigger trg_individual_charges_updated_at
before update on public.individual_charges
for each row
execute function public.set_updated_at();

create trigger trg_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create trigger trg_statements_updated_at
before update on public.statements
for each row
execute function public.set_updated_at();

create or replace function public.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  rid_text text;
  rid uuid;
begin
  if tg_op = 'DELETE' then
    rid_text := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'user_id');
  else
    rid_text := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id');
  end if;

  if rid_text is not null then
    rid := rid_text::uuid;
  else
    rid := null;
  end if;

  insert into public.audit_log (
    table_name,
    record_id,
    action,
    before_data,
    after_data,
    actor_user_id
  )
  values (
    tg_table_name,
    rid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    actor
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_audit_flats
after insert or update or delete on public.flats
for each row
execute function public.capture_audit_log();

create trigger trg_audit_profiles
after insert or update or delete on public.profiles
for each row
execute function public.capture_audit_log();

create trigger trg_audit_charge_categories
after insert or update or delete on public.charge_categories
for each row
execute function public.capture_audit_log();

create trigger trg_audit_billing_cycles
after insert or update or delete on public.billing_cycles
for each row
execute function public.capture_audit_log();

create trigger trg_audit_common_charges
after insert or update or delete on public.common_charges
for each row
execute function public.capture_audit_log();

create trigger trg_audit_individual_charges
after insert or update or delete on public.individual_charges
for each row
execute function public.capture_audit_log();

create trigger trg_audit_payments
after insert or update or delete on public.payments
for each row
execute function public.capture_audit_log();

create trigger trg_audit_statements
after insert or update or delete on public.statements
for each row
execute function public.capture_audit_log();
