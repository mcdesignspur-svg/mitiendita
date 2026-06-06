import Link from "next/link";
import { listCategories, listCollections } from "@/lib/db";
import { ProductForm } from "@/components/product-form";

export const metadata = { title: "Nuevo producto — Mi Tiendita PR" };

export default async function NuevoProductoPage() {
  const categories = await listCategories();
  const collections = await listCollections();

  return (
    <div className="wrap py-10">
      <nav className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
        <Link href="/admin/productos" className="hover:underline">Productos</Link>
        {" / "}<span style={{ color: "var(--color-ink)" }}>Nuevo</span>
      </nav>
      <h1 className="font-display text-4xl mb-6">Nuevo producto</h1>
      <ProductForm mode="create" categories={categories} collections={collections} />
    </div>
  );
}
