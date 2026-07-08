import type { Metadata } from "next";
import { SiteUnlock } from "@/components/site-unlock";

export const metadata: Metadata = {
  title: "Sitio privado",
  robots: { index: false, follow: false },
};

// Página de contraseña del candado del sitio. El middleware manda aquí cualquier
// ruta cerrada; `?next=` recuerda a dónde volver tras desbloquear.
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <SiteUnlock next={next ?? "/"} />;
}
