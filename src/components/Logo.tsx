import { cn } from "@/lib/cn";

export function Logo({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={compact ? "/eztips-mark.svg" : "/eztips-logo.svg"}
        alt="EZTips"
        className={compact ? "h-8 w-8" : "h-8 w-[120px]"}
      />
    </span>
  );
}
