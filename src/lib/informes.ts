import { ESTADOS_SIN_TRABAJO_PENDIENTE } from "./constants";
import { listarIncidencias, type FiltrosIncidencias } from "./incidencias";
import type { IncidenciaProyectada, Usuario } from "./types";

export interface ResumenPorResponsable {
  total: number;
  abiertas: number;
  costeReal: number;
}

export interface ResumenInformes {
  totalIncidencias: number;
  abiertas: number;
  vencidas: number;
  tiempoMedioResolucionDias: number;
  costeEstimadoTotal: number;
  costeRealTotal: number;
  porCategoria: Record<string, number>;
  porResponsable: Record<string, ResumenPorResponsable>;
  incidencias: IncidenciaProyectada[];
}

// Equivalente a obtenerInformeResumenCliente de Informes.gs: reutiliza el
// mismo filtrado de ámbito/filtros que el listado para heredar exactamente
// la misma visibilidad por rol.
export async function obtenerInformeResumen(actor: Usuario, filtros: FiltrosIncidencias = {}): Promise<ResumenInformes> {
  const lista = await listarIncidencias(actor, { ...filtros, incluirArchivadas: true });

  const abiertas = lista.filter((i) => !ESTADOS_SIN_TRABAJO_PENDIENTE.includes(i.estado));
  const hoy = new Date().toISOString().slice(0, 10);
  const vencidas = abiertas.filter((i) => i.fechaPrevistaActuacion && i.fechaPrevistaActuacion.slice(0, 10) < hoy);

  const resueltas = lista.filter((i) => i.fechaResolucion);
  const sumaDias = resueltas.reduce(
    (acc, i) => acc + (new Date(i.fechaResolucion).getTime() - new Date(i.fechaCreacion).getTime()) / 86400000,
    0
  );
  const tiempoMedioResolucionDias = resueltas.length ? Math.round((sumaDias / resueltas.length) * 10) / 10 : 0;

  const porCategoria: Record<string, number> = {};
  const porResponsable: Record<string, ResumenPorResponsable> = {};
  let costeEstimadoTotal = 0;
  let costeRealTotal = 0;

  for (const i of lista) {
    porCategoria[i.categoria] = (porCategoria[i.categoria] || 0) + 1;
    if (i.responsable) {
      if (!porResponsable[i.responsable]) porResponsable[i.responsable] = { total: 0, abiertas: 0, costeReal: 0 };
      porResponsable[i.responsable].total += 1;
      if (!ESTADOS_SIN_TRABAJO_PENDIENTE.includes(i.estado)) porResponsable[i.responsable].abiertas += 1;
      porResponsable[i.responsable].costeReal += Number(i.costeReal) || 0;
    }
    costeEstimadoTotal += Number(i.costeEstimado) || 0;
    costeRealTotal += Number(i.costeReal) || 0;
  }

  return {
    totalIncidencias: lista.length,
    abiertas: abiertas.length,
    vencidas: vencidas.length,
    tiempoMedioResolucionDias,
    costeEstimadoTotal,
    costeRealTotal,
    porCategoria,
    porResponsable,
    incidencias: lista,
  };
}

// Neutraliza valores que Excel/Sheets interpretarían como fórmula al abrir el
// CSV (protección frente a CSV injection) — equivalente a sanearParaCsv_.
function sanearParaCsv(valor: unknown): string {
  const texto = String(valor ?? "");
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

export function formatearMoneda(valor: number): string {
  return valor.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function generarCsvIncidencias(lista: IncidenciaProyectada[]): string {
  const encabezados = [
    "ID",
    "Fecha creacion",
    "Titulo",
    "Bloque",
    "Zona",
    "Categoria",
    "Prioridad",
    "Estado",
    "Responsable",
    "Coste estimado",
    "Coste real",
  ];
  const lineas = [encabezados.join(";")];
  for (const i of lista) {
    lineas.push(
      [
        i.idIncidencia,
        i.fechaCreacion,
        i.titulo,
        i.bloque,
        i.zonaComun,
        i.categoria,
        i.prioridad,
        i.estado,
        i.responsable,
        i.costeEstimado,
        i.costeReal,
      ]
        .map(sanearParaCsv)
        .join(";")
    );
  }
  return lineas.join("\n");
}
