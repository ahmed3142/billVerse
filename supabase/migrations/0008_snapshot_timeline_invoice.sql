-- 0008_snapshot_timeline_invoice.sql
-- Final snapshot invoice data, cycle lock RPC, and activity timeline helper.

create table if not exists public.cycle_snapshots (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references public.billing_cycles(id) on delete cascade,
  month date not null,
  locked_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.statement_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.cycle_snapshots(id) on delete cascade,
  cycle_id uuid not null references public.billing_cycles(id) on delete cascade,
  flat_id uuid not null references public.flats(id) on delete cascade,
  flat_no text not null,
  opening_due numeric(12, 2) not null default 0,
  new_charges numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  closing_due numeric(12, 2) not null default 0,
  status public.statement_status not null,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(snapshot_id, flat_id)
);

create index if not exists idx_cycle_snapshots_cycle on public.cycle_snapshots(cycle_id);
create index if not exists idx_statement_snapshots_cycle_flat on public.statement_snapshots(cycle_id, flat_id);

alter table public.cycle_snapshots enable row level security;
alter table public.statement_snapshots enable row level security;

drop policy if exists cycle_snapshots_select_admin on public.cycle_snapshots;
create policy cycle_snapshots_select_admin
on public.cycle_snapshots
for select
to authenticated
using (public.is_admin());

drop policy if exists cycle_snapshots_write_admin on public.cycle_snapshots;
create policy cycle_snapshots_write_admin
on public.cycle_snapshots
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists statement_snapshots_select_own_or_admin on public.statement_snapshots;
create policy statement_snapshots_select_own_or_admin
on public.statement_snapshots
for select
to authenticated
using (public.is_admin() or flat_id = public.current_flat_id());

drop policy if exists statement_snapshots_write_admin on public.statement_snapshots;
create policy statement_snapshots_write_admin
on public.statement_snapshots
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.freeze_cycle_snapshot(p_cycle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.cycle_status;
  v_month date;
  v_snapshot_id uuid;
  v_flat_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only admin can freeze snapshots';
  end if;

  select status, month
  into v_status, v_month
  from public.billing_cycles
  where id = p_cycle_id;

  if v_status is null then
    raise exception 'Billing cycle not found';
  end if;

  if v_status not in ('published', 'locked') then
    raise exception 'Only published or locked cycles can be snapshotted';
  end if;

  select id
  into v_snapshot_id
  from public.cycle_snapshots
  where cycle_id = p_cycle_id;

  if v_snapshot_id is not null then
    return v_snapshot_id;
  end if;

  insert into public.cycle_snapshots(cycle_id, month, locked_at, created_by)
  values (p_cycle_id, v_month, now(), auth.uid())
  returning id into v_snapshot_id;

  select count(*)
  into v_flat_count
  from public.statements s
  where s.cycle_id = p_cycle_id;

  if v_flat_count = 0 then
    return v_snapshot_id;
  end if;

  insert into public.statement_snapshots (
    snapshot_id,
    cycle_id,
    flat_id,
    flat_no,
    opening_due,
    new_charges,
    paid_amount,
    closing_due,
    status,
    line_items
  )
  select
    v_snapshot_id,
    s.cycle_id,
    s.flat_id,
    f.flat_no,
    s.opening_due,
    s.new_charges,
    s.paid_amount,
    s.closing_due,
    s.status,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category_name', x.category_name,
            'charge_type', x.charge_type,
            'amount', x.amount
          )
          order by x.charge_type, x.category_name
        )
        from (
          select
            cat.name as category_name,
            'common'::text as charge_type,
            round(cc.total_amount / v_flat_count::numeric, 2) as amount
          from public.common_charges cc
          join public.charge_categories cat on cat.id = cc.category_id
          where cc.cycle_id = p_cycle_id

          union all

          select
            cat.name as category_name,
            'individual'::text as charge_type,
            round(ic.amount, 2) as amount
          from public.individual_charges ic
          join public.charge_categories cat on cat.id = ic.category_id
          where ic.cycle_id = p_cycle_id
            and ic.flat_id = s.flat_id
        ) x
      ),
      '[]'::jsonb
    ) as line_items
  from public.statements s
  join public.flats f on f.id = s.flat_id
  where s.cycle_id = p_cycle_id;

  return v_snapshot_id;
end;
$$;

create or replace function public.lock_cycle(p_cycle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admin can lock cycles';
  end if;

  update public.billing_cycles
  set
    status = 'locked',
    locked_at = coalesce(locked_at, now()),
    updated_at = now()
  where id = p_cycle_id
    and status = 'published';

  if not found then
    raise exception 'Cycle must exist and be in published status';
  end if;

  v_snapshot_id := public.freeze_cycle_snapshot(p_cycle_id);
  return v_snapshot_id;
end;
$$;

create or replace function public.get_cycle_timeline(p_cycle_id uuid)
returns table (
  id bigint,
  table_name text,
  action text,
  actor_user_id uuid,
  created_at timestamptz,
  summary text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.table_name,
    a.action,
    a.actor_user_id,
    a.created_at,
    case
      when a.table_name = 'billing_cycles' then 'Cycle metadata changed'
      when a.table_name = 'common_charges' then 'Common charges updated'
      when a.table_name = 'individual_charges' then 'Individual charges updated'
      when a.table_name = 'payments' then 'Payment recorded/updated'
      when a.table_name = 'statements' then 'Statement values recalculated'
      else 'Audit event'
    end as summary
  from public.audit_log a
  where
    (a.table_name = 'billing_cycles' and a.record_id = p_cycle_id)
    or coalesce(a.after_data->>'cycle_id', a.before_data->>'cycle_id', '') = p_cycle_id::text
  order by a.created_at desc
  limit 200;
$$;

grant execute on function public.freeze_cycle_snapshot(uuid) to authenticated;
grant execute on function public.lock_cycle(uuid) to authenticated;
grant execute on function public.get_cycle_timeline(uuid) to authenticated;
