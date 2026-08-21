"use client";

import { AppProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>{children}</AppProvider>
    </AuthProvider>
  );
}
