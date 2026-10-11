import { ESTADOS, HOJAS, LIMITES, ROLES, TIPO_UBICACION, TRANSICIONES_ESTADO, type Estado } from "./constants";
import { actualizarCelda, agregarFila, generarSiguienteId, leerFilasComoObjetos, obtenerEncabezados } from "./sheets";
import { ErrorAplicacion, incidenciaEnAmbito, listaAmbito, usuarioTieneAmbitoTotal, verificarPermiso } from "./permissions";
import { sanearTextoEntrada, validarComentario, validarIncidencia, type DatosIncidenciaEntrada } from "./validaciones";
import { registrarAuditoria } from "./auditoria";
import type { Incidencia, IncidenciaProyectada, Usuario } from "./types";

export function proyectarIncidencia(inc: Incidencia, actor: Usuario): IncidenciaProyectada {
  const esConfidencial = inc.confidencial === true || inc.confidencial === "TRUE";
  const puedeVerConfidencial =
    actor.rol === ROLES.ADMIN || actor.rol === ROLES.PRESIDENTE || inc.usuario_creador === actor.id_usuario;
  return {
    idIncidencia: inc.id_incidencia,
    fechaCreacion: inc.fecha_creacion,
    titulo: inc.titulo,
    descripcion: esConfidencial && !puedeVerConfidencial ? "(Información confidencial)" : inc.descripcion,
    tipoUbicacion: inc.tipo_ubicacion,
    bloque: inc.bloque,
    planta: inc.planta,
    zonaComun: inc.zona_comun,
    ubicacionDetalle: inc.ubicacion_detalle,
    categoria: inc.categoria,
    prioridad: inc.prioridad,
    estado: inc.estado,
    responsable: inc.responsable,
    fechaPrevistaActuacion: inc.fecha_prevista_actuacion,
    fechaResolucion: inc.fecha_resolucion,
    costeEstimado: inc.coste_estimado,
    costeReal: inc.coste_real,
    proveedor: inc.proveedor,
    confidencial: !!esConfidencial,
    archivada: inc.archivada === true || inc.archivada === "TRUE",
    fechaUltimaModificacion: inc.fecha_ultima_modificacion,
  };
}

export interface FiltrosIncidencias {
  texto?: string;
  incluirArchivadas?: boolean;
  estado?: string;
}

export async function listarIncidencias(actor: Usuario, filtros: FiltrosIncidencias = {}): Promise<IncidenciaProyectada[]> {
  const datos = await leerFilasComoObjetos(HOJAS.INCIDENCIAS);
  return datos.filas
    .map((f) => f.objeto as Incidencia)
    .filter((inc) => incidenciaEnAmbito(actor, inc))
    .filter((inc) => !(inc.archivada === true || inc.archivada === "TRUE") || filtros.incluirArchivadas === true)
    .filter((inc) => (filtros.estado ? inc.estado === filtros.estado : true))
    .filter((inc) => {
      if (!filtros.texto) return true;
      const t = filtros.texto.toLowerCase();
      return String(inc.titulo || "").toLowerCase().includes(t) || String(inc.descripcion || "").toLowerCase().includes(t);
    })
    .sort((a, b) => String(b.fecha_creacion).localeCompare(String(a.fecha_creacion)))
    .map((inc) => proyectarIncidencia(inc, actor));
}

async function buscarFilaIncidencia(idIncidencia: string) {
  const datos = await leerFilasComoObjetos(HOJAS.INCIDENCIAS);
  const encontrada = datos.filas.find((f) => f.objeto.id_incidencia === idIncidencia);
  if (!encontrada) throw new ErrorAplicacion("NO_ENCONTRADO", "Incidencia no encontrada.");
  return { objeto: encontrada.objeto, numeroFila: encontrada.numeroFila, encabezados: datos.encabezados };
}

export async function obtenerIncidenciaDetalle(actor: Usuario, idIncidencia: string): Promise<IncidenciaProyectada> {
  const { objeto } = await buscarFilaIncidencia(idIncidencia);
  const inc = objeto as Incidencia;
  if (!incidenciaEnAmbito(actor, inc)) throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene acceso a esta incidencia.");
  return proyectarIncidencia(inc, actor);
}

export interface DatosIncidenciaNueva extends DatosIncidenciaEntrada {
  fechaPrevistaActuacion?: string;
  proveedor?: string;
  confidencial?: boolean;
}

export async function crearIncidencia(actor: Usuario, datos: DatosIncidenciaNueva): Promise<string> {
  verificarPermiso(actor, "INCIDENCIAS_CREAR");
  const limpio = validarIncidencia(datos);

  if (actor.rol === ROLES.VOCAL || actor.rol === ROLES.COORDINADOR) {
    if (
      datos.tipoUbicacion === TIPO_UBICACION.BLOQUE &&
      !usuarioTieneAmbitoTotal(actor, "BLOQUE") &&
      !listaAmbito(actor.ambito_bloques).includes(datos.bloque || "")
    ) {
      throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene acceso a ese bloque.");
    }
    if (
      datos.tipoUbicacion === TIPO_UBICACION.ZONA_COMUN &&
      !usuarioTieneAmbitoTotal(actor, "ZONA") &&
      !listaAmbito(actor.ambito_zonas).includes(datos.zonaComun || "")
    ) {
      throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene acceso a esa zona.");
    }
  }

  const idNuevo = await generarSiguienteId("INC");
  const encabezados = await obtenerEncabezados(HOJAS.INCIDENCIAS);
  const ahora = new Date().toISOString();
  await agregarFila(HOJAS.INCIDENCIAS, encabezados, {
    id_incidencia: idNuevo,
    fecha_creacion: ahora,
    usuario_creador: actor.id_usuario,
    titulo: limpio.titulo,
    descripcion: limpio.descripcion,
    tipo_ubicacion: datos.tipoUbicacion,
    bloque: datos.tipoUbicacion === TIPO_UBICACION.BLOQUE ? datos.bloque || "" : "",
    planta: datos.tipoUbicacion === TIPO_UBICACION.BLOQUE ? datos.planta || "" : "",
    zona_comun: datos.tipoUbicacion === TIPO_UBICACION.ZONA_COMUN ? datos.zonaComun || "" : "",
    ubicacion_detalle: sanearTextoEntrada(datos.ubicacionDetalle, LIMITES.TEXTO_CORTO_MAX),
    categoria: datos.categoria,
    prioridad: datos.prioridad,
    estado: ESTADOS.REGISTRADA,
    responsable: "",
    fecha_prevista_actuacion: datos.fechaPrevistaActuacion || "",
    fecha_resolucion: "",
    descripcion_solucion: "",
    coste_estimado: datos.costeEstimado || "",
    coste_real: "",
    proveedor: sanearTextoEntrada(datos.proveedor, 150),
    confidencial: !!datos.confidencial,
    fecha_ultima_modificacion: ahora,
    usuario_ultima_modificacion: actor.id_usuario,
    archivada: false,
  });

  await registrarAuditoria("CREAR_INCIDENCIA", "INCIDENCIA", idNuevo, "Incidencia creada", "OK");
  return idNuevo;
}

export async function cambiarEstadoIncidencia(actor: Usuario, idIncidencia: string, nuevoEstado: string): Promise<void> {
  verificarPermiso(actor, "INCIDENCIAS_CAMBIAR_ESTADO");
  const { objeto, numeroFila, encabezados } = await buscarFilaIncidencia(idIncidencia);
  const inc = objeto as Incidencia;
  if (!incidenciaEnAmbito(actor, inc)) throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene acceso a esta incidencia.");
  const permitidas = TRANSICIONES_ESTADO[inc.estado as Estado] || [];
  if (!permitidas.includes(nuevoEstado as Estado)) {
    throw new ErrorAplicacion("ESTADO_INVALIDO", "Esa transición de estado no está permitida.");
  }
  const ahora = new Date().toISOString();
  await actualizarCelda(HOJAS.INCIDENCIAS, numeroFila, encabezados, {
    estado: nuevoEstado,
    fecha_resolucion: nuevoEstado === ESTADOS.RESUELTA ? ahora : inc.fecha_resolucion,
    fecha_ultima_modificacion: ahora,
    usuario_ultima_modificacion: actor.id_usuario,
  });
  await registrarAuditoria("CAMBIAR_ESTADO", "INCIDENCIA", idIncidencia, `Nuevo estado: ${nuevoEstado}`, "OK");
}

export async function agregarComentario(actor: Usuario, idIncidencia: string, texto: string): Promise<void> {
  verificarPermiso(actor, "COMENTARIOS_CREAR");
  await obtenerIncidenciaDetalle(actor, idIncidencia); // valida existencia y ámbito
  const limpio = validarComentario({ texto });
  const encabezados = await obtenerEncabezados(HOJAS.COMENTARIOS);
  await agregarFila(HOJAS.COMENTARIOS, encabezados, {
    id_comentario: `COM-${Date.now()}`,
    id_incidencia: idIncidencia,
    fecha: new Date().toISOString(),
    usuario: actor.id_usuario,
    texto: limpio.texto,
    interno: false,
  });
  await registrarAuditoria("CREAR_COMENTARIO", "INCIDENCIA", idIncidencia, "Comentario añadido", "OK");
}

export async function listarComentarios(actor: Usuario, idIncidencia: string) {
  await obtenerIncidenciaDetalle(actor, idIncidencia);
  const datos = await leerFilasComoObjetos(HOJAS.COMENTARIOS);
  return datos.filas
    .map((f) => f.objeto)
    .filter((c) => c.id_incidencia === idIncidencia)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}
