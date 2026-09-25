-- 003: EZTips learning core (League of Legends).
-- Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE / ON CONFLICT or guarded.
-- Nothing is dropped except policies/triggers that are immediately re-created.

-- ─────────────────────────────────────────────────────────────
-- 0. Helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. Roles on profiles (user / moderator / admin)
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists role text not null default 'user';
do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('user', 'moderator', 'admin'));
exception when duplicate_object then null;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('moderator', 'admin'));
$$;

-- Users can update their own profile (policy from 001), but not their role.
-- Role changes are allowed for admins, and from the SQL editor / service role (auth.uid() is null).
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 2. Lookup tables: patches, champions, roles, maps, tags
-- ─────────────────────────────────────────────────────────────
create table if not exists public.patches (
  id bigint generated always as identity primary key,
  version text not null unique,               -- what players call it, e.g. '26.19'
  ddragon_version text not null unique,       -- Data Dragon version, e.g. '16.19.1'
  release_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists patches_one_current_idx on public.patches (is_current) where is_current;

create table if not exists public.champions (
  id text primary key,                        -- Data Dragon id, e.g. 'MonkeyKing'
  key integer not null unique,                -- Riot numeric key, e.g. 62
  name text not null,                         -- 'Wukong'
  title text not null default '',
  tags text[] not null default '{}',          -- Fighter, Mage, ...
  image text not null default '',             -- 'MonkeyKing.png'
  updated_patch_id bigint references public.patches(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists champions_name_idx on public.champions (lower(name));

create table if not exists public.roles (
  id text primary key,
  name text not null,
  sort smallint not null default 0
);
insert into public.roles (id, name, sort) values
  ('top', 'Top', 1), ('jungle', 'Jungle', 2), ('mid', 'Mid', 3), ('adc', 'ADC', 4), ('support', 'Support', 5)
on conflict (id) do nothing;

create table if not exists public.maps (
  id text primary key,
  name text not null,
  ddragon_map_id integer,                     -- 11 = Summoner's Rift, 12 = Howling Abyss, 30 = Arena
  sort smallint not null default 0
);
insert into public.maps (id, name, ddragon_map_id, sort) values
  ('sr', 'Summoner''s Rift', 11, 1), ('aram', 'ARAM', 12, 2), ('arena', 'Arena', 30, 3)
on conflict (id) do nothing;

create table if not exists public.tags (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  kind text not null default 'situation' check (kind in ('situation', 'topic', 'mechanic')),
  sort smallint not null default 0
);
insert into public.tags (id, name, kind, sort) values
  ('laning', 'Laning', 'situation', 1),
  ('trading', 'Trading', 'mechanic', 2),
  ('wave-management', 'Wave management', 'topic', 3),
  ('jungle-pathing', 'Jungle pathing', 'topic', 4),
  ('ganking', 'Ganking', 'situation', 5),
  ('roaming', 'Roaming', 'situation', 6),
  ('objectives', 'Objectives', 'situation', 7),
  ('teamfights', 'Teamfights', 'situation', 8),
  ('vision', 'Vision', 'topic', 9),
  ('combos', 'Combos', 'mechanic', 10),
  ('kiting', 'Kiting', 'mechanic', 11),
  ('macro', 'Macro', 'topic', 12)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 3. Videos (tips): champion / role / map / patch, votes, moderation, search
-- ─────────────────────────────────────────────────────────────
alter table public.videos add column if not exists champion_id text references public.champions(id) on delete set null;
alter table public.videos add column if not exists role_id text references public.roles(id) on delete set null;
alter table public.videos add column if not exists map_id text references public.maps(id) on delete set null;
alter table public.videos add column if not exists patch_id bigint references public.patches(id) on delete set null;
alter table public.videos add column if not exists upvotes integer not null default 0;
alter table public.videos add column if not exists downvotes integer not null default 0;
alter table public.videos add column if not exists score integer not null default 0;
alter table public.videos add column if not exists hidden_reason text;
alter table public.videos add column if not exists moderated_by uuid references public.profiles(id) on delete set null;
alter table public.videos add column if not exists moderated_at timestamptz;
alter table public.videos add column if not exists search_vector tsvector;

-- The 60-second rule for tips lives in 004_duration_rule.sql (trigger, so older long clips stay editable).

create index if not exists videos_champion_idx on public.videos (champion_id, created_at desc);
create index if not exists videos_role_idx on public.videos (role_id);
create index if not exists videos_patch_idx on public.videos (patch_id);
create index if not exists videos_score_idx on public.videos (score desc);
create index if not exists videos_search_idx on public.videos using gin (search_vector);

-- Backfill role/map from the old free-form learning_metadata.
update public.videos v set role_id = lower(v.learning_metadata ->> 'role')
where v.role_id is null and lower(v.learning_metadata ->> 'role') in (select id from public.roles);
update public.videos set map_id = 'aram'
where map_id is null and game_id = 'lol' and learning_metadata ->> 'gameMode' ilike '%aram%';
update public.videos set map_id = 'arena'
where map_id is null and game_id = 'lol' and learning_metadata ->> 'gameMode' ilike '%arena%';
update public.videos set map_id = 'sr' where map_id is null and game_id = 'lol';
alter table public.videos alter column map_id set default 'sr';

-- Full-text search document: title + champion (weight A), tags + topic (B), description (C).
create or replace function public.videos_search_document(
  p_title text, p_description text, p_tags text[], p_topic text, p_character text, p_champion_id text
) returns tsvector language plpgsql stable set search_path = '' as $$
declare
  champ_name text;
begin
  if p_champion_id is not null then
    select c.name into champ_name from public.champions c where c.id = p_champion_id;
  end if;
  return
    setweight(to_tsvector('english'::regconfig, coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(champ_name, '') || ' ' || coalesce(p_character, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, array_to_string(coalesce(p_tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(p_topic, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(p_description, '')), 'C');
end;
$$;

create or replace function public.videos_search_trigger()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_vector := public.videos_search_document(new.title, new.description, new.tags, new.topic, new.character, new.champion_id);
  return new;
end;
$$;
drop trigger if exists videos_search_update on public.videos;
create trigger videos_search_update before insert or update of title, description, tags, topic, character, champion_id
  on public.videos for each row execute function public.videos_search_trigger();

update public.videos
set search_vector = public.videos_search_document(title, description, tags, topic, character, champion_id)
where search_vector is null;

-- Only moderators can hide or unhide a video (owners can't un-hide their own).
create or replace function public.guard_video_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- SQL editor / service role, moderators, and our own triggers (vote + comment counters) are trusted.
  if (select auth.uid()) is null or pg_trigger_depth() > 1 or public.is_moderator() then
    return new;
  end if;
  if (old.status = 'hidden' or new.status = 'hidden') and new.status is distinct from old.status then
    raise exception 'Only moderators can hide or unhide videos';
  end if;
  -- counters are maintained by triggers, not by clients
  new.upvotes := old.upvotes;
  new.downvotes := old.downvotes;
  new.score := old.score;
  new.comments_count := old.comments_count;
  new.hidden_reason := old.hidden_reason;
  new.moderated_by := old.moderated_by;
  new.moderated_at := old.moderated_at;
  return new;
end;
$$;
drop trigger if exists videos_guard_moderation on public.videos;
create trigger videos_guard_moderation before update on public.videos
  for each row execute function public.guard_video_moderation();

-- Read access. Fixes 001: private videos were readable by anyone via the API.
-- Unlisted stays readable (that's how "anyone with the link" works); the app only lists public ones.
drop policy if exists "Published videos are public" on public.videos;
create policy "Published videos are public" on public.videos for select to anon, authenticated using (
  (status = 'published' and visibility in ('public', 'unlisted'))
  or (select auth.uid()) = user_id
  or public.is_moderator()
);
drop policy if exists "Moderators update videos" on public.videos;
create policy "Moderators update videos" on public.videos for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
drop policy if exists "Moderators delete videos" on public.videos;
create policy "Moderators delete videos" on public.videos for delete to authenticated
  using (public.is_moderator());

-- ─────────────────────────────────────────────────────────────
-- 4. Builds
-- ─────────────────────────────────────────────────────────────
create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  champion_id text not null references public.champions(id) on delete cascade,
  role_id text not null references public.roles(id),
  map_id text not null default 'sr' references public.maps(id),
  patch_id bigint references public.patches(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,  -- null = official/seeded
  title text not null check (char_length(title) between 3 and 100),
  notes text not null default '' check (char_length(notes) <= 2000),
  starting_items text[] not null default '{}',   -- Data Dragon item ids
  items text[] not null default '{}',            -- core build, in order
  situational_items text[] not null default '{}',
  runes jsonb not null default '{}'::jsonb,      -- {primaryTree, keystone, primary[], secondaryTree, secondary[], shards[]} (rune ids)
  spells text[] not null default '{}' check (cardinality(spells) <= 2),  -- summoner spell ids, e.g. SummonerFlash
  skill_order text[] not null default '{}' check (cardinality(skill_order) <= 18), -- 'Q','W','E','R' per level
  is_recommended boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden')),
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists builds_champion_role_idx on public.builds (champion_id, role_id, score desc);
create index if not exists builds_patch_idx on public.builds (patch_id);
create index if not exists builds_author_idx on public.builds (author_id);
-- One recommended build per champion + role.
create unique index if not exists builds_one_recommended_idx on public.builds (champion_id, role_id) where is_recommended;

drop trigger if exists builds_updated_at on public.builds;
create trigger builds_updated_at before update on public.builds
  for each row execute function public.set_updated_at();

create or replace function public.guard_build_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or pg_trigger_depth() > 1 or public.is_moderator() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_recommended := false;
    new.upvotes := 0; new.downvotes := 0; new.score := 0;
    if new.status = 'hidden' then new.status := 'published'; end if;
    return new;
  end if;
  if new.is_recommended is distinct from old.is_recommended then
    raise exception 'Only moderators can set the recommended build';
  end if;
  if (old.status = 'hidden' or new.status = 'hidden') and new.status is distinct from old.status then
    raise exception 'Only moderators can hide or unhide builds';
  end if;
  new.upvotes := old.upvotes; new.downvotes := old.downvotes; new.score := old.score;
  return new;
end;
$$;
drop trigger if exists builds_guard_moderation on public.builds;
create trigger builds_guard_moderation before insert or update on public.builds
  for each row execute function public.guard_build_moderation();

-- ─────────────────────────────────────────────────────────────
-- 5. Matchups (+ linked tips)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.matchups (
  id uuid primary key default gen_random_uuid(),
  champion_id text not null references public.champions(id) on delete cascade,
  vs_champion_id text not null references public.champions(id) on delete cascade,
  role_id text not null references public.roles(id),
  patch_id bigint references public.patches(id) on delete set null,  -- patch the notes were last checked on
  author_id uuid references public.profiles(id) on delete set null,
  difficulty smallint check (difficulty between 1 and 5),
  summary text not null default '' check (char_length(summary) <= 500),
  lane_tips text not null default '' check (char_length(lane_tips) <= 3000),
  power_spikes text not null default '' check (char_length(power_spikes) <= 2000),
  build_changes text not null default '' check (char_length(build_changes) <= 2000),
  status text not null default 'published' check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (champion_id <> vs_champion_id),
  unique (champion_id, vs_champion_id, role_id)
);
create index if not exists matchups_vs_idx on public.matchups (vs_champion_id, role_id);

drop trigger if exists matchups_updated_at on public.matchups;
create trigger matchups_updated_at before update on public.matchups
  for each row execute function public.set_updated_at();

create table if not exists public.matchup_tips (
  matchup_id uuid not null references public.matchups(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  sort smallint not null default 0,
  primary key (matchup_id, video_id)
);

-- ─────────────────────────────────────────────────────────────
-- 6. Votes (tips + builds) and "still works" flags
-- ─────────────────────────────────────────────────────────────
create table if not exists public.votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('tip', 'build')),
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index if not exists votes_target_idx on public.votes (target_type, target_id);

drop trigger if exists votes_updated_at on public.votes;
create trigger votes_updated_at before update on public.votes
  for each row execute function public.set_updated_at();

-- Keeps upvotes/downvotes/score on videos and builds in sync.
create or replace function public.apply_vote()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  t_type text := coalesce(new.target_type, old.target_type);
  t_id uuid := coalesce(new.target_id, old.target_id);
  up_delta integer := 0;
  down_delta integer := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if old.value = 1 then up_delta := up_delta - 1; else down_delta := down_delta - 1; end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if new.value = 1 then up_delta := up_delta + 1; else down_delta := down_delta + 1; end if;
  end if;
  if t_type = 'tip' then
    update public.videos set upvotes = greatest(0, upvotes + up_delta), downvotes = greatest(0, downvotes + down_delta),
      score = greatest(0, upvotes + up_delta) - greatest(0, downvotes + down_delta)
    where id = t_id;
  elsif t_type = 'build' then
    update public.builds set upvotes = greatest(0, upvotes + up_delta), downvotes = greatest(0, downvotes + down_delta),
      score = greatest(0, upvotes + up_delta) - greatest(0, downvotes + down_delta)
    where id = t_id;
  end if;
  return null;
end;
$$;
drop trigger if exists votes_apply on public.votes;
create trigger votes_apply after insert or update of value or delete on public.votes
  for each row execute function public.apply_vote();

create table if not exists public.still_works_flags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('tip', 'build')),
  target_id uuid not null,
  patch_id bigint not null references public.patches(id) on delete cascade,
  works boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id, patch_id)
);
create index if not exists still_works_target_idx on public.still_works_flags (target_type, target_id, patch_id);

create or replace view public.still_works_stats with (security_invoker = true) as
select target_type, target_id, patch_id,
  count(*) filter (where works) as works_count,
  count(*) filter (where not works) as broken_count,
  count(*) as total
from public.still_works_flags
group by target_type, target_id, patch_id;

-- Clean up polymorphic rows when a tip or build is deleted.
create or replace function public.cleanup_target_rows()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.votes where target_type = tg_argv[0] and target_id = old.id;
  delete from public.still_works_flags where target_type = tg_argv[0] and target_id = old.id;
  delete from public.reports where target_type = tg_argv[0] and target_id = old.id;
  return old;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. Comments
-- ─────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_video_idx on public.comments (video_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

create or replace function public.apply_comment_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'published' then
    update public.videos set comments_count = comments_count + 1 where id = new.video_id;
  elsif tg_op = 'DELETE' and old.status = 'published' then
    update public.videos set comments_count = greatest(0, comments_count - 1) where id = old.video_id;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    update public.videos set comments_count = greatest(0, comments_count + case when new.status = 'published' then 1 else -1 end)
    where id = new.video_id;
  end if;
  return null;
end;
$$;
drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or update of status or delete on public.comments
  for each row execute function public.apply_comment_count();

create or replace function public.guard_comment_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_moderator() then return new; end if;
  if new.status is distinct from old.status then raise exception 'Only moderators can hide comments'; end if;
  if new.video_id <> old.video_id or new.user_id <> old.user_id or new.parent_id is distinct from old.parent_id then
    raise exception 'Comments can only be edited, not moved';
  end if;
  return new;
end;
$$;
drop trigger if exists comments_guard_moderation on public.comments;
create trigger comments_guard_moderation before update on public.comments
  for each row execute function public.guard_comment_moderation();

-- ─────────────────────────────────────────────────────────────
-- 8. Reports (moderation queue)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('tip', 'build', 'matchup', 'comment', 'profile')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'wrong_info', 'outdated', 'offensive', 'not_lol', 'copyright', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);
-- One open report per user per target.
create unique index if not exists reports_one_open_idx on public.reports (reporter_id, target_type, target_id) where status = 'open';

drop trigger if exists videos_cleanup on public.videos;
create trigger videos_cleanup after delete on public.videos
  for each row execute function public.cleanup_target_rows('tip');
drop trigger if exists builds_cleanup on public.builds;
create trigger builds_cleanup after delete on public.builds
  for each row execute function public.cleanup_target_rows('build');

-- ─────────────────────────────────────────────────────────────
-- 9. AI coach queries (rate limit + cache)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ai_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('chat', 'draft', 'counter')),
  input jsonb not null,
  input_hash text not null,                   -- sha256 of the normalized input, for caching
  answer jsonb,
  patch_id bigint references public.patches(id) on delete set null,
  model text,
  cached boolean not null default false,      -- true = answered from cache, did not call the model
  created_at timestamptz not null default now()
);
create index if not exists ai_queries_user_day_idx on public.ai_queries (user_id, created_at desc);
create index if not exists ai_queries_cache_idx on public.ai_queries (kind, input_hash, patch_id, created_at desc);

-- Shared cache lookup across users (rows are otherwise private to their owner).
create or replace function public.ai_cached_answer(p_kind text, p_input_hash text, p_patch_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select q.answer from public.ai_queries q
  where q.kind = p_kind and q.input_hash = p_input_hash and q.patch_id is not distinct from p_patch_id
    and q.answer is not null and q.kind in ('draft', 'counter')
  order by q.created_at desc limit 1;
$$;

-- Questions the current user asked today (UTC) that actually called the model.
create or replace function public.ai_queries_today()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.ai_queries
  where user_id = (select auth.uid()) and not cached and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

-- ─────────────────────────────────────────────────────────────
-- 10. Row level security
-- ─────────────────────────────────────────────────────────────
alter table public.patches enable row level security;
alter table public.champions enable row level security;
alter table public.roles enable row level security;
alter table public.maps enable row level security;
alter table public.tags enable row level security;
alter table public.builds enable row level security;
alter table public.matchups enable row level security;
alter table public.matchup_tips enable row level security;
alter table public.votes enable row level security;
alter table public.still_works_flags enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.ai_queries enable row level security;

-- Lookups: everyone reads, admins write.
do $$
declare t text;
begin
  foreach t in array array['patches', 'champions', 'roles', 'maps', 'tags'] loop
    execute format('drop policy if exists "Lookup is public" on public.%I', t);
    execute format('create policy "Lookup is public" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "Admins manage lookup" on public.%I', t);
    execute format('create policy "Admins manage lookup" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Builds
drop policy if exists "Builds are public" on public.builds;
create policy "Builds are public" on public.builds for select to anon, authenticated
  using (status = 'published' or (select auth.uid()) = author_id or public.is_moderator());
drop policy if exists "Users create builds" on public.builds;
create policy "Users create builds" on public.builds for insert to authenticated
  with check ((select auth.uid()) = author_id or public.is_moderator());
drop policy if exists "Authors update builds" on public.builds;
create policy "Authors update builds" on public.builds for update to authenticated
  using ((select auth.uid()) = author_id or public.is_moderator())
  with check ((select auth.uid()) = author_id or public.is_moderator());
drop policy if exists "Authors delete builds" on public.builds;
create policy "Authors delete builds" on public.builds for delete to authenticated
  using ((select auth.uid()) = author_id or public.is_moderator());

-- Matchups (written by moderators for now; readable by everyone)
drop policy if exists "Matchups are public" on public.matchups;
create policy "Matchups are public" on public.matchups for select to anon, authenticated
  using (status = 'published' or public.is_moderator());
drop policy if exists "Moderators manage matchups" on public.matchups;
create policy "Moderators manage matchups" on public.matchups for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
drop policy if exists "Matchup tips are public" on public.matchup_tips;
create policy "Matchup tips are public" on public.matchup_tips for select to anon, authenticated using (true);
drop policy if exists "Moderators manage matchup tips" on public.matchup_tips;
create policy "Moderators manage matchup tips" on public.matchup_tips for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- Votes: totals are public via videos/builds; individual votes are private to the voter.
drop policy if exists "Users see their votes" on public.votes;
create policy "Users see their votes" on public.votes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users vote" on public.votes;
create policy "Users vote" on public.votes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users change votes" on public.votes;
create policy "Users change votes" on public.votes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove votes" on public.votes;
create policy "Users remove votes" on public.votes for delete to authenticated using ((select auth.uid()) = user_id);

-- Still-works flags: readable by everyone (feeds the % shown on cards).
drop policy if exists "Still works flags are public" on public.still_works_flags;
create policy "Still works flags are public" on public.still_works_flags for select to anon, authenticated using (true);
drop policy if exists "Users flag" on public.still_works_flags;
create policy "Users flag" on public.still_works_flags for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users change flags" on public.still_works_flags;
create policy "Users change flags" on public.still_works_flags for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove flags" on public.still_works_flags;
create policy "Users remove flags" on public.still_works_flags for delete to authenticated using ((select auth.uid()) = user_id);

-- Comments
drop policy if exists "Comments are public" on public.comments;
create policy "Comments are public" on public.comments for select to anon, authenticated
  using (status = 'published' or (select auth.uid()) = user_id or public.is_moderator());
drop policy if exists "Users comment" on public.comments;
create policy "Users comment" on public.comments for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users edit comments" on public.comments;
create policy "Users edit comments" on public.comments for update to authenticated
  using ((select auth.uid()) = user_id or public.is_moderator())
  with check ((select auth.uid()) = user_id or public.is_moderator());
drop policy if exists "Users delete comments" on public.comments;
create policy "Users delete comments" on public.comments for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_moderator());

-- Reports: reporters see their own, moderators see and resolve all.
drop policy if exists "Users see their reports" on public.reports;
create policy "Users see their reports" on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id or public.is_moderator());
drop policy if exists "Users report" on public.reports;
create policy "Users report" on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and status = 'open');
drop policy if exists "Moderators resolve reports" on public.reports;
create policy "Moderators resolve reports" on public.reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- AI queries: private to the user.
drop policy if exists "Users see their AI queries" on public.ai_queries;
create policy "Users see their AI queries" on public.ai_queries for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users log AI queries" on public.ai_queries;
create policy "Users log AI queries" on public.ai_queries for insert to authenticated with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- 11. Grants (explicit, in case the project doesn't auto-expose new tables)
-- ─────────────────────────────────────────────────────────────
grant select on public.patches, public.champions, public.roles, public.maps, public.tags,
  public.builds, public.matchups, public.matchup_tips, public.still_works_flags, public.still_works_stats, public.comments
  to anon, authenticated;
grant insert, update, delete on public.patches, public.champions, public.roles, public.maps, public.tags,
  public.builds, public.matchups, public.matchup_tips to authenticated;
grant select, insert, update, delete on public.votes, public.still_works_flags, public.comments to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert on public.ai_queries to authenticated;
grant execute on function public.is_admin(), public.is_moderator(), public.ai_queries_today(),
  public.ai_cached_answer(text, text, bigint) to anon, authenticated;
