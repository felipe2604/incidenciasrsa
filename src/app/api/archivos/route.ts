import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { registrarArchivo } from "@/lib/archivos";
import { manejarErrorApi } from "@/lib/api";
import { LIMITES } from "@/lib/constants";
import { esquemaArchivoNuevo } from "@/lib/esquemas";

// Base64 infla el tamaño ~4/3; se usa como cota de rechazo temprano (antes de
// decodificar el buffer completo) para no malgastar CPU/memoria con payloads
// manipulados a mano que intenten saltarse el límite del cliente.
const TAMANO_BASE64_MAXIMO = Math.ceil((LIMITES.ARCHIVO_MAX_BYTES * 4) / 3) + 1024;

export async function POST(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const cuerpo = await request.json();
    const analizado = esquemaArchivoNuevo.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "Faltan datos del archivo." }, { status: 400 });
    }
    const { idIncidencia, nombreOriginal, tipoMime, contenidoBase64 } = analizado.data;
    if (contenidoBase64.length > TAMANO_BASE64_MAXIMO) {
      return NextResponse.json(
        { ok: false, message: "El archivo supera el tamaño máximo permitido (10 MB)." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(contenidoBase64, "base64");
    if (buffer.byteLength > LIMITES.ARCHIVO_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, message: "El archivo supera el tamaño máximo permitido (10 MB)." },
        { status: 400 }
      );
    }
    // La incidencia/ámbito y el tipo MIME se revalidan de nuevo dentro de
    // registrarArchivo(); el Blob se crea solo después de pasar esas comprobaciones.
    const blob = await put(`incidencias/${idIncidencia}/${Date.now()}-${nombreOriginal}`, buffer, {
      access: "public",
      contentType: tipoMime,
    });
    const idArchivo = await registrarArchivo(actor, {
      idIncidencia,
      nombreOriginal,
      tipoMime,
      tamanoBytes: buffer.byteLength,
      urlBlob: blob.url,
    });
    return NextResponse.json({ ok: true, data: { idArchivo }, message: "Archivo adjuntado correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
