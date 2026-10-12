import { obtenerUsuarioActual } from "@/lib/sesion";
import { tienePermiso } from "@/lib/permissions";
import AccesoDenegado from "@/components/AccesoDenegado";

export default async function InformesPage() {
  let actor;
  try {
    actor = await obtenerUsuarioActual();
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }
  if (!tienePermiso(actor, "INFORMES_VER")) {
    return <AccesoDenegado mensaje="No tiene permisos para ver informes." />;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Informes</h2>
      <p className="text-gray-600">
        Esta sección está en construcción. Próximamente: exportación de informes y estadísticas avanzadas por periodo.
      </p>
    </div>
  );
}
