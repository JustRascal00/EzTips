import { redirect } from "next/navigation";

// Creator pages and user profiles are the same thing now.
export default async function CreatorRedirect({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  redirect(`/u/${encodeURIComponent(username)}`);
}
