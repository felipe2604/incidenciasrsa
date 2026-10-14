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
    if (!respuestaBlob.ok) {
      return NextResponse.json({ ok: false, message: "No se pudo recuperar el archivo." }, { status: 502 });
    }
    // Se bufferiza en vez de reenviar el stream tal cual: streaming directo del
    // body de fetch() a través de NextResponse falla de forma intermitente en
    // el runtime serverless de Vercel.
    const bytes = await respuestaBlob.arrayBuffer();
    return new NextResponse(bytes, {
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
