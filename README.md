# BillVerse

<div align="center">
  <img src="./docs/images/public-status-hero.jpg" alt="BillVerse public status hero" width="100%" />

  <h3>Modern building billing for apartment communities</h3>
  <p>
    BillVerse gives administrators a fast monthly billing workspace and gives residents a clean place to review dues, payments, notifications, PDFs, and a shareable public collection board.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.2.4-0F172A?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16.2.4" />
    <img src="https://img.shields.io/badge/React-19.2.4-0EA5E9?style=for-the-badge&logo=react&logoColor=white" alt="React 19.2.4" />
    <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-16A34A?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Public_Status-Search%20%2B%20Export-F97316?style=for-the-badge" alt="Public status board" />
    <img src="https://img.shields.io/badge/PDF-Statement%20Download-E11D48?style=for-the-badge" alt="PDF statements" />
  </p>
</div>

> [!NOTE]
> BillVerse is a full-stack billing workspace built for flat or apartment-based buildings. Admins can draft and publish monthly bills, record payments, and monitor collections. Residents can sign in with their assigned email to review statements, history, and notifications. A public status board keeps collection progress transparent without exposing the full app.

## Overview

BillVerse is designed around one clear monthly workflow:

1. Create or update flats and assign resident emails.
2. Enter shared building costs and per-flat usage costs.
3. Publish the monthly cycle.
4. Generate statements automatically for every active flat.
5. Record payments over time.
6. Keep residents informed through notifications, PDFs, and status updates.

## Product Tour

| Public Status Hero | Login and Account Access |
| --- | --- |
| ![BillVerse public status hero](./docs/images/public-status-hero.jpg) | ![BillVerse login screen](./docs/images/login-screen.jpg) |

| Admin Overview | Admin Billing Workspace |
| --- | --- |
| ![BillVerse admin dashboard](./docs/images/admin-dashboard.jpg) | ![BillVerse billing workspace](./docs/images/admin-billing.jpg) |

| Public Collections Board |
| --- |
| ![BillVerse public collections board](./docs/images/public-collections.jpg) |

## What It Does

- Draft common monthly building charges in one place
- Enter per-flat monthly usage for electricity, water, gas, dish, and internet
- Generate resident statements automatically during publish
- Carry forward previous unpaid balances
- Record full or partial payments with notes and payment method
- Notify residents when bills are published and when payments are recorded
- Let residents download PDF statements and review billing history
- Share a public status board with search, filters, sorting, and export

## Experience By Role

| Role | Main Value |
| --- | --- |
| `admin` | Manage flats, prepare the month, publish bills, record payments, and monitor collection progress |
| `user` | View the current bill, download the PDF, review history, and check notifications |
| `public` | View the latest published status board with search, filters, and exports without signing in |

## Billing Flow At A Glance

| Stage | Purpose |
| --- | --- |
| `Flat setup` | Create flats and assign resident emails before sign-up |
| `Common bills` | Enter building-wide charges such as electricity, water, gas, garbage, security, cleaner, and other costs |
| `Individual bills` | Enter per-flat charges for the selected month |
| `Publish cycle` | Generate monthly statements, split common share, and mark the cycle as published |
| `Notifications` | Inform residents that new bills are ready |
| `Payment recording` | Track collections, partial payments, and outstanding balances |
| `Public status` | Share progress through the status board and exports |

```text
Admin setup flats
   -> Create common bills
   -> Fill individual bills
   -> Publish billing cycle
   -> Generate monthly statements
   -> Notify residents
   -> Record payments
   -> Update dashboard and public collection board
```

## Core Features

### Admin Features

- Dashboard with latest cycle, active flats, collected total, outstanding amount, and recent payments
- Flat directory with owner name, phone, resident email, and active billing status
- Common bill editor for shared monthly building charges
- Individual bill workspace with auto-save for per-flat entries
- Monthly summary panel for cycle status, active flats, and publish readiness
- Payment recording with partial payments, notes, and payment method tracking
- Resident notification creation on publish and payment updates

### Resident Features

- Shared sign-in and sign-up flow
- Flat-linked account access based on assigned email
- Current bill view with common, individual, and previous due breakdown
- PDF statement download
- Billing history view
- Notification center with read tracking
- Password reset flow

### Public Status Features

- Latest published month summary
- Search by flat number or owner
- Filters for `All`, `Paid`, `Partial`, and `Pending`
- Sort by due, paid, and balance
- Excel export
- PDF export
- Quick `Open app` action for residents and admins

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd billVerse
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root using `.env.example` as the template:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

> [!IMPORTANT]
> Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and never commit `.env.local` or any `.env.*` files with real credentials.

### 3. Apply the database schema

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Included migrations:

1. `0001_init.sql`
2. `0002_rls.sql`
3. `0003_auth_users.sql`
4. `0004_performance_indexes.sql`

### 4. Create the first admin

1. Create the admin user in Supabase Authentication.
2. Copy the auth user UUID.
3. Run this SQL:

```sql
insert into public.users (id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (id) do update set role = 'admin';
```

### 5. Start the app

```bash
npm run dev
```

Open:

- `http://localhost:3000/login`
- `http://localhost:3000/status`

## Admin Guide

### 1. Sign in

Admins sign in through `/login` and are redirected to `/admin/dashboard`.

### 2. Manage flats

Use `/admin/flats` to add or update:

- Flat number
- Owner name
- Phone
- Resident email
- Active billing status

> [!TIP]
> Add the resident email before the resident signs up. The auth-linking flow uses that email to connect the user account to the correct flat automatically.

### 3. Prepare the month

Use `/admin/bills/new` to manage the selected cycle:

- Enter common building costs
- Enter per-flat usage costs
- Review the monthly summary
- Save common bills manually
- Let individual bill rows auto-save

Important behavior:

- Published cycles become read-only
- Per-flat totals can include carried previous due
- Monthly statements are created when the cycle is published

### 4. Publish the billing cycle

Publishing triggers the billing engine to:

- Generate monthly statements for active flats
- Split the common total evenly across active flats
- Carry forward unpaid previous balances
- Mark the cycle as published
- Create resident notifications

### 5. Record payments

Use `/admin/payments` to record collections.

For each payment you can store:

- Amount
- Payment method
- Notes

BillVerse then:

- Prevents overpayment
- Updates `amount_paid`
- Recalculates `pending`, `partial`, or `paid`
- Saves the transaction to `payment_history`
- Notifies the linked resident account

### 6. Monitor collections

Use:

- `/admin/dashboard` for the internal admin summary
- `/status` for the public collection board

## Resident Guide

### 1. Create an account

Residents sign up from `/login` using the exact email already assigned to their flat.

Requirements:

- The email must already exist on the flat record
- The password must be at least 8 characters
- The resident should complete email confirmation through Supabase

### 2. Sign in

Residents sign in from `/login` and are redirected to `/dashboard`.

### 3. Review the current bill

The resident dashboard includes:

- Current billing period
- Due date
- Total due
- Common charges
- Individual charges
- Previous due
- Payment status
- Recent notifications
- Recent payments

### 4. Download the PDF statement

Residents can download the monthly statement PDF directly from the current bill page.

### 5. Review history

The `/history` page shows:

- Billing period
- Common share
- Individual total
- Previous due
- Total due
- Payment status

### 6. Read notifications

The `/notifications` page includes:

- Bill publication alerts
- Payment received alerts
- Timestamped account updates

### 7. Reset password

If needed:

1. Go to `/reset-password`
2. Enter the linked email
3. Follow the recovery email
4. Complete the update form at `/reset-password/update`

## Public Status Board

The public board at `/status` is built for transparency without exposing private account pages.

It supports:

- Search by flat or owner
- Status filter chips with counts
- Sortable due, paid, and balance columns
- Export to Excel
- Export to PDF
- Quick access back into the app

Best use cases:

- Sharing collection progress with residents
- Reviewing unpaid balances quickly
- Exporting the visible state of the month for reporting

## Installation Guide

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- Optional: Vercel for deployment
- Optional: Vercel KV if you want external cache support

### Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Base URL for redirects and generated links |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser-safe Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for secure operations |
| `KV_REST_API_URL` | Optional | Enables Vercel KV-backed caching helpers |

### First-Run Checklist

1. Sign in as admin
2. Add flats and resident emails
3. Create a billing month
4. Save common bills
5. Fill individual bills
6. Publish the cycle
7. Record one or more payments
8. Verify resident dashboard, PDF, notifications, history, and public status board

## Tech Stack

| Component | Role |
| --- | --- |
| `Next.js 16` | App Router, routing, server rendering, and API routes |
| `React 19` | Frontend UI and interactions |
| `Tailwind CSS 4` | Styling system |
| `Supabase Auth` | Authentication and account linking |
| `Supabase PostgreSQL` | Primary database |
| `TanStack React Query` | Client-side fetching and cache orchestration |
| `@react-pdf/renderer` | PDF statement generation |
| `xlsx` | Spreadsheet export |

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Repository Structure

```text
app/                   Next.js App Router pages and API routes
components/            Admin, resident, shared, and UI components
docs/                  Production notes and screenshots
lib/                   Auth, data access, cache, utilities, validators
supabase/migrations/   Database schema, RLS, auth, and index migrations
types/                 Shared TypeScript domain types
```

## Deployment Notes

- Add the same environment variables in Vercel
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only
- Configure Supabase Auth redirect URLs correctly
- Review [`docs/PRODUCTION_SETUP.md`](./docs/PRODUCTION_SETUP.md) before going live

## Security Notes

> [!IMPORTANT]
> Never commit `.env.local`, `.env.production`, service-role keys, private credentials, or raw secret files.

> [!WARNING]
> If a secret was exposed previously, rotate it before deployment or repository publication.

## Why BillVerse Helps

- Reduces monthly billing friction for building admins
- Keeps payment tracking consistent
- Gives residents a simpler self-service experience
- Improves trust through a transparent public status board
- Creates a clearer handoff between billing, collections, and resident communication

## Future Ideas

- Editable post-publish correction workflow with audit logs
- Role-based admin permissions
- SMS or WhatsApp payment reminders
- Online payment gateway integration
- Multi-building support
- Better analytics for payment trends and collection performance
