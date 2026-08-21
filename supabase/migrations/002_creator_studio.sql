-- Creator Studio fields for projects that already ran 001_eztips_backend.sql.
alter table public.videos add column if not exists visibility text not null default 'public';
alter table public.videos add column if not exists learning_metadata jsonb not null default '{}'::jsonb;
alter table public.videos add column if not exists saves_count bigint not null default 0;

do $$ begin
  alter table public.videos add constraint videos_visibility_check check (visibility in ('public', 'unlisted', 'private'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.videos add constraint videos_saves_count_check check (saves_count >= 0);
exception when duplicate_object then null;
end $$;

create index if not exists videos_visibility_created_idx on public.videos(visibility, created_at desc);
