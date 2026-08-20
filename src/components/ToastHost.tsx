"use client";

import { useApp } from "@/lib/store";

export function ToastHost() {
  const { toasts, xpBurst } = useApp();
  return (
    <>
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm text-text fade-up"
          >
            {t.message}
          </div>
        ))}
      </div>
      {xpBurst != null && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[90] pointer-events-none">
          <div className="xp-float rounded-xl border border-xp/30 bg-elevated px-3 py-1.5 text-sm font-semibold text-xp">
            +{xpBurst} XP
          </div>
        </div>
      )}
    </>
  );
}
