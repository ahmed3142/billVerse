alter table public.flats enable row level security;
alter table public.users enable row level security;
alter table public.common_bills enable row level security;
alter table public.individual_bills enable row level security;
alter table public.monthly_statements enable row level security;
alter table public.payment_history enable row level security;
alter table public.notifications enable row level security;

drop policy if exists admins_manage_flats on public.flats;
create policy admins_manage_flats
on public.flats
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_users on public.users;
create policy admins_manage_users
on public.users
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_common_bills on public.common_bills;
create policy admins_manage_common_bills
on public.common_bills
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_individual_bills on public.individual_bills;
create policy admins_manage_individual_bills
on public.individual_bills
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_statements on public.monthly_statements;
create policy admins_manage_statements
on public.monthly_statements
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_payments on public.payment_history;
create policy admins_manage_payments
on public.payment_history
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_notifications on public.notifications;
create policy admins_manage_notifications
on public.notifications
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists users_read_own_profile on public.users;
create policy users_read_own_profile
on public.users
for select
using (id = auth.uid());

drop policy if exists users_read_own_flat on public.flats;
create policy users_read_own_flat
on public.flats
for select
using (
  exists (
    select 1
    from public.users
    where id = auth.uid()
      and flat_id = public.flats.id
  )
);

drop policy if exists authenticated_read_published_common_bills on public.common_bills;
create policy authenticated_read_published_common_bills
on public.common_bills
for select
using (
  auth.role() = 'authenticated'
  and is_published = true
);

drop policy if exists users_read_own_individual_bills on public.individual_bills;
create policy users_read_own_individual_bills
on public.individual_bills
for select
using (
  flat_id in (
    select flat_id
    from public.users
    where id = auth.uid()
  )
);

drop policy if exists users_read_own_statements on public.monthly_statements;
create policy users_read_own_statements
on public.monthly_statements
for select
using (
  flat_id in (
    select flat_id
    from public.users
    where id = auth.uid()
  )
);

drop policy if exists users_read_own_payments on public.payment_history;
create policy users_read_own_payments
on public.payment_history
for select
using (
  flat_id in (
    select flat_id
    from public.users
    where id = auth.uid()
  )
);

drop policy if exists users_read_own_notifications on public.notifications;
create policy users_read_own_notifications
on public.notifications
for select
using (user_id = auth.uid());

drop policy if exists users_update_own_notifications on public.notifications;
create policy users_update_own_notifications
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
