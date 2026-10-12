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
    <div className="mx-auto max-w-4xl p-4">
      <header className="mb-4 border-b border-marca-200 pb-3">
        <div className="mb-3 flex items-center justify-between">
          <Link href="/incidencias/panel" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Residencial Santa Aurelia" width={36} height={36} className="rounded" />
            <span className="text-lg font-bold text-marca-700">Incidencias RSA</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span>{session.user?.nombre || session.user?.email}</span>
            <CerrarSesionBoton />
          </div>
        </div>
        <nav className="flex gap-4 text-sm font-medium text-marca-700">
          <Link href="/incidencias/panel" className="hover:underline">
            Panel
          </Link>
          <Link href="/incidencias" className="hover:underline">
            Incidencias
          </Link>
          {puedeVerInformes && (
            <Link href="/incidencias/informes" className="hover:underline">
              Informes
            </Link>
          )}
          {esAdmin && (
            <Link href="/incidencias/administracion" className="hover:underline">
              Administración
            </Link>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}

