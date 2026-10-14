import { HOJAS, LIMITES } from "./constants";
import { list } from "@vercel/blob";
import { actualizarCelda, agregarFila, leerFilasComoObjetos, obtenerEncabezados } from "./sheets";
import { ErrorAplicacion, verificarPermiso } from "./permissions";
import { registrarAuditoria } from "./auditoria";
import { obtenerIncidenciaDetalle } from "./incidencias";
import type { Usuario } from "./types";

export interface DatosArchivoNuevo {
  idIncidencia: string;
  nombreOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
  urlBlob: string;
}

export async function registrarArchivo(actor: Usuario, datos: DatosArchivoNuevo): Promise<string> {
  verificarPermiso(actor, "ARCHIVOS_SUBIR");
  await obtenerIncidenciaDetalle(actor, datos.idIncidencia); // valida acceso y existencia
  if (!(LIMITES.TIPOS_ARCHIVO_PERMITIDOS as readonly string[]).includes(datos.tipoMime)) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Tipo de archivo no permitido.");
  }
  if (datos.tamanoBytes > LIMITES.ARCHIVO_MAX_BYTES) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "El archivo supera el tamaño máximo permitido (10 MB).");
  }
  const idArchivo = `ARC-${Date.now()}`;
  const encabezados = await obtenerEncabezados(HOJAS.ARCHIVOS, ["url_blob"]);
  await agregarFila(HOJAS.ARCHIVOS, encabezados, {
    id_archivo: idArchivo,
    id_incidencia: datos.idIncidencia,
    id_actuacion: "",
    nombre_original: datos.nombreOriginal,
    nombre_almacenado: idArchivo,
    url_blob: datos.urlBlob,
    tipo_mime: datos.tipoMime,
    tamano_bytes: datos.tamanoBytes,
    fecha_subida: new Date().toISOString(),
    usuario_subida: actor.id_usuario,
    eliminado: false,
  });
  await registrarAuditoria("SUBIR_ARCHIVO", "INCIDENCIA", datos.idIncidencia, `Archivo: ${datos.nombreOriginal}`, "OK");
  return idArchivo;
}

export async function listarArchivosPorIncidencia(actor: Usuario, idIncidencia: string) {
  await obtenerIncidenciaDetalle(actor, idIncidencia);
  const datos = await leerFilasComoObjetos(HOJAS.ARCHIVOS);
  return datos.filas
    .map((f) => f.objeto)
    .filter((a) => a.id_incidencia === idIncidencia && !(a.eliminado === true || a.eliminado === "TRUE"));
}

// Revalida ámbito en cada descarga (nunca se confía en una URL ya conocida);
// la URL real del blob no sale nunca de aquí hacia el cliente, solo los bytes.
export async function obtenerArchivoPorId(actor: Usuario, idArchivo: string) {
  const datos = await leerFilasComoObjetos(HOJAS.ARCHIVOS);
  const encontrado = datos.filas.find((f) => f.objeto.id_archivo === idArchivo);
  if (!encontrado || encontrado.objeto.eliminado === true || encontrado.objeto.eliminado === "TRUE") {
    throw new ErrorAplicacion("NO_ENCONTRADO", "Archivo no encontrado.");
  }
  const archivo = encontrado.objeto;
  await obtenerIncidenciaDetalle(actor, archivo.id_incidencia);
  if (!archivo.url_blob) {
    const coincidencias: string[] = [];
    let cursor: string | undefined;
    do {
      const resultado = await list({ prefix: `incidencias/${archivo.id_incidencia}/`, cursor });
      for (const blob of resultado.blobs) {
        if (blob.pathname.endsWith(`-${archivo.nombre_original}`) && blob.size === Number(archivo.tamano_bytes)) {
          coincidencias.push(blob.url);
        }
      }
      cursor = resultado.hasMore ? resultado.cursor : undefined;
    } while (cursor);
    if (coincidencias.length !== 1) {
      throw new ErrorAplicacion("NO_ENCONTRADO", "No se puede recuperar este adjunto. Vuelva a adjuntarlo a la incidencia.");
    }
    const encabezados = await obtenerEncabezados(HOJAS.ARCHIVOS, ["url_blob"]);
    archivo.url_blob = coincidencias[0];
    await actualizarCelda(HOJAS.ARCHIVOS, encontrado.numeroFila, encabezados, { url_blob: archivo.url_blob });
  }
  return archivo;
}
