-- 0007_lock_cycle_enforcement.sql
-- Enforce lock mode: block edits/payments/recalculation for locked cycles.

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

  if v_status <> 'published' then
    raise exception 'Only published cycles can be recalculated';
  end if;

  perform public.generate_statements_for_cycle(p_cycle_id);
end;
$$;

drop policy if exists common_charges_admin_write on public.common_charges;
create policy common_charges_admin_write
on public.common_charges
for all
to authenticated
using (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
);

drop policy if exists individual_charges_admin_write on public.individual_charges;
create policy individual_charges_admin_write
on public.individual_charges
for all
to authenticated
using (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
);

drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write
on public.payments
for all
to authenticated
using (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
);

drop policy if exists statements_admin_write on public.statements;
create policy statements_admin_write
on public.statements
for all
to authenticated
using (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.billing_cycles bc
    where bc.id = cycle_id
      and bc.status <> 'locked'
  )
);
