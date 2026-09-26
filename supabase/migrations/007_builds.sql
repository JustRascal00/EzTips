-- 007: builds: patch-aware ranking, "still works" %, recommended build switch, writes through the server.
-- Safe to re-run.

-- 1. Computed columns on builds (usable in select=… / order=… through the API)
create or replace function public.build_patches_behind(b public.builds)
returns integer language sql stable set search_path = '' as $$
  select case when b.patch_id is null then null else (
    select count(*)::integer
    from public.patches p
    join public.patches mine on mine.id = b.patch_id
    join public.patches cur on cur.is_current
    where public.patch_ordinal(p.version) > public.patch_ordinal(mine.version)
      and public.patch_ordinal(p.version) <= public.patch_ordinal(cur.version)
  ) end;
$$;

create or replace function public.build_works_yes(b public.builds)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.still_works_flags f
  where f.target_type = 'build' and f.target_id = b.id and f.patch_id = public.current_patch_id() and f.works;
$$;

create or replace function public.build_works_no(b public.builds)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.still_works_flags f
  where f.target_type = 'build' and f.target_id = b.id and f.patch_id = public.current_patch_id() and not f.works;
$$;

create or replace function public.build_works_pct(b public.builds)
returns integer language sql stable set search_path = '' as $$
  select case when (yes + no) = 0 then null else round(100.0 * yes / (yes + no))::integer end
  from (select public.build_works_yes(b) as yes, public.build_works_no(b) as no) s;
$$;

-- Builds age faster than tips: outdated after 2 patches, or when half of 3+ players say it doesn't work.
create or replace function public.build_is_outdated(b public.builds)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(public.build_patches_behind(b), 0) >= 2
      or ((yes + no) >= 3 and no * 2 >= (yes + no))
  from (select public.build_works_yes(b) as yes, public.build_works_no(b) as no) s;
$$;

create or replace function public.build_rank_score(b public.builds)
returns double precision language sql stable set search_path = '' as $$
  select
    (b.upvotes - b.downvotes)::double precision
    + 2.0 * (s.yes - s.no)
    - 3.0 * coalesce(public.build_patches_behind(b), 1)
    - case when public.build_is_outdated(b) then 20 else 0 end
    + case when b.is_recommended then 1000 else 0 end
    + 4.0 / (1 + extract(epoch from (now() - b.updated_at)) / 604800.0)
  from (select public.build_works_yes(b) as yes, public.build_works_no(b) as no) s;
$$;

grant execute on function public.build_patches_behind(public.builds), public.build_works_yes(public.builds), public.build_works_no(public.builds),
  public.build_works_pct(public.builds), public.build_is_outdated(public.builds), public.build_rank_score(public.builds) to anon, authenticated;

-- 2. Writes: create/edit go through /api/builds (checks every item/rune/spell against Data Dragon).
--    Users can still delete their own builds; moderators can update (recommend / hide).
drop policy if exists "Users create builds" on public.builds;
drop policy if exists "Authors update builds" on public.builds;
drop policy if exists "Moderators update builds" on public.builds;
create policy "Moderators update builds" on public.builds for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- 3. Make one build the recommended build for its champion + role (moderators only).
create or replace function public.set_recommended_build(p_build_id uuid, p_recommended boolean default true)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  target public.builds;
begin
  if not public.is_moderator() then raise exception 'Only moderators can recommend builds'; end if;
  select * into target from public.builds where id = p_build_id;
  if target.id is null then raise exception 'Build not found'; end if;
  if p_recommended then
    update public.builds set is_recommended = false
    where champion_id = target.champion_id and role_id = target.role_id and is_recommended and id <> target.id;
  end if;
  update public.builds set is_recommended = p_recommended where id = target.id;
end;
$$;
grant execute on function public.set_recommended_build(uuid, boolean) to authenticated;
