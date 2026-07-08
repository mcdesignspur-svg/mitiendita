"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Envuelve el "chrome" del sitio (header, footer, asistente) y lo oculta en los
 * links cerrados (`/exclusivo/*`) y en la página de contraseña del candado
 * (`/entrar`). Esas rutas se muestran solas, sin navegación al resto del sitio.
 * El `<main>` se mantiene siempre para conservar el layout/estilos.
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
  const closed =
    (pathname?.startsWith("/exclusivo") || pathname?.startsWith("/entrar")) ??
    false;

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
