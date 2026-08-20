"use client";

import { cn } from "@/lib/cn";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  large,
  initial,
  className,
  autoFocus,
}: {
  large?: boolean;
  initial?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(initial ?? "");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
        else router.push("/search");
      }}
      className={cn("relative", className)}
    >
      <Search
        className={cn(
          "absolute left-3.5 top-1/2 -translate-y-1/2 text-muted",
          large ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search games, creators, champions, agents, mechanics..."
        className={cn(
          "w-full bg-card border border-border text-text placeholder:text-muted outline-none focus:border-accent/50 transition-colors duration-200",
          large
            ? "h-14 rounded-2xl pl-12 pr-4 text-[15px]"
            : "h-10 rounded-xl pl-10 pr-3 text-sm",
        )}
      />
    </form>
  );
}
