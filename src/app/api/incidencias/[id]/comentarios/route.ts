import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { agregarComentario } from "@/lib/incidencias";
import { manejarErrorApi } from "@/lib/api";
import { esquemaComentario } from "@/lib/esquemas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await obtenerUsuarioActual();
    const { id } = await params;
    const cuerpo = await request.json();
    const analizado = esquemaComentario.safeParse(cuerpo);
    if (!analizado.success) {
      return NextResponse.json({ ok: false, message: "El comentario no es válido." }, { status: 400 });
    }
    await agregarComentario(actor, id, analizado.data.texto);
    return NextResponse.json({ ok: true, message: "Comentario añadido." });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
