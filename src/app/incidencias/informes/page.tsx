import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { tienePermiso } from "@/lib/permissions";
import { formatearMoneda, obtenerInformeResumen } from "@/lib/informes";
import { obtenerCatalogos } from "@/lib/catalogos";
import { ETIQUETAS_ESTADO, COLORES_ESTADO } from "@/lib/constants";
import { leerFiltrosIncidencias } from "@/lib/incidencias";
import FormularioFiltrosIncidencias from "@/components/FormularioFiltrosIncidencias";
import AccesoDenegado from "@/components/AccesoDenegado";

type ParametrosBusqueda = Record<string, string | undefined>;

export default async function InformesPage({ searchParams }: { searchParams: Promise<ParametrosBusqueda> }) {
  const parametros = await searchParams;
  let actor;
  try {
    actor = await obtenerUsuarioActual();
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }
  if (!tienePermiso(actor, "INFORMES_VER")) {
    return <AccesoDenegado mensaje="No tiene permisos para ver informes." />;
  }

  const filtros = leerFiltrosIncidencias(new URLSearchParams(Object.entries(parametros).filter(([, valor]) => !!valor) as [string, string][]));
  const catalogos = await obtenerCatalogos();
  let resumen;
  try { resumen = await obtenerInformeResumen(actor, filtros); }
  catch (error) {
    return <div><h2 className="mb-4 text-xl font-semibold">Informes</h2><FormularioFiltrosIncidencias parametros={parametros} catalogos={catalogos} informes /><p role="alert" className="text-red-700">{(error as Error).message}</p></div>;
  }
  const queryCsv = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v) as [string, string][]).toString();

  const tarjetas = [
    { etiqueta: "Total incidencias", valor: resumen.totalIncidencias },
    { etiqueta: "Abiertas", valor: resumen.abiertas },
    { etiqueta: "Vencidas", valor: resumen.vencidas },
    { etiqueta: "Tiempo medio resolución (días)", valor: resumen.tiempoMedioResolucionDias },
    { etiqueta: "Coste estimado total", valor: formatearMoneda(resumen.costeEstimadoTotal) },
    { etiqueta: "Coste real total", valor: formatearMoneda(resumen.costeRealTotal) },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Informes</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`/api/informes/pdf${queryCsv ? `?${queryCsv}` : ""}`}
            className="w-full rounded-md bg-marca-700 px-4 py-2 text-center font-semibold text-white hover:bg-marca-800 sm:w-auto"
          >
            Exportar PDF
          </a>
          <a
            href={`/api/informes/csv${queryCsv ? `?${queryCsv}` : ""}`}
            className="w-full rounded-md bg-marca-500 px-4 py-2 text-center font-semibold text-white hover:bg-marca-600 sm:w-auto"
          >
            Exportar CSV
          </a>
        </div>
      </div>

      <FormularioFiltrosIncidencias parametros={parametros} catalogos={catalogos} informes />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tarjetas.map((t) => (
          <div key={t.etiqueta} className="rounded-md border border-marca-200 bg-white p-3 text-center shadow-sm">
            <div className="text-xl font-bold text-marca-700">{t.valor}</div>
            <div className="text-xs text-gray-600">{t.etiqueta}</div>
          </div>
        ))}
      </div>

      <section className="mb-6 overflow-x-auto border-y border-marca-200 py-4">
        <h3 className="mb-3 font-semibold">Detalle de incidencias ({resumen.incidencias.length})</h3>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead><tr className="border-b text-xs text-gray-500"><th className="p-2">Incidencia</th><th className="p-2">Alta</th><th className="p-2">Ubicación</th><th className="p-2">Estado</th></tr></thead>
          <tbody>{resumen.incidencias.map((incidencia) => (
            <tr key={incidencia.idIncidencia} className="border-b border-gray-100">
              <td className="p-2"><Link className="font-medium hover:underline" href={`/incidencias/${incidencia.idIncidencia}`}>{incidencia.titulo}</Link><div className="text-xs text-gray-500">{incidencia.idIncidencia}</div></td>
              <td className="p-2">{incidencia.fechaCreacion.slice(0, 10)}</td>
              <td className="p-2">{incidencia.bloque || incidencia.zonaComun}</td>
              <td className="p-2"><span className={`inline-block rounded-full px-2 py-1 text-xs ${COLORES_ESTADO[incidencia.estado]}`}>{incidencia.archivada ? "Archivada · " : ""}{ETIQUETAS_ESTADO[incidencia.estado]}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {resumen.incidencias.length === 0 && <p className="py-3 text-sm text-gray-500">Sin incidencias para estos filtros.</p>}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-marca-200 p-3">
          <h3 className="mb-2 text-sm font-semibold text-marca-700">Por categoría</h3>
          {Object.keys(resumen.porCategoria).length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-marca-100 text-xs text-gray-500">
                    <th className="py-1">Categoría</th>
                    <th className="py-1 text-right">Incidencias</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resumen.porCategoria).map(([codigo, total]) => (
                    <tr key={codigo} className="border-b border-marca-50">
                      <td className="py-1">{catalogos.CATEGORIAS.find((c) => c.codigo === codigo)?.etiqueta || codigo}</td>
                      <td className="py-1 text-right">{total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-md border border-marca-200 p-3">
          <h3 className="mb-2 text-sm font-semibold text-marca-700">Por responsable</h3>
          {Object.keys(resumen.porResponsable).length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-marca-100 text-xs text-gray-500">
                    <th className="py-1">Responsable</th>
                    <th className="py-1 text-right">Total</th>
                    <th className="py-1 text-right">Abiertas</th>
                    <th className="py-1 text-right">Coste real</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resumen.porResponsable).map(([responsable, r]) => (
                    <tr key={responsable} className="border-b border-marca-50">
                      <td className="py-1">{responsable}</td>
                      <td className="py-1 text-right">{r.total}</td>
                      <td className="py-1 text-right">{r.abiertas}</td>
                      <td className="py-1 text-right">{formatearMoneda(r.costeReal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

