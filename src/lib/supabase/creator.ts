"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { createClient } from "./client";

export type CreatorVideo = {
  id: string;
  slug: string;
  title: string;
  game_id: string;
  category: string;
  topic: string | null;
  thumbnail_url: string | null;
  video_url: string;
  video_path: string;
  status: "draft" | "published" | "hidden";
  visibility: "public" | "unlisted" | "private";
  views: number;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
};

export function useCreatorVideos() {
  const { configured, user } = useAuth();
  const [videos, setVideos] = useState<CreatorVideo[]>([]);
  const [followers, setFollowers] = useState(0);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const [videoResult, followerResult] = await Promise.all([
      supabase
        .from("videos")
        .select("id,slug,title,game_id,category,topic,thumbnail_url,video_url,video_path,status,visibility,views,likes_count,saves_count,comments_count,duration_seconds,created_at,updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("creator_follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("creator_id", user.id),
    ]);
    if (videoResult.error) setError(videoResult.error.message);
    else setVideos((videoResult.data ?? []) as CreatorVideo[]);
    setFollowers(followerResult.count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
  }, [refresh]);

  const updateVisibility = useCallback(async (video: CreatorVideo, value: "public" | "unlisted" | "draft") => {
    const supabase = createClient();
    if (!supabase) return;
    const nextStatus = value === "draft" ? "draft" : "published";
    const visibility = value === "draft" ? "private" : value;
    const { error: updateError } = await supabase
      .from("videos")
      .update({ status: nextStatus, visibility, updated_at: new Date().toISOString() })
      .eq("id", video.id);
    if (updateError) throw updateError;
    await refresh();
  }, [refresh]);

  const deleteVideo = useCallback(async (video: CreatorVideo) => {
    const supabase = createClient();
    if (!supabase) return;
    if (video.video_path) await supabase.storage.from("videos").remove([video.video_path]);
    const { error: deleteError } = await supabase.from("videos").delete().eq("id", video.id);
    if (deleteError) throw deleteError;
    await refresh();
  }, [refresh]);

  const stats = useMemo(() => ({
    views: videos.reduce((total, video) => total + Number(video.views || 0), 0),
    likes: videos.reduce((total, video) => total + Number(video.likes_count || 0), 0),
    saves: videos.reduce((total, video) => total + Number(video.saves_count || 0), 0),
    watchSeconds: videos.reduce((total, video) => total + Number(video.views || 0) * Number(video.duration_seconds || 0), 0),
    followers,
  }), [followers, videos]);

  return { videos, stats, loading, error, refresh, updateVisibility, deleteVideo };
}
