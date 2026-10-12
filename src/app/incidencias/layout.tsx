import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";

export default async function IncidenciasLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  // Solo oculta/muestra enlaces de navegación por comodidad: cada página
  // revalida el permiso real contra la hoja de Usuarios en el servidor.
  const rol = session.user?.rol;
  const esAdmin = rol === "ADMIN";
  const puedeVerInformes = esAdmin || rol === "PRESIDENTE";

  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-6">
      <header className="mb-4 border-b border-marca-200 pb-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/incidencias/panel" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Residencial Santa Aurelia"
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-md object-contain sm:h-14 sm:w-14"
              priority
            />
            <span className="text-lg font-bold text-marca-700 sm:text-xl">Incidencias RSA</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{session.user?.nombre || session.user?.email}</span>
            <CerrarSesionBoton />
          </div>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm font-medium text-marca-700 sm:gap-2">
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
      {children}
    </div>
  );
}

