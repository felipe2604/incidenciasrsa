import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarIncidencias } from "@/lib/incidencias";
import { CATALOGOS, ESTADOS, ETIQUETAS_ESTADO, PRIORIDADES } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import ModalNuevaIncidencia from "@/components/ModalNuevaIncidencia";

const COLOR_PRIORIDAD: Record<string, string> = {
  BAJA: "border-l-gray-300",
  MEDIA: "border-l-marca-200",
  ALTA: "border-l-marca-400",
  URGENTE: "border-l-marca-700",
};

type ParametrosBusqueda = { texto?: string; estado?: string; prioridad?: string; categoria?: string };

export default async function ListadoIncidenciasPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusqueda>;
}) {
  const parametros = await searchParams;
  let incidencias;
  try {
    const actor = await obtenerUsuarioActual();
    incidencias = await listarIncidencias(actor, {
      texto: parametros.texto || undefined,
      estado: parametros.estado || undefined,
      prioridad: parametros.prioridad || undefined,
      categoria: parametros.categoria || undefined,
    });
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }

  const hayFiltros = Boolean(parametros.texto || parametros.estado || parametros.prioridad || parametros.categoria);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Incidencias</h2>
        <ModalNuevaIncidencia />
      </div>

      <form className="mb-5 grid grid-cols-2 gap-2 rounded-md border border-marca-200 bg-white p-3 sm:grid-cols-4 lg:grid-cols-5">
        <input
          type="text"
          name="texto"
          placeholder="Buscar..."
          defaultValue={parametros.texto || ""}
          className="col-span-2 rounded-md border p-2 text-sm lg:col-span-2"
        />
        <select name="estado" defaultValue={parametros.estado || ""} className="rounded-md border p-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.values(ESTADOS).map((e) => (
            <option key={e} value={e}>
              {ETIQUETAS_ESTADO[e]}
            </option>
          ))}
        </select>
        <select name="prioridad" defaultValue={parametros.prioridad || ""} className="rounded-md border p-2 text-sm">
          <option value="">Toda prioridad</option>
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select name="categoria" defaultValue={parametros.categoria || ""} className="rounded-md border p-2 text-sm">
          <option value="">Toda categoría</option>
          {CATALOGOS.CATEGORIAS.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.etiqueta}
            </option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-4 lg:col-span-5">
          <button type="submit" className="rounded-md bg-marca-500 px-4 py-2 text-sm font-medium text-white hover:bg-marca-600">
            Filtrar
          </button>
          {hayFiltros && (
            <Link href="/incidencias" className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {incidencias.length === 0 ? (
        <p className="text-gray-500">No hay incidencias para mostrar.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {incidencias.map((i) => (
            <Link
              key={i.idIncidencia}
              href={`/incidencias/${i.idIncidencia}`}
              className={`block rounded-md border-l-4 bg-white p-3 shadow-sm transition hover:shadow-md ${
                COLOR_PRIORIDAD[i.prioridad] || "border-l-gray-300"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="font-medium">{i.titulo}</span>
                <span className="shrink-0 rounded-full bg-marca-200 px-2 py-1 text-xs whitespace-nowrap">
                  {ETIQUETAS_ESTADO[i.estado] || i.estado}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {i.idIncidencia} · {i.categoria} · {i.prioridad}
              </p>
              {i.responsable && <p className="mt-1 text-xs text-gray-500">Responsable: {i.responsable}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
