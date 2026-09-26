"use client";

import { BuildEditor } from "@/components/build-editor";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui";
import { getBuild, type Build } from "@/lib/builds";
import { useSupabaseQuery } from "@/lib/use-tips";
import { useParams } from "next/navigation";

export default function EditBuildPage() {
  const { id } = useParams<{ id: string }>();
  const { data: build, loading } = useSupabaseQuery(`build:${id}`, (c) => getBuild(c, id), null as Build | null);
  return (
    <AppShell>
      {loading ? <div className="shimmer mt-8 h-96 rounded-2xl" /> : build ? <BuildEditor key={build.id} initial={build} /> : <div className="py-16"><EmptyState title="Build not found" body="It may have been deleted." /></div>}
    </AppShell>
  );
}
