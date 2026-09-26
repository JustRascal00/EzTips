"use client";

import { BuildEditor } from "@/components/build-editor";
import { AppShell } from "@/components/layout/AppShell";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NewBuild() {
  const params = useSearchParams();
  return <BuildEditor championId={params.get("champion") ?? undefined} roleId={params.get("role") ?? undefined} mapId={params.get("map") ?? undefined} />;
}

export default function NewBuildPage() {
  return (
    <AppShell>
      <Suspense><NewBuild /></Suspense>
    </AppShell>
  );
}
