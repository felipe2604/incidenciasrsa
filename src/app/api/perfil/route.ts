import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { cambiarPasswordPropia } from "@/lib/usuarios";
import { manejarErrorApi } from "@/lib/api";

const esquema = z.object({ actual: z.string().min(1).max(128), nueva: z.string().min(12).max(128) });

export async function POST(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual({ permitirCambioPassword: true });
    const datos = esquema.safeParse(await request.json());
    if (!datos.success) return NextResponse.json({ ok: false, message: "Revise la contraseña: entre 12 y 128 caracteres." }, { status: 400 });
    await cambiarPasswordPropia(actor, datos.data.actual, datos.data.nueva);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return manejarErrorApi(error);
  }
}