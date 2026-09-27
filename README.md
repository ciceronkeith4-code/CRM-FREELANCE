# FreelanceOS

A personal CRM and business-management app for a solo IT freelancer: leads → quotations → projects → change requests → invoices & payments → recurring services/renewals → product license sales, plus expenses, a calendar, reports, and a dashboard.

Built with React, TypeScript, Tailwind, shadcn/ui, and Supabase (Postgres + Auth + Storage).

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Apply the database schema.** In the Supabase dashboard, open the SQL Editor and run each file in `supabase/migrations/` in order (`0001_core.sql` through the last one). Alternatively, if you have the [Supabase CLI](https://supabase.com/docs/guides/cli) and a personal access token, link the project and run:
   ```
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. **Set your environment variables.** Copy `.env.example` to `.env.local` and fill in your Project URL and anon key from Project Settings → API:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. **(Recommended) Disable email confirmation** for this solo/personal app: Authentication → Providers → Email → turn off "Confirm email". Otherwise you'll need to click a confirmation link after signing up.
5. Install dependencies and run the dev server:
   ```
   npm install
   npm run dev
   ```
6. Sign up for an account, then in **Settings** click **Load sample data** to preview the app with example leads, clients, projects, invoices, and more. **Clear sample data** removes it again without touching anything you've entered for real.

## Project structure

- `src/features/<module>` — one folder per business area (leads, clients, projects, invoices, …), each with `api.ts` (Supabase queries/mutations via TanStack Query), `components/`, and `pages/`.
- `src/components/shared` — reusable building blocks used across modules (data table, form sheet, status badges, activity timeline, file uploads, printable document layout, etc).
- `src/components/ui` — shadcn/ui primitives.
- `src/components/layout` — sidebar, topbar, and the Ctrl/Cmd+K command palette.
- `supabase/migrations` — the full database schema: tables, row-level security policies, computed views, and report/dashboard functions.

## Scripts

- `npm run dev` — start the dev server.
- `npm run build` — type-check and build for production.
- `npm run lint` — run oxlint.
