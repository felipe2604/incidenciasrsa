import { del, list } from "@vercel/blob";
import { HOJAS, ROLES } from "./constants";
import { ErrorAplicacion } from "./permissions";
import { obtenerIncidenciaDetalle } from "./incidencias";
import { eliminarFilas, leerFilasComoObjetos } from "./sheets";
import { registrarAuditoria } from "./auditoria";
import type { Usuario } from "./types";

export async function eliminarIncidencia(actor: Usuario, idIncidencia: string): Promise<void> {
  if (actor.rol !== ROLES.ADMIN) {
    throw new ErrorAplicacion("PERMISO_DENEGADO", "Solo ADMIN puede eliminar incidencias.");
  }
  await obtenerIncidenciaDetalle(actor, idIncidencia);
  const grupos = await Promise.all([
    HOJAS.INCIDENCIAS, HOJAS.ARCHIVOS, HOJAS.COMENTARIOS, HOJAS.ACTUACIONES, HOJAS.NOTIFICACIONES,
  ].map(async (hoja) => {
    const datos = await leerFilasComoObjetos(hoja);
    return { hoja, filas: datos.filas.filter((fila) => fila.objeto.id_incidencia === idIncidencia) };
  }));
  if (!grupos.find((grupo) => grupo.hoja === HOJAS.INCIDENCIAS)?.filas.length) {
    throw new ErrorAplicacion("NO_ENCONTRADO", "Incidencia no encontrada.");
  }
  const archivos = grupos.find((grupo) => grupo.hoja === HOJAS.ARCHIVOS)!.filas;
  if (archivos.length > 0) {
    const urls = new Set<string>();
    for (const archivo of archivos) {
      if (typeof archivo.objeto.url_blob === "string" && archivo.objeto.url_blob.trim()) urls.add(archivo.objeto.url_blob);
    }
    let cursor: string | undefined;
    do {
      const resultado = await list({ prefix: `incidencias/${idIncidencia}/`, cursor });
      for (const blob of resultado.blobs) urls.add(blob.url);
      cursor = resultado.hasMore ? resultado.cursor : undefined;
    } while (cursor);
    if (urls.size > 0) await del([...urls]);
  }
  await eliminarFilas(grupos.flatMap(({ hoja, filas }) => filas.map(({ numeroFila }) => ({ hoja, numeroFila }))));
  await registrarAuditoria("ELIMINAR_INCIDENCIA", "INCIDENCIA", idIncidencia, `Incidencia y ${archivos.length} registros de adjuntos eliminados`, "OK");
}