-- 006: uploads go through the server (/api/tips), which checks the real video length.
-- Safe to re-run.

-- 1. New tips are created only by the server (secret key). Users can no longer insert rows directly,
--    so nobody can skip the 60-second check by calling the API with a fake duration.
drop policy if exists "Creators publish videos" on public.videos;

-- 2. Owners can edit details, but not the media itself (file, url, length, owner).
create or replace function public.guard_video_media()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and pg_trigger_depth() <= 1 and not public.is_moderator() then
    new.user_id := old.user_id;
    new.video_path := old.video_path;
    new.video_url := old.video_url;
    new.duration_seconds := old.duration_seconds;
    new.game_id := old.game_id;
  end if;
  return new;
end;
$$;
drop trigger if exists videos_guard_media on public.videos;
create trigger videos_guard_media before update on public.videos
  for each row execute function public.guard_video_media();

-- 3. Cover images (frames picked from the video), 2 MB max, public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails', 'thumbnails', true, 2097152, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Thumbnails are public" on storage.objects;
create policy "Thumbnails are public" on storage.objects for select to anon, authenticated using (bucket_id = 'thumbnails');
drop policy if exists "Users upload their thumbnails" on storage.objects;
create policy "Users upload their thumbnails" on storage.objects for insert to authenticated with check (
  bucket_id = 'thumbnails' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Users delete their thumbnails" on storage.objects;
create policy "Users delete their thumbnails" on storage.objects for delete to authenticated using (
  bucket_id = 'thumbnails' and (storage.foldername(name))[1] = (select auth.uid())::text
);
