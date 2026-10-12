import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { obtenerDatosPanel } from "@/lib/panel";
import { CATALOGOS, ETIQUETAS_ESTADO, type OpcionCatalogo } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import PanelGraficos from "@/components/PanelGraficos";

function mapaEtiquetas(lista: OpcionCatalogo[]): Record<string, string> {
  return Object.fromEntries(lista.map((o) => [o.codigo, o.etiqueta]));
}

const TARJETAS = [
  { clave: "totalAbiertas", etiqueta: "Incidencias abiertas" },
  { clave: "urgentes", etiqueta: "Urgentes" },
  { clave: "pendientes", etiqueta: "Pendientes" },
  { clave: "vencidas", etiqueta: "Vencidas" },
  { clave: "asignadasAMi", etiqueta: "Asignadas a mí" },
  { clave: "finalizadas", etiqueta: "Finalizadas" },
] as const;

export default async function PanelPage() {
  let datos;
  try {
    const actor = await obtenerUsuarioActual();
    datos = await obtenerDatosPanel(actor);
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Panel principal</h2>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TARJETAS.map((t) => (
          <div key={t.clave} className="rounded-md border border-marca-200 bg-white p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-marca-700">{datos[t.clave]}</div>
            <div className="text-xs text-gray-600">{t.etiqueta}</div>
          </div>
        ))}
      </div>

      <PanelGraficos
        porEstado={datos.porEstado}
        porZona={datos.porZona}
        porBloque={datos.porBloque}
        etiquetasEstado={ETIQUETAS_ESTADO}
        etiquetasZona={mapaEtiquetas(CATALOGOS.ZONAS)}
        etiquetasBloque={mapaEtiquetas(CATALOGOS.BLOQUES)}
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
                    <span className="font-medium">{r.titulo}</span>
                    <span className="rounded-full bg-marca-200 px-2 py-1 text-xs">{ETIQUETAS_ESTADO[r.estado] || r.estado}</span>
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
