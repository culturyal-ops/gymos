# GymOS

GymOS is a multi-tenant revenue operating system for gyms, built on Next.js + Supabase.

## What Is Implemented

- Owner dashboard with member, lead, and transaction visibility.
- Reception interface for quick member ops.
- API routes for members, transactions, leads, and attendance.
- Supabase schema + RLS policy migrations.
- Demo mode fallback so UI works on Vercel even before Supabase is connected.

## Routes

- `/dashboard` - owner view
- `/reception` - reception view

## Local Run

1. Copy `.env.example` to `.env.local`.
2. Add Supabase keys (or leave empty to use demo mode).
3. Run your package manager:
   - `npm install`
   - `npm run dev`

## Supabase Setup

Run these SQL files in order:

1. `supabase/migrations/001_core_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/seed.sql`

## Deploy To Vercel

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Set build settings:
   - Framework preset: `Next.js`
   - Build command: `next build`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.

If env vars are missing, deployment still works in demo mode for UI preview.

## Current Notes

- Payments and reception actions are simulated in demo mode.
- For production behavior, connect Supabase and keep RLS enabled.
