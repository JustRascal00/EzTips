// Reports + moderation actions (run with the signed-in user's session; RLS decides who may do what).
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportTarget = "tip" | "build" | "matchup" | "comment" | "profile";
export type ReportReason = "spam" | "wrong_info" | "outdated" | "offensive" | "not_lol" | "copyright" | "other";

export const REPORT_REASONS: { id: ReportReason; label: string; hint: string }[] = [
  { id: "outdated", label: "Doesn't work anymore", hint: "Changed by a patch or no longer true" },
  { id: "wrong_info", label: "Wrong or misleading", hint: "The tip teaches something incorrect" },
  { id: "not_lol", label: "Not a League tip", hint: "Off-topic, meme or other game" },
  { id: "spam", label: "Spam or ads", hint: "Self-promotion, links, repeated uploads" },
  { id: "offensive", label: "Offensive", hint: "Hate, harassment or NSFW" },
  { id: "copyright", label: "Stolen content", hint: "Someone else's clip re-uploaded" },
  { id: "other", label: "Something else", hint: "Tell us in the details" },
];
export const REASON_LABEL: Record<string, string> = Object.fromEntries(REPORT_REASONS.map((r) => [r.id, r.label]));

export async function submitReport(client: SupabaseClient, userId: string, target: ReportTarget, targetId: string, reason: ReportReason, details: string) {
  const { error } = await client.from("reports").insert({ reporter_id: userId, target_type: target, target_id: targetId, reason, details: details.trim().slice(0, 1000) });
  if (error) {
    if (error.code === "23505") throw new Error("You already reported this. A moderator will look at it.");
    throw new Error("Couldn't send the report. Try again.");
  }
}

export type ReportRow = {
  id: string;
  reporter_id: string | null;
  target_type: ReportTarget;
  target_id: string;
  reason: ReportReason;
  details: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
};

export async function listOpenReports(client: SupabaseClient) {
  const { data, error } = await client.from("reports").select("id,reporter_id,target_type,target_id,reason,details,status,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

async function closeReports(client: SupabaseClient, moderatorId: string, targetType: ReportTarget, targetId: string, status: "resolved" | "dismissed") {
  const { error } = await client.from("reports").update({ status, resolved_by: moderatorId, resolved_at: new Date().toISOString() })
    .eq("target_type", targetType).eq("target_id", targetId).eq("status", "open");
  if (error) throw error;
}

export const dismissReports = (client: SupabaseClient, moderatorId: string, targetType: ReportTarget, targetId: string) =>
  closeReports(client, moderatorId, targetType, targetId, "dismissed");

/** Hide a tip everywhere and resolve its open reports. */
export async function hideTip(client: SupabaseClient, moderatorId: string, tipId: string, reason: string) {
  const { error } = await client.from("videos").update({ status: "hidden", hidden_reason: reason.slice(0, 300) || "Hidden by moderators", moderated_by: moderatorId, moderated_at: new Date().toISOString() }).eq("id", tipId);
  if (error) throw error;
  await closeReports(client, moderatorId, "tip", tipId, "resolved");
}

export async function unhideTip(client: SupabaseClient, moderatorId: string, tipId: string) {
  const { error } = await client.from("videos").update({ status: "published", hidden_reason: null, moderated_by: moderatorId, moderated_at: new Date().toISOString() }).eq("id", tipId);
  if (error) throw error;
}

export type HiddenTip = { id: string; slug: string; title: string; thumbnail_url: string | null; hidden_reason: string | null; moderated_at: string | null; user_id: string };

export async function listHiddenTips(client: SupabaseClient) {
  const { data, error } = await client.from("videos").select("id,slug,title,thumbnail_url,hidden_reason,moderated_at,user_id").eq("status", "hidden").order("moderated_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as HiddenTip[];
}
