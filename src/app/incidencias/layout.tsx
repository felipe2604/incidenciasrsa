import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { ErrorAplicacion, tienePermiso } from "@/lib/permissions";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";
import SelectorAspecto from "@/components/SelectorAspecto";
import NavegacionModerna from "@/components/NavegacionModerna";
import CampanaNotificaciones from "@/components/CampanaNotificaciones";
import NavegacionActual from "@/components/NavegacionActual";

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
  const puedeVerAdministracion = tienePermiso(actor, "USUARIOS_ESTADISTICAS_VER");
  const puedeVerCorreos = tienePermiso(actor, "MAILS_GESTIONAR");
  const enlaces = [
    { href: "/incidencias/perfil", texto: "Mi perfil" },
    { href: "/incidencias/panel", texto: "Panel" },
    { href: "/incidencias", texto: "Incidencias" },
    ...(puedeVerInformes ? [{ href: "/incidencias/informes", texto: "Informes" }] : []),
    ...(puedeVerCorreos ? [{ href: "/incidencias/correos", texto: "Correos" }] : []),
    ...(puedeVerAdministracion ? [{ href: "/incidencias/administracion", texto: "Administración" }] : []),
  ];

  return (
    <div className="app-shell mx-auto max-w-6xl p-3 sm:p-6">
      <NavegacionModerna informes={puedeVerInformes} administracion={puedeVerAdministracion} correos={puedeVerCorreos} />
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
            <CampanaNotificaciones key={actor.email} correo={actor.email} />
            <Link href="/incidencias/perfil" className="hidden font-medium hover:underline sm:inline">{actor.nombre || actor.email}</Link>
            <CerrarSesionBoton />
          </div>
        </div>
        <NavegacionActual enlaces={enlaces} />
      </header>
      <main className="app-content min-w-0">{children}</main>
    </div>
  );
}

