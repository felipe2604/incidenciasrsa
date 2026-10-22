import { HOJAS, ESTADOS_SIN_TRABAJO_PENDIENTE } from "./constants";
import { ErrorAplicacion, esResponsable } from "./permissions";
import { estaArchivada } from "./incidencias";
import { agregarFila, leerFilasComoObjetos, obtenerEncabezados } from "./sheets";
import type { Incidencia, Usuario } from "./types";

export interface NotificacionIncidencia {
  id: string;
  idIncidencia: string;
  tipo: "ASIGNACION" | "PROXIMA" | "VENCIDA";
  titulo: string;
  detalle: string;
  fecha: string;
  href: string;
  leida: boolean;
}

export function construirNotificaciones(actor: Usuario, incidencias: Incidencia[], leidas: Set<string>, ahora = new Date()): NotificacionIncidencia[] {
  const notificaciones: NotificacionIncidencia[] = [];
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
  for (const incidencia of incidencias) {
    if (!esResponsable(actor, incidencia) || estaArchivada(incidencia, ahora.getTime()) || ESTADOS_SIN_TRABAJO_PENDIENTE.includes(incidencia.estado)) continue;
    const fechaAsignacion = incidencia.fecha_asignacion || incidencia.fecha_creacion || "";
    function agregar(tipo: NotificacionIncidencia["tipo"], detalle: string, fecha: string) {
      const id = `${tipo}:${incidencia.id_incidencia}:${actor.email.toLowerCase()}:${fecha}`;
      notificaciones.push({ id, idIncidencia: incidencia.id_incidencia, tipo, titulo: incidencia.titulo, detalle, fecha,
        href: `/incidencias/${encodeURIComponent(incidencia.id_incidencia)}`, leida: leidas.has(id) });
    }
    agregar("ASIGNACION", "Tienes esta incidencia asignada.", fechaAsignacion);
    const prevista = String(incidencia.fecha_prevista_actuacion || "").slice(0, 10);
    const instantePrevisto = Date.parse(`${prevista}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prevista) || !Number.isFinite(instantePrevisto) || new Date(instantePrevisto).toISOString().slice(0, 10) !== prevista) continue;
    const dias = (instantePrevisto - Date.parse(`${hoy}T00:00:00Z`)) / 86400000;
    if (Number.isFinite(dias) && dias <= 2) {
      agregar(dias < 0 ? "VENCIDA" : "PROXIMA", dias < 0 ? `Plazo vencido desde el ${prevista}.` :
        dias === 0 ? "El plazo de resolución vence hoy." : `El plazo de resolución vence en ${dias} día${dias === 1 ? "" : "s"}.`, prevista);
    }
  }
  const orden = { VENCIDA: 0, PROXIMA: 1, ASIGNACION: 2 };
  return notificaciones.sort((primera, segunda) => Number(primera.leida) - Number(segunda.leida) ||
    orden[primera.tipo] - orden[segunda.tipo] || segunda.fecha.localeCompare(primera.fecha));
}

export async function obtenerNotificaciones(actor: Usuario): Promise<NotificacionIncidencia[]> {
  const [incidencias, registros] = await Promise.all([leerFilasComoObjetos(HOJAS.INCIDENCIAS), leerFilasComoObjetos(HOJAS.NOTIFICACIONES)]);
  const leidas = new Set(registros.filas.filter(({ objeto }) => String(objeto.usuario_email || "").toLowerCase().trim() === actor.email.toLowerCase().trim() && objeto.leida_en)
    .map(({ objeto }) => String(objeto.id_notificacion)));
  return construirNotificaciones(actor, incidencias.filas.map(({ objeto }) => objeto as Incidencia), leidas);
}

export async function marcarNotificacionesLeidas(actor: Usuario, ids: string[]): Promise<string[]> {
  const notificaciones = await obtenerNotificaciones(actor);
  const solicitadas = [...new Set(ids)];
  if (solicitadas.some((id) => !notificaciones.some((notificacion) => notificacion.id === id))) {
    throw new ErrorAplicacion("PERMISO_DENEGADO", "No puede modificar estas notificaciones.");
  }
  const pendientes = notificaciones.filter((notificacion) => solicitadas.includes(notificacion.id) && !notificacion.leida);
  if (pendientes.length > 0) {
    const encabezados = await obtenerEncabezados(HOJAS.NOTIFICACIONES, ["id_notificacion", "usuario_email", "id_incidencia", "leida_en"]);
    const ahora = new Date().toISOString();
    await Promise.all(pendientes.map((notificacion) => agregarFila(HOJAS.NOTIFICACIONES, encabezados, {
      id_notificacion: notificacion.id, usuario_email: actor.email, id_incidencia: notificacion.idIncidencia, leida_en: ahora,
    })));
  }
  return solicitadas;
}