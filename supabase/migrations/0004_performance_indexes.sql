create index if not exists idx_common_bills_published_period
on public.common_bills (is_published, year desc, month desc);

create index if not exists idx_statements_flat_period_desc
on public.monthly_statements (flat_id, year desc, month desc);

create index if not exists idx_payments_statement_date_desc
on public.payment_history (statement_id, payment_date desc);

create index if not exists idx_payments_flat_date_desc
on public.payment_history (flat_id, payment_date desc);

create index if not exists idx_notifications_user_created_desc
on public.notifications (user_id, created_at desc);
