-- 0002_rls.sql
-- Row Level Security policies and helper functions

create or replace function public.current_flat_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.flat_id
  from public.profiles p
  where p.user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.current_flat_id() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.flats enable row level security;
alter table public.profiles enable row level security;
alter table public.charge_categories enable row level security;
alter table public.billing_cycles enable row level security;
alter table public.common_charges enable row level security;
alter table public.individual_charges enable row level security;
alter table public.payments enable row level security;
alter table public.statements enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;

drop policy if exists flats_select_authenticated on public.flats;
create policy flats_select_authenticated
on public.flats
for select
to authenticated
using (true);

drop policy if exists flats_admin_write on public.flats;
create policy flats_admin_write
on public.flats
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists charge_categories_select_authenticated on public.charge_categories;
create policy charge_categories_select_authenticated
on public.charge_categories
for select
to authenticated
using (true);

drop policy if exists charge_categories_admin_write on public.charge_categories;
create policy charge_categories_admin_write
on public.charge_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists billing_cycles_select_authenticated on public.billing_cycles;
create policy billing_cycles_select_authenticated
on public.billing_cycles
for select
to authenticated
using (true);

drop policy if exists billing_cycles_admin_write on public.billing_cycles;
create policy billing_cycles_admin_write
on public.billing_cycles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists common_charges_select_admin on public.common_charges;
create policy common_charges_select_admin
on public.common_charges
for select
to authenticated
using (public.is_admin());

drop policy if exists common_charges_admin_write on public.common_charges;
create policy common_charges_admin_write
on public.common_charges
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists individual_charges_select_own_or_admin on public.individual_charges;
create policy individual_charges_select_own_or_admin
on public.individual_charges
for select
to authenticated
using (public.is_admin() or flat_id = public.current_flat_id());

drop policy if exists individual_charges_admin_write on public.individual_charges;
create policy individual_charges_admin_write
on public.individual_charges
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists payments_select_own_or_admin on public.payments;
create policy payments_select_own_or_admin
on public.payments
for select
to authenticated
using (public.is_admin() or flat_id = public.current_flat_id());

drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists statements_select_own_or_admin on public.statements;
create policy statements_select_own_or_admin
on public.statements
for select
to authenticated
using (public.is_admin() or flat_id = public.current_flat_id());

drop policy if exists statements_admin_write on public.statements;
create policy statements_admin_write
on public.statements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin
on public.audit_log
for select
to authenticated
using (public.is_admin());

drop policy if exists audit_log_insert_actor on public.audit_log;
create policy audit_log_insert_actor
on public.audit_log
for insert
to authenticated
with check (actor_user_id = auth.uid());

drop policy if exists notifications_select_admin on public.notifications;
create policy notifications_select_admin
on public.notifications
for select
to authenticated
using (public.is_admin());

drop policy if exists notifications_write_admin on public.notifications;
create policy notifications_write_admin
on public.notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
