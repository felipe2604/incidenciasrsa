import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { tienePermiso } from "@/lib/permissions";
import { obtenerInformeResumen } from "@/lib/informes";
import { obtenerCatalogos } from "@/lib/catalogos";
import { ESTADOS, ETIQUETAS_ESTADO, PRIORIDADES } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";

type ParametrosBusqueda = { texto?: string; estado?: string; prioridad?: string; categoria?: string };

function formatearMoneda(valor: number): string {
  return valor.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

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

  const filtros = {
    texto: parametros.texto || undefined,
    estado: parametros.estado || undefined,
    prioridad: parametros.prioridad || undefined,
    categoria: parametros.categoria || undefined,
  };
  const resumen = await obtenerInformeResumen(actor, filtros);
  const catalogos = await obtenerCatalogos();
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
        <a
          href={`/api/informes/csv${queryCsv ? `?${queryCsv}` : ""}`}
          className="w-full rounded-md bg-marca-500 px-4 py-2 text-center font-semibold text-white hover:bg-marca-600 sm:w-auto"
        >
          Exportar CSV
        </a>
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
          {catalogos.CATEGORIAS.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.etiqueta}
            </option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-4 lg:col-span-5">
          <button type="submit" className="rounded-md bg-marca-500 px-4 py-2 text-sm font-medium text-white hover:bg-marca-600">
            Filtrar
          </button>
          <Link href="/incidencias/informes" className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Limpiar
          </Link>
        </div>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tarjetas.map((t) => (
          <div key={t.etiqueta} className="rounded-md border border-marca-200 bg-white p-3 text-center shadow-sm">
            <div className="text-xl font-bold text-marca-700">{t.valor}</div>
            <div className="text-xs text-gray-600">{t.etiqueta}</div>
          </div>
        ))}
      </div>

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

