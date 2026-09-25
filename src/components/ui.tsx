"use client";

import { cn } from "@/lib/cn";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

/** Shared button look, also for <Link>s that should look like buttons. */
export function buttonClass(
  variant: "primary" | "secondary" | "ghost" | "outline" | "danger" | "success" = "primary",
  size: "sm" | "md" | "lg" | "icon" = "md",
  className?: string,
) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-45",
    size === "sm" && "h-8 rounded-lg px-3 text-[13px]",
    size === "md" && "h-10 rounded-xl px-4 text-sm",
    size === "lg" && "h-12 rounded-xl px-5 text-[15px]",
    size === "icon" && "h-10 w-10 rounded-xl",
    variant === "primary" && "bg-accent text-white shadow-[0_6px_20px_-8px_rgba(118,87,255,0.8)] hover:bg-accent-hover",
    variant === "secondary" && "border border-white/[0.08] bg-white/[0.05] text-text hover:border-white/[0.14] hover:bg-white/[0.09]",
    variant === "outline" && "border border-border bg-transparent text-text hover:border-accent/50 hover:bg-accent/10",
    variant === "ghost" && "text-muted hover:bg-white/[0.06] hover:text-text",
    variant === "danger" && "bg-danger/15 text-danger hover:bg-danger/25",
    variant === "success" && "bg-success/15 text-success hover:bg-success/25",
    className,
  );
}

/** Pill-style segmented control (Top / New, class filters, ...). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1", className)} role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
            value === option.id ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" : "text-muted hover:text-text",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-border overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full bg-accent transition-all duration-200", barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: string; label: ReactNode; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex gap-6 overflow-x-auto border-b border-line", className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative flex h-12 shrink-0 items-center gap-2 text-sm font-semibold transition-colors",
            value === t.id ? "text-white" : "text-muted hover:text-text",
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] tabular", value === t.id ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-muted")}>{t.count}</span>
          )}
          {value === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent shadow-[0_0_12px_#7657ff]" />}
        </button>
      ))}
    </div>
  );
}

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 whitespace-nowrap rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-text">
          {label}
        </span>
      )}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className={cn(
          "relative max-h-[88dvh] w-full overflow-y-auto rounded-2xl border border-white/[0.08] bg-panel p-5 shadow-2xl shadow-black/60 fade-up",
          wide ? "max-w-3xl" : "max-w-md",
        )}
      >
        {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function Dropdown({
  trigger,
  children,
  align = "right",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50 min-w-48 rounded-xl border border-border bg-elevated p-1 pop-in",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 text-sm rounded-[10px] transition-colors duration-150",
        active ? "bg-accent/15 text-text" : "text-muted hover:bg-hover hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/[0.08] px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted text-sm mt-1 max-w-sm">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function RankBadge({
  label,
  type = "rank",
}: {
  label: string;
  type?: "rank" | "coach" | "platform" | "level";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        type === "rank" && "bg-xp/12 text-xp border border-xp/25",
        type === "coach" && "bg-accent/12 text-[#c4b7ff] border border-accent/30",
        type === "platform" && "bg-hover text-text border border-border",
        type === "level" && "bg-card text-muted border border-border",
      )}
    >
      {label}
    </span>
  );
}

export function VerifiedMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("h-3.5 w-3.5 text-accent", className)}
      fill="currentColor"
      aria-label="Verified"
    >
      <path d="M8 1.2 9.7 2l1.9.3.9 1.7 1.4 1.4-.3 1.9.8 1.7-.8 1.7.3 1.9-1.4 1.4-.9 1.7-1.9.3L8 14.8 6.3 14l-1.9-.3-.9-1.7-1.4-1.4.3-1.9L1.6 8l.8-1.7-.3-1.9 1.4-1.4.9-1.7 1.9-.3L8 1.2Zm-.1 8.7 3.4-3.4-.9-.9-2.5 2.5-1.2-1.2-.9.9 2.1 2.1Z" />
    </svg>
  );
}

export function Avatar({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover bg-card border border-border", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors duration-150",
        active
          ? "bg-accent/15 text-white border-accent/40"
          : "bg-white/[0.04] text-muted border-white/[0.07]",
        onClick && "hover:bg-hover hover:text-text",
      )}
    >
      {children}
    </Comp>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const id = useId();
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm font-medium text-text outline-none transition-colors hover:border-white/[0.14] focus:border-accent/60"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
