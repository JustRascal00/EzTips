"use client";

import { cn } from "@/lib/cn";
import {
  useEffect,
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

/** Dark, styled dropdown (replaces the browser's native <select> menu). */
export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  size = "md",
  disabled,
  align = "left",
}: {
  value: T;
  onChange: (id: T) => void;
  options: { id: T; label: ReactNode; hint?: ReactNode }[];
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" });
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, active]);

  const openList = () => { setActive(Math.max(0, options.findIndex((o) => o.id === value))); setOpen(true); };
  const pick = (id: T) => { onChange(id); setOpen(false); };

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); openList(); return; }
          if (!open) return;
          if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const o = options[active]; if (o) pick(o.id); }
        }}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] font-medium text-text outline-none transition-colors hover:border-white/[0.14] focus-visible:border-accent/60 disabled:opacity-50",
          size === "sm" ? "h-9 px-3 text-[13px]" : "h-10 px-3.5 text-sm",
          open && "border-accent/60",
        )}
      >
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <svg viewBox="0 0 20 20" className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")} fill="currentColor" aria-hidden><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" /></svg>
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className={cn(
            "absolute top-full z-[60] mt-1.5 max-h-72 min-w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-panel p-1 shadow-2xl shadow-black/60 pop-in",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((o, i) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={o.id === value}
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o.id)}
              className={cn(
                "flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-sm",
                i === active ? "bg-white/[0.07] text-white" : "text-white/80",
              )}
            >
              <span className="w-4 shrink-0 text-accent">{o.id === value && <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" /></svg>}</span>
              <span className="flex-1">{o.label}</span>
              {o.hint && <span className="text-xs text-muted">{o.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
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
  return (
    <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
      {label}
      <Select ariaLabel={label} value={value} onChange={onChange} options={options} className="w-full" />
    </div>
  );
}
