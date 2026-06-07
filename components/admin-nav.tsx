"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/aprobaciones", label: "Aprobaciones" },
  { href: "/admin/operador", label: "Operador" },
  { href: "/admin/compras", label: "Compras" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/grupos", label: "Grupos" },
  { href: "/admin/promociones", label: "Promos" },
  { href: "/admin/bitacora", label: "Bitácora" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 flex-wrap">
      <Link href="/" className="font-display text-lg font-bold mr-3">
        Mi Tiendita<span style={{ color: "var(--color-coral)" }}> · ops</span>
      </Link>
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
            style={
              active
                ? { background: "var(--color-ink)", color: "var(--color-cream)" }
                : { color: "var(--color-ink-soft)" }
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
