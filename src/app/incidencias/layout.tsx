import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { ErrorAplicacion } from "@/lib/permissions";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";
import SelectorAspecto from "@/components/SelectorAspecto";
import NavegacionModerna from "@/components/NavegacionModerna";

export default async function IncidenciasLayout({ children }: { children: React.ReactNode }) {
  let actor;
  try { actor = await obtenerUsuarioActual({ permitirCambioPassword: true }); }
  catch (error) {
    if (error instanceof ErrorAplicacion && error.codigo === "ACCESO_NO_AUTORIZADO") redirect("/login");
    throw error;
  }
  if (actor.cambio_password_obligatorio) redirect("/cambiar-contrasena");
  // Solo oculta/muestra enlaces de navegación por comodidad: cada página
  // revalida el permiso real contra la hoja de Usuarios en el servidor.
  const rol = actor.rol;
  const esAdmin = rol === "ADMIN";
  const puedeVerInformes = esAdmin || rol === "PRESIDENTE" || rol === "ADMINISTRADOR_FINCAS";

  return (
    <div className="app-shell mx-auto max-w-6xl p-3 sm:p-6">
      <NavegacionModerna informes={puedeVerInformes} administracion={esAdmin} />
      <header className="app-header mb-4 border-b border-marca-200 pb-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/incidencias/panel" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Residencial Santa Aurelia"
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-md border border-marca-200 bg-white object-contain p-1 shadow-sm sm:h-14 sm:w-14"
              priority
            />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-marca-700 sm:text-xl">Incidencias RSA</span>
              <span className="text-xs font-medium text-gray-500">Residencial Santa Aurelia</span>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <SelectorAspecto />
            <Link href="/incidencias/perfil" className="hidden font-medium hover:underline sm:inline">{actor.nombre || actor.email}</Link>
            <CerrarSesionBoton />
          </div>
        </div>
        <nav className="app-nav -mx-1 flex gap-1 overflow-x-auto text-sm font-medium text-marca-700 sm:gap-2">
          <Link href="/incidencias/perfil" className="whitespace-nowrap rounded-md px-2 py-1 hover:bg-marca-100/50">Mi perfil</Link>
          <Link href="/incidencias/panel" className="whitespace-nowrap rounded-md px-2 py-1 hover:bg-marca-100/50">
            Panel
          </Link>
          <Link href="/incidencias" className="whitespace-nowrap rounded-md px-2 py-1 hover:bg-marca-100/50">
            Incidencias
          </Link>
          {puedeVerInformes && (
            <Link href="/incidencias/informes" className="whitespace-nowrap rounded-md px-2 py-1 hover:bg-marca-100/50">
              Informes
            </Link>
          )}
          {esAdmin && (
            <Link href="/incidencias/administracion" className="whitespace-nowrap rounded-md px-2 py-1 hover:bg-marca-100/50">
              Administración
            </Link>
          )}
        </nav>
      </header>
      <main className="app-content min-w-0">{children}</main>
    </div>
  );
}

