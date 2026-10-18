import Link from "next/link";
import { ESTADOS, ETIQUETAS_ESTADO, PRIORIDADES, type OpcionCatalogo } from "@/lib/constants";

export default function FormularioFiltrosIncidencias({ parametros, catalogos, informes = false }: {
  parametros: Record<string, string | undefined>;
  catalogos: { CATEGORIAS: OpcionCatalogo[]; BLOQUES: OpcionCatalogo[]; ZONAS: OpcionCatalogo[] };
  informes?: boolean;
}) {
  return (
    <form className="mb-5 grid grid-cols-1 gap-3 border-y border-marca-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      {!informes && <input type="hidden" name="filtroRapido" value={parametros.filtroRapido || ""} />}
      <label className="text-xs font-medium">Buscar
        <input name="texto" defaultValue={parametros.texto || ""} className="mt-1 w-full rounded-md border p-2 text-sm" />
      </label>
      <label className="text-xs font-medium">Estado
        <select name="estado" defaultValue={parametros.estado || ""} className="mt-1 w-full rounded-md border p-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.values(ESTADOS).map((estado) => <option key={estado} value={estado}>{ETIQUETAS_ESTADO[estado]}</option>)}
          {informes && <option value="ARCHIVADAS">Solo archivadas</option>}
        </select>
      </label>
      <label className="text-xs font-medium">Prioridad
        <select name="prioridad" defaultValue={parametros.prioridad || ""} className="mt-1 w-full rounded-md border p-2 text-sm">
          <option value="">Todas</option>
          {PRIORIDADES.map((prioridad) => <option key={prioridad}>{prioridad}</option>)}
        </select>
      </label>
      {([
        { name: "categoria", label: "Categoría", opciones: catalogos.CATEGORIAS },
        { name: "bloque", label: "Bloque", opciones: catalogos.BLOQUES },
        { name: "zona", label: "Zona común", opciones: catalogos.ZONAS },
      ]).map((campo) => (
        <label key={campo.name} className="text-xs font-medium">{campo.label}
          <select name={campo.name} defaultValue={parametros[campo.name] || ""} className="mt-1 w-full rounded-md border p-2 text-sm">
            <option value="">Todos</option>
            {campo.opciones.map((opcion) => <option key={opcion.codigo} value={opcion.codigo}>{opcion.etiqueta}</option>)}
          </select>
        </label>
      ))}
      <label className="text-xs font-medium">Desde
        <input name="fechaDesde" type="date" defaultValue={parametros.fechaDesde || ""} className="mt-1 w-full rounded-md border p-2 text-sm" />
      </label>
      <label className="text-xs font-medium">Hasta
        <input name="fechaHasta" type="date" defaultValue={parametros.fechaHasta || ""} className="mt-1 w-full rounded-md border p-2 text-sm" />
      </label>
      <label className="text-xs font-medium">Fecha de referencia
        <select name="campoFecha" defaultValue={parametros.campoFecha || "creacion"} className="mt-1 w-full rounded-md border p-2 text-sm">
          <option value="creacion">Alta</option><option value="actividad">Actividad</option><option value="resolucion">Resolución</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button className="rounded-md bg-marca-600 px-4 py-2 text-sm font-medium text-white hover:bg-marca-700">Filtrar</button>
        <Link href={informes ? "/incidencias/informes" : "/incidencias"} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Limpiar</Link>
      </div>
    </form>
  );
}