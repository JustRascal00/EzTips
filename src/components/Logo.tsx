import { cn } from "@/lib/cn";

export function Logo({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative h-8 w-8 rounded-[10px] bg-card border border-border flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
          <path
            d="M4 16.5c4.2-1.8 7.4-6.2 8-11.2.6 5 3.8 9.4 8 11.2-3.6 1.1-7.2.4-8-2.2-.8 2.6-4.4 3.3-8 2.2Z"
            fill="#7657FF"
          />
          <path
            d="M12 5.4c.4 3.6 2.6 6.7 5.6 8.2"
            fill="none"
            stroke="#F4F6FA"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-tight">EZTips</span>
      )}
    </span>
  );
}
