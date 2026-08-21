import { StudioShell } from "@/components/studio/StudioShell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Creator Studio" };

export default function CreatorStudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
