import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { obtenerNotificaciones, marcarNotificacionesLeidas } from "@/lib/notificaciones";
import { manejarErrorApi } from "@/lib/api";

const esquema = z.object({ ids: z.array(z.string().min(1).max(600)).min(1).max(100) });
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const actor = await obtenerUsuarioActual();
    return NextResponse.json({ ok: true, data: await obtenerNotificaciones(actor) }, { headers });
  } catch (error) { return manejarErrorApi(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const datos = esquema.safeParse(await request.json());
    if (!datos.success) return NextResponse.json({ ok: false, message: "Notificaciones no válidas." }, { status: 400 });
    return NextResponse.json({ ok: true, data: await marcarNotificacionesLeidas(actor, datos.data.ids) }, { headers });
  } catch (error) { return manejarErrorApi(error); }
}