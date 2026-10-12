import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { eliminarOpcionCatalogo, guardarOpcionCatalogo } from "@/lib/catalogos";
import { manejarErrorApi } from "@/lib/api";
import { esquemaEliminarCatalogo, esquemaOpcionCatalogo } from "@/lib/esquemas";

export async function POST(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const cuerpo = await request.json();
    const analizado = esquemaOpcionCatalogo.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "Datos de catálogo no válidos." }, { status: 400 });
    }
    await guardarOpcionCatalogo(actor, analizado.data.clave, analizado.data);
    return NextResponse.json({ ok: true, message: "Opción de catálogo guardada correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const cuerpo = await request.json();
    const analizado = esquemaEliminarCatalogo.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "Datos de catálogo no válidos." }, { status: 400 });
    }
    await eliminarOpcionCatalogo(actor, analizado.data.clave, analizado.data.codigo);
    return NextResponse.json({ ok: true, message: "Opción de catálogo desactivada correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
