import { Building2, MapPin, Tag } from "lucide-react";
import type { IncidenciaProyectada } from "@/lib/types";
import type { OpcionCatalogo } from "@/lib/constants";

export default function UbicacionCategoriaIncidencia({ incidencia, catalogos }: {
  incidencia: Pick<IncidenciaProyectada, "tipoUbicacion" | "bloque" | "planta" | "zonaComun" | "categoria" | "ubicacionDetalle">;
  catalogos: { BLOQUES: OpcionCatalogo[]; PLANTAS: OpcionCatalogo[]; ZONAS: OpcionCatalogo[]; CATEGORIAS: OpcionCatalogo[] };
}) {
  const esBloque = incidencia.tipoUbicacion === "BLOQUE";
  const ubicacion = esBloque ? catalogos.BLOQUES.find((opcion) => opcion.codigo === incidencia.bloque)?.etiqueta || incidencia.bloque :
    catalogos.ZONAS.find((opcion) => opcion.codigo === incidencia.zonaComun)?.etiqueta || incidencia.zonaComun;
  const categoria = catalogos.CATEGORIAS.find((opcion) => opcion.codigo === incidencia.categoria)?.etiqueta || incidencia.categoria;
  const planta = catalogos.PLANTAS.find((opcion) => opcion.codigo === incidencia.planta)?.etiqueta || incidencia.planta;
  const IconoUbicacion = esBloque ? Building2 : MapPin;
  return (
    <dl className="my-3 grid grid-cols-1 gap-3 border-y border-gray-100 py-3 min-[360px]:grid-cols-2">
      <div className="flex min-w-0 items-start gap-2">
        <IconoUbicacion size={18} className="mt-0.5 shrink-0 text-marca-700" aria-hidden="true" />
        <div className="min-w-0">
          <dt className="text-xs text-gray-500">{esBloque ? "Bloque" : "Zona común"}</dt>
          <dd className="break-words text-sm font-semibold text-gray-800">{ubicacion || "Sin especificar"}</dd>
          {esBloque && planta && <dd className="break-words text-xs text-gray-600">{planta}</dd>}
          {incidencia.ubicacionDetalle && <dd className="break-words text-xs text-gray-600">{incidencia.ubicacionDetalle}</dd>}
        </div>
      </div>
      <div className="flex min-w-0 items-start gap-2">
        <Tag size={18} className="mt-0.5 shrink-0 text-marca-700" aria-hidden="true" />
        <div className="min-w-0"><dt className="text-xs text-gray-500">Categoría</dt><dd className="break-words text-sm font-semibold text-gray-800">{categoria || "Sin especificar"}</dd></div>
      </div>
    </dl>
  );
}