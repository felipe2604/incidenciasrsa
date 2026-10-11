import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { crearIncidencia, listarIncidencias } from "@/lib/incidencias";
import { manejarErrorApi } from "@/lib/api";
import { esquemaNuevaIncidencia } from "@/lib/esquemas";

export async function GET(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const { searchParams } = new URL(request.url);
    const incidencias = await listarIncidencias(actor, {
      texto: searchParams.get("texto") || undefined,
      incluirArchivadas: searchParams.get("incluirArchivadas") === "true",
      estado: searchParams.get("estado") || undefined,
    });
    return NextResponse.json({ ok: true, data: incidencias });
  } catch (e) {
    return manejarErrorApi(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const cuerpo = await request.json();
    const analizado = esquemaNuevaIncidencia.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "Datos de incidencia no válidos." }, { status: 400 });
    }
    const idIncidencia = await crearIncidencia(actor, analizado.data);
    return NextResponse.json({ ok: true, data: { idIncidencia }, message: "Incidencia registrada correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
