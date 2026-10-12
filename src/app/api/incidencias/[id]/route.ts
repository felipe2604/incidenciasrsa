import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { actualizarIncidencia, cambiarEstadoIncidencia, obtenerIncidenciaDetalle } from "@/lib/incidencias";
import { manejarErrorApi } from "@/lib/api";
import { esquemaCambiarEstado, esquemaNuevaIncidencia } from "@/lib/esquemas";

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

    // Cambio de estado (botones de CambiarEstadoIncidencia): solo trae "estado".
    if (typeof cuerpo?.estado === "string" && Object.keys(cuerpo).length === 1) {
      const analizado = esquemaCambiarEstado.safeParse(cuerpo);
      if (!analizado.success) {
        return NextResponse.json({ ok: false, message: "Falta el nuevo estado." }, { status: 400 });
      }
      await cambiarEstadoIncidencia(actor, id, analizado.data.estado);
      return NextResponse.json({ ok: true, message: "Estado actualizado correctamente." });
    }

    // Edición completa de los datos descriptivos (modal "Editar incidencia").
    const analizado = esquemaNuevaIncidencia.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "Datos de incidencia no válidos." }, { status: 400 });
    }
    await actualizarIncidencia(actor, id, analizado.data);
    return NextResponse.json({ ok: true, message: "Incidencia actualizada correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}

