create extension if not exists "uuid-ossp";

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.flats (
  id uuid primary key default uuid_generate_v4(),
  flat_number varchar(10) unique not null,
  owner_name varchar(100) not null,
  phone varchar(20),
  email varchar(100),
  is_active boolean default true,
  created_at timestamptz default now()
);

create unique index if not exists idx_flats_email_unique
on public.flats (lower(email))
where email is not null;

create index if not exists idx_flats_active on public.flats(is_active);
create index if not exists idx_flats_number on public.flats(flat_number);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  flat_id uuid references public.flats(id) on delete set null,
  role varchar(20) not null check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

create index if not exists idx_users_flat on public.users(flat_id);
create index if not exists idx_users_role on public.users(role);

create table if not exists public.common_bills (
  id uuid primary key default uuid_generate_v4(),
  month integer not null check (month between 1 and 12),
  year integer not null,
  electricity numeric(10, 2) default 0,
  water numeric(10, 2) default 0,
  gas numeric(10, 2) default 0,
  garbage numeric(10, 2) default 0,
  project_security numeric(10, 2) default 0,
  cleaner numeric(10, 2) default 0,
  others numeric(10, 2) default 0,
  total numeric(10, 2) generated always as (
    electricity + water + gas + garbage + project_security + cleaner + others
  ) stored,
  published_at timestamptz,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (month, year)
);

create index if not exists idx_common_bills_date on public.common_bills(year, month);
create index if not exists idx_common_bills_published on public.common_bills(is_published);

drop trigger if exists trg_common_bills_updated_at on public.common_bills;
create trigger trg_common_bills_updated_at
before update on public.common_bills
for each row
execute function public.touch_updated_at();

create table if not exists public.individual_bills (
  id uuid primary key default uuid_generate_v4(),
  flat_id uuid references public.flats(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  electricity numeric(10, 2) default 0,
  water numeric(10, 2) default 0,
  gas numeric(10, 2) default 0,
  dish_line numeric(10, 2) default 0,
  internet_line numeric(10, 2) default 0,
  total numeric(10, 2) generated always as (
    electricity + water + gas + dish_line + internet_line
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (flat_id, month, year)
);

create index if not exists idx_individual_bills_flat on public.individual_bills(flat_id);
create index if not exists idx_individual_bills_date on public.individual_bills(year, month);

drop trigger if exists trg_individual_bills_updated_at on public.individual_bills;
create trigger trg_individual_bills_updated_at
before update on public.individual_bills
for each row
execute function public.touch_updated_at();

create table if not exists public.monthly_statements (
  id uuid primary key default uuid_generate_v4(),
  flat_id uuid references public.flats(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  common_share numeric(10, 2) not null,
  individual_total numeric(10, 2) not null,
  previous_due numeric(10, 2) default 0,
  total_due numeric(10, 2) not null,
  amount_paid numeric(10, 2) default 0,
  payment_status varchar(20) default 'pending' check (payment_status in ('pending', 'partial', 'paid')),
  payment_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (flat_id, month, year)
);

create index if not exists idx_statements_flat on public.monthly_statements(flat_id);
create index if not exists idx_statements_date on public.monthly_statements(year, month);
create index if not exists idx_statements_status on public.monthly_statements(payment_status);

drop trigger if exists trg_monthly_statements_updated_at on public.monthly_statements;
create trigger trg_monthly_statements_updated_at
before update on public.monthly_statements
for each row
execute function public.touch_updated_at();

create table if not exists public.payment_history (
  id uuid primary key default uuid_generate_v4(),
  flat_id uuid references public.flats(id) on delete cascade,
  statement_id uuid references public.monthly_statements(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payment_date timestamptz default now(),
  payment_method varchar(50),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_payments_flat on public.payment_history(flat_id);
create index if not exists idx_payments_statement on public.payment_history(statement_id);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  title varchar(200) not null,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, is_read);
create index if not exists idx_notifications_created on public.notifications(created_at);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.generate_monthly_statements(p_month integer, p_year integer)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_common_total numeric(10, 2);
  v_active_flats integer;
  v_common_share numeric(10, 2);
  v_flat record;
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate statements';
  end if;

  select total
  into v_common_total
  from public.common_bills
  where month = p_month and year = p_year;

  if v_common_total is null then
    raise exception 'Common bills for %/% were not found', p_month, p_year;
  end if;

  select count(*)
  into v_active_flats
  from public.flats
  where is_active = true;

  if v_active_flats = 0 then
    raise exception 'No active flats available for billing';
  end if;

  v_common_share := round((v_common_total / v_active_flats)::numeric, 2);

  for v_flat in
    select id
    from public.flats
    where is_active = true
  loop
    insert into public.monthly_statements (
      flat_id,
      month,
      year,
      common_share,
      individual_total,
      previous_due,
      total_due
    )
    select
      v_flat.id,
      p_month,
      p_year,
      v_common_share,
      coalesce(ib.total, 0),
      coalesce(prev.total_due - prev.amount_paid, 0),
      round(
        v_common_share
        + coalesce(ib.total, 0)
        + coalesce(prev.total_due - prev.amount_paid, 0),
        2
      )
    from public.flats f
    left join public.individual_bills ib
      on ib.flat_id = f.id
      and ib.month = p_month
      and ib.year = p_year
    left join public.monthly_statements prev
      on prev.flat_id = f.id
      and (
        (prev.month = p_month - 1 and prev.year = p_year)
        or (prev.month = 12 and prev.year = p_year - 1 and p_month = 1)
      )
    where f.id = v_flat.id
    on conflict (flat_id, month, year)
    do update set
      common_share = excluded.common_share,
      individual_total = excluded.individual_total,
      previous_due = excluded.previous_due,
      total_due = excluded.total_due,
      payment_status = case
        when coalesce(public.monthly_statements.amount_paid, 0) <= 0 then 'pending'
        when coalesce(public.monthly_statements.amount_paid, 0) >= excluded.total_due then 'paid'
        else 'partial'
      end,
      updated_at = now();
  end loop;
end;
$$;

create or replace function public.publish_billing_cycle(p_month integer, p_year integer)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_common_id uuid;
  v_statement_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can publish bills';
  end if;

  select id
  into v_common_id
  from public.common_bills
  where month = p_month and year = p_year
  for update;

  if v_common_id is null then
    raise exception 'Create common bills before publishing';
  end if;

  if exists (
    select 1
    from public.common_bills
    where id = v_common_id
      and is_published = true
  ) then
    raise exception 'This billing cycle is already published';
  end if;

  perform public.generate_monthly_statements(p_month, p_year);

  update public.common_bills
  set is_published = true,
      published_at = now(),
      updated_at = now()
  where id = v_common_id;

  select count(*)
  into v_statement_count
  from public.monthly_statements
  where month = p_month and year = p_year;

  return v_statement_count;
end;
$$;
