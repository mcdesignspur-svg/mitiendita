import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t-2" style={{ borderColor: "var(--color-ink)", background: "var(--color-cream-2)" }}>
      <div className="wrap py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="grid place-items-center w-9 h-9 rounded-xl text-lg"
              style={{ background: "var(--color-coral)", border: "2px solid var(--color-ink)" }}
            >
              🛒
            </span>
            <span className="font-display text-xl font-bold">Mi Tiendita PR</span>
          </div>
          <p className="text-sm max-w-xs" style={{ color: "var(--color-ink-soft)" }}>
            Importamos productos virales y de alta utilidad para individuos y negocios en todo
            Puerto Rico. Entregas rápidas y precios al por mayor para comercios.
          </p>
        </div>

        <FooterCol
          title="Tienda"
          links={[
            { href: "/productos", label: "Catálogo completo" },
            { href: "/productos?cat=Auto%20%26%20Gasolinera", label: "Auto & Gasolinera" },
            { href: "/productos?cat=Impulso%20%26%20Conveniencia", label: "Impulso & Conveniencia" },
            { href: "/carrito", label: "Mi carrito" },
          ]}
        />
        <FooterCol
          title="Negocios"
          links={[
            { href: "/para-negocios", label: "Precios al por mayor" },
            { href: "/negocios/registro", label: "Crear cuenta" },
            { href: "/negocios/entrar", label: "Acceder" },
          ]}
        />
        <FooterCol
          title="Ayuda"
          links={[
            { href: "/para-negocios#verificacion", label: "Verificación de negocios" },
            { href: "mailto:hola@mitiendita.pr", label: "Contáctanos" },
          ]}
        />
      </div>
      <div className="border-t" style={{ borderColor: "var(--color-line)" }}>
        <div className="wrap py-5 flex flex-col sm:flex-row gap-2 items-center justify-between text-xs" style={{ color: "var(--color-muted)" }}>
          <span>© {new Date().getFullYear()} Mi Tiendita PR. Hecho en Puerto Rico 🇵🇷</span>
          <span>Precios mayoristas solo para comercios con Registro de Comerciante válido.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-bold mb-3 uppercase tracking-wide">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sm hover:underline" style={{ color: "var(--color-ink-soft)" }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
