-- 0004_views.sql
-- Public status board (status-only)

create or replace view public.public_status_board as
select
  bc.month,
  f.flat_no,
  s.status
from public.statements s
join public.billing_cycles bc on bc.id = s.cycle_id
join public.flats f on f.id = s.flat_id
where bc.status in ('published', 'locked')
  and bc.month = date_trunc('month', timezone('Asia/Dhaka', now()))::date;

grant select on public.public_status_board to authenticated;
