-- 004: replace the 60s CHECK from 003 with a trigger.
-- A NOT VALID check is still enforced on every UPDATE, which made existing clips longer than 60s
-- impossible to edit (even just the title). The trigger only checks new rows and duration changes.
-- Safe to re-run.

alter table public.videos drop constraint if exists videos_max_60s;

create or replace function public.enforce_video_max_duration()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or new.duration_seconds is distinct from old.duration_seconds)
     and new.duration_seconds > 60 then
    raise exception 'Tips can be at most 60 seconds (got %s)', new.duration_seconds
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists videos_max_duration on public.videos;
create trigger videos_max_duration before insert or update of duration_seconds on public.videos
  for each row execute function public.enforce_video_max_duration();
