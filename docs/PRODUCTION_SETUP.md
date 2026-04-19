# Production Setup

This project now assumes a real Supabase backend and a normal Next.js deployment flow.

## 1. Create the Supabase project

1. Go to Supabase and create a new project.
2. Copy the project URL and the publishable key from the API settings.
3. Keep the service role key server-only. It is required by this app for the public status board route and must never be exposed to the browser.

## 2. Configure local environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 3. Apply the database schema

You can run the SQL manually in the Supabase SQL editor, or use the Supabase CLI.

Recommended CLI flow:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Migrations included in this repo:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_auth_users.sql`

What they do:

- Create the billing tables
- Add RLS policies
- Add the `publish_billing_cycle` SQL function
- Auto-link new auth users to `public.users` when the email matches a flat email

## 4. Create the first admin account

1. In Supabase Auth, create the admin user in the dashboard.
2. Copy that auth user UUID.
3. Run this SQL in the SQL editor:

```sql
insert into public.users (id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (id) do update set role = 'admin';
```

## 5. Configure email-based resident access

1. In the app or directly in SQL, create flats with the resident email address filled in.
2. Residents can then sign up with the same email address.
3. The trigger in `0003_auth_users.sql` links the auth account to the correct flat automatically.

## 6. Update Supabase email templates

In Supabase Auth URL Configuration:

1. Set the Site URL to your app origin, for example `http://localhost:3000` locally and `https://your-domain.com` in production.
2. Add your confirmation route to the redirect allow list for every environment you use.

For server-side confirmation links, update the Confirm signup email template to use the callback route handled by this app:

```text
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

This app already sends `emailRedirectTo` as `/auth/confirm?next=/dashboard`, so `{{ .RedirectTo }}` ensures the token is appended to the right route.

For password recovery, set the reset email redirect to:

```text
https://your-domain.com/auth/confirm?next=/reset-password/update
```

The same template pattern works because the confirmation route verifies the token server-side before redirecting to the password update screen.

## 7. Run the app locally

```bash
npm install
npm run dev
```

Then:

1. Sign in with the admin account
2. Add flats
3. Add current month common and individual bills
4. Publish the cycle
5. Record payments
6. Test resident login using a flat email

## 8. Prepare Vercel deployment

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add these environment variables in the Vercel project:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

4. Set `NEXT_PUBLIC_SITE_URL` per environment:
   - Local development: `http://localhost:3000`
   - Production: `https://your-domain.com`
   - Preview: use a stable staging URL if you send auth emails from preview deployments, or leave it unset so the app can fall back to the request host
5. Redeploy after saving the environment variables so the build picks up the new values.

## 9. Pull Vercel env vars back into local development when needed

```bash
vercel env pull .env.local
```

Use that after changing env vars in the Vercel dashboard so local development stays in sync.

## 10. Production verification checklist

1. Confirm admin sign-in works.
2. Confirm resident sign-up links to the correct flat.
3. Confirm common bills save correctly.
4. Confirm individual bills auto-save.
5. Confirm publish generates monthly statements.
6. Confirm notifications are created.
7. Confirm resident dashboard loads current bill and history.
8. Confirm PDF generation works.
9. Confirm public status board and Excel export work.
10. Confirm dark theme works on login, admin, resident, and status pages.
