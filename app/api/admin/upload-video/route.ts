import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// Subida de video por *client upload*: el archivo va directo del navegador a
// Vercel Blob (no pasa por la función, así evita el límite de ~4.5 MB del body
// serverless). Esta ruta solo emite el token firmado, gateado por admin.
export async function POST(req: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Falta configurar Vercel Blob. Crea un Blob store en Vercel → Storage y vuelve a intentar.",
      },
      { status: 503 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!(await isAdmin())) {
          throw new Error("No autorizado.");
        }
        return {
          allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
          addRandomSuffix: true,
        };
      },
      // El webhook de "completado" no llega en localhost; no lo necesitamos
      // porque `upload()` ya devuelve la URL al cliente.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error subiendo el video.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
