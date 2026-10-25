import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { obtenerDatosPanel } from "@/lib/panel";
import { obtenerCatalogos } from "@/lib/catalogos";
import { COLORES_ESTADO, ETIQUETAS_ESTADO, ETIQUETAS_FILTRO_RAPIDO, type OpcionCatalogo } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import PanelGraficos from "@/components/PanelGraficos";

function mapaEtiquetas(lista: OpcionCatalogo[]): Record<string, string> {
  return Object.fromEntries(lista.map((o) => [o.codigo, o.etiqueta]));
}

const TARJETAS = [
  { clave: "totalAbiertas", filtro: "ABIERTAS" },
  { clave: "urgentes", filtro: "URGENTES" },
  { clave: "pendientes", filtro: "PENDIENTES" },
  { clave: "vencidas", filtro: "VENCIDAS" },
  { clave: "asignadasAMi", filtro: "ASIGNADAS_A_MI" },
  { clave: "finalizadas", filtro: "FINALIZADAS" },
] as const;

export default async function PanelPage() {
  let datos;
  try {
    const actor = await obtenerUsuarioActual();
    datos = await obtenerDatosPanel(actor);
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }
  const catalogos = await obtenerCatalogos();

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Panel principal</h2>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TARJETAS.map((t) => (
          <Link
            key={t.clave}
            href={`/incidencias?filtroRapido=${t.filtro}`}
            className="rounded-md border border-marca-200 bg-white p-3 text-center shadow-sm transition hover:border-marca-400 hover:shadow-md"
          >
            <div className="text-2xl font-bold text-marca-700">{datos[t.clave]}</div>
            <div className="text-xs text-gray-600">{ETIQUETAS_FILTRO_RAPIDO[t.filtro]}</div>
          </Link>
        ))}
      </div>

      <PanelGraficos
        porEstado={datos.porEstado}
        porZona={datos.porZona}
        porBloque={datos.porBloque}
        etiquetasEstado={ETIQUETAS_ESTADO}
        etiquetasZona={mapaEtiquetas(catalogos.ZONAS)}
        etiquetasBloque={mapaEtiquetas(catalogos.BLOQUES)}
      />

      <div className="mt-6">
        <h3 className="mb-2 text-lg font-semibold">Actividad reciente</h3>
        {datos.recientes.length === 0 ? (
          <p className="text-gray-500">Sin actividad reciente.</p>
        ) : (
          <ul className="divide-y divide-marca-100">
            {datos.recientes.map((r) => (
              <li key={r.idIncidencia} className="py-1">
                <Link href={`/incidencias/${r.idIncidencia}`} className="block rounded-md p-2 hover:bg-marca-100/30">
                  <div className="flex items-center justify-between">
                    <span className="min-w-0"><span className="block break-words font-medium">{r.titulo}</span><span className="block text-xs text-gray-500">Creada por {r.creador}</span></span>
                    <span className={`rounded-full px-2 py-1 text-xs ${COLORES_ESTADO[r.estado] || "bg-marca-200"}`}>
                      {ETIQUETAS_ESTADO[r.estado] || r.estado}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
