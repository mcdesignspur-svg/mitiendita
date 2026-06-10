"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // Cerrar menú móvil con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtnRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const cartDisplay = count > 99 ? "99+" : count > 0 ? String(count) : null;

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
          <Link href="/" className="flex items-center shrink-0" aria-label="Mi Tiendita PR — Inicio">
            <Image src="/logo.svg" alt="Mi Tiendita PR" width={120} height={36} className="h-9 w-auto" priority />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
            {NAV.map((n) => {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-2 rounded-full text-sm font-semibold transition-colors"
                  aria-current={active ? "page" : undefined}
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

            <Link href="/carrito" className="btn btn-ink btn-sm relative" aria-label={`Carrito${count > 0 ? `, ${count} artículo${count !== 1 ? "s" : ""}` : ""}`}>
              🛒 Carrito
              {cartDisplay && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 grid place-items-center min-w-[20px] h-5 rounded-full px-1 text-[11px] font-bold"
                  style={{
                    background: "var(--color-sun)",
                    color: "var(--color-ink)",
                    border: "1.5px solid var(--color-ink)",
                  }}
                >
                  {cartDisplay}
                </span>
              )}
            </Link>

            <button
              ref={menuBtnRef}
              className="md:hidden btn btn-ghost btn-sm"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú de navegación"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {open && (
          <div
            id="mobile-menu"
            ref={menuRef}
            className="md:hidden border-t-2 px-5 py-3 flex flex-col gap-1"
            style={{ borderColor: "var(--color-ink)", background: "var(--color-cream)" }}
          >
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="py-2 font-semibold"
                aria-current={isActive(n.href) ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href={session ? "/negocios/cuenta" : "/negocios/entrar"}
              onClick={() => setOpen(false)}
              className="py-2 font-semibold"
            >
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
