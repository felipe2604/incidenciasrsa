import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { obtenerArchivoPorId } from "@/lib/archivos";
import { manejarErrorApi } from "@/lib/api";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await obtenerUsuarioActual();
    const { id } = await params;
    const archivo = await obtenerArchivoPorId(actor, id);
    const respuestaBlob = await fetch(archivo.url_blob);
    if (!respuestaBlob.ok || !respuestaBlob.body) {
      return NextResponse.json({ ok: false, message: "No se pudo recuperar el archivo." }, { status: 502 });
    }
    return new NextResponse(respuestaBlob.body, {
      headers: {
        "Content-Type": archivo.tipo_mime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(archivo.nombre_original || "archivo")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
