import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { eliminarCorreo, listarCorreos } from "@/lib/mails";
import { manejarErrorApi } from "@/lib/api";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const actor = await obtenerUsuarioActual();
    return NextResponse.json({ ok: true, data: await listarCorreos(actor) }, { headers });
  } catch (error) { return manejarErrorApi(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const datos = z.object({ id: z.string().regex(/^[a-f0-9]{32}$/) }).safeParse(await request.json());
    if (!datos.success) return NextResponse.json({ ok: false, message: "Correo no válido." }, { status: 400 });
    await eliminarCorreo(actor, datos.data.id);
    return NextResponse.json({ ok: true, message: "Correo eliminado." }, { headers });
  } catch (error) { return manejarErrorApi(error); }
}
