import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarIncidencias } from "@/lib/incidencias";
import AccesoDenegado from "@/components/AccesoDenegado";

export default async function ListadoIncidenciasPage() {
  let incidencias;
  try {
    const actor = await obtenerUsuarioActual();
    incidencias = await listarIncidencias(actor);
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Incidencias</h2>
        <Link href="/incidencias/nueva" className="rounded-md bg-marca-500 px-4 py-2 text-white hover:bg-marca-600">
          + Nueva incidencia
        </Link>
      </div>
      {incidencias.length === 0 ? (
        <p className="text-gray-500">No hay incidencias para mostrar.</p>
      ) : (
        <ul className="divide-y divide-marca-100">
          {incidencias.map((i) => (
            <li key={i.idIncidencia} className="py-1">
              <Link href={`/incidencias/${i.idIncidencia}`} className="block rounded-md p-2 hover:bg-marca-100/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{i.titulo}</span>
                  <span className="rounded-full bg-marca-200 px-2 py-1 text-xs">{i.estado}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {i.categoria} · {i.prioridad}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
