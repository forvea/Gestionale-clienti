// [INTENT]: Mattoncini di interfaccia condivisi (bottoni, campi, card, badge, stati vuoti). Stessa
// grammatica visiva della dashboard interna Forvea: sfondo neutral-50, card bianche arrotondate con
// bordo sottile, accento blue-600. Nessuna libreria di componenti: sono pochi elementi e Tailwind basta.

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export { cx };

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-neutral-600 hover:bg-neutral-100",
} as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants }) {
  return <button className={cx(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants }) {
  return <Link className={cx(buttonBase, buttonVariants[variant], className)} {...props} />;
}

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, "min-h-20", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(inputClass, className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string[] | string;
  children: ReactNode;
}) {
  const messages = Array.isArray(error) ? error : error ? [error] : [];
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-600">
        {label}
      </label>
      {children}
      {hint && messages.length === 0 && <p className="text-xs text-neutral-400">{hint}</p>}
      {messages.map((m) => (
        <p key={m} className="text-xs text-red-600">
          {m}
        </p>
      ))}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-neutral-800">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return (
    <p role={kind === "error" ? "alert" : undefined} className={cx("rounded-lg border px-3 py-2 text-sm", styles[kind])}>
      {children}
    </p>
  );
}

export function DescriptionList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-xs text-neutral-500">{k}</dt>
          <dd className="text-neutral-800">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
