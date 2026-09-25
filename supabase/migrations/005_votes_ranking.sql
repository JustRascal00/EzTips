-- 005: voting, "still works" flags, saves/follows counters, and patch-aware ranking.
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. Patch helpers
-- ─────────────────────────────────────────────────────────────
-- '26.19' -> 2619, '25.S1.1'-style names are not used (we store '25.1').
create or replace function public.patch_ordinal(p_version text)
returns integer language sql immutable set search_path = '' as $$
  select split_part(p_version, '.', 1)::integer * 100 + split_part(p_version, '.', 2)::integer;
$$;

create or replace function public.current_patch_id()
returns bigint language sql stable set search_path = '' as $$
  select id from public.patches where is_current limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. Computed columns on videos (usable in select=… and order=… through the API)
-- ─────────────────────────────────────────────────────────────
-- How many patches have shipped since the tip's patch (null = patch unknown).
create or replace function public.patches_behind(v public.videos)
returns integer language sql stable set search_path = '' as $$
  select case when v.patch_id is null then null else (
    select count(*)::integer
    from public.patches p
    join public.patches mine on mine.id = v.patch_id
    join public.patches cur on cur.is_current
    where public.patch_ordinal(p.version) > public.patch_ordinal(mine.version)
      and public.patch_ordinal(p.version) <= public.patch_ordinal(cur.version)
  ) end;
$$;

create or replace function public.still_works_yes(v public.videos)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.still_works_flags f
  where f.target_type = 'tip' and f.target_id = v.id and f.patch_id = public.current_patch_id() and f.works;
$$;

create or replace function public.still_works_no(v public.videos)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.still_works_flags f
  where f.target_type = 'tip' and f.target_id = v.id and f.patch_id = public.current_patch_id() and not f.works;
$$;

-- % of this-patch flags that say the tip still works (null = nobody flagged yet).
create or replace function public.still_works_pct(v public.videos)
returns integer language sql stable set search_path = '' as $$
  select case when (yes + no) = 0 then null else round(100.0 * yes / (yes + no))::integer end
  from (select public.still_works_yes(v) as yes, public.still_works_no(v) as no) s;
$$;

-- Outdated = made 3+ patches ago, or at least 3 players this patch and half of them say it's broken.
create or replace function public.is_outdated(v public.videos)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(public.patches_behind(v), 0) >= 3
      or ((yes + no) >= 3 and no * 2 >= (yes + no))
  from (select public.still_works_yes(v) as yes, public.still_works_no(v) as no) s;
$$;

-- Ranking used by "Top": votes + still-works, minus age in patches, with a small freshness boost.
create or replace function public.rank_score(v public.videos)
returns double precision language sql stable set search_path = '' as $$
  select
    (v.upvotes - v.downvotes)::double precision
    + 2.0 * (s.yes - s.no)
    - 1.5 * coalesce(public.patches_behind(v), 1)
    - case when public.is_outdated(v) then 15 else 0 end
    + 8.0 / (1 + extract(epoch from (now() - v.created_at)) / 604800.0)
  from (select public.still_works_yes(v) as yes, public.still_works_no(v) as no) s;
$$;

grant execute on function public.patch_ordinal(text), public.current_patch_id(),
  public.patches_behind(public.videos), public.still_works_yes(public.videos), public.still_works_no(public.videos),
  public.still_works_pct(public.videos), public.is_outdated(public.videos), public.rank_score(public.videos)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. No voting on your own content
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Users vote" on public.votes;
create policy "Users vote" on public.votes for insert to authenticated with check (
  (select auth.uid()) = user_id
  and not exists (select 1 from public.videos v where target_type = 'tip' and v.id = target_id and v.user_id = (select auth.uid()))
  and not exists (select 1 from public.builds b where target_type = 'build' and b.id = target_id and b.author_id = (select auth.uid()))
);

-- ─────────────────────────────────────────────────────────────
-- 4. RPCs the app calls (run as the signed-in user, RLS applies)
-- ─────────────────────────────────────────────────────────────
-- value: 1 = up, -1 = down, 0 = remove. Returns fresh totals.
create or replace function public.cast_vote(p_target_type text, p_target_id uuid, p_value integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  totals jsonb;
begin
  if uid is null then raise exception 'Sign in to vote' using errcode = '28000'; end if;
  if p_target_type not in ('tip', 'build') then raise exception 'Invalid target'; end if;
  if p_value = 0 then
    delete from public.votes where user_id = uid and target_type = p_target_type and target_id = p_target_id;
  elsif p_value in (1, -1) then
    insert into public.votes (user_id, target_type, target_id, value)
    values (uid, p_target_type, p_target_id, p_value::smallint)
    on conflict (user_id, target_type, target_id) do update set value = excluded.value;
  else
    raise exception 'Invalid vote value';
  end if;

  if p_target_type = 'tip' then
    select jsonb_build_object('upvotes', upvotes, 'downvotes', downvotes, 'score', score) into totals from public.videos where id = p_target_id;
  else
    select jsonb_build_object('upvotes', upvotes, 'downvotes', downvotes, 'score', score) into totals from public.builds where id = p_target_id;
  end if;
  return coalesce(totals, '{}'::jsonb) || jsonb_build_object('my_vote', p_value);
end;
$$;

-- works: true / false, or null to clear. Always for the current patch. Returns fresh counts.
create or replace function public.set_still_works(p_target_type text, p_target_id uuid, p_works boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  patch bigint := public.current_patch_id();
  yes integer;
  no integer;
begin
  if uid is null then raise exception 'Sign in to flag tips' using errcode = '28000'; end if;
  if patch is null then raise exception 'No current patch set (run npm run seed)'; end if;
  if p_works is null then
    delete from public.still_works_flags where user_id = uid and target_type = p_target_type and target_id = p_target_id and patch_id = patch;
  else
    insert into public.still_works_flags (user_id, target_type, target_id, patch_id, works)
    values (uid, p_target_type, p_target_id, patch, p_works)
    on conflict (user_id, target_type, target_id, patch_id) do update set works = excluded.works;
  end if;
  select count(*) filter (where works), count(*) filter (where not works) into yes, no
  from public.still_works_flags where target_type = p_target_type and target_id = p_target_id and patch_id = patch;
  return jsonb_build_object(
    'yes', yes, 'no', no,
    'pct', case when yes + no = 0 then null else round(100.0 * yes / (yes + no)) end,
    'my_flag', p_works
  );
end;
$$;

grant execute on function public.cast_vote(text, uuid, integer), public.set_still_works(text, uuid, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Saves counter + follower counts
-- ─────────────────────────────────────────────────────────────
create or replace function public.apply_save_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.videos set saves_count = saves_count + 1 where id = new.video_id;
  elsif tg_op = 'DELETE' then
    update public.videos set saves_count = greatest(0, saves_count - 1) where id = old.video_id;
  end if;
  return null;
end;
$$;
drop trigger if exists video_saves_count on public.video_saves;
create trigger video_saves_count after insert or delete on public.video_saves
  for each row execute function public.apply_save_count();

-- Owners must not fake saves_count either (same guard as the other counters).
create or replace function public.guard_video_saves_count()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and pg_trigger_depth() <= 1 and not public.is_moderator() then
    new.saves_count := old.saves_count;
    new.likes_count := old.likes_count;
    new.views := old.views;
  end if;
  return new;
end;
$$;
drop trigger if exists videos_guard_saves_count on public.videos;
create trigger videos_guard_saves_count before update on public.videos
  for each row execute function public.guard_video_saves_count();

create or replace function public.follower_count(p public.profiles)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.creator_follows where creator_id = p.id;
$$;
create or replace function public.following_count(p public.profiles)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.creator_follows where follower_id = p.id;
$$;
grant execute on function public.follower_count(public.profiles), public.following_count(public.profiles) to anon, authenticated;

-- Helpful indexes for the "my state" queries.
create index if not exists votes_user_idx on public.votes (user_id, target_type);
create index if not exists video_saves_user_idx on public.video_saves (user_id, created_at desc);
create index if not exists creator_follows_follower_idx on public.creator_follows (follower_id);
create index if not exists creator_follows_creator_idx on public.creator_follows (creator_id);
