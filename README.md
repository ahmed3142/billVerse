# Building Bill Manager

Next.js + Supabase app for monthly building billing cycles with:

- one login per flat
- admin-managed cycle drafting/publish/recalculate
- equal split of common charges across active flats
- individual per-flat charges
- partial payment support
- automatic carry-forward due
- current-month public status board (status only)
- audit log on critical data writes
- email notifications on publish via Supabase Edge Function

## Tech

- Frontend: Next.js App Router + TypeScript
- Backend: Supabase Postgres, Auth, RLS, RPC
- Emails: Supabase Edge Function (`send-cycle-emails`) + Resend API

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and fill values:

```bash
cp .env.example .env.local
```

3. In Supabase SQL editor (or CLI), run migrations in order:

- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_rls.sql`
- `supabase/migrations/0003_rpc.sql`
- `supabase/migrations/0004_views.sql`

4. Seed categories and sample flats:

- `supabase/seed.sql`

5. Create Auth users and link each user to a flat in `profiles` (one per flat).

6. Deploy edge function and set function secrets:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_BASE_URL`

7. Run app:

```bash
npm run dev
```

## Main Routes

- `/login`, `/reset-password`
- `/status` (current month status board)
- `/me`, `/me/[month]`
- `/admin/cycles`
- `/admin/cycles/[id]`
- `/admin/cycles/[id]/common`
- `/admin/cycles/[id]/individual`
- `/admin/cycles/[id]/payments`
- `/admin/categories`
- `/admin/audit`

## Billing Formula

For each flat and cycle:

- `opening_due = previous_cycle.closing_due (or 0)`
- `new_charges = common_split + sum(individual_charges)`
- `paid_amount = sum(payments)`
- `closing_due = opening_due + new_charges - paid_amount`

Status:

- `paid` if `closing_due <= 0` (tolerance applied in RPC)
- `due` if `paid_amount = 0` and total due > 0
- `partial` otherwise

## Notes

- Cycle publish runs `publish_cycle(cycle_id)` RPC.
- Recalculate runs `recalculate_cycle(cycle_id)` RPC.
- Publish flow attempts to call `/functions/v1/send-cycle-emails`.
- The status board view only exposes `(month, flat_no, status)`.
