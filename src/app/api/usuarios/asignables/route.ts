import { NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarUsuariosAsignables } from "@/lib/asignaciones";
import { manejarErrorApi } from "@/lib/api";

export async function GET() {
  try {
    const actor = await obtenerUsuarioActual();
    return NextResponse.json({ ok: true, data: await listarUsuariosAsignables(actor) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return manejarErrorApi(error); }
}