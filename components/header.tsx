"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-context";

export interface SessionSummary {
  id: string;
  businessName: string;
  status: "pending" | "verified" | "rejected";
}

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Catálogo" },
  { href: "/para-negocios", label: "Para Negocios" },
];

export function Header({ session }: { session: SessionSummary | null }) {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* announcement strip */}
      <div
        style={{ background: "var(--color-ink)", color: "var(--color-cream)" }}
        className="text-center text-xs font-semibold tracking-wide py-2 px-4"
      >
        🇵🇷 Importamos lo viral · Entregas en todo Puerto Rico · Precios al por mayor para negocios verificados
      </div>

      <header
        className="sticky top-0 z-50 border-b-2"
        style={{
          borderColor: "var(--color-ink)",
          background: "rgba(251,246,236,0.82)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="wrap flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span
              className="grid place-items-center w-9 h-9 rounded-xl text-lg"
              style={{
                background: "var(--color-coral)",
                border: "2px solid var(--color-ink)",
                boxShadow: "var(--shadow-pop-sm)",
              }}
            >
              🛒
            </span>
            <span className="font-display text-xl font-bold leading-none">
              Mi Tiendita<span style={{ color: "var(--color-coral)" }}> PR</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-2 rounded-full text-sm font-semibold transition-colors"
                  style={
                    active
                      ? { background: "var(--color-ink)", color: "var(--color-cream)" }
                      : { color: "var(--color-ink-soft)" }
                  }
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {session ? (
              <Link href="/negocios/cuenta" className="hidden sm:inline-flex btn btn-ghost btn-sm">
                {session.status === "verified" ? "✅" : "⏳"} {firstName(session.businessName)}
              </Link>
            ) : (
              <Link href="/negocios/entrar" className="hidden sm:inline-flex btn btn-ghost btn-sm">
                Negocios
              </Link>
            )}

            <Link href="/carrito" className="btn btn-ink btn-sm relative">
              🛒 Carrito
              {count > 0 && (
                <span
                  className="absolute -top-2 -right-2 grid place-items-center w-5 h-5 rounded-full text-[11px] font-bold"
                  style={{
                    background: "var(--color-sun)",
                    color: "var(--color-ink)",
                    border: "1.5px solid var(--color-ink)",
                  }}
                >
                  {count}
                </span>
              )}
            </Link>

            <button
              className="md:hidden btn btn-ghost btn-sm"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
            >
              ☰
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t-2 px-5 py-3 flex flex-col gap-1" style={{ borderColor: "var(--color-ink)", background: "var(--color-cream)" }}>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="py-2 font-semibold"
              >
                {n.label}
              </Link>
            ))}
            <Link href={session ? "/negocios/cuenta" : "/negocios/entrar"} onClick={() => setOpen(false)} className="py-2 font-semibold">
              {session ? "Mi cuenta de negocio" : "Acceso negocios"}
            </Link>
          </div>
        )}
      </header>
    </>
  );
}

function firstName(name: string): string {
  return name.split(" ").slice(0, 2).join(" ");
}
