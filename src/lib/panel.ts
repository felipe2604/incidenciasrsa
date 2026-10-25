import { ESTADOS, ESTADOS_PENDIENTES, ESTADOS_SIN_TRABAJO_PENDIENTE, HOJAS, TIPO_UBICACION, type Estado } from "./constants";
import { leerFilasComoObjetos } from "./sheets";
import { esResponsable, incidenciaEnAmbito } from "./permissions";
import { estaArchivada, obtenerResolverNombres } from "./incidencias";
import type { Incidencia, Usuario } from "./types";

export interface IncidenciaReciente {
  idIncidencia: string;
  titulo: string;
  estado: Estado;
  fecha: string;
  creador: string;
}

export interface DatosPanel {
  totalAbiertas: number;
  urgentes: number;
  pendientes: number;
  vencidas: number;
  asignadasAMi: number;
  finalizadas: number;
  porEstado: Record<string, number>;
  porZona: Record<string, number>;
  porBloque: Record<string, number>;
  recientes: IncidenciaReciente[];
}

// Equivalente a obtenerPanelCliente del backend Apps Script: agrega los
// indicadores del panel principal a partir de las incidencias en el ámbito
// del usuario (misma regla de visibilidad que el listado).
export async function obtenerDatosPanel(actor: Usuario): Promise<DatosPanel> {
  const [datos, nombre] = await Promise.all([leerFilasComoObjetos(HOJAS.INCIDENCIAS), obtenerResolverNombres()]);
  const incidencias = datos.filas
    .map((f) => f.objeto as Incidencia)
    .filter((inc) => incidenciaEnAmbito(actor, inc))
    .filter((inc) => !estaArchivada(inc));

  const hoy = new Date().toISOString().slice(0, 10);
  const estaAbierta = (inc: Incidencia) => !ESTADOS_SIN_TRABAJO_PENDIENTE.includes(inc.estado);
  const abiertas = incidencias.filter(estaAbierta);

  const porEstado: Record<string, number> = {};
  const porZona: Record<string, number> = {};
  const porBloque: Record<string, number> = {};

  for (const inc of abiertas) {
    porEstado[inc.estado] = (porEstado[inc.estado] || 0) + 1;
    if (inc.tipo_ubicacion === TIPO_UBICACION.ZONA_COMUN && inc.zona_comun) {
      porZona[inc.zona_comun] = (porZona[inc.zona_comun] || 0) + 1;
    }
    if (inc.tipo_ubicacion === TIPO_UBICACION.BLOQUE && inc.bloque) {
      porBloque[inc.bloque] = (porBloque[inc.bloque] || 0) + 1;
    }
  }

  const recientes: IncidenciaReciente[] = incidencias
    .slice()
    .sort((a, b) => String(b.fecha_ultima_modificacion).localeCompare(String(a.fecha_ultima_modificacion)))
    .slice(0, 8)
    .map((inc) => ({
      idIncidencia: inc.id_incidencia,
      titulo: inc.titulo,
      estado: inc.estado,
      fecha: inc.fecha_ultima_modificacion,
      creador: nombre(inc.usuario_creador, inc.usuario_creador_email),
    }));

  return {
    totalAbiertas: abiertas.length,
    urgentes: abiertas.filter((inc) => inc.prioridad === "URGENTE").length,
    pendientes: abiertas.filter((inc) => ESTADOS_PENDIENTES.includes(inc.estado)).length,
    vencidas: abiertas.filter((inc) => inc.fecha_prevista_actuacion && inc.fecha_prevista_actuacion.slice(0, 10) < hoy).length,
    asignadasAMi: abiertas.filter((inc) => esResponsable(actor, inc)).length,
    finalizadas: incidencias.filter((inc) => inc.estado === ESTADOS.RESUELTA || inc.estado === ESTADOS.CERRADA).length,
    porEstado,
    porZona,
    porBloque,
    recientes,
  };
}
