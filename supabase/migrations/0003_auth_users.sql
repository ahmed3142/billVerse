create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flat_id uuid;
begin
  select id
  into v_flat_id
  from public.flats
  where email is not null
    and lower(email) = lower(new.email)
  limit 1;

  insert into public.users (id, flat_id, role, created_at)
  values (new.id, v_flat_id, 'user', now())
  on conflict (id)
  do update set flat_id = excluded.flat_id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flat_id uuid;
begin
  select id
  into v_flat_id
  from public.flats
  where email is not null
    and lower(email) = lower(new.email)
  limit 1;

  update public.users
  set flat_id = v_flat_id
  where id = new.id
    and role = 'user';

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row
execute function public.handle_auth_user_updated();
