import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/sesion";
import CambiarPassword from "@/components/CambiarPassword";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";

export default async function CambiarContrasenaPage() {
  let usuario;
  try { usuario = await obtenerUsuarioActual({ permitirCambioPassword: true }); }
  catch { redirect("/login"); }
  if (!usuario.cambio_password_obligatorio) redirect("/incidencias/perfil");
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Cambia tu contraseña para continuar</h1>
      <p className="text-sm text-gray-600">{usuario.nombre} · {usuario.email}</p>
      <CambiarPassword />
      <CerrarSesionBoton />
    </main>
  );
}