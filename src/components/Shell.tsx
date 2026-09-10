"use client";

// [INTENT]: Guscio dell'app autenticata: sidebar + barra superiore + contenuto. Sotto la soglia `md` la
// sidebar è un drawer fuori schermo aperto da un hamburger — lo stesso difetto (sidebar fissa che
// schiaccia il contenuto su iPhone) è già stato trovato e corretto due volte sulle dashboard interne
// Forvea; qui nasce responsive fin dall'inizio.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cx } from "./ui";

const NAV = [
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/clienti", label: "Clienti", icon: "👥" },
] as const;

export function Shell({
  tenantName,
  userEmail,
  logout,
  children,
}: {
  tenantName: string;
  userEmail: string;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cx(
          "fixed left-0 top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white transition-transform md:sticky md:translate-x-0",
          // WHY: da chiuso non basta traslarlo fuori schermo — resterebbe raggiungibile con Tab e per gli
          // screen reader. `invisible` lo toglie davvero dall'albero di accessibilità sotto `md`.
          open ? "translate-x-0" : "-translate-x-full max-md:invisible",
        )}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            G
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{tenantName}</p>
            <p className="truncate text-xs text-neutral-500">{userEmail}</p>
          </div>
          <button
            type="button"
            aria-label="Chiudi menu"
            onClick={() => setOpen(false)}
            className="ml-auto text-neutral-400 hover:text-neutral-700 md:hidden"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-blue-50 font-medium text-blue-700" : "text-neutral-600 hover:bg-neutral-100",
                )}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout} className="border-t border-neutral-200 p-2">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            ↪ Esci
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Apri menu"
            onClick={() => setOpen(true)}
            className="text-xl leading-none text-neutral-600"
          >
            ☰
          </button>
          <span className="text-sm font-semibold">{tenantName}</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
