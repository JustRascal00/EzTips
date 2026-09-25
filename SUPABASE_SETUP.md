# EZTips backend setup

The app is wired for Supabase Auth, Postgres, and Storage. Until credentials are present, the existing example feed remains available and publishing is disabled.

1. Create a Supabase project.
2. Open **SQL Editor** and run the migrations in order: `001_eztips_backend.sql`, `002_creator_studio.sql`, `003_learning_core.sql`, `004_duration_rule.sql`, `005_votes_ranking.sql`. All are safe to re-run.
3. Copy `.env.example` to `.env.local`.
4. From the Supabase **Connect** dialog, add the project URL and publishable key to `.env.local`.
5. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` as a redirect URL.
6. Restart `npm run dev`.

The migrations create public profiles, selected games, videos, likes, saves, follows, creator visibility/draft fields, game-specific learning metadata, a public `videos` storage bucket, indexes, and row-level security policies. Never place a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable.

## Make yourself an admin

After signing up in the app, run this once in the SQL Editor (replace the username):

```sql
update public.profiles set role = 'admin' where username = 'your_username';
```

Roles: `user` (default), `moderator` (can hide/unhide tips, builds and comments, resolve reports, write matchups), `admin` (moderator + can change roles and edit lookup tables). Users can't change their own role from the app.

## Seed data

Add the **secret** key (Project Settings → API Keys, starts with `sb_secret_`) to `.env.local` as `SUPABASE_SECRET_KEY`. Never prefix it with `NEXT_PUBLIC_`.

```bash
npm run seed
```

Loads all patches since 25.1 (marks the latest as current), every champion from Riot Data Dragon, 8 demo League tips owned by an `@eztips` account, and fills champion/patch on existing uploads where it can. Run it again after each new patch. To remove the demo tips later:

```sql
delete from public.videos where learning_metadata ->> 'seed' = 'true';
```

