import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Falta configurar Vercel Blob. Crea un Blob store en Vercel → Storage y vuelve a intentar.",
      },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ninguna imagen." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagen muy grande (máx. 4 MB)." }, { status: 400 });
  }

  try {
    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const key = `products/${crypto.randomUUID()}.${ext}`;
    const blob = await put(key, file, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error subiendo la imagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
