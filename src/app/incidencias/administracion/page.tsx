import { obtenerUsuarioActual } from "@/lib/sesion";
import { listarUsuarios } from "@/lib/usuarios";
import { obtenerCatalogosCompletos } from "@/lib/catalogos";
import { ROLES } from "@/lib/constants";
import AccesoDenegado from "@/components/AccesoDenegado";
import GestionUsuarios from "@/components/GestionUsuarios";
import GestionCatalogos from "@/components/GestionCatalogos";
import { tienePermiso } from "@/lib/permissions";
import { obtenerEstadisticasUsuarios } from "@/lib/estadisticasUsuarios";
import EstadisticasUsuarios from "@/components/EstadisticasUsuarios";

export default async function AdministracionPage() {
  let actor;
  try {
    actor = await obtenerUsuarioActual();
  } catch (e) {
    return <AccesoDenegado mensaje={(e as Error).message} />;
  }
  if (!tienePermiso(actor, "USUARIOS_ESTADISTICAS_VER")) {
    return <AccesoDenegado mensaje="No tiene permisos para acceder a Administración." />;
  }

  const [estadisticas, gestion] = await Promise.all([
    obtenerEstadisticasUsuarios(actor),
    actor.rol === ROLES.ADMIN ? Promise.all([listarUsuarios(actor), obtenerCatalogosCompletos()]) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <EstadisticasUsuarios {...estadisticas} />
      {gestion && <><div>
        <h2 className="mb-4 text-xl font-semibold">Administración de usuarios</h2>
        <GestionUsuarios usuarios={gestion[0]} />
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Catálogos</h2>
        <GestionCatalogos catalogos={gestion[1]} />
      </div></>}
    </div>
  );
}

