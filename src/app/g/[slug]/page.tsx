import { redirect } from "next/navigation";

// v1 is League only: game pages redirect to the champion hub.
export default function GameRedirect() {
  redirect("/");
}
