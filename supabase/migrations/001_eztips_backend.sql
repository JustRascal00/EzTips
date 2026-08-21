-- EZTips backend: authentication profiles, game preferences, videos, and social records.
-- Run this file once in the Supabase SQL editor for a new project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_username text;
  requested_name text;
begin
  requested_username := regexp_replace(
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'player')),
    '[^a-z0-9_]', '', 'g'
  );
  if char_length(requested_username) < 3 then requested_username := 'player'; end if;
  requested_username := left(requested_username, 24);
  if exists (select 1 from public.profiles where username = requested_username) then
    requested_username := left(requested_username, 17) || '_' || left(new.id::text, 6);
  end if;
  requested_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Player');

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, left(requested_name, 50))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.user_games (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique check (char_length(slug) between 3 and 90),
  title text not null check (char_length(title) between 3 and 140),
  description text check (char_length(description) <= 1000),
  game_id text not null,
  category text not null default 'Tips',
  topic text,
  character text,
  tags text[] not null default '{}',
  skill_level text not null default 'intermediate' check (skill_level in ('beginner', 'intermediate', 'advanced', 'competitive')),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 600),
  video_path text not null,
  video_url text not null,
  thumbnail_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden')),
  views bigint not null default 0 check (views >= 0),
  likes_count bigint not null default 0 check (likes_count >= 0),
  comments_count bigint not null default 0 check (comments_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_user_id_idx on public.videos(user_id);
create index if not exists videos_game_created_idx on public.videos(game_id, created_at desc);
create index if not exists videos_status_created_idx on public.videos(status, created_at desc);
create index if not exists user_games_user_id_idx on public.user_games(user_id);

create table if not exists public.video_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.video_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.creator_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

alter table public.profiles enable row level security;
alter table public.user_games enable row level security;
alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_saves enable row level security;
alter table public.creator_follows enable row level security;

create policy "Profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "Users update their profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users view their games" on public.user_games for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their games" on public.user_games for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their games" on public.user_games for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Published videos are public" on public.videos for select to anon, authenticated using (status = 'published' or (select auth.uid()) = user_id);
create policy "Creators publish videos" on public.videos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Creators update videos" on public.videos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Creators delete videos" on public.videos for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Likes are public" on public.video_likes for select to anon, authenticated using (true);
create policy "Users add likes" on public.video_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove likes" on public.video_likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Users view saves" on public.video_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add saves" on public.video_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove saves" on public.video_saves for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Follows are public" on public.creator_follows for select to anon, authenticated using (true);
create policy "Users follow creators" on public.creator_follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "Users unfollow creators" on public.creator_follows for delete to authenticated using ((select auth.uid()) = follower_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Video files are public" on storage.objects for select to anon, authenticated using (bucket_id = 'videos');
create policy "Users upload their videos" on storage.objects for insert to authenticated with check (
  bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Users update their video files" on storage.objects for update to authenticated using (
  bucket_id = 'videos' and owner_id = (select auth.uid())::text
);
create policy "Users delete their video files" on storage.objects for delete to authenticated using (
  bucket_id = 'videos' and owner_id = (select auth.uid())::text
);
