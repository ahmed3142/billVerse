-- 0003_rpc.sql
-- Billing logic RPC functions

create or replace function public.generate_statements_for_cycle(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_month date;
  v_prev_cycle_id uuid;
  v_active_flats_count integer;
  v_common_total numeric(12, 2);
  v_common_split numeric(12, 2);
begin
  if not public.is_admin() then
    raise exception 'Only admin can generate statements';
  end if;

  select month
  into v_cycle_month
  from public.billing_cycles
  where id = p_cycle_id;

  if v_cycle_month is null then
    raise exception 'Billing cycle not found: %', p_cycle_id;
  end if;

  select id
  into v_prev_cycle_id
  from public.billing_cycles
  where month < v_cycle_month
    and status in ('published', 'locked')
  order by month desc
  limit 1;

  select count(*)
  into v_active_flats_count
  from public.flats
  where is_active = true;

  if v_active_flats_count = 0 then
    raise exception 'No active flats found';
  end if;

  select coalesce(sum(total_amount), 0)
  into v_common_total
  from public.common_charges
  where cycle_id = p_cycle_id;

  v_common_split := round(v_common_total / v_active_flats_count, 2);

  insert into public.statements (
    cycle_id,
    flat_id,
    opening_due,
    new_charges,
    paid_amount,
    closing_due,
    status
  )
  select
    p_cycle_id as cycle_id,
    f.id as flat_id,
    coalesce(prev_stmt.closing_due, 0) as opening_due,
    0 as new_charges,
    0 as paid_amount,
    0 as closing_due,
    'due'::public.statement_status as status
  from public.flats f
  left join public.statements prev_stmt
    on prev_stmt.cycle_id = v_prev_cycle_id
   and prev_stmt.flat_id = f.id
  where f.is_active = true
  on conflict (cycle_id, flat_id)
  do update set
    opening_due = excluded.opening_due,
    updated_at = now();

  with individual_totals as (
    select
      ic.flat_id,
      coalesce(sum(ic.amount), 0) as total
    from public.individual_charges ic
    where ic.cycle_id = p_cycle_id
    group by ic.flat_id
  )
  update public.statements s
  set new_charges = round(v_common_split + coalesce(it.total, 0), 2)
  from individual_totals it
  where s.cycle_id = p_cycle_id
    and s.flat_id = it.flat_id;

  update public.statements s
  set new_charges = round(v_common_split, 2)
  where s.cycle_id = p_cycle_id
    and not exists (
      select 1
      from public.individual_charges ic
      where ic.cycle_id = p_cycle_id
        and ic.flat_id = s.flat_id
    );

  with payment_totals as (
    select
      p.flat_id,
      coalesce(sum(p.amount), 0) as total
    from public.payments p
    where p.cycle_id = p_cycle_id
    group by p.flat_id
  )
  update public.statements s
  set paid_amount = round(coalesce(pt.total, 0), 2)
  from payment_totals pt
  where s.cycle_id = p_cycle_id
    and s.flat_id = pt.flat_id;

  update public.statements s
  set paid_amount = 0
  where s.cycle_id = p_cycle_id
    and not exists (
      select 1
      from public.payments p
      where p.cycle_id = p_cycle_id
        and p.flat_id = s.flat_id
    );

  update public.statements s
  set
    closing_due = round(s.opening_due + s.new_charges - s.paid_amount, 2),
    status = (
      case
        when abs(round(s.opening_due + s.new_charges - s.paid_amount, 2)) <= 0.01 then 'paid'
        when round(s.paid_amount, 2) = 0 and round(s.opening_due + s.new_charges, 2) > 0 then 'due'
        else 'partial'
      end
    )::public.statement_status,
    updated_at = now()
  where s.cycle_id = p_cycle_id;
end;
$$;

create or replace function public.publish_cycle(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admin can publish cycles';
  end if;

  update public.billing_cycles
  set
    status = 'published',
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = p_cycle_id
    and status = 'draft';

  if not found then
    raise exception 'Cycle must exist and be in draft status';
  end if;

  perform public.generate_statements_for_cycle(p_cycle_id);
end;
$$;

create or replace function public.recalculate_cycle(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.cycle_status;
begin
  if not public.is_admin() then
    raise exception 'Only admin can recalculate cycles';
  end if;

  select status
  into v_status
  from public.billing_cycles
  where id = p_cycle_id;

  if v_status is null then
    raise exception 'Billing cycle not found';
  end if;

  if v_status not in ('published', 'locked') then
    raise exception 'Only published or locked cycles can be recalculated';
  end if;

  perform public.generate_statements_for_cycle(p_cycle_id);
end;
$$;

create or replace function public.get_cycle_notification_recipients(p_cycle_id uuid)
returns table (
  flat_id uuid,
  flat_no text,
  email text
)
language sql
security definer
set search_path = public
as $$
  select
    s.flat_id,
    f.flat_no,
    p.email
  from public.statements s
  join public.flats f on f.id = s.flat_id
  join public.profiles p on p.flat_id = s.flat_id
  where s.cycle_id = p_cycle_id
    and p.email is not null;
$$;

grant execute on function public.generate_statements_for_cycle(uuid) to authenticated;
grant execute on function public.publish_cycle(uuid) to authenticated;
grant execute on function public.recalculate_cycle(uuid) to authenticated;
