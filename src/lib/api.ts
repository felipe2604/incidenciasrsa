import { NextResponse } from "next/server";
import { ErrorAplicacion } from "./permissions";

// Punto único de captura para las rutas API: nunca se exponen trazas ni
// detalles internos al cliente, igual que manejarError_ en el backend Apps Script.
export function manejarErrorApi(e: unknown) {
  if (e instanceof ErrorAplicacion) {
    const status =
      e.codigo === "ACCESO_NO_AUTORIZADO"
        ? 401
        : e.codigo === "PERMISO_DENEGADO"
          ? 403
          : e.codigo === "NO_ENCONTRADO"
            ? 404
            : 400;
    return NextResponse.json({ ok: false, message: e.message, codigo: e.codigo, errores: e.errores }, { status });
  }
  console.error("Error interno:", e);
  return NextResponse.json(
    { ok: false, message: "Se ha producido un error. Contacte con el administrador si persiste.", codigo: "ERROR_INTERNO" },
    { status: 500 }
  );
}
