import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { crearIncidencia, leerFiltrosIncidencias, listarIncidencias } from "@/lib/incidencias";
import { manejarErrorApi } from "@/lib/api";
import { esquemaNuevaIncidencia } from "@/lib/esquemas";
import { tienePermiso } from "@/lib/permissions";
import { eliminarCorreo, existeCorreo } from "@/lib/mails";

export async function GET(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const { searchParams } = new URL(request.url);
    const incidencias = await listarIncidencias(actor, {
      ...leerFiltrosIncidencias(searchParams),
      incluirArchivadas: searchParams.get("incluirArchivadas") === "true",
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
    const correoId = typeof cuerpo?.correoId === "string" && /^[a-f0-9]{32}$/.test(cuerpo.correoId) ? cuerpo.correoId : null;
    if (cuerpo?.correoId !== undefined && !correoId) {
      return NextResponse.json({ ok: false, message: "Correo no válido." }, { status: 400 });
    }
    if (correoId) {
      if (!tienePermiso(actor, "MAILS_GESTIONAR")) {
        return NextResponse.json({ ok: false, message: "No tiene permisos para gestionar correos." }, { status: 403 });
      }
      if (!(await existeCorreo(actor, correoId))) {
        return NextResponse.json({ ok: false, message: "Este correo ya se procesó o se eliminó." }, { status: 404 });
      }
    }
    const idIncidencia = await crearIncidencia(actor, analizado.data);
    if (correoId) {
      try { await eliminarCorreo(actor, correoId); }
      catch {
        return NextResponse.json({ ok: true, data: { idIncidencia }, message: "Incidencia creada, pero no se pudo eliminar el correo." });
      }
    }
    return NextResponse.json({ ok: true, data: { idIncidencia }, message: "Incidencia registrada correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
