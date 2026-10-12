import { obtenerUsuarioActual } from "@/lib/sesion";
import { tienePermiso } from "@/lib/permissions";
import { obtenerCatalogos } from "@/lib/catalogos";
import AccesoDenegado from "@/components/AccesoDenegado";
import FormularioIncidencia from "@/components/FormularioIncidencia";

export default async function NuevaIncidenciaPage() {
  try {
    const actor = await obtenerUsuarioActual();
    if (!tienePermiso(actor, "INCIDENCIAS_CREAR")) {
      return <AccesoDenegado mensaje="No tiene permisos para crear incidencias." />;
    }
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }
  const catalogos = await obtenerCatalogos();
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Nueva incidencia</h2>
      <FormularioIncidencia catalogos={catalogos} />
    </div>
  );
}
