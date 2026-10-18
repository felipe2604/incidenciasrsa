import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { resetearPassword } from "@/lib/usuarios";
import { manejarErrorApi } from "@/lib/api";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await obtenerUsuarioActual();
    const { id } = await params;
    const passwordTemporal = await resetearPassword(actor, id);
    return NextResponse.json({ ok: true, data: { passwordTemporal } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return manejarErrorApi(error);
  }
}