import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { verificarPermiso } from "@/lib/permissions";
import { obtenerInformeResumen } from "@/lib/informes";
import { generarPdfInformeIncidencias } from "@/lib/informePdf";
import { obtenerCatalogos } from "@/lib/catalogos";
import { ETIQUETAS_ESTADO } from "@/lib/constants";
import { manejarErrorApi } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const actor = await obtenerUsuarioActual();
    verificarPermiso(actor, "INFORMES_VER");
    const { searchParams } = new URL(request.url);
    const texto = searchParams.get("texto") || undefined;
    const estado = searchParams.get("estado") || undefined;
    const prioridad = searchParams.get("prioridad") || undefined;
    const categoria = searchParams.get("categoria") || undefined;

    const [resumen, catalogos] = await Promise.all([
      obtenerInformeResumen(actor, { texto, estado, prioridad, categoria }),
      obtenerCatalogos(),
    ]);

    const filtrosAplicados: string[] = [];
    if (texto) filtrosAplicados.push(`Texto: "${texto}"`);
    if (estado) filtrosAplicados.push(`Estado: ${ETIQUETAS_ESTADO[estado as keyof typeof ETIQUETAS_ESTADO] || estado}`);
    if (prioridad) filtrosAplicados.push(`Prioridad: ${prioridad}`);
    if (categoria) filtrosAplicados.push(`Categoría: ${catalogos.CATEGORIAS.find((c) => c.codigo === categoria)?.etiqueta || categoria}`);

    const pdf = await generarPdfInformeIncidencias(resumen, catalogos, filtrosAplicados);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="informe_incidencias_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    return manejarErrorApi(e);
  }
}
