import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { guardarUsuario, listarUsuarios } from "@/lib/usuarios";
import { manejarErrorApi } from "@/lib/api";
import { esquemaUsuario } from "@/lib/esquemas";

export async function GET() {
  try {
    const actor = await obtenerUsuarioActual();
    const usuarios = await listarUsuarios(actor);
    return NextResponse.json({ ok: true, data: usuarios });
  } catch (e) {
    return manejarErrorApi(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    const cuerpo = await request.json();
    const analizado = esquemaUsuario.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "Datos de usuario no válidos." }, { status: 400 });
    }
    const idUsuario = await guardarUsuario(actor, analizado.data);
    return NextResponse.json({ ok: true, data: { idUsuario }, message: "Usuario guardado correctamente." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
