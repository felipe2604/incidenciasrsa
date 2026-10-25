import { obtenerUsuarioActual } from "@/lib/sesion";
import { tienePermiso } from "@/lib/permissions";
import { listarCorreos } from "@/lib/mails";
import { obtenerCatalogos } from "@/lib/catalogos";
import AccesoDenegado from "@/components/AccesoDenegado";
import BandejaCorreos from "@/components/BandejaCorreos";

export default async function CorreosPage() {
  let actor;
  try { actor = await obtenerUsuarioActual(); }
  catch (e) { return <AccesoDenegado mensaje={(e as Error).message} />; }
  if (!tienePermiso(actor, "MAILS_GESTIONAR")) return <AccesoDenegado mensaje="No tiene permisos para ver los correos." />;
  let correos;
  try { correos = await listarCorreos(actor); }
  catch { return <p role="alert" className="text-red-700">No se pudo leer la pestaña Mails de la hoja de cálculo.</p>; }
  const catalogos = await obtenerCatalogos();
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Correos recibidos ({correos.length})</h2>
      <BandejaCorreos correos={correos} catalogos={catalogos} />
    </div>
  );
}
