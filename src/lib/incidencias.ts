import { ESTADOS, ESTADOS_PENDIENTES, ESTADOS_SIN_TRABAJO_PENDIENTE, HOJAS, LIMITES, ROLES, TIPO_UBICACION, TRANSICIONES_ESTADO, type Estado } from "./constants";
import { actualizarCelda, agregarFila, generarSiguienteId, leerFilasComoObjetos, obtenerEncabezados } from "./sheets";
import { ErrorAplicacion, esCreador, esResponsable, incidenciaEnAmbito, listaAmbito, puedeCambiarEstado, tienePermiso, usuarioTieneAmbitoTotal, verificarPermiso } from "./permissions";
import { resolverResponsable } from "./asignaciones";
import { sanearTextoEntrada, validarComentario, validarIncidencia, type DatosIncidenciaEntrada } from "./validaciones";
import { registrarAuditoria } from "./auditoria";
import type { Incidencia, IncidenciaProyectada, Usuario } from "./types";

export function estaArchivada(inc: Incidencia, ahora = Date.now()): boolean {
  if (inc.archivada === true || inc.archivada === "TRUE") return true;
  if (inc.estado !== ESTADOS.RESUELTA && inc.estado !== ESTADOS.CERRADA) return false;
  const fecha = inc.fecha_estado_final || (inc.estado === ESTADOS.RESUELTA ?
    inc.fecha_resolucion || inc.fecha_ultima_modificacion : inc.fecha_ultima_modificacion || inc.fecha_resolucion);
  const instante = Date.parse(fecha || "");
  return Number.isFinite(instante) && ahora - instante >= 15 * 24 * 60 * 60 * 1000;
}

export function proyectarIncidencia(inc: Incidencia, actor: Usuario): IncidenciaProyectada {
  const esConfidencial = inc.confidencial === true || inc.confidencial === "TRUE";
  const puedeVerConfidencial =
    actor.rol === ROLES.ADMIN || actor.rol === ROLES.PRESIDENTE || esCreador(actor, inc);
  return {
    idIncidencia: inc.id_incidencia,
    fechaCreacion: inc.fecha_creacion,
    usuarioCreador: inc.usuario_creador,
    usuarioCreadorEmail: inc.usuario_creador_email,
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
    responsableEmail: inc.responsable_email,
    responsableNombre: inc.responsable_nombre || inc.responsable_email || inc.responsable,
    fechaPrevistaActuacion: inc.fecha_prevista_actuacion,
    fechaResolucion: inc.fecha_resolucion,
    costeEstimado: inc.coste_estimado,
    costeReal: inc.coste_real,
    proveedor: inc.proveedor,
    confidencial: !!esConfidencial,
    archivada: estaArchivada(inc),
    fechaUltimaModificacion: inc.fecha_ultima_modificacion,
  };
}

export interface FiltrosIncidencias {
  texto?: string;
  incluirArchivadas?: boolean;
  estado?: string;
  prioridad?: string;
  categoria?: string;
  bloque?: string;
  zona?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  campoFecha?: string;
  // Mismos codigos que las tarjetas del panel (ABIERTAS, URGENTES, PENDIENTES,
  // VENCIDAS, ASIGNADAS_A_MI, FINALIZADAS), para que el listado muestre
  // exactamente el conjunto que dio lugar al contador pulsado.
  filtroRapido?: string;
}

export function leerFiltrosIncidencias(parametros: URLSearchParams): FiltrosIncidencias {
  return Object.fromEntries(["texto", "estado", "prioridad", "categoria", "bloque", "zona", "fechaDesde", "fechaHasta", "campoFecha", "filtroRapido"]
    .map((clave) => [clave, parametros.get(clave) || undefined]));
}

function validarFiltros(filtros: FiltrosIncidencias): void {
  for (const fecha of [filtros.fechaDesde, filtros.fechaHasta]) {
    if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha)) {
      throw new ErrorAplicacion("DATOS_INVALIDOS", "El rango de fechas no es válido.");
    }
  }
  if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "La fecha inicial debe ser anterior o igual a la final.");
  }
  if (filtros.campoFecha && !["creacion", "actividad", "resolucion"].includes(filtros.campoFecha)) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "El tipo de fecha no es válido.");
  }
}

function cumpleFechas(inc: Incidencia, filtros: FiltrosIncidencias): boolean {
  if (!filtros.fechaDesde && !filtros.fechaHasta) return true;
  const fechas = filtros.campoFecha === "actividad" ? [inc.fecha_creacion, inc.fecha_ultima_modificacion, inc.fecha_resolucion, inc.fecha_estado_final] :
    filtros.campoFecha === "resolucion" ? [inc.fecha_resolucion] : [inc.fecha_creacion];
  return fechas.some((valor) => {
    const fecha = String(valor || "").slice(0, 10);
    return !!fecha && (!filtros.fechaDesde || fecha >= filtros.fechaDesde) && (!filtros.fechaHasta || fecha <= filtros.fechaHasta);
  });
}

function cumpleFiltroRapido(inc: Incidencia, actor: Usuario, filtroRapido: string): boolean {
  const abierta = !ESTADOS_SIN_TRABAJO_PENDIENTE.includes(inc.estado);
  switch (filtroRapido) {
    case "ABIERTAS":
      return abierta;
    case "URGENTES":
      return abierta && inc.prioridad === "URGENTE";
    case "PENDIENTES":
      return abierta && ESTADOS_PENDIENTES.includes(inc.estado);
    case "VENCIDAS": {
      const hoy = new Date().toISOString().slice(0, 10);
      return abierta && !!inc.fecha_prevista_actuacion && inc.fecha_prevista_actuacion.slice(0, 10) < hoy;
    }
    case "ASIGNADAS_A_MI":
      return abierta && esResponsable(actor, inc);
    case "FINALIZADAS":
      return inc.estado === ESTADOS.RESUELTA || inc.estado === ESTADOS.CERRADA;
    default:
      return true;
  }
}

export async function listarIncidencias(actor: Usuario, filtros: FiltrosIncidencias = {}): Promise<IncidenciaProyectada[]> {
  validarFiltros(filtros);
  const datos = await leerFilasComoObjetos(HOJAS.INCIDENCIAS);
  return datos.filas
    .map((f) => f.objeto as Incidencia)
    .filter((inc) => incidenciaEnAmbito(actor, inc))
    .filter((inc) => !estaArchivada(inc) || filtros.incluirArchivadas === true)
    .filter((inc) => filtros.estado === "ARCHIVADAS" ? estaArchivada(inc) : filtros.estado ? inc.estado === filtros.estado : true)
    .filter((inc) => (filtros.prioridad ? inc.prioridad === filtros.prioridad : true))
    .filter((inc) => (filtros.categoria ? inc.categoria === filtros.categoria : true))
    .filter((inc) => (!filtros.bloque && !filtros.zona) ||
      (filtros.bloque && inc.tipo_ubicacion === TIPO_UBICACION.BLOQUE && inc.bloque === filtros.bloque) ||
      (filtros.zona && inc.tipo_ubicacion === TIPO_UBICACION.ZONA_COMUN && inc.zona_comun === filtros.zona))
    .filter((inc) => cumpleFechas(inc, filtros))
    .filter((inc) => (filtros.filtroRapido ? cumpleFiltroRapido(inc, actor, filtros.filtroRapido) : true))
    .filter((inc) => {
      if (!filtros.texto) return true;
      const t = filtros.texto.toLowerCase();
      const visible = proyectarIncidencia(inc, actor);
      return String(visible.titulo || "").toLowerCase().includes(t) || String(visible.descripcion || "").toLowerCase().includes(t);
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
  responsableEmail?: string;
}

function validarFechaPrevista(fecha?: string): void {
  if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha)) {
    throw new ErrorAplicacion("DATOS_INVALIDOS", "La fecha prevista no es válida.", { fechaPrevistaActuacion: "Indique una fecha válida." });
  }
}

export async function crearIncidencia(actor: Usuario, datos: DatosIncidenciaNueva): Promise<string> {
  verificarPermiso(actor, "INCIDENCIAS_CREAR");
  const limpio = validarIncidencia(datos);
  validarFechaPrevista(datos.fechaPrevistaActuacion);

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

  const responsable = await resolverResponsable(actor, datos.responsableEmail);
  const idNuevo = await generarSiguienteId("INC");
  const encabezados = await obtenerEncabezados(HOJAS.INCIDENCIAS, ["responsable", "responsable_email", "responsable_nombre", "fecha_asignacion", "usuario_creador_email"]);
  const ahora = new Date().toISOString();
  await agregarFila(HOJAS.INCIDENCIAS, encabezados, {
    id_incidencia: idNuevo,
    fecha_creacion: ahora,
    usuario_creador: actor.id_usuario,
    usuario_creador_email: actor.email,
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
    responsable: responsable.id,
    responsable_email: responsable.email,
    responsable_nombre: responsable.nombre,
    fecha_asignacion: ahora,
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

export type DatosIncidenciaEdicion = DatosIncidenciaNueva;

export async function actualizarIncidencia(actor: Usuario, idIncidencia: string, datos: DatosIncidenciaEdicion): Promise<void> {
  const { objeto, numeroFila, encabezados: encabezadosActuales } = await buscarFilaIncidencia(idIncidencia);
  const inc = objeto as Incidencia;
  if (!incidenciaEnAmbito(actor, inc)) throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene acceso a esta incidencia.");

  const puedeEditarTodas = tienePermiso(actor, "INCIDENCIAS_EDITAR");
  const puedeEditarPropioAmbito = tienePermiso(actor, "INCIDENCIAS_EDITAR_PROPIO_AMBITO");
  if (!puedeEditarTodas && !puedeEditarPropioAmbito) {
    throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene permisos para editar incidencias.");
  }
  if (!puedeEditarTodas && !esCreador(actor, inc)) {
    throw new ErrorAplicacion("PERMISO_DENEGADO", "Solo puede editar las incidencias que usted creó.");
  }

  const limpio = validarIncidencia(datos);
  validarFechaPrevista(datos.fechaPrevistaActuacion);

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

  const ahora = new Date().toISOString();
  const responsable = datos.responsableEmail !== undefined ? await resolverResponsable(actor, datos.responsableEmail) : null;
  const cambiaResponsable = responsable && responsable.email !== inc.responsable_email;
  const encabezados = responsable ? await obtenerEncabezados(HOJAS.INCIDENCIAS, ["responsable", "responsable_email", "responsable_nombre", "fecha_asignacion"]) : encabezadosActuales;
  await actualizarCelda(HOJAS.INCIDENCIAS, numeroFila, encabezados, {
    ...(responsable ? { responsable: responsable.id, responsable_email: responsable.email, responsable_nombre: responsable.nombre,
      fecha_asignacion: cambiaResponsable ? ahora : inc.fecha_asignacion || ahora } : {}),
    titulo: limpio.titulo,
    descripcion: limpio.descripcion,
    tipo_ubicacion: datos.tipoUbicacion,
    bloque: datos.tipoUbicacion === TIPO_UBICACION.BLOQUE ? datos.bloque || "" : "",
    planta: datos.tipoUbicacion === TIPO_UBICACION.BLOQUE ? datos.planta || "" : "",
    zona_comun: datos.tipoUbicacion === TIPO_UBICACION.ZONA_COMUN ? datos.zonaComun || "" : "",
    ubicacion_detalle: sanearTextoEntrada(datos.ubicacionDetalle, LIMITES.TEXTO_CORTO_MAX),
    categoria: datos.categoria,
    prioridad: datos.prioridad,
    coste_estimado: datos.costeEstimado || "",
    proveedor: sanearTextoEntrada(datos.proveedor, 150),
    fecha_prevista_actuacion: datos.fechaPrevistaActuacion ?? inc.fecha_prevista_actuacion ?? "",
    confidencial: !!datos.confidencial,
    fecha_ultima_modificacion: ahora,
    usuario_ultima_modificacion: actor.id_usuario,
  });
  await registrarAuditoria("EDITAR_INCIDENCIA", "INCIDENCIA", idIncidencia, "Incidencia editada", "OK");
}

export async function cambiarEstadoIncidencia(actor: Usuario, idIncidencia: string, nuevoEstado: string): Promise<void> {
  const { objeto, numeroFila } = await buscarFilaIncidencia(idIncidencia);
  const inc = objeto as Incidencia;
  if (!incidenciaEnAmbito(actor, inc)) throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene acceso a esta incidencia.");
  if (!puedeCambiarEstado(actor, inc.usuario_creador, inc.usuario_creador_email)) {
    throw new ErrorAplicacion("PERMISO_DENEGADO", "No tiene permisos para cambiar el estado de esta incidencia.");
  }
  const permitidas = TRANSICIONES_ESTADO[inc.estado as Estado] || [];
  if (!permitidas.includes(nuevoEstado as Estado)) {
    throw new ErrorAplicacion("ESTADO_INVALIDO", "Esa transición de estado no está permitida.");
  }
  const ahora = new Date().toISOString();
  const encabezados = await obtenerEncabezados(HOJAS.INCIDENCIAS, ["fecha_estado_final", "archivada"]);
  await actualizarCelda(HOJAS.INCIDENCIAS, numeroFila, encabezados, {
    estado: nuevoEstado,
    fecha_resolucion: nuevoEstado === ESTADOS.RESUELTA ? ahora : nuevoEstado === ESTADOS.REABIERTA ? "" : inc.fecha_resolucion || "",
    fecha_estado_final: nuevoEstado === ESTADOS.RESUELTA || nuevoEstado === ESTADOS.CERRADA ? ahora : "",
    archivada: false,
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
