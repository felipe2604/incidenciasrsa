import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { leerFiltrosIncidencias, listarIncidencias } from "@/lib/incidencias";
import { obtenerCatalogos } from "@/lib/catalogos";
import { ETIQUETAS_ESTADO, ETIQUETAS_FILTRO_RAPIDO, COLORES_ESTADO } from "@/lib/constants";
import FormularioFiltrosIncidencias from "@/components/FormularioFiltrosIncidencias";
import AccesoDenegado from "@/components/AccesoDenegado";
import ModalNuevaIncidencia from "@/components/ModalNuevaIncidencia";
import UbicacionCategoriaIncidencia from "@/components/UbicacionCategoriaIncidencia";

const COLOR_PRIORIDAD: Record<string, string> = {
  BAJA: "border-l-gray-300",
  MEDIA: "border-l-marca-200",
  ALTA: "border-l-marca-400",
  URGENTE: "border-l-marca-700",
};

type ParametrosBusqueda = Record<string, string | undefined>;

export default async function ListadoIncidenciasPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusqueda>;
}) {
  const parametros = await searchParams;
  let incidencias;
  try {
    const actor = await obtenerUsuarioActual();
    incidencias = await listarIncidencias(actor, leerFiltrosIncidencias(new URLSearchParams(
      Object.entries(parametros).filter(([, valor]) => !!valor) as [string, string][]
    )));
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }
  const catalogos = await obtenerCatalogos();

  const parametrosSinFiltroRapido = new URLSearchParams();
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (clave !== "filtroRapido" && valor) parametrosSinFiltroRapido.set(clave, valor);
  });
  const cadena = parametrosSinFiltroRapido.toString();
  const hrefSinFiltroRapido = `/incidencias${cadena ? `?${cadena}` : ""}`;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Incidencias</h2>
        <ModalNuevaIncidencia catalogos={catalogos} />
      </div>

      {parametros.filtroRapido && (
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-marca-500 px-3 py-1 text-sm text-white">
            Filtro: {ETIQUETAS_FILTRO_RAPIDO[parametros.filtroRapido] || parametros.filtroRapido}
          </span>
          <Link href={hrefSinFiltroRapido} className="text-sm text-marca-600 underline">
            Quitar
          </Link>
        </div>
      )}

      <FormularioFiltrosIncidencias parametros={parametros} catalogos={catalogos} />

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
              <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0 break-words font-medium">{i.titulo}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs whitespace-nowrap ${COLORES_ESTADO[i.estado] || "bg-marca-200"}`}
                >
                  {ETIQUETAS_ESTADO[i.estado] || i.estado}
                </span>
              </div>
              <UbicacionCategoriaIncidencia incidencia={i} catalogos={catalogos} />
              <p className="text-xs text-gray-500">
                {i.idIncidencia} · Prioridad {i.prioridad}
              </p>
              {i.responsableNombre && <p className="mt-1 break-words text-xs text-gray-600">Responsable: {i.responsableNombre}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
