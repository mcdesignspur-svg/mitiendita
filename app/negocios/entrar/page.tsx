import { LoginForm } from "@/components/business-forms";

export const metadata = { title: "Acceso negocios — Mi Tiendita PR" };

export default function EntrarPage() {
  return (
    <div className="wrap py-16 max-w-md">
      <div className="text-center mb-8">
        <span className="eyebrow">Acceso negocios</span>
        <h1 className="font-display text-4xl mt-3">Bienvenido de vuelta 👋</h1>
        <p className="mt-2" style={{ color: "var(--color-ink-soft)" }}>
          Accede a tu cuenta para ver precios mayoristas.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
