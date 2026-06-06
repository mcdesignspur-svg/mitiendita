import Link from "next/link";
import { RegisterForm } from "@/components/business-forms";

export const metadata = { title: "Crear cuenta de negocio — Mi Tiendita PR" };

export default function RegistroPage() {
  return (
    <div className="wrap py-12 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
      <div className="lg:sticky lg:top-24">
        <span className="eyebrow">Cuenta de negocio</span>
        <h1 className="font-display text-4xl md:text-5xl mt-3 mb-4">
          Regístrate y compra al por mayor.
        </h1>
        <p className="mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Crea tu cuenta con tu Registro de Comerciante. Tras verificarlo, desbloqueas
          precios mayoristas en todo el catálogo.
        </p>
        <ul className="space-y-3">
          {[
            "Precios netos para tu negocio",
            "Mínimos por caja pensados para góndola",
            "Reposición sugerida según lo que más se vende",
            "Entrega en todo Puerto Rico",
          ].map((t) => (
            <li key={t} className="flex items-center gap-3 font-semibold">
              <span className="grid place-items-center w-6 h-6 rounded-full text-xs" style={{ background: "var(--color-teal)", color: "#fff" }}>✓</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="text-sm mt-8" style={{ color: "var(--color-muted)" }}>
          ¿Buscas comprar al detal? <Link href="/productos" className="underline font-semibold">Ve al catálogo</Link>.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
