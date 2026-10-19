import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { resetearPassword } from "@/lib/usuarios";
import { manejarErrorApi } from "@/lib/api";
import { z } from "zod";

const esquema = z.object({ email: z.string().email().max(200).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await obtenerUsuarioActual();
    const { id } = await params;
    const cuerpo = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const datos = esquema.safeParse(cuerpo);
    if (!datos.success) return NextResponse.json({ ok: false, message: "Correo electrónico no válido." }, { status: 400 });
    const passwordTemporal = await resetearPassword(actor, id, datos.data.email);
    return NextResponse.json({ ok: true, data: { passwordTemporal } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return manejarErrorApi(error);
  }
}