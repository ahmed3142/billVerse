-- 0005_statement_breakdown_rpc.sql
-- Per-flat statement breakdown (common share + individual charges) for current user

create or replace function public.get_my_statement_breakdown(p_cycle_id uuid)
returns table (
  category_name text,
  charge_type text,
  amount numeric(12, 2)
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flat_id uuid;
  v_flat_count integer;
  v_has_statement boolean;
begin
  v_flat_id := public.current_flat_id();

  if v_flat_id is null then
    return;
  end if;

  select exists (
    select 1
    from public.statements s
    join public.billing_cycles bc on bc.id = s.cycle_id
    where s.cycle_id = p_cycle_id
      and s.flat_id = v_flat_id
      and bc.status in ('published', 'locked')
  )
  into v_has_statement;

  if not v_has_statement then
    return;
  end if;

  select count(*)
  into v_flat_count
  from public.statements s
  where s.cycle_id = p_cycle_id;

  if v_flat_count = 0 then
    return;
  end if;

  return query
  with common_rows as (
    select
      cc.category_id,
      round(cc.total_amount / v_flat_count::numeric, 2) as amount
    from public.common_charges cc
    where cc.cycle_id = p_cycle_id
  ),
  individual_rows as (
    select
      ic.category_id,
      round(ic.amount, 2) as amount
    from public.individual_charges ic
    where ic.cycle_id = p_cycle_id
      and ic.flat_id = v_flat_id
  )
  select
    cat.name as category_name,
    'common'::text as charge_type,
    cr.amount
  from common_rows cr
  join public.charge_categories cat on cat.id = cr.category_id

  union all

  select
    cat.name as category_name,
    'individual'::text as charge_type,
    ir.amount
  from individual_rows ir
  join public.charge_categories cat on cat.id = ir.category_id

  order by charge_type, category_name;
end;
$$;

grant execute on function public.get_my_statement_breakdown(uuid) to authenticated;
