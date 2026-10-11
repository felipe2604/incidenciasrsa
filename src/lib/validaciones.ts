/**
 * Validación y saneado de entradas de negocio — puerto de Validaciones.gs.
 * Se ejecuta siempre en el servidor, nunca basta con la validación del navegador.
 */
import { LIMITES, PRIORIDADES, TIPO_UBICACION, type TipoUbicacion } from "./constants";
import { ErrorAplicacion } from "./permissions";

export function sanearTextoEntrada(texto: unknown, maxLen?: number): string {
  if (texto === null || texto === undefined) return "";
  let limpio = String(texto).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (maxLen && limpio.length > maxLen) limpio = limpio.substring(0, maxLen);
  return limpio;
}

export interface DatosIncidenciaEntrada {
  titulo: string;
  descripcion: string;
  tipoUbicacion: string;
  bloque?: string;
  planta?: string;
  zonaComun?: string;
  ubicacionDetalle?: string;
  categoria: string;
  prioridad: string;
  costeEstimado?: string | number;
  costeReal?: string | number;
}

export function validarIncidencia(datos: DatosIncidenciaEntrada): { titulo: string; descripcion: string } {
  const errores: Record<string, string> = {};
  const titulo = sanearTextoEntrada(datos.titulo, LIMITES.TITULO_MAX);
  if (!titulo) errores.titulo = "El título es obligatorio.";
  const descripcion = sanearTextoEntrada(datos.descripcion, LIMITES.DESCRIPCION_MAX);
  if (!descripcion) errores.descripcion = "La descripción es obligatoria.";
  if (![TIPO_UBICACION.BLOQUE, TIPO_UBICACION.ZONA_COMUN].includes(datos.tipoUbicacion as TipoUbicacion)) {
    errores.tipoUbicacion = "Seleccione un tipo de ubicación.";
  }
  if (datos.tipoUbicacion === TIPO_UBICACION.BLOQUE && (!datos.bloque || !datos.planta)) {
    errores.bloque = "Indique bloque y planta.";
  }
  if (datos.tipoUbicacion === TIPO_UBICACION.ZONA_COMUN && !datos.zonaComun) {
    errores.zonaComun = "Indique la zona común.";
  }
  if (!datos.categoria) errores.categoria = "Seleccione una categoría.";
  if (!(PRIORIDADES as readonly string[]).includes(datos.prioridad)) errores.prioridad = "Prioridad no válida.";
  if (datos.costeEstimado !== undefined && datos.costeEstimado !== "" && isNaN(Number(datos.costeEstimado))) {
    errores.costeEstimado = "El coste estimado debe ser numérico.";
  }
  if (datos.costeReal !== undefined && datos.costeReal !== "" && isNaN(Number(datos.costeReal))) {
    errores.costeReal = "El coste real debe ser numérico.";
  }
  if (Object.keys(errores).length > 0) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "Revise los campos indicados.", errores);
  }
  return { titulo, descripcion };
}

export function validarComentario(datos: { texto: string }): { texto: string } {
  const texto = sanearTextoEntrada(datos.texto, LIMITES.COMENTARIO_MAX);
  if (!texto) throw new ErrorAplicacion("DATOS_INVALIDOS", "El comentario no puede estar vacío.");
  return { texto };
}
