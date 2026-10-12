import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarUsuarios } from "@/lib/usuarios";
import { obtenerCatalogosCompletos } from "@/lib/catalogos";
import { ROLES } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import GestionUsuarios from "@/components/GestionUsuarios";
import GestionCatalogos from "@/components/GestionCatalogos";

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

  const [usuarios, catalogos] = await Promise.all([listarUsuarios(actor), obtenerCatalogosCompletos()]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Administración de usuarios</h2>
        <GestionUsuarios usuarios={usuarios} />
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Catálogos</h2>
        <GestionCatalogos catalogos={catalogos} />
      </div>
    </div>
  );
}

