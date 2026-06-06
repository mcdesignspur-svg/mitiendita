import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, listCategories, listCollections } from "@/lib/db";
import { ProductForm } from "@/components/product-form";
import { DeleteProductButton } from "@/components/confirm-delete";

export const metadata = { title: "Editar producto — Mi Tiendita PR" };

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const categories = await listCategories();
  const collections = await listCollections();

  return (
    <div className="wrap py-10">
      <nav className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
        <Link href="/admin/productos" className="hover:underline">Productos</Link>
        {" / "}<span style={{ color: "var(--color-ink)" }}>{product.name}</span>
      </nav>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="font-display text-4xl">Editar producto</h1>
        <div className="flex items-center gap-2">
          <Link href={`/productos/${product.slug}`} className="btn btn-ghost btn-sm" target="_blank">
            Ver en tienda ↗
          </Link>
          <DeleteProductButton id={product.id} name={product.name} label="🗑 Eliminar" />
        </div>
      </div>

      <ProductForm mode="edit" product={product} categories={categories} collections={collections} />
    </div>
  );
}
