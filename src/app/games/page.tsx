import { redirect } from "next/navigation";

// v1 is League only: the champion hub replaces the games list.
export default function GamesRedirect() {
  redirect("/");
}
