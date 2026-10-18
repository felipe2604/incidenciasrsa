import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { verificarPermiso } from "@/lib/permissions";
import { leerFiltrosIncidencias, listarIncidencias } from "@/lib/incidencias";
import { generarCsvIncidencias } from "@/lib/informes";
import { manejarErrorApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    verificarPermiso(actor, "INFORMES_VER");
    const { searchParams } = new URL(request.url);
    const lista = await listarIncidencias(actor, {
      ...leerFiltrosIncidencias(searchParams),
      incluirArchivadas: true,
    });
    const csv = generarCsvIncidencias(lista);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="incidencias_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
