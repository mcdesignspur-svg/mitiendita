"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Envuelve el "chrome" del sitio (header, footer, asistente) y lo oculta en los
 * links cerrados (`/exclusivo/*`). Esas rutas muestran SOLO el producto y su
 * compra, sin navegación al resto de la tienda. El `<main>` se mantiene siempre
 * para conservar el layout/estilos.
 */
export function ChromeGate({
  header,
  footer,
  assistant,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  assistant: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const closed = pathname?.startsWith("/exclusivo") ?? false;

  if (closed) return <main>{children}</main>;

  return (
    <>
      {header}
      <main>{children}</main>
      {footer}
      {assistant}
    </>
  );
}
