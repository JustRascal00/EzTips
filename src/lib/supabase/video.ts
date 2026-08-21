import type { SkillLevel, Tutorial } from "@/lib/types";

export type VideoRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  game_id: string;
  category: string;
  topic: string | null;
  character: string | null;
  tags: string[] | null;
  skill_level: string;
  duration_seconds: number;
  video_url: string;
  thumbnail_url: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: ProfileSummary | ProfileSummary[] | null;
};

export type ProfileSummary = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export function videoRowToTutorial(row: VideoRow): Tutorial {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    learn: row.description || "A useful community gaming clip.",
    takeaways: [],
    gameId: row.game_id,
    category: row.category,
    topic: row.topic || row.category,
    character: row.character || undefined,
    tags: row.tags ?? [],
    skillLevel: (["beginner", "intermediate", "advanced", "competitive"].includes(row.skill_level)
      ? row.skill_level
      : "intermediate") as SkillLevel,
    duration: row.duration_seconds || 0,
    creatorId: row.user_id,
    creatorUsername: profile?.username,
    creatorDisplayName: profile?.display_name,
    creatorAvatar: profile?.avatar_url ?? undefined,
    thumbnail: row.thumbnail_url || "",
    videoUrl: row.video_url,
    views: Number(row.views || 0),
    likes: Number(row.likes_count || 0),
    helpful: 0,
    helpfulPercent: 0,
    comments: Number(row.comments_count || 0),
    createdAt: row.created_at,
    communityUpload: true,
  };
}
