# EZTips backend setup

The app is wired for Supabase Auth, Postgres, and Storage. Until credentials are present, the existing example feed remains available and publishing is disabled.

1. Create a Supabase project.
2. Open **SQL Editor**, paste `supabase/migrations/001_eztips_backend.sql`, and run it once.
3. Copy `.env.example` to `.env.local`.
4. From the Supabase **Connect** dialog, add the project URL and publishable key to `.env.local`.
5. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` as a redirect URL.
6. Restart `npm run dev`.

The migration creates public profiles, selected games, videos, likes, saves, follows, a public `videos` storage bucket, indexes, and row-level security policies. Never place a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable.
