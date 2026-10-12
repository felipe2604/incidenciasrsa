import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarUsuarios } from "@/lib/usuarios";
import { ROLES } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import GestionUsuarios from "@/components/GestionUsuarios";

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

  const usuarios = await listarUsuarios(actor);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Administración de usuarios</h2>
      <GestionUsuarios usuarios={usuarios} />
    </div>
  );
}

