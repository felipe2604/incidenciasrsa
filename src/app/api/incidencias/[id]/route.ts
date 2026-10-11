import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { cambiarEstadoIncidencia, obtenerIncidenciaDetalle } from "@/lib/incidencias";
import { manejarErrorApi } from "@/lib/api";
import { esquemaCambiarEstado } from "@/lib/esquemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await obtenerUsuarioActual();
    const { id } = await params;
    const incidencia = await obtenerIncidenciaDetalle(actor, id);
    return NextResponse.json({ ok: true, data: incidencia });
  } catch (e) {
    return manejarErrorApi(e);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await obtenerUsuarioActual();
    const { id } = await params;
    const cuerpo = await request.json();
    const analizado = esquemaCambiarEstado.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "Falta el nuevo estado." }, { status: 400 });
    }
    await cambiarEstadoIncidencia(actor, id, analizado.data.estado);
    return NextResponse.json({ ok: true, message: "Estado actualizado correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
