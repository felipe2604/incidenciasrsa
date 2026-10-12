import { obtenerUsuarioActual } from "@/lib/sesion";
import { ROLES } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";

export default async function AdministracionPage() {
  let actor;
  try {
    actor = await obtenerUsuarioActual();
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }
  if (actor.rol !== ROLES.ADMIN) {
    return <AccesoDenegado mensaje="No tiene permisos para acceder a Administración." />;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Administración</h2>
      <p className="text-gray-600">
        Esta sección está en construcción. Próximamente: gestión de usuarios y catálogos desde la propia aplicación.
      </p>
    </div>
  );
}
