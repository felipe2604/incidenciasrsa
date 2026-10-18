import { obtenerUsuarioActual } from "@/lib/sesion";
import CambiarPassword from "@/components/CambiarPassword";

export default async function PerfilPage() {
  const usuario = await obtenerUsuarioActual();
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Mi perfil</h2>
      <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt>Nombre</dt><dd className="break-words font-medium">{usuario.nombre}</dd>
        <dt>Correo</dt><dd className="break-all">{usuario.email}</dd>
        <dt>Perfil</dt><dd>{usuario.rol.replaceAll("_", " ")}</dd>
        <dt>Bloques</dt><dd>{usuario.ambito_bloques || "—"}</dd>
        <dt>Zonas</dt><dd>{usuario.ambito_zonas || "—"}</dd>
      </dl>
      {usuario.acceso_password ? (
        <section className="space-y-4 border-t pt-5"><h3 className="font-semibold">Contraseña</h3><CambiarPassword /></section>
      ) : <p className="text-sm text-gray-600">Acceso mediante Google.</p>}
    </div>
  );
}